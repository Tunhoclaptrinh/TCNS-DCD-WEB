import React from 'react';
import { Modal, Typography, Space, Tag, Input, List, Avatar, Popover, Segmented } from 'antd';
import {
    CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined,
    UserOutlined, MessageOutlined, FileTextOutlined, EditOutlined
} from '@ant-design/icons';
import { Button } from '@/components/common';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export const POSITION_LABELS: Record<string, string> = {
    ctc: 'CTV',
    tv: 'Thành viên',
    tvb: 'Thành viên ban',
    pb: 'Phó ban',
    tb: 'Trưởng ban',
    dt: 'Đội trưởng'
};

interface MeetingDetailModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    currentUser: User | null;
    users: User[];
    rsvpStatus: 'accepted' | 'declined';
    rsvpReason: string;
    setRsvpReason: (reason: string) => void;
    isSubmitting: boolean;
    onRsvp: (status: 'accepted' | 'declined') => void;
    canCreate: boolean;
    onOpenMinutes: () => void;
}

const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
    open,
    onCancel,
    record,
    currentUser,
    users,
    rsvpStatus,
    rsvpReason,
    setRsvpReason,
    isSubmitting,
    onRsvp,
    canCreate,
    onOpenMinutes
}) => {
    const [viewMode, setViewMode] = React.useState<'rsvp' | 'attendance'>('rsvp');
    const [filter, setFilter] = React.useState<string>('all');

    // Reset filter when changing viewMode
    React.useEffect(() => {
        setFilter('all');
    }, [viewMode]);

    if (!record) return null;

    const isParticipant = record.isAllParticipants || record.participantIds?.some(id => String(id) === String(currentUser?.id));

    return (
        <Modal
            title={
                <Space>
                    <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
                    <Text strong>{canCreate ? 'Quản lý cuộc họp' : 'Chi tiết cuộc họp'}</Text>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
                    <Space size={12}>
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            onClick={onCancel} 
                            style={{ 
                                minWidth: 80, 
                                borderRadius: 8, 
                                color: '#595959',
                                border: '1px solid #d9d9d9'
                            }}
                        >
                            Đóng
                        </Button>
                        {canCreate && (
                            <Button 
                                variant="outline" 
                                buttonSize="small" 
                                icon={record.minutesStatus === 'submitted' ? <FileTextOutlined /> : <EditOutlined />} 
                                onClick={onOpenMinutes}
                                style={{ 
                                    borderRadius: 8,
                                    borderColor: record.minutesStatus === 'submitted' ? '#52c41a' : '#faad14',
                                    color: record.minutesStatus === 'submitted' ? '#52c41a' : '#faad14',
                                    fontWeight: 500
                                }}
                            >
                                {record.minutesStatus === 'submitted' ? 'Xem biên bản' : 'Ghi biên bản'}
                            </Button>
                        )}
                    </Space>
                    <Space size={12}>
                        {isParticipant && record.status === 'scheduled' && (
                            <>
                                <Button 
                                    variant="outline" 
                                    buttonSize="small" 
                                    onClick={() => onRsvp('declined')}
                                    loading={isSubmitting && rsvpStatus === 'declined'}
                                    style={{ 
                                        minWidth: 100, 
                                        borderRadius: 8,
                                        borderColor: '#ff4d4f',
                                        color: '#ff4d4f'
                                    }}
                                >
                                    Từ chối
                                </Button>
                                <Button 
                                    variant="primary" 
                                    buttonSize="small" 
                                    onClick={() => onRsvp('accepted')}
                                    loading={isSubmitting && rsvpStatus === 'accepted'}
                                    style={{ 
                                        minWidth: 140, 
                                        borderRadius: 8,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    Xác nhận tham gia
                                </Button>
                            </>
                        )}
                    </Space>
                </div>
            }
            width={600}
        >
            <div style={{ padding: '4px 0' }}>
                <Title level={4} style={{ marginBottom: 12, fontSize: 18 }}>{record.title}</Title>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClockCircleOutlined style={{ color: '#64748b' }} />
                        <Text style={{ fontSize: 13 }}>{dayjs(record.meetingAt).format('HH:mm - DD/MM/YYYY')}</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <EnvironmentOutlined style={{ color: '#64748b' }} />
                        <Text style={{ fontSize: 13 }}>{record.location || 'Chưa rõ địa điểm'}</Text>
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>NỘI DUNG CUỘC HỌP</Text>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{record.agenda || 'Chưa có nội dung chi tiết.'}</Text>
                    </div>
                </div>

                {record.status === 'scheduled' && isParticipant && (
                    <div style={{ marginBottom: 24, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <MessageOutlined style={{ color: 'var(--primary-color)' }} />
                            <Text strong style={{ fontSize: 14 }}>Phản hồi xác nhận (RSVP)</Text>
                        </div>
                        
                        <div>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                Ghi chú / Lý do (nếu từ chối):
                            </Text>
                            <Input.TextArea 
                                placeholder="Nhập lý do nếu bạn từ chối, hoặc lời nhắn cho quản trị viên..."
                                rows={2} 
                                value={rsvpReason}
                                onChange={(e) => setRsvpReason(e.target.value)}
                                style={{ borderRadius: 6, fontSize: 13 }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: 13, color: 'var(--primary-color)' }}>
                            {viewMode === 'rsvp' ? 'TRẠNG THÁI XÁC NHẬN (RSVP)' : 'TRẠNG THÁI ĐIỂM DANH (ATTENDANCE)'}
                        </Text>
                        <Segmented
                            size="small"
                            value={viewMode}
                            onChange={(v) => setViewMode(v as any)}
                            options={[
                                { label: 'Xác nhận', value: 'rsvp' },
                                { label: 'Điểm danh', value: 'attendance' },
                            ]}
                            style={{ borderRadius: 6 }}
                        />
                    </div>

                    <Segmented
                        block
                        value={filter}
                        onChange={(value) => setFilter(value as string)}
                        options={viewMode === 'rsvp' ? [
                            { label: 'Tất cả', value: 'all' },
                            { label: `Tham gia (${record.confirmations?.filter((c: any) => String(c.rsvpStatus || '').toLowerCase() === 'accepted').length || 0})`, value: 'accepted' },
                            { label: `Từ chối (${record.confirmations?.filter((c: any) => String(c.rsvpStatus || '').toLowerCase() === 'declined').length || 0})`, value: 'declined' },
                            { label: `Chờ (${(record.participantIds?.length || 0) - (record.confirmations?.filter((c: any) => ['accepted', 'declined'].includes(String(c.rsvpStatus || '').toLowerCase())).length || 0)})`, value: 'pending' },
                        ] : [
                            { label: 'Tất cả', value: 'all' },
                            { label: `Có mặt (${record.confirmations?.filter((c: any) => String(c.attendanceStatus || '').toLowerCase() === 'present').length || 0})`, value: 'present' },
                            { label: `Muộn (${record.confirmations?.filter((c: any) => String(c.attendanceStatus || '').toLowerCase() === 'late').length || 0})`, value: 'late' },
                            { label: `Vắng (${record.confirmations?.filter((c: any) => String(c.attendanceStatus || '').toLowerCase() === 'absent').length || 0})`, value: 'absent' },
                            { label: `Chưa (${(record.participantIds?.length || 0) - (record.confirmations?.filter((c: any) => ['present', 'late', 'absent'].includes(String(c.attendanceStatus || '').toLowerCase())).length || 0)})`, value: 'none' },
                        ]}
                        style={{ borderRadius: 8, fontSize: 13 }}
                    />
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fff' }}>
                    <List
                        size="small"
                        dataSource={(record.participantIds || []).filter(userId => {
                            if (filter === 'all') return true;
                            const myConfirm = record.confirmations?.find((c: any) => String(c.userId) === String(userId));
                            
                            if (viewMode === 'rsvp') {
                                const status = String(myConfirm?.rsvpStatus || 'pending').toLowerCase();
                                if (filter === 'accepted') return status === 'accepted';
                                if (filter === 'declined') return status === 'declined';
                                if (filter === 'pending') return status === 'pending';
                            } else {
                                const status = String(myConfirm?.attendanceStatus || 'none').toLowerCase();
                                if (filter === 'present') return status === 'present';
                                if (filter === 'late') return status === 'late';
                                if (filter === 'absent') return status === 'absent';
                                if (filter === 'none') return status === 'none';
                            }
                            return true;
                        })}
                        renderItem={(userId: number) => {
                            const myConfirm = record.confirmations?.find((c: any) => String(c.userId) === String(userId));
                            const rsvpStatus = String(myConfirm?.rsvpStatus || 'pending').toLowerCase();
                            const attendanceStatus = String(myConfirm?.attendanceStatus || 'none').toLowerCase();
                            
                            const user = users.find((u: User) => String(u.id) === String(userId)) || 
                                         record.participants?.find((u: User) => String(u.id) === String(userId));
                            
                            const rsvpConfig: any = {
                                accepted: { color: 'blue', label: 'Tham gia' },
                                declined: { color: 'red', label: 'Từ chối' },
                                pending: { color: 'default', label: 'Chờ phản hồi' }
                            };

                            const attendanceConfig: any = {
                                present: { color: 'green', label: 'Có mặt' },
                                late: { color: 'orange', label: 'Đi muộn' },
                                absent: { color: 'red', label: 'Vắng mặt' },
                                none: { color: 'default', label: 'Chưa điểm danh' }
                            };

                            const config = viewMode === 'rsvp' 
                                ? (rsvpConfig[rsvpStatus] || rsvpConfig.pending)
                                : (attendanceConfig[attendanceStatus] || attendanceConfig.none);

                            return (
                                <List.Item style={{ padding: '6px 12px' }}>
                                    <List.Item.Meta
                                        avatar={<Avatar size={24} src={user?.avatar} icon={<UserOutlined />} />}
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Text style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || `Thành viên #${userId}`}</Text>
                                                {user?.studentId && <Text type="secondary" style={{ fontSize: 11 }}>({user.studentId})</Text>}
                                            </div>
                                        }
                                        description={myConfirm?.reason && (
                                            <Text type="secondary" italic style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                                Lý do: {myConfirm.reason}
                                            </Text>
                                        )}
                                    />
                                    <Space size={4}>
                                        <Tag color={config.color} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>{config.label}</Tag>
                                        {myConfirm?.reason && (
                                            <Popover 
                                                content={
                                                    <div style={{ maxWidth: 250 }}>
                                                        <Text strong style={{ fontSize: 12, color: 'var(--primary-color)' }}>Lý do phản hồi:</Text>
                                                        <div style={{ marginTop: 4, fontSize: 13 }}>{myConfirm.reason}</div>
                                                    </div>
                                                }
                                                title={null}
                                                trigger="click"
                                                placement="left"
                                            >
                                                <MessageOutlined style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 12 }} />
                                            </Popover>
                                        )}
                                    </Space>
                                </List.Item>
                            );
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default MeetingDetailModal;
