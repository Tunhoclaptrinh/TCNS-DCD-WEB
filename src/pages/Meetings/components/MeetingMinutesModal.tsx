import React, { useEffect, useMemo, useState } from 'react';
import { 
    Modal, Form, Input, Row, Col, 
    Button, Space, Typography, Tag, message,
    Divider, Avatar, List, Empty,
    Popover, AutoComplete
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
    FileTextOutlined,
    PlusOutlined
} from '@ant-design/icons';
import './MeetingMinutesModal.less';
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
    const [chairpersonIds, setChairpersonIds] = useState<number[]>([]);
    const [secretaryIds, setSecretaryIds] = useState<number[]>([]);
    const [memberModalConfig, setMemberModalConfig] = useState<{ open: boolean, type: 'present' | 'absent' | 'chairperson' | 'secretary', title: string }>({
        open: false,
        type: 'present',
        title: ''
    });
    const [showAllPresent, setShowAllPresent] = useState(false);
    const [showAllAbsent, setShowAllAbsent] = useState(false);
    
    // Extras stored in DB
    const [otherPresent, setOtherPresent] = useState<string[]>([]);
    const [otherAbsent, setOtherAbsent] = useState<string[]>([]);
    const [otherChairpersons, setOtherChairpersons] = useState<string[]>([]);
    const [otherSecretaries, setOtherSecretaries] = useState<string[]>([]);
    const [guestHistory, setGuestHistory] = useState<string[]>([]);

    const meetingParticipants = useMemo(() => {
        if (!record?.participantIds) return users;
        return users.filter(u => record.participantIds?.includes(Number(u.id)));
    }, [users, record]);

    useEffect(() => {
        if (open && record) {
            // Load attendance
            const currentPresentIds = record.confirmations
                ?.filter(c => c.attendanceStatus === 'present' || c.attendanceStatus === 'late')
                ?.map(c => Number(c.userId)) || [];
            
            const currentAbsentIds = record.confirmations
                ?.filter(c => c.attendanceStatus === 'absent')
                ?.map(c => Number(c.userId)) || [];

            setPresentIds(currentPresentIds);
            setAbsentIds(currentAbsentIds);
            setChairpersonIds(record.chairpersonIds || (record.chairpersonId ? [Number(record.chairpersonId)] : []));
            setSecretaryIds(record.secretaryIds || (record.secretaryId ? [Number(record.secretaryId)] : []));

            // Load extras from record (DB)
            setOtherPresent(record.otherPresent || []);
            setOtherAbsent(record.otherAbsent || []);
            setOtherChairpersons(record.otherChairpersons || (record.otherChairperson ? [record.otherChairperson] : []));
            setOtherSecretaries(record.otherSecretaries || (record.otherSecretary ? [record.otherSecretary] : []));

            form.setFieldsValue({
                meetingAtDisplay: dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY'),
                location: record.location,
                minutesContent: record.minutesContent || '',
                opinions: record.opinions || '',
                proposals: record.proposals || '',
                minutesStatus: record.minutesStatus || 'none'
            });
        }

        // Load guest history
        const history = localStorage.getItem('meeting_guest_history');
        if (history) {
            try {
                setGuestHistory(JSON.parse(history));
            } catch (e) {
                console.error("Failed to parse guest history", e);
            }
        }
    }, [open, record, form, currentUser]);

    const addToGuestHistory = (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;
        
        setGuestHistory(prev => {
            const newHistory = [trimmedName, ...prev.filter(n => n !== trimmedName)].slice(0, 50);
            localStorage.setItem('meeting_guest_history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const handleSave = async (status: 'draft' | 'submitted') => {
        try {
            const values = await form.validateFields();
            if (record) {
                const { meetingAtDisplay: _ignored, ...submitValues } = values;
                const meetingStatus = status === 'submitted' ? 'completed' : undefined;
                
                await onSave(record.id, {
                    ...submitValues,
                    chairpersonIds,
                    otherChairpersons,
                    secretaryIds,
                    otherSecretaries,
                    presentIds,
                    absentIds,
                    otherPresent,
                    otherAbsent,
                    minutesStatus: status,
                    ...(meetingStatus ? { status: meetingStatus } : {}),
                });
                message.success(status === 'submitted' ? 'Đã kết thúc cuộc họp và lưu biên bản' : 'Đã lưu nháp biên bản');
                onCancel();
            }
        } catch (error) {
            console.error("Save minutes failed:", error);
        }
    };

    const handleMemberSelect = (userIds: number[]) => {
        if (memberModalConfig.type === 'present') {
            setPresentIds(userIds);
            setAbsentIds(prev => prev.filter(id => !userIds.includes(Number(id))));
        } else if (memberModalConfig.type === 'absent') {
            setAbsentIds(userIds);
            setPresentIds(prev => prev.filter(id => !userIds.includes(Number(id))));
        } else if (memberModalConfig.type === 'chairperson') {
            setChairpersonIds(userIds);
        } else if (memberModalConfig.type === 'secretary') {
            setSecretaryIds(userIds);
        }
    };


    const statusConfig = {
        none: { color: 'default', text: 'Chưa khởi tạo' },
        draft: { color: 'warning', text: 'Đang soạn thảo' },
        submitted: { color: 'success', text: 'Đã hoàn thành' }
    };

    const currentStatus = record?.minutesStatus || 'none';
    const lastEditor = record?.updatedBy ? users.find(u => String(u.id) === String(record.updatedBy)) : null;
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

    return (
        <Modal
            zIndex={1100}
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '96%' }}>
                    <Space size={12}>
                        <FileDoneOutlined style={{ color: 'var(--primary-color)' }} />
                        <Title level={5} style={{ margin: 0 }}>Ghi biên bản: {record?.title}</Title>
                        <Tag color={statusConfig[currentStatus as keyof typeof statusConfig].color}>{statusConfig[currentStatus as keyof typeof statusConfig].text}</Tag>
                    </Space>
                    {(record?.updatedAt || record?.updatedBy) && (
                        <Typography.Link 
                            type="secondary" 
                            style={{ fontSize: 11, fontStyle: 'italic' }}
                            onClick={() => setIsHistoryModalVisible(true)}
                        >
                            <EditOutlined style={{ marginRight: 4 }} />
                            Cập nhật lần cuối: {record.updatedAt ? dayjs(record.updatedAt).format('HH:mm DD/MM/YYYY') : '--'} 
                            {lastEditor ? ` bởi ${lastEditor.name}` : ''}
                        </Typography.Link>
                    )}
                </div>
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
                    {record?.minutesStatus === 'submitted' ? 'Cập nhật biên bản' : 'Kết thúc cuộc họp & Lưu biên bản'}
                </Button>
            ]}
            centered
            className="meeting-minutes-modal"
        >
            <Form form={form} layout="vertical" className="meeting-minutes-form" style={{ marginTop: 12 }}>
                <Divider orientation="left">
                    <Space>
                        <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
                        <Text strong style={{ fontSize: 13 }}>THÔNG TIN CHUNG</Text>
                    </Space>
                </Divider>
                <Row gutter={[24, 24]}>
                    <Col span={12}>
                        <Form.Item label={<Space><CalendarOutlined style={{ color: 'var(--primary-color)' }} /><span>Thời gian</span></Space>} name="meetingAtDisplay">
                            <Input disabled variant="filled" style={{ borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={<Space><EnvironmentOutlined style={{ color: 'var(--primary-color)' }} /><span>Địa điểm</span></Space>} name="location">
                            <Input disabled variant="filled" style={{ borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={[40, 24]} style={{ marginBottom: 32 }}>
                    <Col span={12}>
                        <div className="section-header">
                            <Space>
                                <UserOutlined style={{ color: 'var(--primary-color)' }} />
                                <Text strong style={{ fontSize: 13 }}>CHỦ TRÌ</Text>
                            </Space>
                            <Space size={8}>
                                <Popover
                                    content={
                                        <div style={{ padding: 4 }}>
                                            <AutoComplete
                                                style={{ width: 250 }}
                                                options={guestHistory.map(name => ({ value: name }))}
                                                filterOption={(inputValue, option) =>
                                                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                                }
                                            >
                                                <Input 
                                                    placeholder="Nhập tên chủ trì ngoài hệ thống..." 
                                                    autoFocus
                                                    onPressEnter={(e: any) => {
                                                        const val = e.target.value.trim();
                                                        if (val && !otherChairpersons.includes(val)) {
                                                            setOtherChairpersons(prev => [...prev, val]);
                                                            addToGuestHistory(val);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </AutoComplete>
                                        </div>
                                    }
                                    title="Thêm chủ trì ngoài hệ thống"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button type="dashed" size="small" icon={<PlusOutlined />} style={{ borderRadius: 6, fontSize: 11, height: 24 }}>Thêm khách</Button>
                                </Popover>
                                <Popover
                                    content={
                                        <div style={{ width: 300 }}>
                                            <UserSelect 
                                                users={meetingParticipants} 
                                                mode="multiple"
                                                placeholder="Tìm và chọn thành viên..." 
                                                onChange={(ids) => setChairpersonIds(ids)}
                                                value={chairpersonIds}
                                            />
                                        </div>
                                    }
                                    title="Chọn thành viên chủ trì"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button 
                                        type="link" 
                                        size="small" 
                                        icon={<EditOutlined />} 
                                        style={{ fontSize: 11, height: 24 }}
                                    >
                                        Điều chỉnh
                                    </Button>
                                </Popover>
                            </Space>
                        </div>
                        <div className="attendance-display-box">
                            {chairpersonIds.map((id, index, arr) => {
                                const user = users.find(u => String(u.id) === String(id));
                                return (
                                    <div key={id} className="attendance-item">
                                        <Space size={4}>
                                            <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                            <Text style={{ fontSize: 13, color: '#374151' }}>{user?.name || `TV #${id}`}</Text>
                                        </Space>
                                        {(index < arr.length - 1 || otherChairpersons.length > 0) && <span className="comma">,</span>}
                                    </div>
                                );
                            })}
                            {otherChairpersons.map((name, i) => (
                                <div key={`other-chair-${i}`} className="attendance-item">
                                    <Popover
                                        content={<Button danger size="small" onClick={() => setOtherChairpersons(prev => prev.filter((_, idx) => idx !== i))}>Xóa chủ trì này</Button>}
                                        trigger="click"
                                    >
                                        <Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', cursor: 'pointer' }}>{name}</Text>
                                    </Popover>
                                    {i < otherChairpersons.length - 1 && <span className="comma">,</span>}
                                </div>
                            ))}
                            {chairpersonIds.length === 0 && otherChairpersons.length === 0 && <span className="empty-text">Chưa xác định chủ trì</span>}
                        </div>
                    </Col>

                    <Col span={12}>
                        <div className="section-header">
                            <Space>
                                <FileDoneOutlined style={{ color: 'var(--primary-color)' }} />
                                <Text strong style={{ fontSize: 13 }}>THƯ KÝ</Text>
                            </Space>
                            <Space size={8}>
                                <Popover
                                    content={
                                        <div style={{ padding: 4 }}>
                                            <AutoComplete
                                                style={{ width: 250 }}
                                                options={guestHistory.map(name => ({ value: name }))}
                                                filterOption={(inputValue, option) =>
                                                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                                }
                                            >
                                                <Input 
                                                    placeholder="Nhập tên thư ký ngoài hệ thống..." 
                                                    autoFocus
                                                    onPressEnter={(e: any) => {
                                                        const val = e.target.value.trim();
                                                        if (val && !otherSecretaries.includes(val)) {
                                                            setOtherSecretaries(prev => [...prev, val]);
                                                            addToGuestHistory(val);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </AutoComplete>
                                        </div>
                                    }
                                    title="Thêm thư ký ngoài hệ thống"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button type="dashed" size="small" icon={<PlusOutlined />} style={{ borderRadius: 6, fontSize: 11, height: 24 }}>Thêm khách</Button>
                                </Popover>
                                <Popover
                                    content={
                                        <div style={{ width: 300 }}>
                                            <UserSelect 
                                                users={meetingParticipants} 
                                                mode="multiple"
                                                placeholder="Tìm và chọn thư ký..." 
                                                onChange={(ids) => setSecretaryIds(ids)}
                                                value={secretaryIds}
                                            />
                                        </div>
                                    }
                                    title="Chọn thư ký"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button 
                                        type="link" 
                                        size="small" 
                                        icon={<EditOutlined />} 
                                        style={{ fontSize: 11, height: 24 }}
                                    >
                                        Điều chỉnh
                                    </Button>
                                </Popover>
                            </Space>
                        </div>
                        <div className="attendance-display-box">
                            {secretaryIds.map((id, index, arr) => {
                                const user = users.find(u => String(u.id) === String(id));
                                return (
                                    <div key={id} className="attendance-item">
                                        <Space size={4}>
                                            <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                            <Text style={{ fontSize: 13, color: '#374151' }}>{user?.name || `TV #${id}`}</Text>
                                        </Space>
                                        {(index < arr.length - 1 || otherSecretaries.length > 0) && <span className="comma">,</span>}
                                    </div>
                                );
                            })}
                            {otherSecretaries.map((name, i) => (
                                <div key={`other-sec-${i}`} className="attendance-item">
                                    <Popover
                                        content={<Button danger size="small" onClick={() => setOtherSecretaries(prev => prev.filter((_, idx) => idx !== i))}>Xóa thư ký này</Button>}
                                        trigger="click"
                                    >
                                        <Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', cursor: 'pointer' }}>{name}</Text>
                                    </Popover>
                                    {i < otherSecretaries.length - 1 && <span className="comma">,</span>}
                                </div>
                            ))}
                            {secretaryIds.length === 0 && otherSecretaries.length === 0 && <span className="empty-text">Chưa xác định thư ký</span>}
                        </div>
                    </Col>
                </Row>

                <Row gutter={[0, 24]} style={{ marginBottom: 20 }}>
                    <Col span={24}>
                        <div className="section-header">
                            <Space>
                                <TeamOutlined style={{ color: '#16a34a' }} />
                                <Text strong style={{ fontSize: 14, color: '#16a34a' }}>CÓ MẶT ({presentIds.length + otherPresent.length})</Text>
                            </Space>
                            <Space size={8}>
                                <Popover
                                    content={
                                        <div style={{ padding: 4 }}>
                                            <AutoComplete
                                                style={{ width: 250 }}
                                                options={guestHistory.map(name => ({ value: name }))}
                                                filterOption={(inputValue, option) =>
                                                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                                }
                                                onSelect={(val) => {
                                                    if (val && !otherPresent.includes(val)) {
                                                        setOtherPresent(prev => [...prev, val]);
                                                    }
                                                }}
                                            >
                                                <Input.Search
                                                    placeholder="Nhập tên hoặc chọn từ lịch sử..." 
                                                    enterButton="Thêm"
                                                    onSearch={(val) => {
                                                        const name = val.trim();
                                                        if (name && !otherPresent.includes(name)) {
                                                            setOtherPresent(prev => [...prev, name]);
                                                            addToGuestHistory(name);
                                                        }
                                                    }}
                                                />
                                            </AutoComplete>
                                        </div>
                                    }
                                    title="Thêm khách mời ngoài hệ thống"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button 
                                        type="dashed" 
                                        size="small" 
                                        icon={<PlusOutlined />} 
                                        style={{ borderRadius: 6, fontSize: 12, color: '#f59e0b', borderColor: '#f59e0b' }}
                                    >
                                        Thêm khách
                                    </Button>
                                </Popover>
                                <Button 
                                    type="link" 
                                    size="small" 
                                    icon={<EditOutlined />}
                                    onClick={() => setMemberModalConfig({ open: true, type: 'present', title: 'Danh sách thành viên có mặt' })}
                                >
                                    Điều chỉnh
                                </Button>
                            </Space>
                        </div>
                        <div className={`attendance-display-box ${!showAllPresent ? 'collapsed' : ''}`}>
                            {/* Thành viên trong hệ thống */}
                            {presentIds.map((id, index, arr) => {
                                const user = users.find(u => String(u.id) === String(id));
                                const isLate = record?.confirmations?.find(c => String(c.userId) === String(id))?.attendanceStatus === 'late';
                                return (
                                    <div key={id} className="attendance-item">
                                        <Space size={4}>
                                            <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                            <Text style={{ fontSize: 13, color: '#374151' }}>
                                                {user?.name || `TV #${id}`}
                                                {isLate && <Text type="warning" style={{ fontSize: 11, marginLeft: 2 }}>(m)</Text>}
                                            </Text>
                                        </Space>
                                        {(index < arr.length - 1 || otherPresent.length > 0) && <span className="comma">,</span>}
                                    </div>
                                );
                            })}
                            
                            {/* Khách ngoài hệ thống */}
                            {otherPresent.map((name, i) => (
                                <div key={`other-${i}`} className="attendance-item">
                                    <Popover
                                        content={<Button danger size="small" onClick={() => setOtherPresent(prev => prev.filter((_, idx) => idx !== i))}>Xóa khách này</Button>}
                                        trigger="click"
                                    >
                                        <Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', cursor: 'pointer' }}>
                                            {name}
                                        </Text>
                                    </Popover>
                                    {i < otherPresent.length - 1 && <span className="comma">,</span>}
                                </div>
                            ))}

                            {presentIds.length === 0 && otherPresent.length === 0 && <Text type="secondary" italic style={{ fontSize: 12 }}>Chưa có dữ liệu tham dự</Text>}
                        </div>
                        {(presentIds.length + otherPresent.length) > 12 && (
                            <Typography.Link className="show-more-btn" onClick={() => setShowAllPresent(!showAllPresent)}>
                                {showAllPresent ? 'Thu gọn' : 'Xem thêm...'}
                            </Typography.Link>
                        )}
                    </Col>

                    <Col span={24}>
                        <div className="section-header">
                            <Space>
                                <UserDeleteOutlined style={{ color: '#ef4444' }} />
                                <Text strong style={{ fontSize: 14, color: '#ef4444' }}>VẮNG MẶT ({absentIds.length + otherAbsent.length})</Text>
                            </Space>
                            <Space size={8}>
                                <Popover
                                    content={
                                        <div style={{ padding: 4 }}>
                                            <AutoComplete
                                                style={{ width: 250 }}
                                                options={guestHistory.map(name => ({ value: name }))}
                                                filterOption={(inputValue, option) =>
                                                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                                }
                                                onSelect={(val) => {
                                                    if (val && !otherAbsent.includes(val)) {
                                                        setOtherAbsent(prev => [...prev, val]);
                                                    }
                                                }}
                                            >
                                                <Input.Search
                                                    placeholder="Nhập tên hoặc chọn từ lịch sử..." 
                                                    enterButton="Thêm"
                                                    onSearch={(val) => {
                                                        const name = val.trim();
                                                        if (name && !otherAbsent.includes(name)) {
                                                            setOtherAbsent(prev => [...prev, name]);
                                                            addToGuestHistory(name);
                                                        }
                                                    }}
                                                />
                                            </AutoComplete>
                                        </div>
                                    }
                                    title="Thêm khách vắng ngoài hệ thống"
                                    trigger="click"
                                    placement="bottomRight"
                                >
                                    <Button 
                                        type="dashed" 
                                        size="small" 
                                        icon={<PlusOutlined />} 
                                        style={{ borderRadius: 6, fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }}
                                    >
                                        Thêm khách
                                    </Button>
                                </Popover>
                                <Button 
                                    type="link" 
                                    size="small" 
                                    icon={<EditOutlined />}
                                    onClick={() => setMemberModalConfig({ open: true, type: 'absent', title: 'Danh sách thành viên vắng mặt' })}
                                >
                                    Điều chỉnh
                                </Button>
                            </Space>
                        </div>
                        <div className={`attendance-display-box ${!showAllAbsent ? 'collapsed' : ''}`}>
                            {/* Thành viên trong hệ thống */}
                            {absentIds.map((id, index, arr) => {
                                const user = users.find(u => String(u.id) === String(id));
                                return (
                                    <div key={id} className="attendance-item">
                                        <Space size={4}>
                                            <Avatar size={18} src={user?.avatar} icon={<UserOutlined />} style={{ border: '1px solid #f0f0f0' }} />
                                            <Text style={{ fontSize: 13, color: '#374151' }}>{user?.name || `TV #${id}`}</Text>
                                        </Space>
                                        {(index < arr.length - 1 || otherAbsent.length > 0) && <span className="comma">,</span>}
                                    </div>
                                );
                            })}

                            {/* Khách ngoài hệ thống */}
                            {otherAbsent.map((name, i) => (
                                <div key={`other-absent-${i}`} className="attendance-item">
                                    <Popover
                                        content={<Button danger size="small" onClick={() => setOtherAbsent(prev => prev.filter((_, idx) => idx !== i))}>Xóa khách vắng này</Button>}
                                        trigger="click"
                                    >
                                        <Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', cursor: 'pointer' }}>
                                            {name}
                                        </Text>
                                    </Popover>
                                    {i < otherAbsent.length - 1 && <span className="comma">,</span>}
                                </div>
                            ))}

                            {absentIds.length === 0 && otherAbsent.length === 0 && <Text type="secondary" italic style={{ fontSize: 12 }}>Không có thành viên vắng mặt</Text>}
                        </div>
                        {(absentIds.length + otherAbsent.length) > 12 && (
                            <Typography.Link className="show-more-btn" onClick={() => setShowAllAbsent(!showAllAbsent)}>
                                {showAllAbsent ? 'Thu gọn' : 'Xem thêm...'}
                            </Typography.Link>
                        )}
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
                users={meetingParticipants}
                selectedIds={
                    memberModalConfig.type === 'present' ? presentIds : 
                    memberModalConfig.type === 'absent' ? absentIds : 
                    memberModalConfig.type === 'chairperson' ? chairpersonIds :
                    secretaryIds
                }
                onCancel={() => setMemberModalConfig(prev => ({ ...prev, open: false }))}
                onSelect={handleMemberSelect}
            />

            {/* History Modal */}
            <Modal
                title={
                    <Space>
                        <FileTextOutlined style={{ color: 'var(--primary-color)' }} />
                        <span style={{ fontWeight: 600 }}>Lịch sử chỉnh sửa biên bản</span>
                    </Space>
                }
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsHistoryModalVisible(false)} style={{ borderRadius: 8 }}>
                        Đóng
                    </Button>
                ]}
                width={550}
                destroyOnClose
            >
                <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
                    <List
                        dataSource={record?.minutesHistory?.slice().reverse() || []}
                        renderItem={(item, index) => {
                            const editor = users.find(u => String(u.id) === String(item.userId));
                            return (
                                <List.Item 
                                    key={index} 
                                    style={{ 
                                        padding: '12px 16px', 
                                        borderLeft: `3px solid ${item.action.includes('Nộp') ? '#52c41a' : '#faad14'}`,
                                        marginBottom: 8,
                                        background: '#f9fafb',
                                        borderRadius: '0 8px 8px 0'
                                    }}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar src={editor?.avatar} icon={<UserOutlined />} />}
                                        title={
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <Text strong>{editor?.name || `Thành viên #${item.userId}`}</Text>
                                                <Tag color={item.action.includes('Nộp') ? 'success' : 'warning'} style={{ margin: 0, borderRadius: 4, fontSize: 10 }}>
                                                    {item.action}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <div style={{ marginTop: 4 }}>
                                                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                                    <CalendarOutlined style={{ marginRight: 4 }} />
                                                    {dayjs(item.timestamp).format('HH:mm:ss DD/MM/YYYY')}
                                                </div>
                                                {item.note && <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>{item.note}</div>}
                                            </div>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                        locale={{ emptyText: <Empty description="Chưa có lịch sử chỉnh sửa" /> }}
                    />
                </div>
            </Modal>
        </Modal>
    );
};

export default MeetingMinutesModal;
