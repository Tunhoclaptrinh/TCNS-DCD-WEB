import { useState, useEffect, useCallback } from 'react';
import {
    Table, Card, Button, Tag, Avatar, Badge, Modal, Form,
    Select, Input, Tooltip, Space, DatePicker, message, Tabs, Typography, Popconfirm,
} from 'antd';
import {
    LeftOutlined, RightOutlined, CalendarOutlined, SwapOutlined,
    CheckCircleOutlined, UserOutlined, PlusOutlined, EditOutlined,
    LockOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/vi';
import StatisticsCard from '../../components/common/StatisticsCard';
import { useAccess } from '../../hooks';
import dutyService from '../../services/duty.service';
import type { DutySlot, DutySwapRequest, DutyStats } from '../../types/duty.types';

dayjs.extend(isoWeek);
dayjs.locale('vi');

const SHIFT_LABELS: Record<string, string> = {
    morning: 'Ca sáng',
    afternoon: 'Ca chiều',
    evening: 'Ca tối',
};

const SHIFT_ORDER = ['morning', 'afternoon', 'evening'];

const STATUS_COLORS: Record<string, string> = {
    open: '#52c41a',
    full: '#faad14',
    locked: '#d9d9d9',
    cancelled: '#ff4d4f',
};

const STATUS_LABELS: Record<string, string> = {
    open: 'Mở',
    full: 'Đầy',
    locked: 'Khóa',
    cancelled: 'Hủy',
};

const SWAP_STATUS_COLORS: Record<string, string> = {
    pending: 'processing',
    approved: 'success',
    rejected: 'error',
};

const SWAP_STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
};

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

const isFormValidationError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'errorFields' in error;

