import React, { useEffect, useState, useCallback } from 'react';
import { 
    Modal, Form, Input, Row, Col, 
    Button, Space, Typography, Tag, message,
    Divider, Avatar, List, Empty
} from 'antd';
import { 
    SaveOutlined, 
    CheckCircleOutlined, 
    FileDoneOutlined,
    UserOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TeamOutlined,
    UserDeleteOutlined,
    EditOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import TinyEditor from '@/components/common/TinyEditor';
import { UserSelect } from '@/components/common';
import MemberSelectionModal from './MemberSelectionModal';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface MeetingMinutesModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
    currentUser: User | null | undefined;
    onSave: (id: number, data: any) => Promise<void>;
    isSubmitting?: boolean;
}

const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({
    open,
    onCancel,
    record,
    users,
    currentUser,
    onSave,
    isSubmitting = false
}) => {
    const [form] = Form.useForm();
    const [presentIds, setPresentIds] = useState<number[]>([]);
    const [absentIds, setAbsentIds] = useState<number[]>([]);
    const [memberModalConfig, setMemberModalConfig] = useState<{ open: boolean, type: 'present' | 'absent', title: string }>({
        open: false,
        type: 'present',
        title: ''
    });

    useEffect(() => {
        if (open && record) {
            const currentPresentIds = record.confirmations
                ?.filter(c => c.attendanceStatus === 'present' || c.attendanceStatus === 'late')
                ?.map(c => Number(c.userId)) || [];
            
            const currentAbsentIds = record.confirmations
                ?.filter(c => c.attendanceStatus === 'absent')
                ?.map(c => Number(c.userId)) || [];

            setPresentIds(currentPresentIds);
            setAbsentIds(currentAbsentIds);

            form.setFieldsValue({
                meetingAt: dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY'),
                location: record.location,
                chairpersonId: record.chairpersonId || record.createdBy || currentUser?.id,
                secretaryId: record.secretaryId || currentUser?.id,
                minutesContent: record.minutesContent || '',
                opinions: record.opinions || '',
                proposals: record.proposals || '',
                minutesStatus: record.minutesStatus || 'none'
            });
        }
    }, [open, record, form, currentUser]);

    const handleSave = async (status: 'draft' | 'submitted') => {
        try {
            const values = await form.validateFields();
            if (record) {
                await onSave(record.id, {
                    ...values,
                    presentIds,
                    absentIds,
                    minutesStatus: status
                });
                message.success(status === 'submitted' ? 'Đã kết thúc cuộc họp và lưu biên bản' : 'Đã lưu nháp biên bản');
                if (status === 'submitted') onCancel();
            }
        } catch (error) {
            console.error("Save minutes failed:", error);
        }
    };

    const handleMemberSelect = (userIds: number[]) => {
        if (memberModalConfig.type === 'present') {
            setPresentIds(userIds);
            setAbsentIds(prev => prev.filter(id => !userIds.includes(Number(id))));
        } else {
            setAbsentIds(userIds);
            setPresentIds(prev => prev.filter(id => !userIds.includes(Number(id))));
        }
    };

    const renderMemberItem = useCallback((userId: number) => {
        const user = users.find(u => String(u.id) === String(userId));
        const attendanceInfo = record?.confirmations?.find(c => String(c.userId) === String(userId));
        return (
            <List.Item style={{ padding: '6px 12px', borderBottom: '1px solid #f8f9fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Space size={10}>
                        <Avatar size={24} src={user?.avatar} icon={<UserOutlined />} />
                        <Space size={4}>
                            <Text style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>{user?.name || `Thành viên #${userId}`}</Text>
                            {user?.studentId && <Text type="secondary" style={{ fontSize: 12 }}>· {user.studentId}</Text>}
                        </Space>
                    </Space>
                    <Space size={4}>
                        {user?.department && (
                            <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px', background: '#f0f0f0', border: 'none' }}>
                                {user.department}
                            </Tag>
                        )}
                        {attendanceInfo && attendanceInfo.attendanceStatus === 'late' && (
                            <Tag color="warning" style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px', border: 'none' }}>MUỘN</Tag>
                        )}
                    </Space>
                </div>
            </List.Item>
        );
    }, [users, record]);

    const statusConfig = {
        none: { color: 'default', text: 'Chưa khởi tạo' },
        draft: { color: 'warning', text: 'Đang soạn thảo' },
        submitted: { color: 'success', text: 'Đã hoàn thành' }
    };

    const currentStatus = record?.minutesStatus || 'none';

    return (
        <Modal
            title={
                <Space>
                    <FileDoneOutlined style={{ color: 'var(--primary-color)' }} />
                    <Title level={5} style={{ margin: 0 }}>Ghi biên bản họp: {record?.title}</Title>
                    <Tag color={statusConfig[currentStatus as keyof typeof statusConfig].color}>{statusConfig[currentStatus as keyof typeof statusConfig].text}</Tag>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            width={1200}
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={isSubmitting} style={{ borderRadius: 8 }}>
                    Đóng
                </Button>,
                <Button 
                    key="save" 
                    icon={<SaveOutlined />} 
                    onClick={() => handleSave('draft')}
                    loading={isSubmitting}
                    style={{ borderRadius: 8 }}
                >
                    Lưu nháp
                </Button>,
                <Button 
                    key="submit" 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    onClick={() => handleSave('submitted')}
                    loading={isSubmitting}
                    style={{ background: 'var(--primary-color)', borderColor: 'var(--primary-color)', borderRadius: 8 }}
                >
                    Kết thúc cuộc họp & Lưu biên bản
                </Button>
            ]}
            centered
            className="meeting-minutes-modal"
        >
            <style>{`
                .meeting-minutes-modal .ant-form-item-label label {
                    font-weight: 600;
                    color: #434343;
                    font-size: 13px;
                }
                .meeting-minutes-modal .member-list-container {
                    border: 1px solid #f0f0f0;
                    border-radius: 8px;
                    background: #ffffff;
                    height: 250px;
                    overflow-y: auto;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .meeting-minutes-modal .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .meeting-minutes-modal .ant-divider-inner-text {
                    color: var(--primary-color);
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
            `}</style>
            
            <Form
                form={form}
                layout="vertical"
                className="minutes-form"
                style={{ marginTop: 12 }}
            >
                <Row gutter={20}>
                    <Col span={6}>
                        <Form.Item label={<Space><CalendarOutlined /><span>Thời gian</span></Space>} name="meetingAt">
                            <Input disabled variant="filled" style={{ borderRadius: 8, background: '#f8f9fa' }} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item label={<Space><EnvironmentOutlined /><span>Địa điểm</span></Space>} name="location">
                            <Input disabled variant="filled" style={{ borderRadius: 8, background: '#f8f9fa' }} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item 
                            label={<Space><UserOutlined /><span>Chủ trì</span></Space>} 
                            name="chairpersonId"
                            rules={[{ required: true, message: 'Vui lòng chọn người chủ trì' }]}
                        >
                            <UserSelect users={users} placeholder="Chọn chủ trì" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item 
                            label={<Space><UserOutlined /><span>Thư ký</span></Space>} 
                            name="secretaryId"
                            rules={[{ required: true, message: 'Vui lòng chọn thư ký' }]}
                        >
                            <UserSelect users={users} placeholder="Chọn thư ký" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={20} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                        <div className="section-header">
                            <Space>
                                <TeamOutlined style={{ color: '#52c41a' }} />
                                <Text strong style={{ fontSize: 14 }}>Có mặt ({presentIds.length})</Text>
                            </Space>
                            <Button 
                                type="link" 
                                size="small" 
                                icon={<EditOutlined />}
                                onClick={() => setMemberModalConfig({ open: true, type: 'present', title: 'Danh sách thành viên có mặt' })}
                            >
                                Điều chỉnh
                            </Button>
                        </div>
                        <div className="member-list-container">
                            <List
                                size="small"
                                dataSource={presentIds}
                                renderItem={renderMemberItem}
                                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thành viên" /> }}
                            />
                        </div>
                    </Col>
                    <Col span={12}>
                        <div className="section-header">
                            <Space>
                                <UserDeleteOutlined style={{ color: '#ff4d4f' }} />
                                <Text strong style={{ fontSize: 14 }}>Vắng mặt ({absentIds.length})</Text>
                            </Space>
                            <Button 
                                type="link" 
                                size="small" 
                                icon={<EditOutlined />}
                                onClick={() => setMemberModalConfig({ open: true, type: 'absent', title: 'Danh sách thành viên vắng mặt' })}
                            >
                                Điều chỉnh
                            </Button>
                        </div>
                        <div className="member-list-container">
                            <List
                                size="small"
                                dataSource={absentIds}
                                renderItem={renderMemberItem}
                                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ai vắng" /> }}
                            />
                        </div>
                    </Col>
                </Row>

                <Divider orientation="left" style={{ margin: '12px 0' }}>
                    <Space>
                        <FileTextOutlined style={{ color: 'var(--primary-color)' }} />
                        <Text strong style={{ fontSize: 13 }}>NỘI DUNG BIÊN BẢN CHI TIẾT</Text>
                    </Space>
                </Divider>

                <Form.Item name="minutesContent" noStyle>
                    <TinyEditor 
                        height={350} 
                        placeholder="Nhập nội dung biên bản cuộc họp chi tiết tại đây..." 
                    />
                </Form.Item>

                <Row gutter={20} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Form.Item label="Ý kiến của sinh viên hoặc tập thể" name="opinions" rules={[{ required: true, message: 'Vui lòng nhập ý kiến của sinh viên hoặc tập thể' }]}>
                            <TextArea rows={3} placeholder="Ghi nhận ý kiến đóng góp..." style={{ borderRadius: 8 }} />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item label="Kiến nghị, đề xuất (nếu có)" name="proposals">
                            <TextArea rows={3} placeholder="Các kiến nghị, đề xuất sau cuộc họp..." style={{ borderRadius: 8 }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>

            <MemberSelectionModal
                open={memberModalConfig.open}
                title={memberModalConfig.title}
                users={users}
                selectedIds={memberModalConfig.type === 'present' ? presentIds : absentIds}
                onCancel={() => setMemberModalConfig(prev => ({ ...prev, open: false }))}
                onSelect={handleMemberSelect}
            />
        </Modal>
    );
};

export default MeetingMinutesModal;
