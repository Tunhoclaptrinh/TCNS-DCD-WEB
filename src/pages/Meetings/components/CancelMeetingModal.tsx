import React, { useState } from 'react';
import { Modal, Form, Input, Checkbox, Typography, Space, Alert, Tag, Avatar, List } from 'antd';
import {
    StopOutlined,
    WarningOutlined,
    BellOutlined,
    UserOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface CancelMeetingModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
    onConfirm: (reason: string, sendNotification: boolean) => Promise<void>;
    isSubmitting?: boolean;
}

const CancelMeetingModal: React.FC<CancelMeetingModalProps> = ({
    open,
    onCancel,
    record,
    users,
    onConfirm,
    isSubmitting = false,
}) => {
    const [form] = Form.useForm();
    const [sendNotification, setSendNotification] = useState(true);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            await onConfirm(values.cancelReason, sendNotification);
            form.resetFields();
            setSendNotification(true);
        } catch (_) {
            // validation failed
        }
    };

    const handleClose = () => {
        form.resetFields();
        setSendNotification(true);
        onCancel();
    };

    if (!record) return null;

    const participantCount = record.isAllParticipants
        ? users.length
        : (record.participantIds?.length || 0);

    const participantNames = (record.isAllParticipants ? users : (record.participantIds || []).map(id =>
        users.find(u => String(u.id) === String(id))
    )).filter(Boolean).slice(0, 5) as User[];

    return (
        <Modal
            title={
                <Space>
                    <StopOutlined style={{ color: '#ff4d4f' }} />
                    <Text strong style={{ color: '#ff4d4f' }}>Hủy cuộc họp</Text>
                </Space>
            }
            open={open}
            onCancel={handleClose}
            onOk={handleOk}
            okText="Xác nhận hủy"
            cancelText="Quay lại"
            okButtonProps={{
                danger: true,
                loading: isSubmitting,
                icon: <StopOutlined />,
            }}
            width={540}
            centered
            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                {/* Meeting summary card */}
                <div style={{
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 10,
                    padding: '14px 16px',
                    marginBottom: 20,
                }}>
                    <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#cf1322' }}>
                        {record.title}
                    </Title>
                    <Space direction="vertical" size={4}>
                        <Space size={8}>
                            <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                            <Text style={{ fontSize: 13 }}>
                                {dayjs(record.meetingAt).format('HH:mm - DD/MM/YYYY')}
                            </Text>
                        </Space>
                        <Space size={8}>
                            <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                            <Text style={{ fontSize: 13 }}>{record.location || 'Chưa rõ địa điểm'}</Text>
                        </Space>
                    </Space>
                </div>

                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message="Hành động không thể hoàn tác"
                    description="Sau khi hủy, trạng thái cuộc họp sẽ chuyển sang ĐBHỦY và không thể khôi phục. Vui lòng cân nhắc kỹ trước khi xác nhận."
                    style={{ marginBottom: 20, borderRadius: 8 }}
                />

                <Form form={form} layout="vertical">
                    <Form.Item
                        label={
                            <Text strong>
                                Lý do hủy họp <Text type="danger">*</Text>
                            </Text>
                        }
                        name="cancelReason"
                        rules={[
                            { required: true, message: 'Vui lòng nhập lý do hủy họp' },
                            { min: 10, message: 'Lý do phải có ít nhất 10 ký tự' },
                        ]}
                    >
                        <TextArea
                            rows={3}
                            placeholder="Nhập lý do hủy cuộc họp (bắt buộc)..."
                            showCount
                            maxLength={500}
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </Form>

                {/* Notification option */}
                <div style={{
                    background: sendNotification ? '#f0f9ff' : '#fafafa',
                    border: `1px solid ${sendNotification ? '#bae6fd' : '#f0f0f0'}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    transition: 'all 0.2s',
                }}>
                    <Checkbox
                        checked={sendNotification}
                        onChange={e => setSendNotification(e.target.checked)}
                        style={{ fontWeight: 600, fontSize: 14 }}
                    >
                        <Space size={6}>
                            <BellOutlined style={{ color: sendNotification ? '#0284c7' : '#8c8c8c' }} />
                            <Text strong style={{ color: sendNotification ? '#0284c7' : '#595959' }}>
                                Gửi thông báo hủy đến thành viên
                            </Text>
                        </Space>
                    </Checkbox>

                    {sendNotification && (
                        <div style={{ marginTop: 10, paddingLeft: 24 }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                Thông báo sẽ được gửi đến <Text strong>{participantCount}</Text> thành viên trong danh sách:
                            </Text>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                {participantNames.map(user => (
                                    <Tag
                                        key={user.id}
                                        icon={<UserOutlined />}
                                        style={{ margin: 2, borderRadius: 20, fontSize: 11 }}
                                    >
                                        {user.name}
                                    </Tag>
                                ))}
                                {participantCount > 5 && (
                                    <Tag style={{ margin: 2, borderRadius: 20, fontSize: 11, background: '#f5f5f5' }}>
                                        +{participantCount - 5} người khác
                                    </Tag>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default CancelMeetingModal;
