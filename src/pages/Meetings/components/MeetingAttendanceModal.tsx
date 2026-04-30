import React from 'react';
import { Modal, Typography, Space, List, Avatar, Tag, Select, message } from 'antd';
import { 
    TeamOutlined, UserOutlined, CheckCircleOutlined, 
    ClockCircleOutlined, CloseCircleOutlined, 
    SyncOutlined
} from '@ant-design/icons';
import { Button } from '@/components/common';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';

const { Text } = Typography;

interface MeetingAttendanceModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
    onMarkAttendance: (userId: number, status: string) => void;
}

const MeetingAttendanceModal: React.FC<MeetingAttendanceModalProps> = ({
    open,
    onCancel,
    record,
    users,
    onMarkAttendance
}) => {
    if (!record) return null;

    const handleMarkAllPresent = () => {
        Modal.confirm({
            title: 'Điểm danh nhanh',
            content: 'Bạn có chắc chắn muốn đánh dấu tất cả thành viên là "Có mặt"?',
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: () => {
                record.participantIds.forEach(id => {
                    onMarkAttendance(id, 'present');
                });
                message.success('Đã đánh dấu tất cả có mặt');
            }
        });
    };

    const handleSyncFromRsvp = () => {
        const acceptedIds = record.confirmations
            ?.filter(c => c.status === 'accepted')
            ?.map(c => c.userId) || [];
        
        if (acceptedIds.length === 0) {
            message.info('Không có thành viên nào xác nhận tham gia trước đó');
            return;
        }

        Modal.confirm({
            title: 'Đồng bộ từ RSVP',
            content: `Phát hiện ${acceptedIds.length} thành viên đã xác nhận tham gia. Đánh dấu họ là "Có mặt"?`,
            okText: 'Đồng bộ',
            cancelText: 'Hủy',
            onOk: () => {
                acceptedIds.forEach(id => {
                    onMarkAttendance(id, 'present');
                });
                message.success(`Đã đồng bộ ${acceptedIds.length} thành viên`);
            }
        });
    };

    return (
        <Modal
            title={
                <Space>
                    <TeamOutlined style={{ color: 'var(--primary-color)' }} />
                    <Text strong>Điểm danh cuộc họp</Text>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="close" variant="primary" buttonSize="small" onClick={onCancel} style={{ minWidth: 100 }}>
                    Hoàn tất
                </Button>
            ]}
            width={650}
            centered
        >
            <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>{record.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Đánh giá sự chuyên cần thực tế của các thành viên.</Text>
                    </div>
                    <Space>
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            icon={<SyncOutlined />} 
                            onClick={handleSyncFromRsvp}
                            style={{ fontSize: 12, color: '#1890ff' }}
                        >
                            Đồng bộ RSVP
                        </Button>
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            icon={<CheckCircleOutlined />} 
                            onClick={handleMarkAllPresent}
                            style={{ fontSize: 12, color: '#52c41a' }}
                        >
                            Tất cả có mặt
                        </Button>
                    </Space>
                </div>
                
                <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                    <List
                        size="small"
                        dataSource={record.participantIds || []}
                        renderItem={(userId: number) => {
                            const confirmation = record.confirmations?.find((c: any) => String(c.userId) === String(userId));
                            const rsvpStatus = confirmation?.status || 'pending';
                            const user = users.find((u: User) => String(u.id) === String(userId)) || 
                                         record.participants?.find((u: User) => String(u.id) === String(userId));
                            
                            const isMarked = ['present', 'late', 'absent'].includes(rsvpStatus);

                            return (
                                <List.Item
                                    style={{ padding: '10px 16px' }}
                                    actions={[
                                        <Select
                                            key="status"
                                            value={isMarked ? rsvpStatus : undefined}
                                            placeholder="Chọn"
                                            size="small"
                                            style={{ width: 110 }}
                                            onChange={(val: string) => onMarkAttendance(userId, val)}
                                            options={[
                                                { label: 'Có mặt', value: 'present' },
                                                { label: 'Đi muộn', value: 'late' },
                                                { label: 'Vắng mặt', value: 'absent' },
                                            ]}
                                        />
                                    ]}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                        <Avatar size={32} src={user?.avatar} icon={<UserOutlined />} style={{ flexShrink: 0 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Text style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {user?.name || `Thành viên #${userId}`}
                                                </Text>
                                                {user?.studentId && (
                                                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                        ({user.studentId})
                                                    </Text>
                                                )}
                                            </div>
                                            
                                            <Space size={8} style={{ lineHeight: 1 }}>
                                                {rsvpStatus === 'accepted' && <Tag color="blue" style={{ fontSize: 9, margin: 0, padding: '0 4px', borderRadius: 4, height: 16, lineHeight: '14px' }}>Đã RSVP</Tag>}
                                                {rsvpStatus === 'present' && <Text type="success" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircleOutlined /> Có mặt</Text>}
                                                {rsvpStatus === 'late' && <Text type="warning" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><ClockCircleOutlined /> Muộn</Text>}
                                                {rsvpStatus === 'absent' && <Text type="danger" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><CloseCircleOutlined /> Vắng</Text>}
                                            </Space>
                                        </div>
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default MeetingAttendanceModal;
