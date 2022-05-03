// Import required packages
import * as restify from "restify";

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { BotFrameworkAdapter, MessageFactory, TurnContext } from "botbuilder";

// This bot's main dialog.
import { TeamsBot } from "./botHandler/teamsBot";
import ConversationHandler from "./database/ConversationHandler";

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
    appId: process.env.BOT_ID,
    appPassword: process.env.BOT_PASSWORD,
});

// Catch-all for errors.
const onTurnErrorHandler = async (context: TurnContext, error: Error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        "OnTurnError Trace",
        `${error}`,
        "https://www.botframework.com/schemas/error",
        "TurnError"
    );

    // Send a message to the user
    await context.sendActivity(`The bot encountered unhandled error:\n ${error.message}`);
    await context.sendActivity("To continue to run this bot, please fix the bot source code.");
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the bot that will handle incoming messages.
const bot = new TeamsBot();

// Create HTTP server.
const server = restify.createServer();

// query string 자동 파서
server.use(restify.plugins.queryParser());
// Request - Content-type 이 application/json일 경우 자동으로 파싱
server.use(restify.plugins.jsonBodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

// Listen for incoming requests.
server.post("/api/messages", async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
    });
});

// Listen for incoming notifications and send proactive messages to users.
server.post('/api/notify', async function (req, res, next) {
    // const { user_email } = req.query;
    const rawBody = req.body;

    // if (!user_email) {
    //     res.send("err");
    //     return;
    // }

    const actorEmail = rawBody.actor ? rawBody.actor.emailAddress : '';
    if (!actorEmail)
        return res.send(404, { message: 'actorEmail not found' });

    const rawPullRequest = rawBody.pullRequest;

    if (!rawPullRequest)
        return res.send(404, { message: 'pr not found' });

    const prTitle = rawPullRequest.title;
    const prDescription = rawPullRequest.description;
    const reviewers = rawPullRequest.reviewers;
    let prLink = rawPullRequest.links.self[0].href.toString();

    if (!Array.isArray(reviewers))
        return res.send(404, { message: 'No reviewers' });

    for (let index = 0; index < reviewers.length; index++) {
        const element = reviewers[index];
        const reviewerEmail = element.user.emailAddress;

        try {
            const handler = new ConversationHandler();      // DB에서 conversation 있나 확인
            const getResult = await handler.GetUserConversation(null, reviewerEmail);
            if (getResult.length !== 1)
                return res.send(500, { message: `user not found or too many, count = ${getResult.length}` });

            const conversation_id = getResult.data.conversation.id;
            const service_url = getResult.data.serviceUrl || "https://smba.trafficmanager.net/kr/";
            const connectorClient = adapter.createConnectorClient(service_url);
            // const response = await connectorClient.conversations.createConversation(conversationParameters);

            let rawNotificationCard = require("./adaptiveCards/prNotification.json");
            rawNotificationCard.body[0].text = prTitle;
            rawNotificationCard.body[1].text = prDescription;

            prLink = prLink.replace("bitbucket.jisa.net", "10.1.4.71");

            rawNotificationCard.actions[0].url = prLink;

            // conversation_id = response.id 임
            // let etest = MessageFactory.text("PR이 발생했습니다!")
            const card = bot.renderAdaptiveCard(rawNotificationCard);
            let attachCard = MessageFactory.attachment(card);
            const result = await connectorClient.conversations.sendToConversation(conversation_id, attachCard);//  { attachments: [card] });
        } catch (error) {
            console.error(error);
            return res.send(500, { message: JSON.stringify(error) });
        }
    }
    return res.send(200, { message: "No error occurred." });
});


