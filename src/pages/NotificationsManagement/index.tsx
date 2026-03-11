import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Switch, Form, Button, message, Tabs, List, Avatar,
    Typography, Badge, Tag, Tooltip, Popconfirm, Spin, Empty, Divider,
} from 'antd';
import {
    BellOutlined, CheckCircleOutlined, DeleteOutlined,
    GiftOutlined, TrophyOutlined, InfoCircleOutlined,
    MessageOutlined, RocketOutlined, SettingOutlined, ReadOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types/notification.types';
import { formatRelativeTime } from '@/utils/formatters';

const { Title, Text, Paragraph } = Typography;

const HISTORY_NOTIFICATION_TYPES = [
    { key: 'shift', label: 'Thông báo ca trực', icon: <CalendarOutlined />, color: '#722ed1' },
    { key: 'approval', label: 'Thông báo phê duyệt', icon: <CheckCircleOutlined />, color: '#13c2c2' },
    { key: 'reward', label: 'Thưởng/Phạt', icon: <GiftOutlined />, color: '#ff4d4f' },
    { key: 'achievement', label: 'Thành tích', icon: <TrophyOutlined />, color: '#faad14' },
    { key: 'social', label: 'Xã hội', icon: <MessageOutlined />, color: '#52c41a' },
    { key: 'quest', label: 'Nhiệm vụ', icon: <RocketOutlined />, color: '#1890ff' },
    { key: 'system', label: 'Hệ thống', icon: <InfoCircleOutlined />, color: '#1890ff' },
];

const SETTINGS_FIELDS = [
    { key: 'shift_notifications', label: 'Thông báo ca trực', icon: <CalendarOutlined />, color: '#722ed1' },
    { key: 'approval_notifications', label: 'Thông báo phê duyệt', icon: <CheckCircleOutlined />, color: '#13c2c2' },
    { key: 'system_notifications', label: 'Thông báo hệ thống', icon: <InfoCircleOutlined />, color: '#1890ff' },
    { key: 'email_notifications', label: 'Thông báo qua email', icon: <MessageOutlined />, color: '#52c41a' },
    { key: 'sms_notifications', label: 'Thông báo qua SMS', icon: <BellOutlined />, color: '#fa8c16' },
];

const isFormValidationError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'errorFields' in error;

const getNotificationIcon = (type: string) => {
    const found = HISTORY_NOTIFICATION_TYPES.find((t) => t.key === type);
    return found ? (
        React.cloneElement(found.icon as React.ReactElement, {
            style: { fontSize: 20, color: found.color },
        })
    ) : (
        <InfoCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
    );
};

const getAvatarBg = (type: string) => {
    const map: Record<string, string> = {
        shift: '#f9f0ff',
        approval: '#e6fffb',
        reward: '#fff1f0',
        achievement: '#fffbe6',
        social: '#f6ffed',
        quest: '#e6f7ff',
        system: '#e6f7ff',
        shift_notifications: '#f9f0ff',
        approval_notifications: '#e6fffb',
        system_notifications: '#e6f7ff',
        email_notifications: '#f6ffed',
        sms_notifications: '#fff7e6',
    };
    return map[type] || '#e6f7ff';
};

const NotificationsManagementPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [activeTab, setActiveTab] = useState('history');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [prefLoading, setPrefLoading] = useState(false);
    const [savingPref, setSavingPref] = useState(false);
    const [form] = Form.useForm();

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications(page, limit, {});
            setNotifications(data.items);
            setTotal(data.total);
            setUnreadTotal(data.unread_count);
        } catch {
            message.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    const fetchPreferences = useCallback(async () => {
        setPrefLoading(true);
        try {
            const prefs = await notificationService.getPreferences();
            const formValues: Record<string, boolean> = {};
            SETTINGS_FIELDS.forEach((field) => {
                formValues[field.key] = prefs[field.key as keyof typeof prefs] !== false;
            });
            form.setFieldsValue(formValues);
        } catch {
            const defaults: Record<string, boolean> = {};
            SETTINGS_FIELDS.forEach((field) => {
                defaults[field.key] = true;
            });
            form.setFieldsValue(defaults);
        } finally {
            setPrefLoading(false);
        }
    }, [form]);

    useEffect(() => {
        if (activeTab === 'history') fetchNotifications();
        if (activeTab === 'settings') fetchPreferences();
    }, [activeTab, fetchNotifications, fetchPreferences]);

    const handleMarkAsRead = async (item: Notification) => {
        if (item.is_read) return;
        try {
            await notificationService.markAsRead(item.id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
            );
            setUnreadTotal((prev) => Math.max(0, prev - 1));
        } catch {
            message.error('Thao tác thất bại');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadTotal(0);
            message.success('Đã đánh dấu tất cả là đã đọc');
        } catch {
            message.error('Thao tác thất bại');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            setTotal((prev) => prev - 1);
            message.success('Đã xóa thông báo');
        } catch {
            message.error('Xóa thất bại');
        }
    };

    const handleDeleteAll = async () => {
        try {
            await notificationService.deleteAllNotifications();
            setNotifications([]);
            setTotal(0);
            setUnreadTotal(0);
            message.success('Đã xóa tất cả thông báo');
        } catch {
            message.error('Xóa thất bại');
        }
    };

    const handleSavePreferences = async () => {
        setSavingPref(true);
        try {
            const values = await form.validateFields();
            await notificationService.updatePreferences(values);
            message.success('Đã lưu cài đặt thông báo');
        } catch (error: unknown) {
            if (isFormValidationError(error)) return;
            message.error('Lưu cài đặt thất bại');
        } finally {
            setSavingPref(false);
        }
    };

    return (
        <>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <BellOutlined style={{ marginRight: 8 }} />
                        Thông báo
                    </Title>
                    <Text type="secondary">
                        Lịch sử và cài đặt thông báo của bạn
                    </Text>
                </div>
                {unreadTotal > 0 && (
                    <Tag color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
                        {unreadTotal} chưa đọc
                    </Tag>
                )}
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key);
                    setPage(1);
                }}
                items={[
                    {
                        key: 'history',
                        label: (
                            <span>
                                <BellOutlined /> Lịch sử thông báo
                                {unreadTotal > 0 && (
                                    <Badge
                                        count={unreadTotal}
                                        size="small"
                                        style={{ marginLeft: 6 }}
                                    />
                                )}
                            </span>
                        ),
                        children: (
                            <Card
                                extra={
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Tooltip title="Đánh dấu tất cả đã đọc">
                                            <Button
                                                icon={<ReadOutlined />}
                                                size="small"
                                                onClick={handleMarkAllRead}
                                                disabled={unreadTotal === 0}
                                            >
                                                Đã đọc tất cả
                                            </Button>
                                        </Tooltip>
                                        <Popconfirm
                                            title="Xóa tất cả thông báo?"
                                            description="Hành động này không thể hoàn tác."
                                            onConfirm={handleDeleteAll}
                                            okText="Xóa hết"
                                            cancelText="Hủy"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                disabled={notifications.length === 0}
                                            >
                                                Xóa tất cả
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                }
                            >
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                        <Spin size="large" />
                                    </div>
                                ) : notifications.length > 0 ? (
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={notifications}
                                        pagination={{
                                            current: page,
                                            onChange: setPage,
                                            pageSize: limit,
                                            total,
                                            align: 'center',
                                            showSizeChanger: false,
                                        }}
                                        renderItem={(item) => (
                                            <List.Item
                                                actions={[
                                                    !item.is_read && (
                                                        <Tooltip key="read" title="Đánh dấu đã đọc">
                                                            <Button
                                                                type="text"
                                                                shape="circle"
                                                                icon={
                                                                    <CheckCircleOutlined
                                                                        style={{ color: '#1890ff' }}
                                                                    />
                                                                }
                                                                onClick={() => handleMarkAsRead(item)}
                                                            />
                                                        </Tooltip>
                                                    ),
                                                    <Popconfirm
                                                        key="delete"
                                                        title="Xóa thông báo này?"
                                                        onConfirm={() => handleDelete(item.id)}
                                                        okText="Xóa"
                                                        cancelText="Hủy"
                                                        okButtonProps={{ danger: true }}
                                                    >
                                                        <Button
                                                            type="text"
                                                            danger
                                                            shape="circle"
                                                            icon={<DeleteOutlined />}
                                                        />
                                                    </Popconfirm>,
                                                ].filter(Boolean)}
                                                style={{
                                                    padding: '16px 24px',
                                                    background: !item.is_read
                                                        ? 'linear-gradient(to right, rgba(230,247,255,0.5), transparent)'
                                                        : 'transparent',
                                                    borderBottom: '1px solid #f5f5f5',
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={
                                                        <Avatar
                                                            icon={getNotificationIcon(item.type)}
                                                            size={44}
                                                            style={{
                                                                backgroundColor: getAvatarBg(item.type),
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        />
                                                    }
                                                    title={
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <Text
                                                                strong={!item.is_read}
                                                                style={{ fontSize: 15 }}
                                                            >
                                                                {item.title}
                                                            </Text>
                                                            {!item.is_read && (
                                                                <Badge
                                                                    status="processing"
                                                                    color="#1890ff"
                                                                />
                                                            )}
                                                        </div>
                                                    }
                                                    description={
                                                        <div>
                                                            <Paragraph
                                                                style={{
                                                                    margin: '2px 0 6px',
                                                                    color: '#595959',
                                                                    fontSize: 13,
                                                                }}
                                                            >
                                                                {item.message}
                                                            </Paragraph>
                                                            <Text
                                                                type="secondary"
                                                                style={{ fontSize: 12 }}
                                                            >
                                                                {formatRelativeTime(item.createdAt)}
                                                            </Text>
                                                        </div>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <Empty
                                        description="Không có thông báo nào"
                                        style={{ padding: '48px 0' }}
                                    />
                                )}
                            </Card>
                        ),
                    },
                    {
                        key: 'settings',
                        label: (
                            <span>
                                <SettingOutlined /> Cài đặt thông báo
                            </span>
                        ),
                        children: (
                            <Card>
                                <Spin spinning={prefLoading}>
                                    <Title level={5} style={{ marginBottom: 4 }}>
                                        Loại thông báo nhận
                                    </Title>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
                                        Chọn loại thông báo bạn muốn nhận
                                    </Text>
                                    <Form form={form} layout="vertical">
                                        {SETTINGS_FIELDS.map((type) => (
                                            <div key={type.key}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px 0',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 12,
                                                        }}
                                                    >
                                                        <Avatar
                                                            icon={React.cloneElement(
                                                                type.icon as React.ReactElement,
                                                                { style: { color: type.color } }
                                                            )}
                                                            style={{
                                                                background: getAvatarBg(type.key),
                                                            }}
                                                        />
                                                        <span style={{ fontSize: 14 }}>{type.label}</span>
                                                    </div>
                                                    <Form.Item
                                                        name={type.key}
                                                        valuePropName="checked"
                                                        style={{ margin: 0 }}
                                                    >
                                                        <Switch />
                                                    </Form.Item>
                                                </div>
                                                <Divider style={{ margin: '0' }} />
                                            </div>
                                        ))}
                                        <div style={{ marginTop: 24 }}>
                                            <Button
                                                type="primary"
                                                onClick={handleSavePreferences}
                                                loading={savingPref}
                                            >
                                                Lưu cài đặt
                                            </Button>
                                        </div>
                                    </Form>
                                </Spin>
                            </Card>
                        ),
                    },
                ]}
            />
        </>
    );
};

export default NotificationsManagementPage;
