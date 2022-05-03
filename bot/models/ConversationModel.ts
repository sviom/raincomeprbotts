import BotConversationModel from "./BotConversationModel";
import BotModel from "./BotModel";
import UserModel from "./UserModel";

class ConversationModel {
    public email: string;
    public timestamp: Date = new Date();
    public bot: BotModel;
    public conversation: BotConversationModel;

    /** 봇이 대답을 어느 곳으로 보낼지 콜백 url */
    public serviceUrl: string = '';
    /** 봇과 대화하는 사용자 정보 */
    public user: UserModel;

    /**
     * @param {String} email 사용자 이메일 정보
     */
    constructor(email?: string) {
        this.email = email;
    }

    setConversationObject(bot_id: string, bot_name: string, conv_type: string, conv_id: string, conv_tenant_id: string, service_url: string, user_id: string, user_object_id: string, user_name: string) {
        this.bot.id = bot_id;
        this.bot.name = bot_name;
        this.conversation.conversationType = conv_type;
        this.conversation.id = conv_id;
        this.conversation.tenantId = conv_tenant_id;
        this.serviceUrl = service_url;
        this.user.id = user_id;
        this.user.aadObjectId = user_object_id;
        this.user.name = user_name;
    }
}

module.exports = ConversationModel
