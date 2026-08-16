import { useState, useMemo, useEffect } from 'react';
import { 
    Form, Space, Typography, message, 
    Modal,
    Tooltip,
    Tag,
    Calendar,
    Spin,
    ConfigProvider,
    Dropdown,
    Menu,
    Select,
    DatePicker
} from 'antd';
import { 
    CalendarOutlined, EditOutlined, DeleteOutlined, 
    EyeOutlined, QuestionCircleOutlined,
    CheckCircleOutlined, 
    AppstoreOutlined, CopyOutlined, PlusOutlined,
    MessageOutlined, ClockCircleOutlined,
    MenuOutlined, FileDoneOutlined, StopOutlined,
    FileTextOutlined
} from '@ant-design/icons';
const { Text } = Typography;
const { RangePicker } = DatePicker;
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
import MeetingMinutesViewModal from './components/MeetingMinutesViewModal';
import CancelMeetingModal from './components/CancelMeetingModal';
import notificationService from '@/services/notification.service';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import vi_VN from 'antd/es/locale/vi_VN';
import { useAccess } from '@/hooks';
import './styles.less';

dayjs.locale('vi');

const MeetingsPage = () => {
    const { hasPermission, user: currentUser } = useAccess();
    
    // Role-based Permissions
    const canCreate = useMemo(() => hasPermission('meeting:create:all') || hasPermission('meeting:create:dept'), [hasPermission]);
    const canManageAll = useMemo(() => hasPermission('meeting:create:all') || currentUser?.permissions?.includes('*'), [hasPermission, currentUser]);
    const canAttendance = useMemo(() => hasPermission('meeting:attendance') || canManageAll, [hasPermission, canManageAll]);
    const canEditSubmitted = useMemo(() => hasPermission('meeting:minutes:edit_submitted') || canManageAll, [hasPermission, canManageAll]);

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
        updateFilters,
        filters,
    } = useCRUD(meetingService, {
        autoFetch: true,
        pageSize: 10,
        defaultSort: 'meetingAt',
        defaultOrder: 'descend',
    });

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
    const [isMinutesModalVisible, setIsMinutesModalVisible] = useState(false);
    const [isMinutesViewModalVisible, setIsMinutesViewModalVisible] = useState(false);
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
    const [cancelRecord, setCancelRecord] = useState<Meeting | null>(null);
    const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
    
    // Overdue Popup State
    const [overdueMeetingsPopup, setOverdueMeetingsPopup] = useState<Meeting[]>([]);
    const [overdueStatusSelections, setOverdueStatusSelections] = useState<Record<number, string>>({});
    const [hasShownOverduePopup, setHasShownOverduePopup] = useState(false);
    const [isUpdatingOverdue, setIsUpdatingOverdue] = useState(false);
    
    const { data: users } = useCRUD(userService, {
        autoFetch: true,
        pageSize: 1000,
    });

    useEffect(() => {
        if (!data || data.length === 0 || loading || !canManageAll || hasShownOverduePopup) return;

        const now = dayjs();
        const overdues = data.filter(m => {
            const targetTime = m.endAt || m.meetingAt;
            return m.status === 'scheduled' && targetTime && dayjs(targetTime).isBefore(now);
        });

        if (overdues.length > 0) {
            setOverdueMeetingsPopup(overdues);
            const initialSelections: Record<number, string> = {};
            overdues.forEach(m => initialSelections[m.id] = 'overdue');
            setOverdueStatusSelections(initialSelections);
            setHasShownOverduePopup(true);
        }
    }, [data, loading, canManageAll, hasShownOverduePopup]);

    // Statistics logic from backend
    const [stats, setStats] = useState({ upcoming: 0, pendingRsvp: 0, totalMonth: 0, overdue: 0 });

    const fetchStats = async () => {
        try {
            const params: any = {};
            Object.keys(filters).forEach(key => {
                params[key] = filters[key];
            });
            const res = await meetingService.getStats(params);
            if (res?.data) {
                setStats(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch meeting stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [data, filters]);
    
    // Advanced Filters Config (đã được thay thế bằng Quick Filters trực quan)
    const filtersConfig = useMemo((): any[] => [], []);

    const openCalendarAt = (date: any) => {
        setCalendarValue(dayjs(date));
        setIsCalendarModalVisible(true);
    };

    const columns: DataTableColumn<Meeting>[] = [
        {
            title: "Cuộc họp",
            dataIndex: "title",
            key: "title",
            width: 250,
            sorter: true,
            searchable: true,
            render: (_: any, record: Meeting) => (
                <Text strong style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => openDetail(record)}>
                    {record.title}
                </Text>
            )
        },
        {
            title: "Thời gian",
            dataIndex: "meetingAt",
            key: "meetingAt",
            width: 180,
            sorter: true,
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
            sorter: true,
            render: (status: string) => {
                const colors: any = { scheduled: 'blue', completed: 'green', cancelled: 'red', overdue: 'warning' };
                const texts: any = { scheduled: 'Sắp diễn ra', completed: 'Đã xong', cancelled: 'Đã hủy', overdue: 'Quá hạn' };
                return <Tag color={colors[status]}>{texts[status]}</Tag>;
            }
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 100,
            fixed: 'right',
            align: 'center',
            render: (_: any, record: Meeting) => {
                const isCreator = record.createdBy === currentUser?.id;
                const canEdit = canManageAll || (canCreate && isCreator);
                
                const menuItems = (
                    <Menu>
                        <Menu.Item key="calendar" icon={<AppstoreOutlined />} onClick={() => openCalendarAt(record.meetingAt)}>
                            Xem trên lịch
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                            key="edit"
                            icon={<EditOutlined />}
                            onClick={() => canEdit ? openEdit(record) : undefined}
                            disabled={!canEdit}
                            title={!canEdit ? 'Bạn không có quyền chỉnh sửa' : undefined}
                        >
                            Chỉnh sửa
                        </Menu.Item>
                        {(record.status === 'scheduled' || record.status === 'overdue') && (
                            <Menu.Item
                                key="attendance"
                                icon={<CheckCircleOutlined />}
                                onClick={() => canAttendance ? setAttendanceRecord(record) : undefined}
                                disabled={!canAttendance}
                                title={!canAttendance ? 'Bạn không có quyền điểm danh' : undefined}
                                style={{ color: canAttendance ? '#faad14' : undefined }}
                            >
                                Điểm danh
                            </Menu.Item>
                        )}
                        <Menu.Item
                            key="minutes"
                            icon={<FileDoneOutlined />}
                            onClick={() => {
                                if (!canEdit) return;
                                setViewingRecord(record);
                                setIsMinutesModalVisible(true);
                            }}
                            disabled={!canEdit}
                            title={!canEdit ? 'Bạn không có quyền ghi biên bản' : undefined}
                            style={{ color: canEdit ? '#faad14' : undefined }}
                        >
                            {record.minutesStatus === 'submitted' ? 'Sửa biên bản' : 'Ghi biên bản'}
                        </Menu.Item>
                        {record.minutesStatus === 'submitted' && (
                            <Menu.Item
                                key="view-minutes"
                                icon={<FileTextOutlined />}
                                onClick={() => openMinutesView(record)}
                                style={{ color: '#52c41a' }}
                            >
                                Xem biên bản
                            </Menu.Item>
                        )}
                        <Menu.Item key="copy" icon={<CopyOutlined />} onClick={() => copyMeetingInfo(record)}>
                            Sao chép thông tin
                        </Menu.Item>
                        {(record.status === 'scheduled' || record.status === 'overdue') && (
                            <>
                                <Menu.Divider />
                                <Menu.Item
                                    key="cancel"
                                    icon={<StopOutlined />}
                                    onClick={() => canManageAll ? setCancelRecord(record) : undefined}
                                    disabled={!canManageAll}
                                    title={!canManageAll ? 'Bạn không có quyền hủy cuộc họp' : undefined}
                                    danger
                                >
                                    Hủy cuộc họp
                                </Menu.Item>
                            </>
                        )}
                        <Menu.Divider />
                        <Menu.Item
                            key="delete"
                            icon={<DeleteOutlined />}
                            onClick={() => canManageAll ? handleDelete(record.id) : undefined}
                            disabled={!canManageAll}
                            title={!canManageAll ? 'Bạn không có quyền xóa' : undefined}
                            danger
                        >
                            Xóa vĩnh viễn
                        </Menu.Item>
                    </Menu>
                );

                return (
                    <Space size={4}>
                        <Tooltip title="Xem chi tiết">
                            <Button variant="ghost" buttonSize="small" style={{ color: 'var(--primary-color)', padding: '4px' }} onClick={() => openDetail(record)}>
                                <EyeOutlined style={{ fontSize: 16 }} />
                            </Button>
                        </Tooltip>
                        <Dropdown overlay={menuItems} trigger={['click']} placement="bottomRight">
                            <Button variant="ghost" buttonSize="small" style={{ padding: '4px' }}>
                                <MenuOutlined style={{ fontSize: 16 }} />
                            </Button>
                        </Dropdown>
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

    const openMinutesView = (record: Meeting) => {
        if (record.minutesStatus !== 'submitted') {
            message.info('Cuộc họp này chưa có biên bản hoàn tất');
            return;
        }

        setViewingRecord(record);
        setIsMinutesViewModalVisible(true);
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

    const handleCancelMeeting = async (reason: string, sendNotify: boolean) => {
        if (!cancelRecord) return;
        setIsCancelSubmitting(true);
        try {
            const res = await meetingService.update(cancelRecord.id, {
                status: 'cancelled' as any,
                note: `[HỦY HỌ P - ${dayjs().format('DD/MM/YYYY HH:mm')}]: ${reason}`,
            });
            if (res.success) {
                message.warning('Dạ hủy cuộc họp thành công');
                // Send broadcast notification if requested
                if (sendNotify) {
                    const participantIds = cancelRecord.isAllParticipants
                        ? users.map(u => Number(u.id))
                        : (cancelRecord.participantIds || []).map(Number);
                    if (participantIds.length > 0) {
                        try {
                            await notificationService.broadcast({
                                userIds: participantIds,
                                title: '❌ Cuộc họp bị hủy',
                                message: `Cuộc họp "${cancelRecord.title}" (${dayjs(cancelRecord.meetingAt).format('HH:mm DD/MM/YYYY')}) đã bị hủy.\nLý do: ${reason}`,
                                type: 'meeting_cancelled',
                                relatedId: cancelRecord.id,
                                relatedType: 'meeting',
                            });
                            message.success(`Đã gửi thông báo đến ${participantIds.length} thành viên`);
                        } catch {
                            message.warning('Hủy thành công nhưng gửi thông báo thất bại');
                        }
                    }
                }
                setCancelRecord(null);
                fetchAll();
            }
        } catch (error) {
            console.error('Cancel meeting failed:', error);
            message.error('Hủy cuộc họp thất bại');
        } finally {
            setIsCancelSubmitting(false);
        }
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
                if (minutesData.minutesStatus === 'submitted') {
                    setIsDetailVisible(false);
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

    const handleBulkUpdateOverdue = async () => {
        setIsUpdatingOverdue(true);
        try {
            const promises = overdueMeetingsPopup.map(m => {
                const newStatus = overdueStatusSelections[m.id];
                if (newStatus !== 'scheduled') {
                    return meetingService.update(m.id, { status: newStatus as any });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            message.success('Đã cập nhật trạng thái các cuộc họp quá hạn');
            setOverdueMeetingsPopup([]);
            fetchAll();
        } catch (error) {
            message.error('Cập nhật thất bại');
        } finally {
            setIsUpdatingOverdue(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{canCreate ? "Quản lý Lịch họp" : "Lịch họp của tôi"}</h2>
            
            <Space style={{ flexWrap: 'wrap' }}>
                <RangePicker 
                    placeholder={['Từ ngày', 'Đến ngày']} 
                    format="DD/MM/YYYY"
                    onChange={(dates: any) => {
                        if (dates && dates[0] && dates[1]) {
                            updateFilters({
                                meetingAt_gte: dates[0].startOf('day').toISOString(),
                                meetingAt_lte: dates[1].endOf('day').toISOString(),
                            });
                        } else {
                            updateFilters({
                                meetingAt_gte: null,
                                meetingAt_lte: null,
                            });
                        }
                    }}
                />
                
                <Select 
                    placeholder="Tất cả trạng thái"
                    style={{ width: 160 }}
                    allowClear
                    onChange={(val) => updateFilters({ status: val || null })}
                    options={[
                        { label: 'Đã lên lịch', value: 'scheduled' },
                        { label: 'Quá hạn', value: 'overdue' },
                        { label: 'Đã hoàn thành', value: 'completed' },
                        { label: 'Đã hủy', value: 'cancelled' },
                    ]}
                />

                <Button 
                    variant="ghost" 
                    buttonSize="small"
                    icon={<QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />} 
                    onClick={() => setIsGuideModalVisible(true)}
                    style={{ 
                        color: '#595959', 
                        border: '1px solid #d9d9d9',
                        height: 32 
                    }}
                >
                    Hướng dẫn
                </Button>
            </Space>
        </div>
    );

    return (
        <div className="meetings-page-container">
            <DataTable
                title={PageHeaderTitle}
                extra={
                    <Access anyPermission={["meeting:create:all", "meeting:create:dept"]} behavior="disable">
                        <Button variant="primary" buttonSize="small" icon={<PlusOutlined />} onClick={openCreate}>
                            Lên lịch mới
                        </Button>
                    </Access>
                }
                headerContent={
                    <StatisticsCard
                        hideCard={true}
                        loading={loading}
                        colSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
                        data={[
                            { title: "Sắp diễn ra", value: stats.upcoming, icon: <CalendarOutlined />, valueColor: "#1890ff" },
                            { title: "Chờ xác nhận", value: stats.pendingRsvp, icon: <MessageOutlined />, valueColor: "#faad14" },
                            { title: "Quá hạn", value: stats.overdue, icon: <ClockCircleOutlined />, valueColor: "#fa8c16" },
                            { title: "Trong tháng này", value: stats.totalMonth, icon: <FileDoneOutlined />, valueColor: "#52c41a" }
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
                zIndex={102}
    
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
                canEditSubmitted={canEditSubmitted}
                onOpenMinutes={() => {
                    setIsDetailVisible(false);
                    setIsMinutesModalVisible(true);
                }}
                onViewMinutes={() => {
                    setIsDetailVisible(false);
                    if (viewingRecord) {
                        openMinutesView(viewingRecord);
                    }
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

            <MeetingMinutesViewModal
                open={isMinutesViewModalVisible}
                onCancel={() => setIsMinutesViewModalVisible(false)}
                record={viewingRecord}
                users={users}
            />

            <MeetingAttendanceModal
                open={!!attendanceRecord}
                onCancel={() => setAttendanceRecord(null)}
                record={attendanceRecord}
                users={users}
                onSaveAttendance={handleSaveAttendanceBatch}
                isSaving={isSubmittingAttendance}
            />

            <CancelMeetingModal
                open={!!cancelRecord}
                onCancel={() => setCancelRecord(null)}
                record={cancelRecord}
                users={users}
                onConfirm={handleCancelMeeting}
                isSubmitting={isCancelSubmitting}
            />

            <Modal
                title="Hướng dẫn sử dụng"
                open={isGuideModalVisible}
                onCancel={() => setIsGuideModalVisible(false)}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '12px 0 4px 0' }}>
                        <Button
                            variant="primary"
                            buttonSize="small"
                            onClick={() => setIsGuideModalVisible(false)}
                            style={{ minWidth: 88 }}
                        >
                            Đã hiểu
                        </Button>
                    </div>
                }
            >
                <div style={{ padding: '0 10px' }}>
                    <p><strong>1. Danh sách:</strong> Xem tất cả cuộc họp dưới dạng bảng.</p>
                    <p><strong>2. Lịch họp:</strong> Xem các cuộc họp theo ngày trên lịch tháng.</p>
                    <p><strong>3. RSVP:</strong> Xác nhận tham gia ngay trong chi tiết cuộc họp.</p>
                    <p><strong>4. Điểm danh:</strong> (Dành cho Admin/Leader) Cập nhật chuyên cần thực tế.</p>
                </div>
            </Modal>

            <Modal
                title="⚠️ Phát hiện Cuộc họp đã qua thời gian"
                open={overdueMeetingsPopup.length > 0}
                onCancel={() => setOverdueMeetingsPopup([])}
                footer={[
                    <Button key="skip" variant="outline" buttonSize="small" onClick={() => setOverdueMeetingsPopup([])}>
                        Bỏ qua
                    </Button>,
                    <Button key="submit" variant="primary" buttonSize="small" loading={isUpdatingOverdue} onClick={handleBulkUpdateOverdue}>
                        Cập nhật trạng thái
                    </Button>
                ]}
                width={700}
                zIndex={1001}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>Có <strong>{overdueMeetingsPopup.length}</strong> cuộc họp đã qua thời gian dự kiến nhưng chưa được cập nhật trạng thái.</Text>
                    <br/>
                    <Text type="secondary">Gợi ý: Hãy chuyển thành "Đã hoàn thành" nếu cuộc họp đã diễn ra trót lọt, hoặc giữ nguyên "Quá hạn" (mặc định).</Text>
                </div>
                
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {overdueMeetingsPopup.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ flex: 1, paddingRight: 16 }}>
                                <Text strong>{m.title}</Text>
                                <br/>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(m.meetingAt).format('HH:mm DD/MM/YYYY')} 
                                    {m.endAt ? ` - ${dayjs(m.endAt).format('HH:mm DD/MM/YYYY')}` : ''}
                                </Text>
                            </div>
                            <div style={{ width: 150 }}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={overdueStatusSelections[m.id]}
                                    onChange={(val) => setOverdueStatusSelections(prev => ({ ...prev, [m.id]: val }))}
                                    options={[
                                        { label: 'Quá hạn', value: 'overdue' },
                                        { label: 'Đã hoàn thành', value: 'completed' },
                                        { label: 'Đã hủy', value: 'cancelled' },
                                    ]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default MeetingsPage;
