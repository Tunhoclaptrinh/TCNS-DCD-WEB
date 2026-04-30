import React, { useState, useEffect } from 'react';
import { Modal, Typography, Space, List, Avatar, Tag, Select, message, Divider } from 'antd';
import { 
    TeamOutlined, UserOutlined, CheckCircleOutlined, 
    ClockCircleOutlined, CloseCircleOutlined, 
    SyncOutlined, InfoCircleOutlined
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
    onSaveAttendance: (updates: Record<number, string>) => Promise<void>;
    isSaving?: boolean;
}

const MeetingAttendanceModal: React.FC<MeetingAttendanceModalProps> = ({
    open,
    onCancel,
    record,
    users,
    onSaveAttendance,
    isSaving = false
}) => {
    const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});

    useEffect(() => {
        if (open && record) {
            const initial: Record<number, string> = {};
            record.participantIds.forEach(id => {
                const conf = record.confirmations?.find(c => String(c.userId) === String(id));
                // Only take attendance statuses, or default to empty
                if (conf && ['present', 'late', 'absent'].includes(conf.status)) {
                    initial[id] = conf.status;
                }
            });
            setLocalAttendance(initial);
        }
    }, [open, record]);

    if (!record) return null;

    const handleMarkAllPresent = () => {
        const newAttendance = { ...localAttendance };
        record.participantIds.forEach(id => {
            newAttendance[id] = 'present';
        });
        setLocalAttendance(newAttendance);
        message.info('Đã đánh dấu tất cả có mặt trên giao diện. Nhấn Hoàn tất để lưu.');
    };

    const handleSyncFromRsvp = () => {
        const newAttendance = { ...localAttendance };
        let count = 0;
        
        record.participantIds.forEach(userId => {
            const conf = record.confirmations?.find(c => String(c.userId) === String(userId));
            if (conf?.status === 'accepted') {
                newAttendance[userId] = 'present';
                count++;
            } else if (conf?.status === 'declined') {
                newAttendance[userId] = 'absent';
                count++;
            }
        });
        
        setLocalAttendance(newAttendance);
        message.info(`Đã đồng bộ ${count} trạng thái từ RSVP (Accepted -> Có mặt, Declined -> Vắng). Nhấn Hoàn tất để lưu.`);
    };

    const handleFinish = () => {
        const present = Object.values(localAttendance).filter(s => s === 'present').length;
        const absent = Object.values(localAttendance).filter(s => s === 'absent').length;
        const lateUsers = record.participantIds
            .filter(id => localAttendance[id] === 'late')
            .map(id => users.find(u => String(u.id) === String(id))?.name || `Thành viên #${id}`);

        Modal.confirm({
            title: 'Xác nhận lưu điểm danh',
            width: 500,
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            content: (
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center', flex: 1, padding: '12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>{present}</div>
                            <div style={{ fontSize: 12, color: '#52c41a' }}>CÓ MẶT</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '12px', background: '#fff2f0', borderRadius: 8, border: '1px solid #ffccc7' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>{absent}</div>
                            <div style={{ fontSize: 12, color: '#ff4d4f' }}>VẮNG MẶT</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '12px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#faad14' }}>{lateUsers.length}</div>
                            <div style={{ fontSize: 12, color: '#faad14' }}>ĐI MUỘN</div>
                        </div>
                    </div>
                    
                    {lateUsers.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>Danh sách đi muộn:</Text>
                            <ul style={{ paddingLeft: 20, marginTop: 4, maxHeight: 100, overflowY: 'auto' }}>
                                {lateUsers.map((name, i) => <li key={i}><Text style={{ fontSize: 13 }}>{name}</Text></li>)}
                            </ul>
                        </div>
                    )}
                    
                    <Divider style={{ margin: '12px 0' }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        <InfoCircleOutlined /> Bạn có chắc chắn muốn cập nhật kết quả điểm danh này? Hành động này sẽ thay đổi trạng thái chuyên cần của thành viên.
                    </Text>
                </div>
            ),
            okText: 'Xác nhận lưu',
            cancelText: 'Hủy',
            onOk: async () => {
                await onSaveAttendance(localAttendance);
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
                <Button key="close" variant="ghost" buttonSize="small" onClick={onCancel} style={{ borderRadius: 6 }}>
                    Đóng
                </Button>,
                <Button 
                    key="finish" 
                    variant="primary" 
                    buttonSize="small" 
                    onClick={handleFinish} 
                    loading={isSaving}
                    style={{ borderRadius: 6, minWidth: 100 }}
                >
                    Hoàn tất
                </Button>
            ]}
            width={700}
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
                            style={{ fontSize: 12, color: '#1890ff', height: 28 }}
                        >
                            Đồng bộ RSVP
                        </Button>
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            icon={<CheckCircleOutlined />} 
                            onClick={handleMarkAllPresent}
                            style={{ fontSize: 12, color: '#52c41a', height: 28 }}
                        >
                            Tất cả có mặt
                        </Button>
                    </Space>
                </div>
                
                <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
                    <List
                        size="small"
                        dataSource={record.participantIds || []}
                        renderItem={(userId: number) => {
                            const conf = record.confirmations?.find(c => String(c.userId) === String(userId));
                            const rsvpStatus = conf?.status || 'pending';
                            const user = users.find((u: User) => String(u.id) === String(userId)) || 
                                         record.participants?.find((u: User) => String(u.id) === String(userId));
                            
                            const currentStatus = localAttendance[userId];

                            return (
                                <List.Item
                                    style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}
                                    actions={[
                                        <Select
                                            key="status"
                                            value={currentStatus}
                                            placeholder="Chọn"
                                            size="small"
                                            style={{ width: 110 }}
                                            onChange={(val: string) => setLocalAttendance(prev => ({ ...prev, [userId]: val }))}
                                            options={[
                                                { label: 'Có mặt', value: 'present' },
                                                { label: 'Đi muộn', value: 'late' },
                                                { label: 'Vắng mặt', value: 'absent' },
                                            ]}
                                        />
                                    ]}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                        <Avatar size={36} src={user?.avatar} icon={<UserOutlined />} style={{ flexShrink: 0 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Text style={{ fontSize: 13, fontWeight: 600 }}>
                                                    {user?.name || `Thành viên #${userId}`}
                                                </Text>
                                                {user?.studentId && (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        ({user.studentId})
                                                    </Text>
                                                )}
                                            </div>
                                            
                                            <Space size={8} style={{ lineHeight: 1 }}>
                                                {rsvpStatus === 'accepted' && <Tag color="blue" style={{ fontSize: 9, margin: 0, padding: '0 4px', borderRadius: 4, height: 16, lineHeight: '14px', border: 'none' }}>Đã RSVP</Tag>}
                                                {rsvpStatus === 'declined' && <Tag color="error" style={{ fontSize: 9, margin: 0, padding: '0 4px', borderRadius: 4, height: 16, lineHeight: '14px', border: 'none' }}>Từ chối</Tag>}
                                                
                                                {currentStatus === 'present' && <Text type="success" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircleOutlined /> Có mặt</Text>}
                                                {currentStatus === 'late' && <Text type="warning" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><ClockCircleOutlined /> Muộn</Text>}
                                                {currentStatus === 'absent' && <Text type="danger" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><CloseCircleOutlined /> Vắng</Text>}
                                                {!currentStatus && <Text type="secondary" style={{ fontSize: 11 }}>Chưa điểm danh</Text>}
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
