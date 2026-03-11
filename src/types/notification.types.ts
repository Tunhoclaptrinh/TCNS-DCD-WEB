// ============================================
// Notification Types
// ============================================

export interface Notification {
    id: number;
    user_id: number;
    type: 'system' | 'reward' | 'achievement' | 'quest' | 'social' | 'shift' | 'approval';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    is_read: boolean;
    createdAt: string;
    read_at?: string;
}

export interface NotificationPreferences {
    user_id: number;
    shift_notifications: boolean;
    approval_notifications: boolean;
    system_notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications?: boolean;
    quest_notifications?: boolean;
    achievement_notifications?: boolean;
    social_notifications?: boolean;
}

export type NotificationType = Notification['type'];
