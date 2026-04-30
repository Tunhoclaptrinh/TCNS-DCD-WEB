import React, { useEffect, useMemo } from 'react';
import { 
    Modal, Form, Input, Row, Col, Select, 
    Button, Space, Typography, Tag, message,
    Divider, List, Popover
} from 'antd';
import { 
    SaveOutlined, 
    CheckCircleOutlined, 
    FileDoneOutlined,
    UserOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TeamOutlined,
    UserDeleteOutlined
} from '@ant-design/icons';
import { Meeting } from '@/services/meeting.service';
import { User } from '@/types';
import TinyEditor from '@/components/common/TinyEditor';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface MeetingMinutesModalProps {
    open: boolean;
    onCancel: () => void;
    record: Meeting | null;
    users: User[];
    onSave: (id: number, data: any) => Promise<void>;
    isSubmitting?: boolean;
}

const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({
    open,
    onCancel,
    record,
    users,
    onSave,
    isSubmitting = false
}) => {
    const [form] = Form.useForm();

    const participants = useMemo(() => {
        if (!record) return [];
        return users.filter(u => record.participantIds.includes(u.id));
    }, [record, users]);

    const presentMembers = useMemo(() => {
        if (!record) return [];
        return record.confirmations
            ?.filter(c => c.status === 'present' || c.status === 'accepted')
            ?.map(c => users.find(u => u.id === c.userId))
            ?.filter(Boolean) as User[];
    }, [record, users]);

    const absentMembers = useMemo(() => {
        if (!record) return [];
        const presentIds = record.confirmations
            ?.filter(c => c.status === 'present' || c.status === 'accepted')
            ?.map(c => c.userId) || [];
        return participants.filter(p => !presentIds.includes(p.id));
    }, [record, participants]);

    useEffect(() => {
        if (open && record) {
            form.setFieldsValue({
                meetingAt: dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY'),
                location: record.location,
                chairpersonId: record.chairpersonId || record.createdBy,
                secretaryId: record.secretaryId,
                presentCount: presentMembers.length,
                absentCount: absentMembers.length,
                minutesContent: record.minutesContent || '',
                opinions: record.opinions || '',
                proposals: record.proposals || '',
                minutesStatus: record.minutesStatus || 'none'
            });
        }
    }, [open, record, form, presentMembers, absentMembers]);

    const handleSave = async (status: 'draft' | 'submitted') => {
        try {
            const values = await form.validateFields();
            if (record) {
                await onSave(record.id, {
                    ...values,
                    minutesStatus: status
                });
                message.success(status === 'submitted' ? 'Đã kết thúc cuộc họp và lưu biên bản' : 'Đã lưu nháp biên bản');
                if (status === 'submitted') onCancel();
            }
        } catch (error) {
            console.error("Save minutes failed:", error);
        }
    };

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
                    <Tag color={statusConfig[currentStatus].color}>{statusConfig[currentStatus].text}</Tag>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={isSubmitting}>
                    Đóng
                </Button>,
                <Button 
                    key="save" 
                    icon={<SaveOutlined />} 
                    onClick={() => handleSave('draft')}
                    loading={isSubmitting}
                >
                    Lưu nháp
                </Button>,
                <Button 
                    key="submit" 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    onClick={() => handleSave('submitted')}
                    loading={isSubmitting}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                    Kết thúc cuộc họp & Lưu biên bản
                </Button>
            ]}
            centered
            className="meeting-minutes-modal"
        >
            <style>{`
                .meeting-minutes-modal .ant-form-item-label label {
                    font-weight: 500;
                    color: #595959;
                }
                .meeting-minutes-modal .ant-divider-inner-text {
                    font-size: 16px;
                }
            `}</style>
            <Form
                form={form}
                layout="vertical"
                className="minutes-form"
                style={{ marginTop: 12 }}
            >
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={<Space><CalendarOutlined /><span>Thời gian</span></Space>} name="meetingAt">
                            <Input disabled variant="filled" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={<Space><EnvironmentOutlined /><span>Địa điểm</span></Space>} name="location">
                            <Input disabled variant="filled" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item 
                            label={<Space><UserOutlined /><span>Chủ trì</span></Space>} 
                            name="chairpersonId"
                            rules={[{ required: true, message: 'Vui lòng chọn người chủ trì' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Chọn chủ trì"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={users.map(u => ({ label: `${u.name} (${u.studentId || u.id})`, value: u.id }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item 
                            label={<Space><UserOutlined /><span>Thư ký</span></Space>} 
                            name="secretaryId"
                            rules={[{ required: true, message: 'Vui lòng chọn thư ký' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Chọn thư ký"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={users.map(u => ({ label: `${u.name} (${u.studentId || u.id})`, value: u.id }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={<Space><TeamOutlined /><span>Có mặt</span></Space>} name="presentCount">
                            <Input 
                                suffix={
                                    <Popover 
                                        title="Danh sách có mặt" 
                                        content={
                                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                {presentMembers.length > 0 ? (
                                                    <List
                                                        size="small"
                                                        dataSource={presentMembers}
                                                        renderItem={(u: User) => <List.Item>{u.name}</List.Item>}
                                                    />
                                                ) : <Text type="secondary">Chưa có ai điểm danh</Text>}
                                            </div>
                                        }
                                        trigger="click"
                                    >
                                        <Button type="link" size="small" style={{ padding: 0 }}>Sinh viên</Button>
                                    </Popover>
                                } 
                                readOnly 
                                variant="filled"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={<Space><UserDeleteOutlined /><span>Vắng mặt</span></Space>} name="absentCount">
                            <Input 
                                suffix={
                                    <Popover 
                                        title="Danh sách vắng mặt" 
                                        content={
                                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                {absentMembers.length > 0 ? (
                                                    <List
                                                        size="small"
                                                        dataSource={absentMembers}
                                                        renderItem={(u: User) => <List.Item>{u.name}</List.Item>}
                                                    />
                                                ) : <Text type="secondary">Không có ai vắng mặt</Text>}
                                            </div>
                                        }
                                        trigger="click"
                                    >
                                        <Button type="link" size="small" style={{ padding: 0 }}>Sinh viên</Button>
                                    </Popover>
                                } 
                                readOnly 
                                variant="filled"
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" style={{ margin: '12px 0' }}>
                    <Text strong style={{ color: 'var(--primary-color)' }}>Nội dung biên bản</Text>
                </Divider>

                <Form.Item name="minutesContent" noStyle>
                    <TinyEditor 
                        height={400} 
                        placeholder="Nhập nội dung biên bản cuộc họp chi tiết tại đây..." 
                    />
                </Form.Item>

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={12}>
                        <Form.Item label="Ý kiến của sinh viên hoặc tập thể" name="opinions">
                            <TextArea rows={4} placeholder="Ghi nhận ý kiến đóng góp..." />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Kiến nghị, đề xuất (nếu có)" name="proposals">
                            <TextArea rows={4} placeholder="Các kiến nghị, đề xuất sau cuộc họp..." />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default MeetingMinutesModal;
