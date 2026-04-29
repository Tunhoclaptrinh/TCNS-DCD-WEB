
import BaseService from './base.service';
import type { Notification, NotificationPreferences } from '@/types/notification.types';

class NotificationService extends BaseService {
  constructor() {
    super('/notifications');
  }

  async getNotifications(page: number = 1, limit: number = 20, filter: Record<string, any> = {}): Promise<{ items: Notification[]; total: number; unread_count: number }> {
    const params = { page, limit, ...filter };
    const response = await this.get<any>('/', params);

    // Backend returns: { success: true, data: { items: [], total: 0, unreadCount: 0 } }
    // Or sometimes: { success: true, data: [], pagination: { total: 0 } }
    const data = response.data || {};
    
    return {
      items: Array.isArray(data) ? data : (data.items || []),
      total: data.total ?? response.pagination?.total ?? (Array.isArray(data) ? data.length : 0),
      unread_count: data.unreadCount ?? response.unreadCount ?? 0
    };
  }

  async markAsRead(id: number): Promise<boolean> {
    const response = await this.patchRequest(`/${id}/read`, {});
    return response.success ?? true;
  }

  async markAllAsRead(): Promise<boolean> {
    const response = await this.patchRequest('/read-all', {});
    return response.success ?? true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const response = await this.deleteRequest(`/${id}`);
    return response.success ?? true;
  }

  async deleteAllNotifications(): Promise<boolean> {
    const response = await this.deleteRequest('/');
    return response.success ?? true;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await this.get('/preferences');
    return response.data;
  }

  async updatePreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await this.put('/preferences', data);
    return response.data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
