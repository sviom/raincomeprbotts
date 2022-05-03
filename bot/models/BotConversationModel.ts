class BotConversationModel {
    /** personal or channel */
    public conversationType: string = '';
    /** a:{암호화문자열} */
    public id: string = '';
    /** office 365 tenant id */
    public tenantId: string;

    constructor() {

    }
}

export default BotConversationModel;