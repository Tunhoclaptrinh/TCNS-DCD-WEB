import React from 'react';
import { Modal, Typography, Space, Avatar, Empty, Descriptions, Divider } from 'antd';
import {
    FileDoneOutlined,
    UserOutlined,
    TeamOutlined,
    UserDeleteOutlined,
    FileTextOutlined,
    BulbOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import dayjs from 'dayjs';
import Button from '@/components/common/Button';
import MeetingAttendanceModal from './MeetingAttendanceModal';

const { Text, Title, Paragraph } = Typography;

interface MeetingMinutesViewModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
}

const MeetingMinutesViewModal: React.FC<MeetingMinutesViewModalProps> = ({
    open,
    onCancel,
    record,
    users,
}) => {
    const [showAllPresent, setShowAllPresent] = React.useState(false);
    const [showAllAbsent, setShowAllAbsent] = React.useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = React.useState(false);

    // Data from record (DB)
    const otherPresent = record?.otherPresent || [];
    const otherAbsent = record?.otherAbsent || [];
    const otherChairpersons = record?.otherChairpersons || (record?.otherChairperson ? [record.otherChairperson] : []);
    const otherSecretaries = record?.otherSecretaries || (record?.otherSecretary ? [record.otherSecretary] : []);

    if (!record) return null;

    const PRESENT_LIMIT = 8;
    const ABSENT_LIMIT = 8;

    const resolveUser = (userId: number) =>
        users.find(u => String(u.id) === String(userId)) ||
        record.participants?.find(u => String(u.id) === String(userId));

    const chairpersonIds = record.chairpersonIds || (record.chairpersonId ? [record.chairpersonId] : []);
    const secretaryIds = record.secretaryIds || (record.secretaryId ? [record.secretaryId] : []);

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

    const lateIds = (record.confirmations || [])
        .filter(c => c.attendanceStatus === 'late')
        .map(c => Number(c.userId));

    return (
        <Modal
            title={
                <Space>
                    <FileDoneOutlined style={{ color: 'var(--primary-color)' }} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>BIÊN BẢN CUỘC HỌP (Dạng A4)</span>
                </Space>
            }
            zIndex={1100}
            open={open}
            onCancel={onCancel}
            width={850}
            centered
            destroyOnClose
            footer={[
                <Button key="close" variant="outline" buttonSize="small" onClick={onCancel} style={{ minWidth: 100, borderRadius: 8 }}>
                    Đóng
                </Button>
            ]}
            styles={{ body: { padding: 16, backgroundColor: '#f5f5f5', maxHeight: '90vh', overflowY: 'auto'} }}
        >
            <div 
                className="meeting-minutes-content" 
                style={{ 
                    backgroundColor: '#fff', 
                    padding: '48px 64px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                    border: '1px solid #e5e7eb',
                    minHeight: '297mm',
                    margin: '0 auto',
                    maxWidth: '100%',
                    position: 'relative'
                }}
            >
                {/* Header Info */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <Text type="secondary" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                        Cộng hòa Xã hội Chủ nghĩa Việt Nam
                    </Text>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 24 }}>
                        Độc lập - Tự do - Hạnh phúc
                    </Text>
                    <Divider style={{ margin: '0 auto 32px', width: '120px', minWidth: '120px', borderTop: '1px solid #000' }} />
                    <Title level={3} style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.05em' }}>
                        BIÊN BẢN CUỘC HỌP
                    </Title>
                    <Text strong style={{ fontSize: 18, color: '#374151', display: 'block', marginTop: 12 }}>
                        {record.title}
                    </Text>
                </div>

                <Divider orientation="left" style={{ fontSize: 11, color: '#94a3b8', margin: '40px 0 20px', letterSpacing: '0.05em' }}>THÔNG TIN CHUNG</Divider>
                <Descriptions 
                    column={2} 
                    bordered={false} 
                    size="small" 
                    labelStyle={{ color: '#6b7280', fontWeight: 500, width: '120px' }}
                    contentStyle={{ color: '#111827', fontWeight: 600 }}
                >
                    <Descriptions.Item label="Thời gian">
                        {dayjs(record.meetingAt).format('HH:mm')}
                        {record.endAt ? ` - ${dayjs(record.endAt).format('HH:mm')}` : ''}
                        {', '}
                        {dayjs(record.meetingAt).format('DD/MM/YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa điểm">
                        {record.location || 'Chưa ghi nhận'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chủ trì">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {chairpersonIds.map(id => {
                                const user = resolveUser(Number(id));
                                return user ? <Text key={id}>{user.name}</Text> : null;
                            })}
                            {otherChairpersons.map((name, i) => (
                                <Text key={`other-ch-${i}`} style={{ fontStyle: 'italic', color: '#4b5563' }}>{name}</Text>
                            ))}
                            {chairpersonIds.length === 0 && otherChairpersons.length === 0 && <Text type="secondary">Chưa ghi nhận</Text>}
                        </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Thư ký">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {secretaryIds.map(id => {
                                const user = resolveUser(Number(id));
                                return user ? <Text key={id}>{user.name}</Text> : null;
                            })}
                            {otherSecretaries.map((name, i) => (
                                <Text key={`other-sec-${i}`} style={{ fontStyle: 'italic', color: '#4b5563' }}>{name}</Text>
                            ))}
                            {secretaryIds.length === 0 && otherSecretaries.length === 0 && <Text type="secondary">Chưa ghi nhận</Text>}
                        </div>
                    </Descriptions.Item>
                </Descriptions>

                <Divider orientation="left" style={{ fontSize: 11, color: '#94a3b8', margin: '40px 0 20px', letterSpacing: '0.05em' }}>THÀNH PHẦN THAM DỰ</Divider>
                <div style={{ padding: '0 4px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <TeamOutlined style={{ color: '#16a34a', fontSize: 14 }} />
                                <Text strong style={{ color: '#16a34a', fontSize: 13, letterSpacing: '0.02em' }}>CÓ MẶT ({presentIds.length + otherPresent.length}):</Text>
                            </Space>
                            <Typography.Link 
                                style={{ fontSize: 12, fontWeight: 500 }}
                                onClick={() => setIsAttendanceModalOpen(true)}
                            >
                                Xem chi tiết
                            </Typography.Link>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
                            {/* System members */}
                            {(showAllPresent ? presentIds : presentIds.slice(0, PRESENT_LIMIT)).map((id, index, array) => {
                                const user = resolveUser(id);
                                const isLate = lateIds.includes(id);
                                return (
                                    <Space key={id} size={6} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                        <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                        <Text style={{ fontSize: 13, color: '#374151' }}>
                                            {user?.name || `Thành viên #${id}`}
                                            {isLate && <Text type="warning" style={{ fontSize: 11, marginLeft: 2 }}>(muộn)</Text>}
                                            {(index < array.length - 1 || otherPresent.length > 0) && <span style={{ color: '#9ca3af', marginLeft: 4 }}>,</span>}
                                        </Text>
                                    </Space>
                                );
                            })}
                            
                            {/* Other members */}
                            {otherPresent.map((name, index) => (
                                <Text key={`other-${index}`} style={{ fontSize: 13, color: '#374151', fontStyle: 'italic' }}>
                                    {name}
                                    {index < otherPresent.length - 1 && <span style={{ color: '#9ca3af', marginLeft: 4 }}>,</span>}
                                </Text>
                            ))}

                            {!showAllPresent && presentIds.length > PRESENT_LIMIT && (
                                <Typography.Link 
                                    style={{ fontSize: 12, marginLeft: 8 }}
                                    onClick={() => setShowAllPresent(true)}
                                >
                                    Xem thêm...
                                </Typography.Link>
                            )}
                            {showAllPresent && presentIds.length > PRESENT_LIMIT && (
                                <Typography.Link 
                                    style={{ fontSize: 12, marginLeft: 8 }}
                                    onClick={() => setShowAllPresent(false)}
                                >
                                    Thu gọn
                                </Typography.Link>
                            )}
                            {presentIds.length === 0 && otherPresent.length === 0 && <Text type="secondary" italic style={{ fontSize: 13 }}>Không có dữ liệu</Text>}
                        </div>
                    </div>

                    <div>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <UserDeleteOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                                <Text strong style={{ color: '#ef4444', fontSize: 13, letterSpacing: '0.02em' }}>VẮNG MẶT ({absentIds.length}):</Text>
                            </Space>
                            <Typography.Link 
                                style={{ fontSize: 12, fontWeight: 500 }}
                                onClick={() => setIsAttendanceModalOpen(true)}
                            >
                                Xem chi tiết
                            </Typography.Link>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
                            {(showAllAbsent ? absentIds : absentIds.slice(0, ABSENT_LIMIT)).map((id, index, array) => {
                                const user = resolveUser(id);
                                return (
                                    <Space key={id} size={6} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                        <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                        <Text key={id} style={{ fontSize: 13, color: '#374151' }}>
                                            {user?.name || `Thành viên #${id}`}
                                            {index < array.length - 1 && <span style={{ color: '#9ca3af', marginLeft: 4 }}>,</span>}
                                        </Text>
                                    </Space>
                                );
                            })}

                            {/* Other members */}
                            {otherAbsent.map((name, index) => (
                                <Text key={`other-absent-${index}`} style={{ fontSize: 13, color: '#374151', fontStyle: 'italic' }}>
                                    {name}
                                    {index < otherAbsent.length - 1 && <span style={{ color: '#9ca3af', marginLeft: 4 }}>,</span>}
                                </Text>
                            ))}
                            
                            {!showAllAbsent && absentIds.length > ABSENT_LIMIT && (
                                <Typography.Link 
                                    style={{ fontSize: 12, marginLeft: 8 }}
                                    onClick={() => setShowAllAbsent(true)}
                                >
                                    Xem thêm...
                                </Typography.Link>
                            )}
                            {showAllAbsent && absentIds.length > ABSENT_LIMIT && (
                                <Typography.Link 
                                    style={{ fontSize: 12, marginLeft: 8 }}
                                    onClick={() => setShowAllAbsent(false)}
                                >
                                    Thu gọn
                                </Typography.Link>
                            )}
                            {absentIds.length === 0 && <Text type="secondary" italic style={{ fontSize: 13 }}>Không vắng ai</Text>}
                        </div>
                    </div>
                </div>

                <Divider orientation="left" style={{ fontSize: 11, color: '#94a3b8', margin: '32px 0 20px', letterSpacing: '0.05em' }}>NỘI DUNG CHI TIẾT</Divider>
                
                {record.minutesContent ? (
                    <div style={{ marginBottom: 24 }}>
                        <Space style={{ marginBottom: 12 }}><FileTextOutlined style={{ color: '#64748b' }} /><Text strong style={{ color: '#374151' }}>Nội dung biên bản</Text></Space>
                        <div 
                            style={{ 
                                fontSize: 15, 
                                lineHeight: 1.8, 
                                color: '#111827',
                                padding: '4px 16px',
                                borderLeft: '2px solid #e5e7eb',
                                marginLeft: '4px'
                            }} 
                            dangerouslySetInnerHTML={{ __html: record.minutesContent }} 
                        />
                    </div>
                ) : null}

                {record.opinions && (
                    <div style={{ marginBottom: 24 }}>
                        <Space style={{ marginBottom: 12 }}><MessageOutlined style={{ color: '#64748b' }} /><Text strong style={{ color: '#374151' }}>Ý kiến đóng góp</Text></Space>
                        <Paragraph style={{ padding: '4px 16px', margin: 0, whiteSpace: 'pre-wrap', color: '#111827', fontSize: 14, borderLeft: '2px solid #e5e7eb', marginLeft: '4px' }}>
                            {record.opinions}
                        </Paragraph>
                    </div>
                )}

                {record.proposals && (
                    <div style={{ marginBottom: 24 }}>
                        <Space style={{ marginBottom: 12 }}><BulbOutlined style={{ color: '#64748b' }} /><Text strong style={{ color: '#374151' }}>Kiến nghị & Đề xuất</Text></Space>
                        <Paragraph style={{ padding: '4px 16px', margin: 0, whiteSpace: 'pre-wrap', color: '#111827', fontSize: 14, borderLeft: '2px solid #e5e7eb', marginLeft: '4px' }}>
                            {record.proposals}
                        </Paragraph>
                    </div>
                )}

                {!record.minutesContent && !record.opinions && !record.proposals && (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text type="secondary">Nội dung biên bản chưa được cập nhật</Text>}
                    />
                )}

                <div style={{ marginTop: 40, textAlign: 'right', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    ID: {record.id} • Cập nhật lần cuối: {record.updatedAt ? dayjs(record.updatedAt).format('HH:mm DD/MM/YYYY') : '--'}
                </div>
            </div>

            {/* Attendance Details Modal */}
            <MeetingAttendanceModal
                open={isAttendanceModalOpen}
                onCancel={() => setIsAttendanceModalOpen(false)}
                record={record}
                users={users}
                onSaveAttendance={async () => {
                    // This modal is read-only in this view
                }}
            />
        </Modal>
    );
};

export default MeetingMinutesViewModal;
