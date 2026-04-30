import { useState, useMemo } from 'react';
import { 
    Form, Space, Typography, message, 
    Modal,
    Tooltip,
    Tag,
    Calendar,
    Spin,
    ConfigProvider
} from 'antd';
import { 
    CalendarOutlined, EditOutlined, DeleteOutlined, 
    EyeOutlined, QuestionCircleOutlined,
    CheckCircleOutlined, 
    AppstoreOutlined, CopyOutlined, PlusOutlined,
    MessageOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useCRUD } from '@/hooks/useCRUD';
import { Button, DataTable, StatisticsCard, Access } from '@/components/common';
import { DataTableColumn } from '@/components/common/DataTable/types';
import meetingService, { Meeting } from '@/services/meeting.service';
import userService from '@/services/user.service';
import { User } from '@/types';
import MeetingForm from './components/MeetingForm';
import MeetingDetailModal from './components/MeetingDetailModal';
import MeetingAttendanceModal from './components/MeetingAttendanceModal';
import MeetingMinutesModal from './components/MeetingMinutesModal';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import vi_VN from 'antd/es/locale/vi_VN';
import { useAccess } from '@/hooks';
import './styles.less';

dayjs.locale('vi');

const { Text } = Typography;

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
    const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
    const [isMinutesModalVisible, setIsMinutesModalVisible] = useState(false);
    const [calendarValue, setCalendarValue] = useState(dayjs());
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [attendanceRecord, setAttendanceRecord] = useState<Meeting | null>(null);
    const [viewingRecord, setViewingRecord] = useState<Meeting | null>(null);
    const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
    const [initialParticipants, setInitialParticipants] = useState<User[]>([]);
    
    // RSVP State
    const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined'>('accepted');
    const [rsvpReason, setRsvpReason] = useState('');
    const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
    const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
    
    const { data: users } = useCRUD(userService, {
        autoFetch: true,
        pageSize: 1000,
    });

    // Statistics logic
    const stats = useMemo(() => {
        const now = dayjs();
        const upcoming = data.filter(m => m.status === 'scheduled' && dayjs(m.meetingAt).isAfter(now) && dayjs(m.meetingAt).isBefore(now.add(24, 'hour'))).length;
        const pendingRsvp = data.filter((m: Meeting) => {
            const myConfirm = m.confirmations?.find((c: any) => String(c.userId) === String(currentUser?.id));
            const rsvpStatus = String(myConfirm?.rsvpStatus || 'pending').toLowerCase();
            const isInvited = m.isAllParticipants || m.participantIds?.some(id => String(id) === String(currentUser?.id));
            return m.status === 'scheduled' && rsvpStatus === 'pending' && isInvited;
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
        }
    ], []);

    const openCalendarAt = (date: any) => {
        setCalendarValue(dayjs(date));
        setIsCalendarModalVisible(true);
    };

    const columns: DataTableColumn<Meeting>[] = [
        {
            title: "Cuộc họp",
            key: "title",
            width: 250,
            render: (_: any, record: Meeting) => (
                <Text strong style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => openDetail(record)}>
                    {record.title}
                </Text>
            )
        },
        {
            title: "Thời gian",
            key: "meetingAt",
            width: 180,
            render: (_: any, record: Meeting) => (
                <Tooltip title="Xem trên lịch tháng">
                    <Text 
                        style={{ cursor: 'pointer', color: '#1890ff', borderBottom: '1px dashed #1890ff' }} 
                        onClick={() => openCalendarAt(record.meetingAt)}
                    >
                        {dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY')}
                    </Text>
                </Tooltip>
            )
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status: string) => {
                const colors: any = { scheduled: 'blue', completed: 'green', cancelled: 'red' };
                const texts: any = { scheduled: 'Sắp diễn ra', completed: 'Đã xong', cancelled: 'Đã hủy' };
                return <Tag color={colors[status]}>{texts[status]}</Tag>;
            }
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 220,
            fixed: 'right',
            align: 'center',
            render: (_: any, record: Meeting) => {
                const isCreator = record.createdBy === currentUser?.id;
                const canEdit = canManageAll || (canCreate && isCreator);
                
                return (
                    <Space size="small">
                        <Tooltip title="Xem chi tiết">
                            <Button variant="ghost" buttonSize="small" style={{ color: '#1890ff' }} onClick={() => openDetail(record)}>
                                <EyeOutlined />
                            </Button>
                        </Tooltip>
                        <Tooltip title="Xem trên lịch">
                            <Button variant="ghost" buttonSize="small" style={{ color: '#8b5cf6' }} onClick={() => openCalendarAt(record.meetingAt)}>
                                <AppstoreOutlined />
                            </Button>
                        </Tooltip>
                        {canEdit && (
                            <Tooltip title="Sửa">
                                <Button variant="ghost" buttonSize="small" style={{ color: 'var(--primary-color)' }} onClick={() => openEdit(record)}>
                                    <EditOutlined />
                                </Button>
                            </Tooltip>
                        )}
                        {canAttendance && record.status === 'scheduled' && (
                             <Tooltip title="Điểm danh">
                                <Button variant="ghost" buttonSize="small" style={{ color: '#faad14' }} onClick={() => setAttendanceRecord(record)}>
                                    <CheckCircleOutlined />
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip title="Sao chép">
                            <Button variant="ghost" buttonSize="small" style={{ color: '#8c8c8c' }} onClick={() => copyMeetingInfo(record)}>
                                <CopyOutlined />
                            </Button>
                        </Tooltip>
                        {canManageAll && (
                            <Tooltip title="Xóa">
                                <Button variant="ghost" buttonSize="small" danger onClick={() => handleDelete(record.id)}>
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
        setInitialParticipants(record.participants || []);
        form.setFieldsValue({
            ...record,
            meetingAt: dayjs(record.meetingAt),
            endAt: record.endAt ? dayjs(record.endAt) : undefined,
        });
        setIsModalVisible(true);
    };

    const openDetail = (record: Meeting) => {
        setViewingRecord(record);
        const myConfirm = record.confirmations?.find((c: any) => String(c.userId) === String(currentUser?.id));
        if (myConfirm && (String(myConfirm.rsvpStatus).toLowerCase() === 'accepted' || String(myConfirm.rsvpStatus).toLowerCase() === 'declined')) {
            setRsvpStatus(String(myConfirm.rsvpStatus).toLowerCase() as any);
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
            content: 'Bạn có chắc chắn muốn xóa lịch họp này?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: () => remove(id)
        });
    };

    const handleRsvp = async (status: 'accepted' | 'declined') => {
        if (!viewingRecord) return;
        setRsvpStatus(status);
        setIsSubmittingRsvp(true);
        try {
            const res = await meetingService.rsvp(viewingRecord.id, {
                rsvpStatus: status,
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

    const handleSaveMinutes = async (id: number, minutesData: any) => {
        setIsSubmittingRsvp(true);
        try {
            const res = await meetingService.update(id, minutesData);
            if (res.success) {
                // If submitted, we might want to close the detail modal too
                if (minutesData.minutesStatus === 'submitted') {
                    setIsDetailVisible(false);
                    // Also update status to completed if not already
                    await meetingService.setStatus(id, 'completed');
                }
                fetchAll();
            }
        } catch (error) {
            console.error("Save minutes failed:", error);
            message.error('Lưu biên bản thất bại');
        } finally {
            setIsSubmittingRsvp(false);
        }
    };

    const handleSaveAttendanceBatch = async (attendanceUpdates: Record<number, string>) => {
        if (!attendanceRecord) return;
        setIsSubmittingAttendance(true);
        try {
            const res = await meetingService.update(attendanceRecord.id, {
                attendanceUpdates
            });
            if (res.success) {
                message.success('Đã lưu kết quả điểm danh');
                setAttendanceRecord(null);
                fetchAll();
            }
        } catch (error) {
            console.error("Save attendance batch failed:", error);
            message.error('Lưu điểm danh thất bại');
        } finally {
            setIsSubmittingAttendance(false);
        }
    };

    const copyMeetingInfo = (record: Meeting) => {
        const info = `
📅 CUỘC HỌP: ${record.title}
📍 Địa điểm: ${record.location}
⏰ Thời gian: ${dayjs(record.meetingAt).format('HH:mm DD/MM/YYYY')}
        `.trim();
        navigator.clipboard.writeText(info);
        message.success('Đã sao chép thông tin');
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
            if (editingId) success = await update(editingId, formattedValues);
            else success = await create(formattedValues);

            if (success) {
                setIsModalVisible(false);
                form.resetFields();
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    const PageHeaderTitle = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h2 style={{ margin: 0 }}>{canCreate ? "Quản lý Lịch họp" : "Lịch họp của tôi"}</h2>
            <Button 
                variant="ghost" 
                buttonSize="small"
                icon={<QuestionCircleOutlined />} 
                onClick={() => setIsGuideModalVisible(true)}
                style={{ border: '1px solid #d9d9d9' }}
            >
                Hướng dẫn
            </Button>
        </div>
    );

    return (
        <div className="meetings-page-container">
            <DataTable
                title={PageHeaderTitle}
                extra={
                    <Access anyPermission={["meeting:create:all", "meeting:create:dept"]}>
                        <Button variant="primary" buttonSize="small" icon={<PlusOutlined />} onClick={openCreate}>
                            Lên lịch mới
                        </Button>
                    </Access>
                }
                headerContent={
                    <StatisticsCard
                        hideCard={true}
                        loading={loading}
                        data={[
                            { title: "Sắp diễn ra (24h)", value: stats.upcoming, icon: <CalendarOutlined />, valueColor: "#1890ff" },
                            { title: "Chờ xác nhận", value: stats.pendingRsvp, icon: <MessageOutlined />, valueColor: "#faad14" },
                            { title: "Trong tháng này", value: stats.totalMonth, icon: <ClockCircleOutlined />, valueColor: "#52c41a" }
                        ]}
                        statShadow={false}
                    />
                }
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                onRefresh={() => fetchAll()}
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                filters={filtersConfig}
                rowKey="id"
            />

            {/* Calendar View Modal */}
            <Modal
                title={
                    <Space>
                        <AppstoreOutlined style={{ color: 'var(--primary-color)' }} />
                        <span style={{ fontWeight: 700 }}>Lịch họp chi tiết</span>
                    </Space>
                }
                open={isCalendarModalVisible}
                onCancel={() => setIsCalendarModalVisible(false)}
                footer={[
                    <Button key="close" variant="outline" buttonSize="small" onClick={() => setIsCalendarModalVisible(false)} style={{ minWidth: 100 }}>
                        Đóng
                    </Button>
                ]}
                width={1000}
                centered
                className="calendar-modal"
            >
                <div style={{ marginTop: -12 }}>
                    <Spin spinning={loading}>
                        <ConfigProvider locale={vi_VN}>
                            <Calendar 
                                fullscreen={true}
                                value={calendarValue}
                                onChange={(val) => setCalendarValue(val)}
                                dateCellRender={(date) => {
                                    const dateStr = date.format('YYYY-MM-DD');
                                    const dayMeetings = data.filter(m => dayjs(m.meetingAt).format('YYYY-MM-DD') === dateStr);
                                    return (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {dayMeetings.map(m => (
                                                <li key={m.id} style={{ marginBottom: 4 }}>
                                                    <Tag 
                                                        style={{ 
                                                            width: '100%', 
                                                            margin: 0, 
                                                            fontSize: 10, 
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            background: 'var(--primary-color)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            fontWeight: 500
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetail(m);
                                                        }}
                                                    >
                                                        {dayjs(m.meetingAt).format('HH:mm')}{m.endAt ? `-${dayjs(m.endAt).format('HH:mm')}` : ''} {m.title}
                                                    </Tag>
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                }}
                            />
                        </ConfigProvider>
                    </Spin>
                </div>
            </Modal>

            <MeetingForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
                users={users}
                initialParticipants={initialParticipants}
            />

            <MeetingDetailModal
                open={isDetailVisible}
                onCancel={() => setIsDetailVisible(false)}
                record={viewingRecord}
                currentUser={currentUser}
                users={users}
                rsvpStatus={rsvpStatus}
                rsvpReason={rsvpReason}
                setRsvpReason={setRsvpReason}
                isSubmitting={isSubmittingRsvp}
                onRsvp={handleRsvp}
                canCreate={canCreate}
                onOpenMinutes={() => {
                    setIsDetailVisible(false);
                    setIsMinutesModalVisible(true);
                }}
            />

            <MeetingMinutesModal
                open={isMinutesModalVisible}
                onCancel={() => setIsMinutesModalVisible(false)}
                record={viewingRecord}
                users={users}
                currentUser={currentUser}
                onSave={handleSaveMinutes}
                isSubmitting={isSubmittingRsvp}
            />

            <MeetingAttendanceModal
                open={!!attendanceRecord}
                onCancel={() => setAttendanceRecord(null)}
                record={attendanceRecord}
                users={users}
                onSaveAttendance={handleSaveAttendanceBatch}
                isSaving={isSubmittingAttendance}
            />

            <Modal
                title="Hướng dẫn sử dụng"
                open={isGuideModalVisible}
                onCancel={() => setIsGuideModalVisible(false)}
                footer={
                    <Button
                        variant="primary"
                        buttonSize="small"
                        onClick={() => setIsGuideModalVisible(false)}
                        style={{ minWidth: 100, borderRadius: 8 }}
                    >
                        Đã hiểu
                    </Button>
                }
            >
                <div style={{ padding: '0 10px' }}>
                    <p><strong>1. Danh sách:</strong> Xem tất cả cuộc họp dưới dạng bảng.</p>
                    <p><strong>2. Lịch họp:</strong> Xem các cuộc họp theo ngày trên lịch tháng.</p>
                    <p><strong>3. RSVP:</strong> Xác nhận tham gia ngay trong chi tiết cuộc họp.</p>
                    <p><strong>4. Điểm danh:</strong> (Dành cho Admin/Leader) Cập nhật chuyên cần thực tế.</p>
                </div>
            </Modal>
        </div>
    );
};

export default MeetingsPage;
