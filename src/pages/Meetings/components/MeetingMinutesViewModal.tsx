import React from 'react';
import { Modal, Typography, Space, Tag, List, Avatar, Divider, Empty } from 'antd';
import {
    FileDoneOutlined,
    UserOutlined,
    TeamOutlined,
    UserDeleteOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    BulbOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

interface MeetingMinutesViewModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ color: '#8c8c8c', width: 20, flexShrink: 0, paddingTop: 2 }}>{icon}</div>
        <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </Text>
            <div style={{ fontSize: 13, color: '#262626' }}>{value}</div>
        </div>
    </div>
);

const MeetingMinutesViewModal: React.FC<MeetingMinutesViewModalProps> = ({
    open,
    onCancel,
    record,
    users,
}) => {
    if (!record) return null;

    // Resolve user helper
    const resolveUser = (userId: number) =>
        users.find(u => String(u.id) === String(userId)) ||
        record.participants?.find(u => String(u.id) === String(userId));

    const chairperson = record.chairpersonId ? resolveUser(record.chairpersonId) : null;
    const secretary = record.secretaryId ? resolveUser(record.secretaryId) : null;

    // Present = from presentIds OR confirmations with present/late
    const presentIds: number[] = record.presentIds?.length
        ? record.presentIds.map(Number)
        : (record.confirmations || [])
            .filter(c => ['present', 'late'].includes(c.attendanceStatus))
            .map(c => Number(c.userId));

    const absentIds: number[] = record.absentIds?.length
        ? record.absentIds.map(Number)
        : (record.confirmations || [])
            .filter(c => c.attendanceStatus === 'absent')
            .map(c => Number(c.userId));

    const statusConfig = {
        none: { color: 'default', text: 'Chưa khởi tạo' },
        draft: { color: 'warning', text: 'Bản nháp' },
        submitted: { color: 'success', text: 'Đã hoàn thành' },
    };
    const minutesStatus = (record.minutesStatus || 'none') as keyof typeof statusConfig;

    const renderUserItem = (userId: number, isLate?: boolean) => {
        const user = resolveUser(userId);
        return (
            <List.Item style={{ padding: '6px 12px', borderBottom: '1px solid #fafafa' }}>
                <Space size={10}>
                    <Avatar size={28} src={user?.avatar} icon={<UserOutlined />} />
                    <div>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>
                            {user?.name || `Thành viên #${userId}`}
                        </Text>
                        {user?.studentId && (
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                                {user.studentId}
                            </Text>
                        )}
                        {isLate && (
                            <Tag color="warning" style={{ marginLeft: 8, fontSize: 10, padding: '0 4px', border: 'none' }}>
                                MUỘN
                            </Tag>
                        )}
                    </div>
                </Space>
            </List.Item>
        );
    };

    // Detect late users from confirmations
    const lateIds = (record.confirmations || [])
        .filter(c => c.attendanceStatus === 'late')
        .map(c => Number(c.userId));

    return (
        <Modal
            title={
                <Space>
                    <FileDoneOutlined style={{ color: '#52c41a' }} />
                    <Text strong>Biên bản cuộc họp</Text>
                    <Tag color={statusConfig[minutesStatus].color}>
                        {statusConfig[minutesStatus].text}
                    </Tag>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            width={800}
            centered
            styles={{ body: { padding: '16px 24px', maxHeight: '80vh', overflowY: 'auto' } }}
        >
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20,
            }}>
                <Title level={4} style={{ margin: 0, marginBottom: 4, color: '#15803d' }}>
                    {record.title}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Biên bản chính thức — Chỉ đọc
                </Text>
            </div>

            {/* Basic Info */}
            <div style={{ marginBottom: 20 }}>
                <InfoRow
                    icon={<CalendarOutlined />}
                    label="Thời gian"
                    value={
                        <Text strong>
                            {dayjs(record.meetingAt).format('HH:mm')}
                            {record.endAt ? ` – ${dayjs(record.endAt).format('HH:mm')}` : ''}
                            {', '}
                            {dayjs(record.meetingAt).format('DD/MM/YYYY')}
                        </Text>
                    }
                />
                <InfoRow
                    icon={<EnvironmentOutlined />}
                    label="Địa điểm"
                    value={record.location || <Text type="secondary" italic>Chưa ghi nhận</Text>}
                />
                <InfoRow
                    icon={<UserOutlined />}
                    label="Chủ trì"
                    value={chairperson
                        ? <Space size={8}><Avatar size={20} src={chairperson.avatar} icon={<UserOutlined />} /><Text>{chairperson.name}</Text></Space>
                        : <Text type="secondary" italic>Chưa ghi nhận</Text>
                    }
                />
                <InfoRow
                    icon={<UserOutlined />}
                    label="Thư ký"
                    value={secretary
                        ? <Space size={8}><Avatar size={20} src={secretary.avatar} icon={<UserOutlined />} /><Text>{secretary.name}</Text></Space>
                        : <Text type="secondary" italic>Chưa ghi nhận</Text>
                    }
                />
            </div>

            {/* Attendance Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {/* Present */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#f0fdf4', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={6}>
                            <TeamOutlined style={{ color: '#16a34a' }} />
                            <Text strong style={{ fontSize: 13, color: '#16a34a' }}>
                                Có mặt ({presentIds.length})
                            </Text>
                        </Space>
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {presentIds.length > 0 ? (
                            <List
                                size="small"
                                dataSource={presentIds}
                                renderItem={(id) => renderUserItem(id, lateIds.includes(id))}
                            />
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không có dữ liệu"
                                style={{ padding: '16px 0', margin: 0 }}
                            />
                        )}
                    </div>
                </div>

                {/* Absent */}
                <div style={{ border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#fff5f5', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={6}>
                            <UserDeleteOutlined style={{ color: '#dc2626' }} />
                            <Text strong style={{ fontSize: 13, color: '#dc2626' }}>
                                Vắng mặt ({absentIds.length})
                            </Text>
                        </Space>
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {absentIds.length > 0 ? (
                            <List
                                size="small"
                                dataSource={absentIds}
                                renderItem={(id) => renderUserItem(id)}
                            />
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không vắng ai"
                                style={{ padding: '16px 0', margin: 0 }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Minutes Content */}
            {record.minutesContent && (
                <>
                    <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
                        <Space size={6}>
                            <FileTextOutlined style={{ color: 'var(--primary-color)' }} />
                            <Text strong style={{ fontSize: 13 }}>Nội dung biên bản</Text>
                        </Space>
                    </Divider>
                    <div
                        style={{
                            padding: '14px 16px',
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                            marginBottom: 16,
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: '#262626',
                        }}
                        dangerouslySetInnerHTML={{ __html: record.minutesContent }}
                    />
                </>
            )}

            {/* Opinions */}
            {record.opinions && (
                <>
                    <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
                        <Space size={6}>
                            <MessageOutlined style={{ color: '#f59e0b' }} />
                            <Text strong style={{ fontSize: 13 }}>Ý kiến của sinh viên / tập thể</Text>
                        </Space>
                    </Divider>
                    <div style={{
                        padding: '12px 16px',
                        background: '#fffbeb',
                        borderRadius: 8,
                        border: '1px solid #fde68a',
                        marginBottom: 16,
                    }}>
                        <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', color: '#78350f' }}>
                            {record.opinions}
                        </Paragraph>
                    </div>
                </>
            )}

            {/* Proposals */}
            {record.proposals && (
                <>
                    <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
                        <Space size={6}>
                            <BulbOutlined style={{ color: '#8b5cf6' }} />
                            <Text strong style={{ fontSize: 13 }}>Kiến nghị & Đề xuất</Text>
                        </Space>
                    </Divider>
                    <div style={{
                        padding: '12px 16px',
                        background: '#faf5ff',
                        borderRadius: 8,
                        border: '1px solid #e9d5ff',
                        marginBottom: 8,
                    }}>
                        <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', color: '#5b21b6' }}>
                            {record.proposals}
                        </Paragraph>
                    </div>
                </>
            )}

            {/* Empty state */}
            {!record.minutesContent && !record.opinions && !record.proposals && (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text type="secondary">
                            {record.minutesStatus === 'none' || !record.minutesStatus
                                ? 'Cuộc họp chưa có biên bản.'
                                : 'Nội dung biên bản đang được cập nhật.'}
                        </Text>
                    }
                />
            )}
        </Modal>
    );
};

export default MeetingMinutesViewModal;
