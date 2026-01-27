import BaseService from './base.service';
class CategoryService extends BaseService {
    constructor() {
        super('/categories');
    }
}
export const categoryService = new CategoryService();
