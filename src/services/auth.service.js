import apiClient from '../config/axios.config';
export const authService = {
    login: (credentials) => {
        return apiClient.post('/auth/login', credentials);
    },
    register: (data) => {
        return apiClient.post('/auth/register', data);
    },
    getMe: () => {
        return apiClient.get('/auth/me');
    },
    logout: () => {
        return apiClient.post('/auth/logout');
    }
};
