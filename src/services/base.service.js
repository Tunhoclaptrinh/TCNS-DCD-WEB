import apiClient from '../config/axios.config';
class BaseService {
    constructor(endpoint) {
        Object.defineProperty(this, "endpoint", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.endpoint = endpoint;
    }
    async getAll(params = {}) {
        return apiClient.get(this.endpoint, { params });
    }
    async getById(id) {
        return apiClient.get(`${this.endpoint}/${id}`);
    }
    async create(data) {
        return apiClient.post(this.endpoint, data);
    }
    async update(id, data) {
        return apiClient.put(`${this.endpoint}/${id}`, data);
    }
    async delete(id) {
        return apiClient.delete(`${this.endpoint}/${id}`);
    }
}
export default BaseService;
