import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Tabs, Divider, Alert, DatePicker, Row, Col, Tooltip, Tag, Checkbox, Badge, Popconfirm, Dropdown, Menu } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ScheduleOutlined, SettingOutlined,
  InboxOutlined,
  LeftOutlined, RightOutlined, LayoutOutlined,
  QuestionCircleOutlined,
  LockOutlined, UnlockOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined, PlusSquareOutlined, InfoCircleOutlined,
  DownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import dutyService, { DutyShift } from '@/services/duty.service';
import userService from '@/services/user.service';
import DataTable from '@/components/common/DataTable';
import StatisticsCard from '@/components/common/StatisticsCard';
import ShiftTemplateModal from './components/ShiftTemplateModal';
import GroupModal from './components/GroupModal';
import KipModal from './components/KipModal';
import SlotEditModal from './components/SlotEditModal';

const { Text, Title } = Typography;

const DutyManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotFilterWeek, setSlotFilterWeek] = useState(dayjs().startOf('isoWeek' as any));

  // Modals Visibility
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isKipModalOpen, setIsKipModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSlotEditModalOpen, setIsSlotEditModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Forms
  const [shiftForm] = Form.useForm();
  const [coordinationForm] = Form.useForm();
  const [manualSlotForm] = Form.useForm();

  // Selected Items for Editing
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [editingKip, setEditingKip] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [selectedShiftTemplate, setSelectedShiftTemplate] = useState<number | null>(null);
  const [previewDates, setPreviewDates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs().startOf('day'));
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => slotFilterWeek.add(i, 'day')),
    [slotFilterWeek]
  );

  useEffect(() => {
    fetchGroups();
    fetchSlots();
    fetchUsers();
  }, [slotFilterWeek]);

  useEffect(() => {
    fetchTemplates();
  }, [currentTemplateId]);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll({ _limit: 100 });
      if (res.success && res.data) setAllUsers(res.data);
    } catch (err) { console.error('Lỗi tải danh sách người dùng'); }
  };

  const fetchGroups = async () => {
    try {
      const res = await dutyService.getTemplateGroups();
      if (res.success && res.data) {
        setTemplateGroups(res.data);
        if (!currentTemplateId && res.data.length > 0) {
          const def = res.data.find((g: any) => g.isDefault) || res.data[0];
          setCurrentTemplateId(def.id);
        }
      }
    } catch (err) { message.error('Lỗi tải nhóm bản mẫu'); }
  };

  const fetchTemplates = async () => {
    if (!currentTemplateId) return;
    try {
      const res = await dutyService.getShiftTemplates(currentTemplateId);
      if (res.success && res.data) setTemplates(res.data);
    } catch (err) { message.error('Lỗi tải bản mẫu'); }
  };

  const fetchSlots = async () => {
    setSlotLoading(true);
    try {
      const res = await dutyService.getWeeklySchedule(slotFilterWeek.format('YYYY-MM-DD'));
      if (res.success && res.data) setSlots(res.data.slots || []);
    } catch (err) { message.error('Lỗi tải danh sách ca'); }
    finally { setSlotLoading(false); }
  };

  // Derived stats for the current selected date
  const currentDaySlots = useMemo(() => {
    if (!selectedDate) return slots;
    return slots.filter(s => dayjs(s.shiftDate).isSame(selectedDate, 'day'));
  }, [slots, selectedDate]);

  const dailyStats = useMemo(() => ({
    total: currentDaySlots.length,
    locked: currentDaySlots.filter(s => s.status === 'locked').length,
    open: currentDaySlots.filter(s => s.status === 'open').length,
    personnel: currentDaySlots.reduce((acc, s) => acc + (s.capacity || s.kip?.capacity || 0), 0)
  }), [currentDaySlots]);

  const handleSubmitGroup = async (values: any) => {
    try {
      const res = editingGroup
        ? await dutyService.updateTemplateGroup(editingGroup.id, values)
        : await dutyService.createTemplateGroup(values);
      if (res.success) {
        message.success('Đã lưu nhóm bản mẫu');
        setIsGroupModalOpen(false);
        fetchGroups();
      }
    } catch (err) { message.error('Lỗi khi lưu nhóm bản mẫu'); }
  };

  const handleDeleteGroup = (id: number) => {
    Modal.confirm({
      title: 'Xóa nhóm bản mẫu?',
      content: 'Tất cả các ca và kíp thuộc nhóm này sẽ bị xóa vĩnh viễn.',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteTemplateGroup(id);
        if (res.success) {
          message.success('Đã xóa nhóm bản mẫu');
          if (currentTemplateId === id) setCurrentTemplateId(null);
          fetchGroups();
        }
      }
    });
  };

  const handleCreateKip = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      startTime: timeRange?.[0]?.format('HH:mm'),
      endTime: timeRange?.[1]?.format('HH:mm')
    };
    try {
      const res = editingKip?.id
        ? await dutyService.updateKipTemplate(editingKip.id, data)
        : await dutyService.createKipTemplate(data);
      if (res.success) {
        message.success('Đã lưu kíp trực');
        setIsKipModalOpen(false);
        fetchTemplates();
      }
    } catch (err) { message.error('Lỗi khi lưu'); }
  };

  const handleDeleteShift = (id: number) => {
    Modal.confirm({
      title: 'Xóa bản mẫu Ca?',
      content: 'Tất cả kíp thuộc ca này cũng sẽ bị xóa.',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteShiftTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const handleDeleteKip = (id: number) => {
    Modal.confirm({
      title: 'Xóa kíp?',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteKipTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const toggleSlotStatus = async (slot: any) => {
    const res = await dutyService.updateSlot(slot.id, {
      ...slot,
      status: slot.status === 'locked' ? 'open' : 'locked'
    });
    if (res.success) {
      message.success('Đã cập nhật trạng thái');
      fetchSlots();
    }
  };

  const openSlotEdit = (slot: any) => {
    setEditingSlot(slot);
    setIsSlotEditModalOpen(true);
  };

  const tabItems = [
    {
      key: '1',
      label: <span><InboxOutlined /> Quản lý ca & kíp</span>,
      children: (
        <DataTable
          loading={slotLoading}
          dataSource={currentDaySlots}
          rowKey="id"
          pagination={{ total: currentDaySlots.length, pageSize: 10, showSizeChanger: true }}
          searchable={false}
          onRefresh={fetchSlots}
          headerContent={
            <div>
              {/* NEW TOP ROW: Week Selection & Title */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                backgroundColor: '#ffffff',
              }}>
                <Space size="middle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f5f5f5', padding: '2px 8px', borderRadius: 8 }}>
                    <Button icon={<LeftOutlined />} size="small" type="text" onClick={() => setSlotFilterWeek(slotFilterWeek.subtract(1, 'week'))} />
                    <DatePicker
                      picker="week"
                      value={slotFilterWeek}
                      allowClear={false}
                      bordered={false}
                      onChange={(val) => val && setSlotFilterWeek(val.startOf('isoWeek' as any))}
                      format="[Tuần] ww"
                      style={{ width: 85, fontWeight: 700, padding: 0 }}
                    />
                    <Button icon={<RightOutlined />} size="small" type="text" onClick={() => setSlotFilterWeek(slotFilterWeek.add(1, 'week'))} />
                    <Divider type="vertical" />
                    <Button
                      size="small"
                      type="text"
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: slotFilterWeek.isSame(dayjs().startOf('isoWeek' as any), 'week')
                          ? 'var(--primary-color)'
                          : '#8c8c8c'
                      }}
                      onClick={() => {
                        const today = dayjs();
                        setSlotFilterWeek(today.startOf('isoWeek' as any));
                        setSelectedDate(null);
                      }}
                    >
                      Tuần này
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, }}>
                    <ScheduleOutlined style={{ color: 'var(--primary-color)', fontSize: 16 }} />
                    <Text strong style={{ fontSize: '13px', color: '#1e293b' }}>
                      {selectedDate ? selectedDate.locale('vi').format('dddd, DD/MM/YYYY') : `Tất cả các ca trong tuần từ ${slotFilterWeek.format('DD/MM')} đến ${slotFilterWeek.add(6, 'day').format('DD/MM/YYYY')}`}
                    </Text>
                  </div>
                </Space>

                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                  {slotFilterWeek.format('[Tuần] ww, YYYY')}
                </Tag>
              </div>

              <div>
                {/* Day selection UI - At the Top */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 16,
                  width: '100%',
                  alignItems: 'center',
                  overflowX: 'auto',
                  paddingBottom: 4
                }}>
                  {/* "Cả tuần" (All Week) Selection Card */}
                  <div
                    onClick={() => setSelectedDate(null)}
                    style={{
                      flex: '0 0 90px',
                      padding: '6px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 10,
                      border: !selectedDate ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                      backgroundColor: !selectedDate ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.05)' : '#fff',
                      color: !selectedDate ? 'var(--primary-color)' : '#64748b',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 52,
                      zIndex: !selectedDate ? 2 : 1,
                    }}
                  >
                    <CalendarOutlined style={{ fontSize: '0.9rem', marginBottom: 2 }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cả tuần</div>
                  </div>

                  <Divider type="vertical" style={{ height: 32, borderLeft: '1px solid #e2e8f0', margin: '0 4px' }} />

                  {weekDays.map(d => {
                    const isSelected = selectedDate && d.isSame(selectedDate, 'day');
                    const daySlotsCount = slots.filter(s => dayjs(s.shiftDate).isSame(d, 'day')).length;
                    const isToday = d.isSame(dayjs(), 'day');

                    return (
                      <div
                        key={d.toISOString()}
                        onClick={() => setSelectedDate(d)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          borderRadius: 10,
                          border: isSelected ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.05)' : (isToday ? '#fff1f0' : '#fff'),
                          color: isSelected ? 'var(--primary-color)' : '#1e293b',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 52,
                          zIndex: isSelected ? 2 : 1
                        }}
                      >
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isSelected ? 'var(--primary-color)' : '#94a3b8'
                        }}>
                          {d.locale('vi').format('ddd')}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{d.format('DD/MM')}</div>

                        {daySlotsCount > 0 && (
                          <div style={{ position: 'absolute', top: 4, right: 6 }}>
                            <Badge
                              count={daySlotsCount}
                              size="small"
                              style={{
                                backgroundColor: isSelected ? 'var(--primary-color)' : '#94a3b8',
                                fontSize: '9px',
                                height: '16px',
                                minWidth: '16px',
                                lineHeight: '16px',
                                border: 'none'
                              }}
                            />
                          </div>
                        )}

                        {isToday && (
                          <div style={{
                            position: 'absolute',
                            bottom: -4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 12,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? 'var(--primary-color)' : '#ef4444',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Daily Statistics */}
                <div style={{ marginBottom: 16 }}>
                  <StatisticsCard
                    hideCard
                    loading={slotLoading}
                    rowGutter={12}
                    colSpan={{ xs: 12, sm: 12, md: 6, lg: 6 }}
                    data={[
                      { title: 'Tổng số ca', value: dailyStats.total, valueColor: 'var(--primary-color)' },
                      { title: 'Đang mở', value: dailyStats.open, valueColor: '#10b981' },
                      { title: 'Đã khóa', value: dailyStats.locked, valueColor: '#f43f5e' },
                      { title: 'Tổng nhân sự', value: dailyStats.personnel, valueColor: '#3b82f6' }
                    ]}
                  />
                </div>
              </div>
            </div>
          }
          title={null}
          filters={[]}
          extra={
            <Button type="primary" icon={<PlusOutlined />} className="hifi-button" onClick={() => {
              manualSlotForm.setFieldsValue({ date: selectedDate || dayjs() });
              setActiveTab('2');
              message.info('Vui lòng thêm ca tại phần "Thêm Ca đơn lẻ" phía dưới');
            }}>Thêm ca</Button>
          }
          columns={[
            ...(!selectedDate ? [{
              title: 'Ngày trực',
              dataIndex: 'shiftDate',
              key: 'shiftDate',
              width: 140,
              render: (date: string) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text strong>{dayjs(date).locale('vi').format('dddd')}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(date).format('DD/MM/YYYY')}</Text>
                </div>
              )
            }] : []),
            {
              title: 'Khung giờ',
              key: 'time',
              width: 180,
              render: (_, r: any) => (
                <Tag color={r.kipId ? "processing" : "error"} style={{ borderRadius: 6, padding: '4px 12px', fontSize: '14px', fontWeight: 600 }}>
                  {r.startTime} - {r.endTime}
                </Tag>
              )
            },
            {
              title: 'Ca & Kíp',
              dataIndex: 'shiftLabel',
              key: 'label',
              render: (val, r: any) => (
                <Space direction="vertical" size={0}>
                  <Text strong style={{ color: r.kipId ? '#1e293b' : '#ef4444' }}>{val}</Text>
                  {!r.kipId && <Text type="danger" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Chế độ Ca (Shift)</Text>}
                </Space>
              )
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              align: 'center',
              width: 140,
              render: (s) => (
                <Tag color={s === 'locked' ? 'error' : 'success'} style={{ borderRadius: 10, padding: '0 12px' }}>
                  {s === 'locked' ? 'Đã khóa' : 'Đang mở'}
                </Tag>
              )
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 150,
              align: 'center',
              render: (_, r: any) => (
                <Space>
                  <Tooltip title={r.status === 'locked' ? 'Mở khóa' : 'Khóa ca'}>
                    <Button
                      type="text"
                      shape="circle"
                      icon={r.status === 'locked' ? <LockOutlined /> : <UnlockOutlined />}
                      onClick={() => toggleSlotStatus(r)}
                    />
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<EditOutlined />}
                      style={{ color: '#6366f1' }}
                      onClick={() => openSlotEdit(r)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Xác nhận xóa ca này?"
                    description="Hành động này không thể hoàn tác."
                    onConfirm={async () => {
                      const res = await dutyService.deleteSlot(r.id);
                      if (res.success) { message.success('Đã xóa'); fetchSlots(); }
                    }}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  >
                    <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      )
    },
    {
      key: '2',
      label: <span><ScheduleOutlined /> Điều phối & Lập lịch</span>,
      children: (
        <div className="coordination-tab">
          <Card title={<Space><ScheduleOutlined /><span>Lập lịch Hàng loạt</span></Space>} className="hifi-border">
            {!isReviewMode ? (
              <Form form={coordinationForm} layout="vertical" onFinish={async (v) => {
                const [start, end] = v.range;
                const genTemplateId = v.templateId; // Can be undefined
                const genMode = v.mode || 'kips';

                const proceedPreview = async (targetTemplates: any[]) => {
                  // Fetch assignments to show accurate preview
                  let assignments: any[] = [];
                  try {
                    const res = await dutyService.getTemplateAssignments();
                    if (res.success && res.data) assignments = res.data;
                  } catch (e) { console.error(e); }

                  const days = [];
                  let curr = dayjs(start);
                  while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                    const dateStr = curr.format('YYYY-MM-DD');
                    const dayOfWeek = (curr.day() + 6) % 7;
                    const daySlots: any[] = [];
                    
                    // Determine which template to use for this day
                    let effectiveTemplates = targetTemplates;
                    
                    if (!genTemplateId) {
                      const assignment = assignments.find(a => 
                        dayjs(dateStr).isSameOrAfter(dayjs(a.startDate), 'day') && 
                        dayjs(dateStr).isSameOrBefore(dayjs(a.endDate), 'day')
                      );
                      
                      if (assignment) {
                        const assignedShifts = await dutyService.getShiftTemplates(assignment.templateId);
                        if (assignedShifts.success && assignedShifts.data) effectiveTemplates = assignedShifts.data;
                      }
                    }

                    effectiveTemplates.forEach(s => {
                      const shiftDays = s.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                      if (!shiftDays.includes(dayOfWeek)) return;
                      if (genMode === 'shifts' || genMode === 'all') {
                        daySlots.push({ name: s.name, startTime: s.startTime, endTime: s.endTime, isShift: true });
                      }
                      if (genMode === 'kips' || genMode === 'all') {
                        s.kips.forEach((k: any) => {
                          const kipDays = k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                          if (kipDays.includes(dayOfWeek)) {
                            daySlots.push({ ...k, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime, isShift: false });
                          }
                        });
                      }
                    });
                    days.push({ date: curr.clone(), kips: daySlots, isSelected: daySlots.length > 0 });
                    curr = curr.add(1, 'day');
                  }
                  setPreviewDates(days); setIsReviewMode(true);
                };

                if (genTemplateId !== currentTemplateId) {
                  setLoading(true);
                  dutyService.getShiftTemplates(genTemplateId).then((res: any) => {
                    if (res.success && res.data) proceedPreview(res.data);
                    else message.error('Không thể lấy thông tin bản mẫu');
                  }).finally(() => setLoading(false));
                } else {
                  proceedPreview(templates);
                }
              }}>
                <Row gutter={[24, 16]}>
                  <Col span={10}>
                    <Form.Item name="range" label="Khoảng ngày áp dụng" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100% ' }} /></Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item name="templateId" label="Sử dụng Bản mẫu" tooltip="Để trống để tự động áp dụng theo Giai đoạn (nếu đã gắn Bản mẫu)">
                      <Select 
                        allowClear 
                        placeholder="Theo Giai đoạn (Automatic)"
                        options={templateGroups.map(g => ({ 
                          label: g.isDefault ? `${g.name} (Mặc định)` : g.name, 
                          value: g.id 
                        }))} 
                      />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item name="mode" label="Chế độ khởi tạo" initialValue="kips">
                      <Select options={[
                        { label: 'Chỉ mình Ca (Shifts only)', value: 'shifts' },
                        { label: 'Chỉ mình Kíp (Kips only)', value: 'kips' },
                        { label: 'Cả 2 (Both)', value: 'all' }
                      ]} />
                    </Form.Item>
                  </Col>
                </Row>
                <Space><Button type="primary" htmlType="submit">Xem trước</Button><Button danger ghost onClick={() => { const r = coordinationForm.getFieldValue('range'); if (r) dutyService.deleteRangeSlots(r[0].format('YYYY-MM-DD'), r[1].format('YYYY-MM-DD')).then(() => message.success('Đã xóa')); }}>Xóa vùng chọn</Button></Space>
              </Form>
            ) : (
              <div>
                <Space style={{ marginBottom: 16 }}><Button onClick={() => setIsReviewMode(false)}>Quay lại</Button><Button type="primary" loading={loading} onClick={async () => {
                  setLoading(true); try {
                    const range = coordinationForm.getFieldValue('range');
                    const genTemplateId = coordinationForm.getFieldValue('templateId') || currentTemplateId;
                    const genMode = coordinationForm.getFieldValue('mode') || 'kips';
                    const res = await dutyService.generateRangeSlots(
                      range[0].format('YYYY-MM-DD'),
                      range[1].format('YYYY-MM-DD'),
                      genTemplateId,
                      genMode
                    );
                    if (res.success) {
                      message.success('Đã lập lịch thành công');
                      setIsReviewMode(false);
                      fetchSlots();
                    }
                  } catch (e) { message.error('Lỗi khi lập lịch'); } finally { setLoading(false); }
                }}>Xác nhận tạo {previewDates.filter(x => x.isSelected).length} ngày</Button></Space>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                  {previewDates.map((d, i) => (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                      <Checkbox checked={d.isSelected} onChange={e => { const n = [...previewDates]; n[i].isSelected = e.target.checked; setPreviewDates(n); }}>{d.date.format('DD/MM')} ({d.date.locale('vi').format('dd')})</Checkbox>
                      <Space>
                        {d.kips.filter((x: any) => x.isShift).length > 0 && <Text type="danger" strong>{d.kips.filter((x: any) => x.isShift).length} ca</Text>}
                        {d.kips.filter((x: any) => !x.isShift).length > 0 && <Text type="secondary">{d.kips.filter((x: any) => !x.isShift).length} kíp</Text>}
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card 
            title={<Space><PlusSquareOutlined style={{ color: 'var(--primary-color)' }} /><span>Thêm Ca/Kíp trực đơn lẻ (Ad-hoc)</span></Space>} 
            style={{ marginTop: 24, borderRadius: 12 }} 
            className="hifi-border" 
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Form form={manualSlotForm} layout="vertical" onFinish={async (v) => {
              try {
                const s = templates.find(x => x.id === v.shiftId);
                const k = s?.kips.find(x => x.id === v.kipId);
                const res = await dutyService.createSlot({
                  shiftDate: v.date.format('YYYY-MM-DD'),
                  shiftLabel: v.shiftLabel || (k ? `${s?.name} - ${k?.name}` : s?.name || 'Kíp trực lẻ'),
                  startTime: v.timeRange?.[0]?.format('HH:mm') || k?.startTime || s?.startTime,
                  endTime: v.timeRange?.[1]?.format('HH:mm') || k?.endTime || s?.endTime,
                  order: v.order || k?.order || s?.order,
                  endPeriod: v.endPeriod || k?.endPeriod,
                  capacity: v.capacity || k?.capacity || 1,
                  kipId: k?.id,
                  shiftId: s?.id,
                  status: v.status || 'open'
                });
                if (res.success) { 
                  message.success('Đã thêm kíp trực mới'); 
                  manualSlotForm.resetFields(); 
                  fetchSlots(); 
                }
              } catch (err) {
                message.error('Lỗi khi thêm ca lẻ');
              }
            }} initialValues={{ status: 'open' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <Row gutter={[24, 16]}>
                  <Col span={6}>
                    <Form.Item name="date" label="Ngày trực" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item name="shiftId" label="Chọn khung Ca (Bản mẫu)" rules={[{ required: true }]}>
                      <Select 
                        placeholder="Chọn Ca mẫu"
                        onChange={v => {
                          setSelectedShiftTemplate(v);
                          const s = templates.find(x => x.id === v);
                          if (s) {
                            manualSlotForm.setFieldsValue({ 
                              kipId: undefined, 
                              shiftLabel: s.name,
                              timeRange: [dayjs(s.startTime, 'HH:mm'), dayjs(s.endTime, 'HH:mm')],
                              order: s.order
                            });
                          }
                        }} 
                        options={templates.map(s => ({ label: `${s.name} (${s.startTime}-${s.endTime})`, value: s.id }))} 
                      />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item name="kipId" label="Chọn Kíp trực (Chi tiết)" tooltip="Chọn Ca trước để hiện danh sách Kíp">
                      <Select 
                        placeholder={selectedShiftTemplate ? "Chọn Kíp" : "Vui lòng chọn Ca trước"}
                        disabled={!selectedShiftTemplate}
                        onChange={v => {
                          const s = templates.find(x => x.id === selectedShiftTemplate);
                          const k = s?.kips.find(x => x.id === v);
                          if (k) {
                            manualSlotForm.setFieldsValue({ 
                              shiftLabel: `${s?.name} - ${k.name}`,
                              timeRange: k.startTime && k.endTime ? [dayjs(k.startTime, 'HH:mm'), dayjs(k.endTime, 'HH:mm')] : [dayjs(s!.startTime, 'HH:mm'), dayjs(s!.endTime, 'HH:mm')],
                              order: k.order,
                              endPeriod: k.endPeriod,
                              capacity: k.capacity
                            });
                          }
                        }}
                        options={templates.find(s => s.id === selectedShiftTemplate)?.kips.map(k => ({ label: k.name, value: k.id })) || []} 
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={[24, 16]}>
                  <Col span={10}>
                    <Form.Item name="shiftLabel" label="Tên hiển thị thực tế" rules={[{ required: true }]}>
                      <Input prefix={<EditOutlined />} placeholder="VD: Ca Sáng - Kíp 1" />
                    </Form.Item>
                  </Col>
                  <Col span={14}>
                    <Form.Item name="timeRange" label="Khoảng thời gian (Thực tế)" rules={[{ required: true }]}>
                      <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<PlusSquareOutlined />} 
                  className="hifi-button"
                  style={{ minWidth: 240 }}
                >
                  Tạo kíp trực và đưa lên lịch
                </Button>
                <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                  <InfoCircleOutlined /> Lưu ý: Ca trực lẻ này sẽ tạo ra bản sao độc lập (Deep Copy), không ảnh hưởng bởi thay đổi bản mẫu gốc sau này.
                </div>
              </div>
            </Form>
          </Card>
        </div>
      )
    },
    {
      key: '3',
      label: <span><LayoutOutlined /> Cấu hình Bản mẫu</span>,
      children: (
        <div className="templates-tab">
          <Card className="hifi-border mb-4" style={{ marginBottom: 24, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Space size="middle">
                <span>Nhóm bản mẫu:</span>
                <Select
                  style={{ width: 250 }}
                  value={currentTemplateId}
                  onChange={setCurrentTemplateId}
                  placeholder="Chọn nhóm bản mẫu"
                  className="hifi-select"
                  options={templateGroups.map(g => ({ 
                    label: (
                      <Space>
                        {g.name}
                        {g.isDefault && <Tag color="gold" style={{ fontSize: '10px', height: '18px', lineHeight: '18px', border: 'none', borderRadius: 4, fontWeight: 700 }}>MẶC ĐỊNH</Tag>}
                      </Space>
                    ), 
                    value: g.id 
                  }))}
                />
                
                <Dropdown overlay={
                  <Menu onClick={({ key }) => {
                    if (key === 'add') {
                      setEditingGroup(null);
                      setIsGroupModalOpen(true);
                    } else if (key === 'edit') {
                      const g = templateGroups.find(x => x.id === currentTemplateId);
                      if (g) {
                        setEditingGroup(g);
                        setIsGroupModalOpen(true);
                      }
                    } else if (key === 'delete') {
                      if (currentTemplateId) handleDeleteGroup(currentTemplateId);
                    }
                  }}>
                    <Menu.Item key="add" icon={<PlusOutlined />}>Thêm nhóm mới</Menu.Item>
                    <Menu.Item key="edit" icon={<EditOutlined />} disabled={!currentTemplateId}>Sửa tên / mô tả</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="delete" icon={<DeleteOutlined />} danger disabled={!currentTemplateId}>Xóa nhóm này</Menu.Item>
                  </Menu>
                }>
                  <Button size="large" icon={<DownOutlined />}>Thiết lập nhóm</Button>
                </Dropdown>

                <Divider type="vertical" />

                <Button
                  type="primary"
                  icon={<ScheduleOutlined />}
                  className="hifi-button"
                  onClick={() => {
                    coordinationForm.setFieldsValue({ templateId: currentTemplateId });
                    setActiveTab('2');
                  }}
                  disabled={!currentTemplateId}
                >
                  Áp dụng hàng loạt
                </Button>
              </Space>
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div><Title level={4} style={{ margin: 0 }}>Bản mẫu Ca & Kíp</Title><Text type="secondary">Cấu hình khung giờ cố định cho nhóm đã chọn</Text></div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingShift(null); shiftForm.resetFields(); setIsShiftModalOpen(true); }}>Thêm Ca mới</Button>
          </div>
          {templates.length === 0 ? (
            <Card className="hifi-border" style={{ textAlign: 'center', padding: '40px 0', borderStyle: 'dashed' }}>
              <InboxOutlined style={{ fontSize: 40, color: '#94a3b8', marginBottom: 16 }} />
              <div><Text type="secondary">Chưa có bản mẫu Ca trực nào trong nhóm này.</Text></div>
              <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16 }} onClick={() => { setEditingShift(null); setIsShiftModalOpen(true); }}>Bắt đầu tạo Ca</Button>
            </Card>
          ) : templates.map(s => (
            <Card 
              key={s.id} 
              className="hifi-border hifi-shift-card" 
              style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden' }} 
              title={
                <Space>
                  <Text strong style={{ fontSize: '16px', color: '#1e293b' }}>{s.name}</Text>
                  <Tag color="red-outline" style={{ borderRadius: 6, fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {s.startTime} - {s.endTime}
                  </Tag>
                  {s.daysOfWeek && s.daysOfWeek.length < 7 && (
                    <Tag color="blue" style={{ fontSize: '11px' }}>
                      {s.daysOfWeek.map((d: number) => ['T2','T3','T4','T5','T6','T7','CN'][d]).join(', ')}
                    </Tag>
                  )}
                </Space>
              } 
              extra={
                <Space>
                  <Button size="small" shape="circle" icon={<EditOutlined />} onClick={() => { setEditingShift(s); setIsShiftModalOpen(true); }} />
                  <Popconfirm
                    title="Xác nhận xóa bản mẫu Ca?"
                    description="Các kíp trực thuộc ca này cũng sẽ mất vĩnh viễn."
                    onConfirm={() => handleDeleteShift(s.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" shape="circle" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Danh sách Kíp trực chi tiết</Text>
                <Button type="link" size="small" icon={<PlusOutlined />} style={{ fontWeight: 600 }} onClick={() => { setEditingKip({ shiftId: s.id }); setIsKipModalOpen(true); }}>Thêm Kíp</Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.kips.length === 0 ? (
                  <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '12px' }}>Chưa có kíp nào. Hãy nhấp "Thêm Kíp" để chia nhỏ Ca này.</Text>
                ) : s.kips.map(k => (
                  <div key={k.id} style={{ 
                    padding: '12px 16px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 10, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }} className="kip-item-row-hover">
                    <Space size="middle">
                       <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--primary-color)', opacity: 0.6 }} />
                       <div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <Text strong style={{ color: '#1e293b' }}>{k.name}</Text>
                           {(k.startTime || k.endTime) && (
                             <Tag color="cyan" style={{ fontSize: '10px', fontWeight: 600 }}>
                               Múi giờ riêng: {k.startTime || '??:??'} - {k.endTime || '??:??'}
                             </Tag>
                           )}
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                           <Text type="secondary" style={{ fontSize: '11px' }}>Tiết: <Tag style={{ margin: 0, fontSize: '10px' }}>{k.order} {k.endPeriod ? ` - ${k.endPeriod}` : ''}</Tag></Text>
                           <Divider type="vertical" />
                           <Text type="secondary" style={{ fontSize: '11px' }}>Chỉ tiêu: <Text strong style={{ color: '#475569' }}>{k.capacity}</Text> người</Text>
                           {k.daysOfWeek && k.daysOfWeek.length < 7 && (
                             <>
                               <Divider type="vertical" />
                               <Text type="secondary" style={{ fontSize: '11px' }}>Ngày: <Text strong style={{ color: '#475569' }}>{k.daysOfWeek.map((d: number) => ['T2','T3','T4','T5','T6','T7','CN'][d]).join(', ')}</Text></Text>
                             </>
                           )}
                         </div>
                       </div>
                    </Space>
                    <Space>
                      <Button size="small" type="text" shape="circle" icon={<EditOutlined />} onClick={() => { setEditingKip(k); setIsKipModalOpen(true); }} />
                      <Button size="small" type="text" shape="circle" danger icon={<DeleteOutlined />} onClick={() => handleDeleteKip(k.id)} />
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )
    },
    {
      key: '5',
      label: <span><SettingOutlined /> Cài đặt chung</span>,
      children: (
        <Card title="Cấu hình hệ thống" className="hifi-border">
          <Form layout="vertical">
            <Form.Item label="Số tiết trực tối đa trong ngày"><InputNumber defaultValue={22} style={{ width: 120 }} /></Form.Item>
            <Divider />
            <Button type="primary" disabled>Lưu thay đổi</Button>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <div className="duty-management-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Thiết lập lịch trực</Title>
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setIsGuideModalOpen(true)}
        >
          Hướng dẫn
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        className="hifi-tabs"
      />

      <GroupModal
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        onSuccess={fetchGroups}
        editingGroup={editingGroup}
        onSubmit={handleSubmitGroup}
        loading={loading}
      />

      <ShiftTemplateModal
        open={isShiftModalOpen}
        onCancel={() => setIsShiftModalOpen(false)}
        editingShift={editingShift}
        groupId={currentTemplateId}
        onSuccess={fetchTemplates}
      />

      <KipModal
        open={isKipModalOpen}
        onCancel={() => setIsKipModalOpen(false)}
        onSuccess={fetchTemplates}
        editingKip={editingKip}
        onSubmit={handleCreateKip}
        templates={templates}
        loading={loading}
      />

      <SlotEditModal
        open={isSlotEditModalOpen}
        onCancel={() => setIsSlotEditModalOpen(false)}
        onSuccess={fetchSlots}
        editingSlot={editingSlot}
        onSubmit={async (v) => {
          const res = await dutyService.updateSlot(editingSlot?.id, v);
          if (res.success) {
            message.success('Cập nhật thành công');
            setIsSlotEditModalOpen(false);
          }
        }}
        allUsers={allUsers}
        loading={loading}
      />

      <Modal
        title={
          <Space>
            <div style={{ width: 4, height: 18, background: 'var(--primary-color)', borderRadius: 2 }} />
            <span>Hướng dẫn Quản lý Lịch trực</span>
          </Space>
        }
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Button key="close" type="primary" onClick={() => setIsGuideModalOpen(false)} style={{ minWidth: 120 }}>Đã hiểu</Button>
          </div>
        ]}
        width={600}
        className="premium-modal"
      >
        <div style={{ padding: '8px 4px' }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>Quy trình vận hành 3 bước:</Text>
          <ul style={{ paddingLeft: 20, color: '#475569' }}>
            <li style={{ marginBottom: 12 }}>
              <Text strong>1. Thiết lập Bản mẫu:</Text> Định nghĩa các Ca (Sáng/Chiều/Tối) và các Kíp trực (Kíp 1, Kíp 2...) với khung giờ và số người (chỉ tiêu) cố định.
            </li>
            <li style={{ marginBottom: 12 }}>
              <Text strong>2. Lập lịch Hàng loạt:</Text> Dựa trên bản mẫu, hệ thống sẽ tự động tạo ra các "Slot" trực cho cả tuần hoặc tháng chỉ với vài click.
            </li>
            <li style={{ marginBottom: 12 }}>
              <Text strong>3. Điều phối & Phê duyệt:</Text> Bạn có thể chỉnh sửa thủ công từng kíp trực lẻ hoặc phê duyệt các đơn xin nghỉ của thành viên.
            </li>
          </ul>
          <Alert
            message="Công nghệ Snapshot-Independent"
            description="Sau khi dập khuôn, lịch trực sẽ được lưu dưới dạng các bản ghi vật lý độc lập. Việc xóa hay sửa bản mẫu sau đó sẽ không làm mất dữ liệu lịch đã tạo."
            type="info"
            showIcon
            style={{ marginTop: 16, borderRadius: 12 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DutyManagement;
