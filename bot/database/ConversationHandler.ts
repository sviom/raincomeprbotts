import sql from 'mssql';
import KeyVaultHelper from "../Helper/AzureKeyVaultHelper";
import ConversationModel from '../models/ConversationModel';

/**
 * Conversation 을 DB에 저장하는 핸들러
 */
class ConversationHandler {
    /**
     * DB에 저장
     * @param {ConversationModel} conversationObject conversation 정보 통째로
     * @param {String} email 사용자 이메일 정보
     */
    async UpsertConversation(conversationObject: ConversationModel, email?: string) {
        try {
            const helper = new KeyVaultHelper();
            const connection_string = await helper.GetKeyVaultSecret();
            let pool = await sql.connect(connection_string);

            var conversationModel = new ConversationModel(email);
            conversationModel.setConversationObject(
                conversationObject.bot.id,
                conversationObject.bot.name,
                conversationObject.conversation.conversationType,
                conversationObject.conversation.id,
                conversationObject.conversation.tenantId,
                conversationObject.serviceUrl,
                conversationObject.user.id,
                conversationObject.user.aadObjectId,
                conversationObject.user.name
            );

            const getResult = await this.GetUserConversation(conversationModel.user.aadObjectId);
            if (getResult.length <= 0) {
                let query = `
                    INSERT INTO Conversations
                    (BotId, BotName, ConversationType, ConversationId, UserId, UserAADId, UserName, Email, ServiceUrl)
                    VALUES
                    (
                        @BotId,
                        @BotName,
                        @ConversationType,
                        @ConversationId,
                        @UserId,
                        @UserAADId,
                        @UserName,
                        @Email,
                        @ServiceUrl
                    );
                `;


                let result = await pool.request()
                    .input('BotId', sql.NVarChar(300), conversationObject.bot.id)
                    .input('BotName', sql.NVarChar(100), conversationObject.bot.name)
                    .input('ConversationType', sql.NVarChar(50), conversationObject.conversation.conversationType)
                    .input('ConversationId', sql.NVarChar(300), conversationObject.conversation.id)
                    .input('UserId', sql.NVarChar(300), conversationObject.user.id)
                    .input('UserAADId', sql.UniqueIdentifier, conversationObject.user.aadObjectId)
                    .input('UserName', sql.NVarChar(200), conversationObject.user.name)
                    .input('Email', sql.NVarChar(100), email)
                    .input('ServiceUrl', sql.NVarChar(300), conversationObject.serviceUrl)
                    .query(query);
            } else {
                await this.UpdatetUserConversation(conversationModel, email);
            }
        } catch (err) {
            console.error("insert error : ", err)
        }
    }

    /**
     *
     * @param {String} UserAAdId Azure AD guid
     * @returns 배열
     */
    async GetUserConversation(UserAAdId: string, Email?: string) {
        let returnObject = {
            /**
             * Conversation 정보
             * @type {ConversationModel}
             */
            data: {},
            /** 갯수 */
            length: 0
        }

        try {
            const helper = new KeyVaultHelper();
            const connection_string = await helper.GetKeyVaultSecret();
            // await sql.connect(connection_string);
            let pool = await sql.connect(connection_string);
            let query = `
                SELECT
                    *
                FROM Conversations
                WHERE UserAADId = @UserAAdId OR Email = @Email
            `;

            // const request = new sql.Request();
            // request.input('UserAADId', sql.UniqueIdentifier, UserAAdId);
            // request.input('Email', sql.NVarChar(100), Email);

            let result = await pool.request()
                .input('UserAADId', sql.UniqueIdentifier, UserAAdId)
                .input('Email', sql.NVarChar(100), Email)
                .query(query)

            console.dir(result);
            const queryResult = result.recordset;
            if (queryResult.length > 0) {
                const userConversation = queryResult[0];
                let model = new ConversationModel();
                model.bot.id = userConversation.BotId;
                model.bot.name = userConversation.BotName;
                model.user.id = userConversation.UserId;
                model.user.aadObjectId = userConversation.UserAADId;
                model.user.name = userConversation.UserName;
                model.conversation.id = userConversation.ConversationId;
                model.conversation.conversationType = userConversation.ConversationType;
                model.email = userConversation.Email;
                model.serviceUrl = userConversation.ServiceUrl;

                returnObject.data = model;
            }
            returnObject.length = queryResult.length;
            // request.query(query, (err, result) => {
            // https://github.com/sviom/rainecomeprbot_ts.git
            // });
        } catch (err) {
            // ... error checks
            console.error(err);
        }
        return returnObject;
    }

    /**
     * 업데이트
     * @param {ConversationModel} conversationObject
     */
    async UpdatetUserConversation(conversationObject, email = null) {
        try {
            const helper = new KeyVaultHelper();
            const connection_string = await helper.GetKeyVaultSecret();
            let pool = await sql.connect(connection_string);

            let query = `
                UPDATE Conversations
                SET
                    BotId = @BotId,
                    BotName = @BotName,
                    ConversationType = @ConversationType,
                    ConversationId = @ConversationId,
                    Email = @Email,
                    UserId = @UserId,
                    UserName = @UserName,
                    UpdatedTime = @UpdatedTime,
                    ServiceUrl = @ServiceUrl
                WHERE UserAADId = @UserAADId
            `;

            let result = await pool.request()
                .input('BotId', sql.NVarChar(300), conversationObject.bot.id)
                .input('BotName', sql.NVarChar(100), conversationObject.bot.name)
                .input('ConversationType', sql.NVarChar(50), conversationObject.conversation.conversationType)
                .input('ConversationId', sql.NVarChar(300), conversationObject.conversation.id)
                .input('UserId', sql.NVarChar(300), conversationObject.user.id)
                .input('UserName', sql.NVarChar(200), conversationObject.user.name)
                .input('Email', sql.NVarChar(100), email)
                .input('UpdatedTime', sql.DateTime, new Date())
                .input('UserAADId', sql.UniqueIdentifier, conversationObject.user.aadObjectId)
                .input('ServiceUrl', sql.NVarChar(300), conversationObject.serviceUrl)
                .query(query);

        } catch (err) {
            console.error("update error : ", err);
        }
    }
}
module.exports = ConversationHandler;
