import axios from 'axios';
import { STORAGE_KEYS, API_BASE_URL } from './constants';
const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
instance.interceptors.response.use((response) => response.data, (error) => {
    return Promise.reject(error);
});
const apiClient = instance;
export default apiClient;
