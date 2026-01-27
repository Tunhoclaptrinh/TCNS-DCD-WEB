import BaseService from './base.service';
class UserService extends BaseService {
    constructor() {
        super('/users');
    }
}
export const userService = new UserService();
