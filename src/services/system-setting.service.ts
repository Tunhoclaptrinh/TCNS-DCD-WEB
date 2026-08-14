import BaseService from './base.service';
import apiClient from '@/config/axios.config';

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
}

class SystemSettingService extends BaseService<SystemSetting> {
  constructor() {
    super('/system-settings');
  }

  async getByKey(key: string): Promise<SystemSetting | null> {
    try {
      const response = await apiClient.get(`${this.endpoint}/key/${key}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }
}

export default new SystemSettingService();