const DutyPage = () => {
    const { hasPermission } = useAccess();
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('isoWeek' as dayjs.OpUnitType)
    );
    const [slots, setSlots] = useState<DutySlot[]>([]);
    const [swapRequests, setSwapRequests] = useState<DutySwapRequest[]>([]);
    const [stats, setStats] = useState<DutyStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [swapLoading, setSwapLoading] = useState(false);
    const [slotFormOpen, setSlotFormOpen] = useState(false);
    const [swapFormOpen, setSwapFormOpen] = useState(false);
    const [decideModalOpen, setDecideModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<DutySlot | null>(null);
    const [selectedSwap, setSelectedSwap] = useState<DutySwapRequest | null>(null);
    const [selectedSlotForSwap, setSelectedSlotForSwap] = useState<DutySlot | null>(null);
    const [slotForm] = Form.useForm();
    const [swapForm] = Form.useForm();
    const [decideForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState('schedule');

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const res = await dutyService.getWeeklySchedule(
                currentWeekStart.format('YYYY-MM-DD')
            );
            const data = res.data;
            setSlots(Array.isArray(data) ? data : []);
        } catch {
            message.error('Không thể tải lịch trực');
        } finally {
            setLoading(false);
        }
    }, [currentWeekStart]);

    const fetchSwapRequests = useCallback(async () => {
        setSwapLoading(true);
        try {
            const res = await dutyService.getSwapRequests();
            const data = res.data;
            setSwapRequests(Array.isArray(data) ? data : []);
        } catch {
            message.error('Không thể tải yêu cầu đổi ca');
        } finally {
            setSwapLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await dutyService.getStats();
            setStats(res.data as DutyStats);
        } catch {
            // silent fail
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
        fetchStats();
    }, [fetchSchedule, fetchStats]);

    useEffect(() => {
        if (activeTab === 'swaps') {
            fetchSwapRequests();
        }
    }, [activeTab, fetchSwapRequests]);

    // Build 7-day headers
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = currentWeekStart.add(i, 'day');
        return {
            label: day.format('ddd DD/MM'),
            date: day.format('YYYY-MM-DD'),
        };
    });

    // Group slots by shift + date
    const slotMap: Record<string, Record<string, DutySlot>> = {};
    slots.forEach((slot) => {
        if (!slotMap[slot.shift]) slotMap[slot.shift] = {};
        slotMap[slot.shift][slot.date] = slot;
    });

    const allShifts = Array.from(
        new Set([...SHIFT_ORDER, ...slots.map((s) => s.shift)])
    ).filter((s) => SHIFT_ORDER.includes(s) || slots.some((sl) => sl.shift === s));

    const handleRegister = async (slot: DutySlot) => {
        try {
            await dutyService.registerToSlot(slot.id);
            message.success('Đăng ký ca trực thành công');
            fetchSchedule();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, 'Đăng ký thất bại'));
        }
    };

    const handleCancelReg = async (slot: DutySlot) => {
        try {
            await dutyService.cancelRegistration(slot.id);
            message.success('Hủy đăng ký thành công');
            fetchSchedule();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, 'Hủy thất bại'));
        }
    };

    const handleOpenSwapModal = (slot: DutySlot) => {
        setSelectedSlotForSwap(slot);
        swapForm.resetFields();
        setSwapFormOpen(true);
    };

    const handleSwapSubmit = async () => {
        try {
            const values = await swapForm.validateFields();
            await dutyService.requestSwap({
                slotId: selectedSlotForSwap!.id,
                targetId: Number(values.targetId),
                reason: values.reason,
            });
            message.success('Yêu cầu đổi ca đã được gửi');
            setSwapFormOpen(false);
            swapForm.resetFields();
        } catch (error: unknown) {
            if (isFormValidationError(error)) return;
            message.error(getErrorMessage(error, 'Gửi yêu cầu thất bại'));
        }
    };

    const handleOpenSlotForm = (slot?: DutySlot) => {
        setEditingSlot(slot || null);
        if (slot) {
            slotForm.setFieldsValue({
                shift: slot.shift,
                date: dayjs(slot.date),
                location: slot.location,
                capacity: slot.capacity,
                notes: slot.notes,
            });
        } else {
            slotForm.resetFields();
        }
        setSlotFormOpen(true);
    };

    const handleSlotSubmit = async () => {
        try {
            const values = await slotForm.validateFields();
            const payload = {
                ...values,
                date: values.date?.format('YYYY-MM-DD'),
                capacity: Number(values.capacity),
            };
            if (editingSlot) {
                await dutyService.updateSlot(editingSlot.id, payload);
                message.success('Cập nhật ca trực thành công');
            } else {
                await dutyService.createSlot(payload);
                message.success('Tạo ca trực thành công');
            }
            setSlotFormOpen(false);
            slotForm.resetFields();
            fetchSchedule();
            fetchStats();
        } catch (error: unknown) {
            if (isFormValidationError(error)) return;
            message.error(getErrorMessage(error, 'Lưu thất bại'));
        }
    };

    const handleDecide = async () => {
        try {
            const values = await decideForm.validateFields();
            await dutyService.decideSwap(selectedSwap!.id, values.decision, values.reason);
            message.success('Đã xử lý yêu cầu đổi ca');
            setDecideModalOpen(false);
            decideForm.resetFields();
            fetchSwapRequests();
            fetchSchedule();
        } catch (error: unknown) {
            if (isFormValidationError(error)) return;
            message.error(getErrorMessage(error, 'Xử lý thất bại'));
        }
    };

    // --- Weekly schedule table ---
    const scheduleColumns = [
        {
            title: 'Ca trực',
            dataIndex: 'shift',
            key: 'shift',
            width: 110,
            fixed: 'left' as const,
            render: (shift: string) => (
                <Tag color="blue" style={{ fontWeight: 600 }}>
                    {SHIFT_LABELS[shift] || shift}
                </Tag>
            ),
        },
        ...weekDays.map(({ label, date }) => ({
            title: label,
            key: date,
            render: (_: unknown, row: { shift: string }) => {
                const slot = slotMap[row.shift]?.[date];
                if (!slot) {
                    return (
                        <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 18 }}>
                            —
                            {hasPermission('duty:manage') && (
                                <div style={{ marginTop: 4 }}>
                                    <Button
                                        size="small"
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            slotForm.setFieldsValue({
                                                shift: row.shift,
                                                date: dayjs(date),
                                            });
                                            setEditingSlot(null);
                                            setSlotFormOpen(true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                }

                const isFull = slot.assignedUsers.length >= slot.capacity;

                return (
                    <div style={{ minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Badge
                                color={STATUS_COLORS[slot.status] || '#d9d9d9'}
                                text={
                                    <span style={{ fontSize: 12 }}>{STATUS_LABELS[slot.status] || slot.status}</span>
                                }
                            />
                            <span style={{ fontSize: 11, color: '#888' }}>
                                {slot.assignedUsers.length}/{slot.capacity}
                            </span>
                        </div>
                        {slot.location && (
                            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>
                                📍 {slot.location}
                            </div>
                        )}
                        {slot.assignedUsers.length > 0 && (
                            <Avatar.Group maxCount={3} size="small" style={{ marginBottom: 6 }}>
                                {slot.assignedUsers.map((u) => (
                                    <Tooltip key={u.id} title={u.name}>
                                        <Avatar src={u.avatar} size="small" style={{ fontSize: 10 }}>
                                            {u.name?.charAt(0)?.toUpperCase()}
                                        </Avatar>
                                    </Tooltip>
                                ))}
                            </Avatar.Group>
                        )}
                        {slot.status !== 'cancelled' && (
                            <Space size={4} wrap style={{ marginTop: 4 }}>
                                {hasPermission('duty:register') && slot.status === 'open' && !isFull && (
                                    <Popconfirm
                                        title="Đăng ký ca này?"
                                        onConfirm={() => handleRegister(slot)}
                                        okText="Đăng ký"
                                        cancelText="Hủy"
                                    >
                                        <Button size="small" type="primary">
                                            Đăng ký
                                        </Button>
                                    </Popconfirm>
                                )}
                                {hasPermission('duty:register') && slot.status === 'open' && (
                                    <Popconfirm
                                        title="Hủy đăng ký ca này?"
                                        onConfirm={() => handleCancelReg(slot)}
                                        okText="Hủy đăng ký"
                                        cancelText="Không"
                                    >
                                        <Button size="small" danger>
                                            Hủy
                                        </Button>
                                    </Popconfirm>
                                )}
                                {hasPermission('duty:register') && (
                                    <Tooltip title="Yêu cầu đổi ca">
                                        <Button
                                            size="small"
                                            icon={<SwapOutlined />}
                                            onClick={() => handleOpenSwapModal(slot)}
                                        />
                                    </Tooltip>
                                )}
                                {hasPermission('duty:manage') && (
                                    <Tooltip title="Chỉnh sửa">
                                        <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => handleOpenSlotForm(slot)}
                                        />
                                    </Tooltip>
                                )}
                            </Space>
                        )}
                    </div>
                );
            },
        })),
    ];

    const scheduleDataSource = allShifts.map((shift) => ({ shift, key: shift }));

    // --- Swap requests table ---
    const swapColumns = [
        {
            title: 'Người yêu cầu',
            key: 'requester',
            render: (_: unknown, record: DutySwapRequest) =>
                record.requester?.name || `ID: ${record.requesterId}`,
        },
        {
            title: 'Người đổi',
            key: 'target',
            render: (_: unknown, record: DutySwapRequest) =>
                record.target?.name || `ID: ${record.targetId}`,
        },
        {
            title: 'Ca trực',
            key: 'slot',
            render: (_: unknown, record: DutySwapRequest) =>
                record.slot
                    ? `${SHIFT_LABELS[record.slot.shift] || record.slot.shift} — ${record.slot.date}`
                    : `Slot #${record.slotId}`,
        },
        {
            title: 'Lý do',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            render: (val: string) => val || <span style={{ color: '#bfbfbf' }}>—</span>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={SWAP_STATUS_COLORS[status] || 'default'}>
                    {SWAP_STATUS_LABELS[status] || status}
                </Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (val: string) =>
                val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (_: unknown, record: DutySwapRequest) =>
                record.status === 'pending' && hasPermission('duty:approve_swap') ? (
                    <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                            setSelectedSwap(record);
                            decideForm.resetFields();
                            setDecideModalOpen(true);
                        }}
                    >
                        Xử lý
                    </Button>
                ) : null,
        },
    ];

    const statsData = [
        {
            title: 'Tổng ca trực',
            value: stats?.total ?? 0,
            icon: <CalendarOutlined />,
            valueColor: 'var(--primary-color)',
        },
        {
            title: 'Ca đang mở',
            value: stats?.open ?? 0,
            icon: <CheckCircleOutlined />,
            valueColor: '#52c41a',
        },
        {
            title: 'Ca đã khóa',
            value: stats?.locked ?? 0,
            icon: <LockOutlined />,
            valueColor: '#722ed1',
        },
        {
            title: 'Tổng lượt đăng ký',
            value: stats?.totalAssigned ?? 0,
            icon: <UserOutlined />,
            valueColor: '#fa8c16',
        },
    ];

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <Typography.Title level={3} style={{ margin: 0 }}>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Lịch trực
                </Typography.Title>
                {hasPermission('duty:manage') && activeTab === 'schedule' && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenSlotForm()}
                    >
                        Thêm ca trực
                    </Button>
                )}
            </div>

            <StatisticsCard
                hideCard
                data={statsData}
                colSpan={{ xs: 24, sm: 12, md: 6 }}
                rowGutter={12}
                statShadow={false}
                containerStyle={{ marginBottom: 24 }}
            />

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'schedule',
                        label: (
                            <span>
                                <CalendarOutlined /> Lịch tuần
                            </span>
                        ),
                        children: (
                            <Card>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}
                                >
                                    <Button
                                        icon={<LeftOutlined />}
                                        onClick={() =>
                                            setCurrentWeekStart((d) => d.subtract(1, 'week'))
                                        }
                                    >
                                        Tuần trước
                                    </Button>
                                    <Typography.Title level={5} style={{ margin: 0 }}>
                                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                                        Tuần {currentWeekStart.isoWeek()} (
                                        {currentWeekStart.format('DD/MM')} –{' '}
                                        {currentWeekStart.add(6, 'day').format('DD/MM/YYYY')})
                                    </Typography.Title>
                                    <Button
                                        icon={<RightOutlined />}
                                        onClick={() =>
                                            setCurrentWeekStart((d) => d.add(1, 'week'))
                                        }
                                    >
                                        Tuần sau
                                    </Button>
                                </div>
                                <Table
                                    loading={loading}
                                    dataSource={scheduleDataSource}
                                    columns={scheduleColumns}
                                    pagination={false}
                                    scroll={{ x: 'max-content' }}
                                    bordered
                                    size="middle"
                                />
                            </Card>
                        ),
                    },
                    {
                        key: 'swaps',
                        label: (
                            <span>
                                <SwapOutlined /> Yêu cầu đổi ca
                            </span>
                        ),
                        children: (
                            <Card>
                                <Table
                                    loading={swapLoading}
                                    dataSource={swapRequests}
                                    columns={swapColumns}
                                    rowKey="id"
                                    pagination={{ pageSize: 10, showSizeChanger: true }}
                                    scroll={{ x: 'max-content' }}
                                />
                            </Card>
                        ),
                    },
                ]}
            />

            {/* Slot Form Modal */}
            <Modal
                open={slotFormOpen}
                title={editingSlot ? 'Cập nhật ca trực' : 'Thêm ca trực'}
                onCancel={() => {
                    setSlotFormOpen(false);
                    slotForm.resetFields();
                }}
                onOk={handleSlotSubmit}
                okText="Lưu lại"
                cancelText="Hủy"
                width={480}
                destroyOnClose
            >
                <Form form={slotForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="date"
                        label="Ngày"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                    >
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item
                        name="shift"
                        label="Ca"
                        rules={[{ required: true, message: 'Vui lòng chọn ca' }]}
                    >
                        <Select
                            options={[
                                { value: 'morning', label: 'Ca sáng' },
                                { value: 'afternoon', label: 'Ca chiều' },
                                { value: 'evening', label: 'Ca tối' },
                            ]}
                            placeholder="Chọn ca trực"
                        />
                    </Form.Item>
                    <Form.Item name="location" label="Địa điểm">
                        <Input placeholder="Nhập địa điểm trực" />
                    </Form.Item>
                    <Form.Item
                        name="capacity"
                        label="Sức chứa (số người)"
                        rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}
                    >
                        <Input type="number" min={1} placeholder="Số người tối đa" />
                    </Form.Item>
                    <Form.Item name="notes" label="Ghi chú">
                        <Input.TextArea rows={3} placeholder="Ghi chú thêm về ca trực" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Swap Request Modal */}
            <Modal
                open={swapFormOpen}
                title="Yêu cầu đổi ca"
                onCancel={() => {
                    setSwapFormOpen(false);
                    swapForm.resetFields();
                }}
                onOk={handleSwapSubmit}
                okText="Gửi yêu cầu"
                cancelText="Hủy"
                width={440}
                destroyOnClose
            >
                <Form form={swapForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label="Ca trực cần đổi">
                        <Input
                            disabled
                            value={
                                selectedSlotForSwap
                                    ? `${SHIFT_LABELS[selectedSlotForSwap.shift] || selectedSlotForSwap.shift} — ${selectedSlotForSwap.date}`
                                    : ''
                            }
                        />
                    </Form.Item>
                    <Form.Item
                        name="targetId"
                        label="ID người đổi ca"
                        rules={[{ required: true, message: 'Vui lòng nhập ID người đổi' }]}
                    >
                        <Input type="number" placeholder="Nhập ID thành viên đổi ca" />
                    </Form.Item>
                    <Form.Item name="reason" label="Lý do đổi ca">
                        <Input.TextArea rows={3} placeholder="Lý do bạn muốn đổi ca" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Decide Swap Modal */}
            <Modal
                open={decideModalOpen}
                title="Xử lý yêu cầu đổi ca"
                onCancel={() => {
                    setDecideModalOpen(false);
                    decideForm.resetFields();
                }}
                onOk={handleDecide}
                okText="Xác nhận"
                cancelText="Hủy"
                width={400}
                destroyOnClose
            >
                {selectedSwap && (
                    <div
                        style={{
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                            fontSize: 13,
                        }}
                    >
                        <div>
                            <b>Người yêu cầu:</b>{' '}
                            {selectedSwap.requester?.name || `ID: ${selectedSwap.requesterId}`}
                        </div>
                        <div>
                            <b>Người đổi:</b>{' '}
                            {selectedSwap.target?.name || `ID: ${selectedSwap.targetId}`}
                        </div>
                        {selectedSwap.reason && (
                            <div>
                                <b>Lý do:</b> {selectedSwap.reason}
                            </div>
                        )}
                    </div>
                )}
                <Form form={decideForm} layout="vertical">
                    <Form.Item
                        name="decision"
                        label="Quyết định"
                        rules={[{ required: true, message: 'Vui lòng chọn quyết định' }]}
                    >
                        <Select
                            options={[
                                { value: 'approved', label: '✅ Phê duyệt' },
                                { value: 'rejected', label: '❌ Từ chối' },
                            ]}
                            placeholder="Chọn quyết định"
                        />
                    </Form.Item>
                    <Form.Item name="reason" label="Ghi chú (tuỳ chọn)">
                        <Input.TextArea rows={2} placeholder="Lý do quyết định" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default DutyPage;
