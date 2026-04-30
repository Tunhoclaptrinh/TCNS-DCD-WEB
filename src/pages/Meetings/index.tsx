import { useState, useEffect, useMemo } from 'react';
import { 
    Form, Tag, Space, Tooltip, Modal, Typography, 
    List, Avatar, Divider, Radio, Input, message, 
    Select, Tabs, Card, Badge, Calendar 
} from 'antd';
import { 
    CalendarOutlined, EditOutlined, DeleteOutlined, 
    EyeOutlined, QuestionCircleOutlined, EnvironmentOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    UserOutlined, TeamOutlined, CheckOutlined, CloseOutlined,
    AppstoreOutlined, BarsOutlined, CopyOutlined, PlusOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { useCRUD } from '@/hooks/useCRUD';
import { Button, DataTable, StatisticsCard, Access, TabSwitcher } from '@/components/common';
import { DataTableColumn } from '@/components/common/DataTable/types';
import meetingService, { Meeting } from '@/services/meeting.service';
import userService from '@/services/user.service';
import { User } from '@/types';
import MeetingForm from './components/MeetingForm';
import dayjs from 'dayjs';
import { useAccess } from '@/hooks';
import './styles.less';

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
    const [attendanceRecord, setAttendanceRecord] = useState<Meeting | null>(null);
    const [viewingRecord, setViewingRecord] = useState<Meeting | null>(null);
    const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    
    // RSVP State
    const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined'>('accepted');
    const [rsvpReason, setRsvpReason] = useState('');
    const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
    
    // View State
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    // Fetch users for display
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await userService.getAll({ pageSize: 1000 });
                if (res.success) setUsers(res.data || []);
            } catch (error) {
                console.error("Fetch users failed:", error);
            }
        };
        fetchUsers();
    }, []);

    // Statistics logic
    const stats = useMemo(() => {
        const now = dayjs();
        const upcoming = data.filter(m => m.status === 'scheduled' && dayjs(m.meetingAt).isAfter(now) && dayjs(m.meetingAt).isBefore(now.add(24, 'hour'))).length;
        const pendingRsvp = data.filter((m: Meeting) => {
            const myConfirm = m.confirmations?.find((c: any) => c.userId === currentUser?.id);
            return m.status === 'scheduled' && (!myConfirm || (!myConfirm.status || myConfirm.status === 'pending')) && m.participantIds?.includes(currentUser?.id || 0);
        }).length;
        const totalMonth = data.filter((m: Meeting) => dayjs(m.meetingAt).isSame(now, 'month')).length;

        return { upcoming, pendingRsvp, totalMonth };
    }, [data, currentUser]);
    
    // Advanced Filters Config
    const filtersConfig = useMemo((): any[] => [
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: [
                { label: 'Đã lên lịch', value: 'scheduled' },
                { label: 'Đã hoàn thành', value: 'completed' },
                { label: 'Đã hủy', value: 'cancelled' },
            ],
            operators: ['eq', 'ne'],
        },
        {
            key: 'meetingAt',
            label: 'Thời gian họp',
            type: 'dateRange',
            operators: ['between'],
        },
        {
            key: 'location',
            label: 'Địa điểm',
            type: 'string',
            operators: ['contains', 'eq'],
        }
    ], []);

    const columns: DataTableColumn<Meeting>[] = [
        {
            title: "Cuộc họp",
            key: "title",
            width: 250,
            render: (_: any, record: Meeting) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => openDetail(record)}>
                        {record.title}
                    </Text>
                    <Space style={{ fontSize: 12, color: '#8c8c8c' }}>
                        <EnvironmentOutlined /> {record.location}
                    </Space>
                </Space>
            )
        },
        {
            title: "Thời gian",
            key: "meetingAt",
            width: 180,
            render: (_: any, record: Meeting) => dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY')
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status: string) => {
                const config: any = {
                    scheduled: { color: 'blue', text: 'Đã lên lịch' },
                    completed: { color: 'green', text: 'Hoàn thành' },
                    cancelled: { color: 'red', text: 'Đã hủy' }
                };
                return <Badge status={config[status]?.color as any} text={config[status]?.text} />;
            }
        },
        {
            title: "Tham gia",
            key: "participants",
            width: 120,
            render: (_: any, record: Meeting) => {
                const total = record.participantIds?.length || 0;
                const accepted = record.confirmations?.filter((c: any) => c.status === 'accepted').length || 0;
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
                const myConfirm = record.confirmations?.find((c: any) => c.userId === currentUser?.id);
                if (!myConfirm) return <Tag color="default">Không có trong DS</Tag>;
                if (myConfirm.status === 'accepted' || myConfirm.status === 'present' || myConfirm.status === 'late') 
                    return <Tag color="green" icon={<CheckOutlined />}>Tham gia</Tag>;
                if (myConfirm.status === 'declined' || myConfirm.status === 'absent') 
                    return <Tag color="red" icon={<CloseOutlined />}>Từ chối</Tag>;
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
                        <Tooltip title="Sao chép thông tin">
                            <Button 
                                variant="ghost" 
                                buttonSize="small" 
                                style={{ color: '#8c8c8c' }} 
                                onClick={() => copyMeetingInfo(record)}
                            >
                                <CopyOutlined />
                            </Button>
                        </Tooltip>
                        
                        {/* Quick RSVP Actions */}
                        {record.status === 'scheduled' && record.participantIds?.includes(currentUser?.id || 0) && (
                            <>
                                {record.confirmations?.find(c => c.userId === currentUser?.id)?.status !== 'accepted' && (
                                    <Tooltip title="Xác nhận tham gia nhanh">
                                        <Button 
                                            variant="ghost" 
                                            buttonSize="small" 
                                            style={{ color: '#52c41a' }} 
                                            onClick={() => handleQuickRsvp(record.id, 'accepted')}
                                        >
                                            <CheckOutlined />
                                        </Button>
                                    </Tooltip>
                                )}
                                {record.confirmations?.find(c => c.userId === currentUser?.id)?.status !== 'declined' && (
                                    <Tooltip title="Từ chối tham gia nhanh">
                                        <Button 
                                            variant="ghost" 
                                            buttonSize="small" 
                                            style={{ color: '#f5222d' }} 
                                            onClick={() => handleQuickRsvp(record.id, 'declined')}
                                        >
                                            <CloseOutlined />
                                        </Button>
                                    </Tooltip>
                                )}
                            </>
                        )}

                        <Tooltip title="Chi tiết & Phản hồi">
                            <Button 
                                variant="ghost" 
                                buttonSize="small" 
                                style={{ color: '#1890ff' }} 
                                onClick={() => openDetail(record)}
                            >
                                <EyeOutlined />
                            </Button>
                        </Tooltip>
                        {canEdit && (
                            <Tooltip title="Sửa">
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
                        {canAttendance && record.status === 'scheduled' && (
                             <Tooltip title="Điểm danh">
                                <Button 
                                    variant="ghost" 
                                    buttonSize="small" 
                                    style={{ color: '#faad14' }} 
                                    onClick={() => setAttendanceRecord(record)}
                                >
                                    <CheckCircleOutlined />
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
                    </Space>
                );
            }
        }
    ];

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
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

    const openDetail = (record: Meeting) => {
        setViewingRecord(record);
        const myConfirm = record.confirmations?.find((c: any) => c.userId === currentUser?.id);
        if (myConfirm && (myConfirm.status === 'accepted' || myConfirm.status === 'declined')) {
            setRsvpStatus(myConfirm.status as any);
            setRsvpReason(myConfirm.reason || '');
        } else {
            setRsvpStatus('accepted');
            setRsvpReason('');
        }
        setIsDetailVisible(true);
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

    const handleRsvp = async () => {
        if (!viewingRecord) return;
        setIsSubmittingRsvp(true);
        try {
            const res = await meetingService.rsvp(viewingRecord.id, {
                status: rsvpStatus,
                reason: rsvpReason
            });
            if (res.success) {
                message.success('Gửi phản hồi thành công');
                setIsDetailVisible(false);
                fetchAll();
            }
        } catch (error) {
            console.error("RSVP failed:", error);
            message.error('Gửi phản hồi thất bại');
        } finally {
            setIsSubmittingRsvp(false);
        }
    };

    const handleQuickRsvp = async (meetingId: number, status: 'accepted' | 'declined') => {
        try {
            const res = await meetingService.rsvp(meetingId, {
                status,
                reason: status === 'accepted' ? 'Xác nhận nhanh qua danh sách' : 'Từ chối nhanh qua danh sách'
            });
            if (res.success) {
                message.success(status === 'accepted' ? 'Đã xác nhận tham gia' : 'Đã từ chối tham gia');
                fetchAll();
            }
        } catch (error) {
            console.error("Quick RSVP failed:", error);
            message.error('Thao tác thất bại');
        }
    };

    const handleMarkAttendance = async (userId: number, status: string) => {
        if (!attendanceRecord) return;
        try {
            const res = await meetingService.markAttendance({
                meetingId: attendanceRecord.id,
                userId,
                status
            });
            if (res.success) {
                message.success('Cập nhật điểm danh thành công');
                const updatedConfirmations = attendanceRecord.confirmations.map(c => 
                    c.userId === userId ? { ...c, status: status as any } : c
                );
                if (!updatedConfirmations.find(c => c.userId === userId)) {
                    updatedConfirmations.push({ userId, status: status as any, respondedAt: new Date().toISOString() });
                }
                setAttendanceRecord({ ...attendanceRecord, confirmations: updatedConfirmations });
                fetchAll();
            }
        } catch (error) {
            console.error("Attendance failed:", error);
            message.error('Cập nhật điểm danh thất bại');
        }
    };

    const copyMeetingInfo = (record: Meeting) => {
        const info = `
📅 CUỘC HỌP: ${record.title}
📍 Địa điểm: ${record.location}
⏰ Thời gian: ${dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY')}
📝 Nội dung: ${record.agenda || 'N/A'}
        `.trim();
        navigator.clipboard.writeText(info);
        message.success('Đã sao chép thông tin cuộc họp');
    };

    const dateCellRender = (date: dayjs.Dayjs) => {
        const listData = data.filter((item: Meeting) => dayjs(item.meetingAt).isSame(date, 'day'));
        return (
            <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listData.map((item: Meeting) => (
                    <li key={item.id} onClick={(e) => {
                        e.stopPropagation();
                        openDetail(item);
                    }}>
                        <Badge status={item.status === 'scheduled' ? 'processing' : 'default'} text={item.title} />
                    </li>
                ))}
            </ul>
        );
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

    // --- Header Construction (Synchronized for both views) ---
    
    const PageHeaderTitle = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h2 style={{ margin: 0 }}>{canCreate ? "Quản lý Lịch họp" : "Lịch họp của tôi"}</h2>
            <Button 
                variant="ghost" 
                buttonSize="small"
                icon={<QuestionCircleOutlined style={{ color: '#8c8c8c' }} />} 
                onClick={() => setIsGuideModalVisible(true)}
                style={{ border: '1px solid #d9d9d9', borderRadius: 6 }}
            >
                Hướng dẫn
            </Button>
        </div>
    );

    const PageHeaderStats = (
        <StatisticsCard
            hideCard={true}
            loading={loading}
            data={[
                {
                    title: "Sắp diễn ra (24h)",
                    value: stats.upcoming,
                    icon: <CalendarOutlined />,
                    valueColor: "#1890ff",
                },
                {
                    title: "Chờ xác nhận",
                    value: stats.pendingRsvp,
                    icon: <MessageOutlined />,
                    valueColor: "#faad14",
                },
                {
                    title: "Trong tháng này",
                    value: stats.totalMonth,
                    icon: <ClockCircleOutlined />,
                    valueColor: "#52c41a",
                }
            ]}
            statShadow={false}
        />
    );

    const ViewSwitcher = (
        <TabSwitcher>
            <Tabs
                activeKey={viewMode}
                onChange={(key) => setViewMode(key as 'list' | 'calendar')}
                className="hifi-tabs-management"
                tabBarGutter={24}
                items={[
                    { key: 'list', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><BarsOutlined /> Danh sách</span> },
                    { key: 'calendar', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><AppstoreOutlined /> Lịch họp</span> }
                ]}
            />
        </TabSwitcher>
    );

    const PageHeaderExtra = (
        <Access anyPermission={["meeting:create:all", "meeting:create:dept"]}>
            <Button 
                variant="primary" 
                buttonSize="small"
                icon={<PlusOutlined />} 
                onClick={openCreate}
            >
                Lên lịch mới
            </Button>
        </Access>
    );

    return (
        <div className="meetings-page-container" style={{ padding: '0 8px' }}>
            {viewMode === 'list' ? (
                <DataTable
                    title={PageHeaderTitle}
                    extra={PageHeaderExtra}
                    headerContent={
                        <>
                            {PageHeaderStats}
                            {ViewSwitcher}
                        </>
                    }
                    loading={loading}
                    columns={columns.map(col => ({ ...col, resizable: true }))}
                    dataSource={data}
                    pagination={pagination}
                    onPaginationChange={handleTableChange}
                    onRefresh={() => fetchAll()}
                    searchable={true}
                    searchValue={searchTerm}
                    onSearch={search}
                    filters={filtersConfig}
                    bordered={true}
                    size="middle"
                    rowKey="id"
                    scroll={{ x: 'max-content' }}
                    saveColumnWidths={true}
                    columnResizeKey="meetings-table-v4"
                />
            ) : (
                <div className="data-table-wrapper">
                    <div className="data-table-title">
                        {PageHeaderTitle}
                    </div>
                    <Card bodyStyle={{ borderRadius: 12, padding: 0 }} hoverable={false}>
                        <div className="data-table-header-content">
                            {PageHeaderStats}
                            {ViewSwitcher}
                        </div>
                        <div className="data-table-toolbar">
                            <Space wrap>{/* Left tools empty */}</Space>
                            <Space wrap align="center" className="right-tools">
                                {PageHeaderExtra}
                            </Space>
                        </div>
                        <div style={{ padding: '16px 24px' }}>
                            <Calendar 
                                className="meetings-calendar"
                                cellRender={dateCellRender} 
                                onSelect={() => {}}
                            />
                        </div>
                    </Card>
                </div>
            )}

            <MeetingForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
            />

            {/* Modals remain the same */}
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
            >
                {viewingRecord && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4}>{viewingRecord.title}</Title>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Space><CalendarOutlined /> <Text strong>{dayjs(viewingRecord.meetingAt).format('HH:mm [ngày] DD/MM/YYYY')}</Text></Space>
                                <Space><EnvironmentOutlined /> <Text>{viewingRecord.location}</Text></Space>
                            </Space>
                        </div>
                        
                        <Divider orientation="left" plain>Nội dung cuộc họp</Divider>
                        <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: 8, marginBottom: 24 }}>
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{viewingRecord.agenda || 'Chưa có nội dung chi tiết.'}</Text>
                        </div>

                        {viewingRecord.status === 'scheduled' && viewingRecord.participantIds?.includes(currentUser?.id || 0) && (
                            <>
                                <Divider orientation="left" plain>Xác nhận tham gia (RSVP)</Divider>
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <Radio.Group 
                                        value={rsvpStatus} 
                                        onChange={(e) => setRsvpStatus(e.target.value)}
                                        buttonStyle="solid"
                                        size="large"
                                    >
                                        <Radio.Button value="accepted" style={{ width: 140 }}>Tham gia</Radio.Button>
                                        <Radio.Button value="declined" style={{ width: 140 }}>Từ chối</Radio.Button>
                                    </Radio.Group>
                                    <div style={{ marginTop: 16 }}>
                                        <Input.TextArea 
                                            placeholder="Ghi chú (Lý do nếu vắng mặt...)" 
                                            rows={2} 
                                            value={rsvpReason}
                                            onChange={(e) => setRsvpReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <Divider orientation="left" plain>Danh sách phản hồi ({viewingRecord.confirmations?.filter((c: any) => c.status === 'accepted').length || 0}/{viewingRecord.participantIds?.length || 0})</Divider>
                        <List
                            itemLayout="horizontal"
                            dataSource={viewingRecord.participantIds || []}
                            renderItem={(userId: number) => {
                                const myConfirm = viewingRecord.confirmations?.find((c: any) => c.userId === userId);
                                const status = myConfirm?.status || 'pending';
                                const user = users.find((u: User) => u.id === userId);
                                return (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar src={user?.avatar} icon={<UserOutlined />} />}
                                            title={<Text strong>{user?.name || `Thành viên #${userId}`}</Text>}
                                            description={
                                                <Space>
                                                    {(status === 'accepted' || status === 'present' || status === 'late') && <Tag color="green">Tham gia</Tag>}
                                                    {(status === 'declined' || status === 'absent') && <Tag color="red">Vắng mặt</Tag>}
                                                    {status === 'pending' && <Tag color="default">Chưa phản hồi</Tag>}
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </div>
                )}
            </Modal>

            {/* Điểm danh Modal */}
            <Modal
                title={
                    <Space>
                        <TeamOutlined style={{ color: 'var(--primary-color)' }} />
                        <Text strong style={{ fontSize: 18 }}>Điểm danh cuộc họp</Text>
                    </Space>
                }
                open={!!attendanceRecord}
                onCancel={() => setAttendanceRecord(null)}
                footer={[
                    <Button key="close" variant="primary" onClick={() => setAttendanceRecord(null)}>Hoàn tất</Button>
                ]}
                width={700}
                centered
            >
                {attendanceRecord && (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>{attendanceRecord.title}</Text>
                            <br />
                            <Text type="secondary">Đánh giá sự chuyên cần của các thành viên tham gia cuộc họp.</Text>
                        </div>
                        <List
                            itemLayout="horizontal"
                            dataSource={attendanceRecord.participantIds || []}
                            renderItem={(userId: number) => {
                                const confirmation = attendanceRecord.confirmations?.find((c: any) => c.userId === userId);
                                const status = confirmation?.status || 'pending';
                                const user = users.find((u: User) => u.id === userId);
                                
                                return (
                                    <List.Item
                                        actions={[
                                            <Select
                                                key="status"
                                                value={['present', 'late', 'absent'].includes(status) ? status : undefined}
                                                placeholder="Chọn trạng thái"
                                                style={{ width: 140 }}
                                                onChange={(val: string) => handleMarkAttendance(userId, val)}
                                                options={[
                                                    { label: 'Tham gia', value: 'present' },
                                                    { label: 'Đi muộn', value: 'late' },
                                                    { label: 'Vắng mặt', value: 'absent' },
                                                ]}
                                            />
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar src={user?.avatar} icon={<UserOutlined />} />}
                                            title={<Text strong>{user?.name || `Thành viên #${userId}`}</Text>}
                                            description={
                                                <Space direction="vertical" size={0}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>{user?.studentId || user?.email}</Text>
                                                    <Space style={{ marginTop: 4 }}>
                                                        {status === 'accepted' && <Tag color="green">Đã xác nhận RSVP</Tag>}
                                                        {status === 'declined' && <Tag color="red">Đã từ chối RSVP</Tag>}
                                                        {status === 'present' && <Tag color="blue">Đã có mặt</Tag>}
                                                        {status === 'late' && <Tag color="orange">Muộn</Tag>}
                                                        {status === 'absent' && <Tag color="volcano">Vắng</Tag>}
                                                        {status === 'pending' && <Tag>Chưa có thông tin</Tag>}
                                                    </Space>
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </>
                )}
            </Modal>

            <Modal
                title="Hướng dẫn sử dụng"
                open={isGuideModalVisible}
                onCancel={() => setIsGuideModalVisible(false)}
                footer={[<Button key="ok" variant="primary" onClick={() => setIsGuideModalVisible(false)}>Đã hiểu</Button>]}
            >
                <div style={{ padding: '0 10px' }}>
                    <p><strong>1. Danh sách:</strong> Xem tất cả cuộc họp dưới dạng bảng, có thể lọc và tìm kiếm.</p>
                    <p><strong>2. Lịch họp:</strong> Xem các cuộc họp theo ngày trên lịch tháng.</p>
                    <p><strong>3. RSVP:</strong> Nhấn vào tên cuộc họp hoặc nút "Phản hồi" để xác nhận tham gia.</p>
                    <p><strong>4. Điểm danh:</strong> (Dành cho Admin/Leader) Nhấn vào biểu tượng điểm danh để cập nhật chuyên cần.</p>
                </div>
            </Modal>
        </div>
    );
};

export default MeetingsPage;
