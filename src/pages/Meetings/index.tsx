import { useState, useEffect, useMemo } from 'react';
import { Form, Tag, Space, Tooltip, Modal, Typography, List, Avatar, Divider, Radio, Input, message } from 'antd';
import { 
    CalendarOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    EyeOutlined, 
    QuestionCircleOutlined,
    EnvironmentOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    UserOutlined,
    TeamOutlined,
    CheckOutlined,
    CloseOutlined,
    FormOutlined
} from '@ant-design/icons';
import { useCRUD } from '@/hooks/useCRUD';
import DataTable from '@/components/common/DataTable';
import { DataTableColumn } from '@/components/common/DataTable/types';
import meetingService, { Meeting } from '@/services/meeting.service';
import userService from '@/services/user.service';
import { User } from '@/types';
import MeetingForm from './components/MeetingForm';
import { Button } from '@/components/common';
import dayjs from 'dayjs';
import { useAccess } from '@/hooks';

const { Text, Title } = Typography;

const MeetingsPage = () => {
    const { hasPermission, user: currentUser } = useAccess();
    
    // Role-based Permissions
    const canCreate = useMemo(() => hasPermission('meeting:create:all') || hasPermission('meeting:create:dept'), [hasPermission]);
    const canManageAll = useMemo(() => hasPermission('meeting:create:all') || currentUser?.role === 'admin', [hasPermission, currentUser]);
    const canAttendance = useMemo(() => hasPermission('meeting:attendance') || canManageAll, [hasPermission, canManageAll]);

    const {
        data,
        loading,
        pagination,
        fetchAll,
        remove,
        create,
        update,
        handleTableChange,
        search,
        searchTerm,
    } = useCRUD(meetingService, {
        autoFetch: true,
    });

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewingRecord, setViewingRecord] = useState<Meeting | null>(null);
    const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
    const [, setUsers] = useState<User[]>([]);
    
    // RSVP State
    const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined'>('accepted');
    const [rsvpReason, setRsvpReason] = useState('');
    const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

    useEffect(() => {
        userService.getAll().then((res: any) => {
            if (res.success && res.data) {
                setUsers(res.data);
            }
        });
    }, []);

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'scheduled': return <Tag color="blue" icon={<ClockCircleOutlined />}>Đã lên lịch</Tag>;
            case 'completed': return <Tag color="green" icon={<CheckCircleOutlined />}>Đã hoàn thành</Tag>;
            case 'cancelled': return <Tag color="red" icon={<CloseCircleOutlined />}>Đã hủy</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    const handleRsvp = async () => {
        if (!viewingRecord || !currentUser) return;
        
        if (rsvpStatus === 'declined' && !rsvpReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối');
            return;
        }

        setIsSubmittingRsvp(true);
        try {
            const res = await meetingService.rsvp(viewingRecord.id, {
                status: rsvpStatus,
                reason: rsvpReason
            });
            if (res.success) {
                message.success('Đã gửi phản hồi thành công');
                await fetchAll();
                setIsDetailVisible(false);
            }
        } catch (error) {
            console.error('RSVP failed:', error);
        } finally {
            setIsSubmittingRsvp(false);
        }
    };

    const columns: DataTableColumn<Meeting>[] = [
        {
            title: "Tiêu đề cuộc họp",
            dataIndex: "title",
            key: "title",
            width: 250,
            searchable: true,
            render: (title: string, record: Meeting) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{ fontSize: 15 }}>{title}</Text>
                    <Space size="small" style={{ marginTop: 4 }}>
                        <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.location}</Text>
                    </Space>
                </div>
            )
        },
        {
            title: "Thời gian",
            dataIndex: "meetingAt",
            key: "meetingAt",
            width: 180,
            sortable: true,
            render: (date: string) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{dayjs(date).format('DD/MM/YYYY')}</Text>
                    <Text type="secondary">{dayjs(date).format('HH:mm')}</Text>
                </Space>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status: string) => getStatusTag(status)
        },
        {
            title: "Thành viên",
            key: "participants",
            width: 120,
            render: (_: any, record: Meeting) => {
                const total = record.participantIds?.length || 0;
                const accepted = record.confirmations?.filter(c => c.status === 'accepted').length || 0;
                return (
                    <Tooltip title={`${accepted}/${total} đã xác nhận tham gia`}>
                        <Tag color="cyan">
                            <TeamOutlined /> {accepted}/{total}
                        </Tag>
                    </Tooltip>
                );
            }
        },
        {
            title: "Phản hồi của tôi",
            key: "my_rsvp",
            width: 150,
            render: (_: any, record: Meeting) => {
                const myConfirm = record.confirmations?.find(c => c.userId === currentUser?.id);
                if (!myConfirm) return <Tag color="default">Không có trong DS</Tag>;
                if (myConfirm.status === 'accepted') return <Tag color="green" icon={<CheckOutlined />}>Tham gia</Tag>;
                if (myConfirm.status === 'declined') return <Tag color="red" icon={<CloseOutlined />}>Từ chối</Tag>;
                return <Tag color="orange" icon={<ClockCircleOutlined />}>Chưa phản hồi</Tag>;
            }
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 160,
            fixed: 'right',
            align: 'center',
            render: (_: any, record: Meeting) => {
                const isCreator = record.createdBy === currentUser?.id;
                const canEdit = canManageAll || (canCreate && isCreator);

                return (
                    <Space size="small">
                        <Tooltip title="Chi tiết & Phản hồi">
                            <Button 
                                variant="ghost" 
                                buttonSize="small" 
                                style={{ color: '#1890ff' }} 
                                onClick={() => {
                                    setViewingRecord(record);
                                    const myConfirm = record.confirmations?.find(c => c.userId === currentUser?.id);
                                    if (myConfirm) {
                                        setRsvpStatus(myConfirm.status === 'declined' ? 'declined' : 'accepted');
                                        setRsvpReason(myConfirm.reason || '');
                                    }
                                    setIsDetailVisible(true);
                                }}
                            >
                                <EyeOutlined />
                            </Button>
                        </Tooltip>
                        {canEdit && (
                            <Tooltip title="Chỉnh sửa">
                                <Button 
                                    variant="ghost" 
                                    buttonSize="small" 
                                    style={{ color: 'var(--primary-color)' }} 
                                    onClick={() => openEdit(record)}
                                >
                                    <EditOutlined />
                                </Button>
                            </Tooltip>
                        )}
                        {canManageAll && (
                            <Tooltip title="Xóa">
                                <Button 
                                    variant="ghost" 
                                    buttonSize="small" 
                                    danger 
                                    onClick={() => handleDelete(record.id)}
                                >
                                    <DeleteOutlined />
                                </Button>
                            </Tooltip>
                        )}
                        {canAttendance && record.status === 'scheduled' && (
                             <Tooltip title="Điểm danh">
                                <Button 
                                    variant="ghost" 
                                    buttonSize="small" 
                                    style={{ color: '#faad14' }} 
                                    onClick={() => message.info('Tính năng điểm danh đang được phát triển')}
                                >
                                    <CheckCircleOutlined />
                                </Button>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
    ];

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ 
            status: 'scheduled',
            meetingAt: dayjs().add(1, 'day').hour(19).minute(0)
        });
        setIsModalVisible(true);
    };

    const openEdit = (record: Meeting) => {
        setEditingId(record.id);
        form.setFieldsValue({
            ...record,
            meetingAt: dayjs(record.meetingAt),
            endAt: record.endAt ? dayjs(record.endAt) : undefined,
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa lịch họp này? Mọi thông tin phản hồi sẽ bị mất.',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: () => remove(id)
        });
    };

    const onOk = async () => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                meetingAt: values.meetingAt.toISOString(),
                endAt: values.endAt ? values.endAt.toISOString() : undefined,
            };

            let success;
            if (editingId) {
                success = await update(editingId, formattedValues);
            } else {
                success = await create(formattedValues);
            }

            if (success) {
                setIsModalVisible(false);
                form.resetFields();
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    return (
        <>
            <DataTable
                title={canCreate ? "Quản lý Lịch họp" : "Lịch họp của tôi"}
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                onAdd={canCreate ? openCreate : undefined}
                onRefresh={() => fetchAll()}
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                extra={
                    <Button 
                        variant="ghost" 
                        buttonSize="small" 
                        icon={<QuestionCircleOutlined />} 
                        onClick={() => setIsGuideModalVisible(true)} 
                        style={{ 
                            color: '#595959', 
                            border: '1px solid #d9d9d9',
                            height: 32 
                        }}
                    >
                        Hướng dẫn
                    </Button>
                }
            />

            <MeetingForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
            />

            <Modal
                title={
                    <div style={{ textAlign: 'left', width: '100%' }}>
                        <Space>
                            <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
                            <Text strong style={{ fontSize: 18 }}>{canCreate ? 'Chi tiết & Quản lý RSVP' : 'Chi tiết & Phản hồi họp'}</Text>
                        </Space>
                    </div>
                }
                open={isDetailVisible}
                onCancel={() => setIsDetailVisible(false)}
                footer={[
                    <Button key="close" variant="outline" onClick={() => setIsDetailVisible(false)}>Đóng</Button>,
                    viewingRecord?.status === 'scheduled' && viewingRecord?.participantIds?.includes(currentUser?.id || 0) && (
                        <Button 
                            key="submit" 
                            variant="primary" 
                            loading={isSubmittingRsvp} 
                            onClick={handleRsvp}
                        >
                            Gửi phản hồi
                        </Button>
                    )
                ]}
                width={650}
                centered
                destroyOnClose
            >
                {viewingRecord && (
                    <div className="meeting-detail">
                        <Title level={4}>{viewingRecord.title}</Title>
                        <Space direction="vertical" style={{ width: '100%', marginBottom: 20 }}>
                            <Space><EnvironmentOutlined /> <strong>Địa điểm:</strong> {viewingRecord.location}</Space>
                            <Space><ClockCircleOutlined /> <strong>Thời gian:</strong> {dayjs(viewingRecord.meetingAt).format('HH:mm DD/MM/YYYY')}</Space>
                            {viewingRecord.agenda && (
                                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
                                    <strong>Nội dung:</strong>
                                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', fontSize: '13px' }}>{viewingRecord.agenda}</pre>
                                </div>
                            )}
                        </Space>

                        {viewingRecord.status === 'scheduled' && viewingRecord.participantIds?.includes(currentUser?.id || 0) && (
                            <div style={{ background: '#e6f7ff', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #91d5ff' }}>
                                <Text strong>Phản hồi tham gia của bạn:</Text>
                                <div style={{ marginTop: '12px' }}>
                                    <Radio.Group value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value)}>
                                        <Space direction="vertical">
                                            <Radio value="accepted">Tôi sẽ tham gia</Radio>
                                            <Radio value="declined">Tôi xin vắng mặt</Radio>
                                        </Space>
                                    </Radio.Group>
                                    {rsvpStatus === 'declined' && (
                                        <div style={{ marginTop: '12px' }}>
                                            <Text type="danger" style={{ fontSize: '12px' }}>* Lý do vắng mặt (Bắt buộc):</Text>
                                            <Input.TextArea 
                                                placeholder="VD: Trùng lịch học, có việc gia đình..." 
                                                rows={2} 
                                                value={rsvpReason}
                                                onChange={(e) => setRsvpReason(e.target.value)}
                                                style={{ marginTop: '4px' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Divider orientation="left">Danh sách phản hồi ({viewingRecord.confirmations?.length || 0})</Divider>
                        <List
                            itemLayout="horizontal"
                            dataSource={viewingRecord.confirmations || []}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<UserOutlined />} />}
                                        title={<Text strong>Thành viên #{item.userId} {item.userId === currentUser?.id && <Tag color="blue">Bạn</Tag>}</Text>}
                                        description={
                                            <Space direction="vertical" size={0}>
                                                <Space>
                                                    {item.status === 'accepted' ? <Tag color="green">Tham gia</Tag> : 
                                                     item.status === 'declined' ? <Tag color="red">Từ chối</Tag> : 
                                                     <Tag color="orange">Chưa phản hồi</Tag>}
                                                    {item.respondedAt && <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(item.respondedAt).format('HH:mm DD/MM/YYYY')}</Text>}
                                                </Space>
                                                {item.reason && <Text type="danger" style={{ fontSize: '12px' }}>Lý do: {item.reason}</Text>}
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Modal>

            <Modal
                title={
                    <Space>
                        <QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />
                        <span>Hướng dẫn {canCreate ? 'Quản lý' : 'Phản hồi'} Lịch họp</span>
                    </Space>
                }
                open={isGuideModalVisible}
                onCancel={() => setIsGuideModalVisible(false)}
                footer={[
                    <div key="footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Button key="close" variant="primary" onClick={() => setIsGuideModalVisible(false)} style={{ minWidth: 100 }}>Đã hiểu</Button>
                    </div>
                ]}
                centered
            >
                <div style={{ padding: '8px 0' }}>
                    <p>Hệ thống {canCreate ? 'quản lý' : 'phản hồi'} lịch họp giúp bạn:</p>
                    <ul style={{ paddingLeft: 20 }}>
                        <li style={{ marginBottom: 8 }}>
                            {canCreate ? 'Lên lịch nhanh chóng: Thông báo sẽ được tự động gửi đến các thành viên.' : 'Nắm bắt lịch họp: Xem thời gian, địa điểm và nội dung họp nhanh chóng.'}
                        </li>
                        <li style={{ marginBottom: 8 }}>
                            {canCreate ? 'Theo dõi RSVP: Biết được ai sẽ tham gia, ai bận để chủ động sắp xếp.' : 'Phản hồi RSVP: Cho Admin biết bạn có tham gia được hay không.'}
                        </li>
                    </ul>
                </div>
            </Modal>
        </>
    );
};

export default MeetingsPage;
