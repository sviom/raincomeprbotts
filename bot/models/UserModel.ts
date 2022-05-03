class UserModel {
    /** AAD user guid */
    public aadObjectId: string = '';
    /** 29:{암호화문자열} */
    public id: string = '';
    /** 사용자이름 */
    public name: string = '';

    constructor() {

    }
}

export default UserModel;