import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Tabs, Divider, Alert, DatePicker, Row, Col, Tooltip, Tag, Checkbox, Badge, Popconfirm } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ScheduleOutlined, SettingOutlined,
  InboxOutlined,
  LeftOutlined, RightOutlined, LayoutOutlined,
  QuestionCircleOutlined,
  TeamOutlined, LockOutlined, UnlockOutlined,
  ProjectOutlined, ExclamationCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import dutyService, { DutyShift } from '@/services/duty.service';
import userService from '@/services/user.service';
import DataTable from '@/components/common/DataTable';
import StatisticsCard from '@/components/common/StatisticsCard';

const { Text, Title } = Typography;

const DutyManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotFilterWeek, setSlotFilterWeek] = useState(dayjs().startOf('isoWeek' as any));

  // Modals Visibility
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isKipModalOpen, setIsKipModalOpen] = useState(false);
  const [isSlotEditModalOpen, setIsSlotEditModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Forms
  const [shiftForm] = Form.useForm();
  const [kipForm] = Form.useForm();
  const [slotEditForm] = Form.useForm();
  const [coordinationForm] = Form.useForm();
  const [manualSlotForm] = Form.useForm();

  // Selected Items for Editing
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [editingKip, setEditingKip] = useState<any>(null);
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
    fetchTemplates();
    fetchSlots();
    fetchUsers();
  }, [slotFilterWeek]);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll({ _limit: 1000 });
      if (res.success && res.data) setAllUsers(res.data);
    } catch (err) { console.error('Lỗi tải danh sách người dùng'); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await dutyService.getTemplates();
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

  const handleSubmitShift = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      startTime: timeRange[0].format('HH:mm'),
      endTime: timeRange[1].format('HH:mm')
    };
    try {
      const res = editingShift
        ? await dutyService.updateShiftTemplate(editingShift.id, data)
        : await dutyService.createShiftTemplate(data);
      if (res.success) {
        message.success('Đã lưu kíp trực');
        setIsShiftModalOpen(false);
        fetchTemplates();
      }
    } catch (err) { message.error('Lỗi khi lưu'); }
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
    slotEditForm.setFieldsValue({
      ...slot,
      shiftDate: dayjs(slot.shiftDate),
      timeRange: slot.startTime && slot.endTime ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] : []
    });
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
                  gap: 16,
                  marginBottom: 16,
                  width: '100%',
                  alignItems: 'center'
                }}>
                  {/* "Cả tuần" (All Week) Selection Card */}
                  <div
                    onClick={() => setSelectedDate(null)}
                    style={{
                      flex: '0 0 100px',
                      padding: '8px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: !selectedDate ? '2.5px solid var(--primary-color)' : '1px solid #d9d9d9',
                      backgroundColor: !selectedDate ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.03)' : '#fff',
                      color: !selectedDate ? 'var(--primary-color)' : 'rgba(0,0,0,0.85)',
                      transition: 'all 0.15s ease',
                      boxShadow: 'none',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 64,
                      zIndex: !selectedDate ? 2 : 1,
                      marginRight: 4
                    }}
                    onMouseEnter={(e) => { if (selectedDate) e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onMouseLeave={(e) => { if (selectedDate) e.currentTarget.style.borderColor = '#d9d9d9'; }}
                  >
                    <CalendarOutlined style={{ fontSize: '1rem', marginBottom: 2, color: !selectedDate ? 'var(--primary-color)' : '#8c8c8c' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cả tuần</div>
                  </div>

                  <Divider type="vertical" style={{ height: 40, borderLeft: '3px solid var(--primary-color)', margin: '0 8px', opacity: 0.8 }} />

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
                          padding: '8px 4px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          borderRadius: 8,
                          border: isSelected ? '2.5px solid var(--primary-color)' : '1px solid #d9d9d9',
                          backgroundColor: isSelected ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.03)' : (isToday ? '#fff1f0' : '#fff'),
                          color: isSelected ? 'var(--primary-color)' : 'rgba(0,0,0,0.85)',
                          transition: 'all 0.15s ease',
                          boxShadow: 'none',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 64,
                          zIndex: isSelected ? 2 : 1
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#d9d9d9'; }}
                      >
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: 4,
                          color: isSelected ? 'var(--primary-color)' : '#8c8c8c'
                        }}>
                          {d.locale('vi').format('ddd')}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{d.format('DD/MM')}</div>

                        {daySlotsCount > 0 && (
                          <div style={{ position: 'absolute', top: 8, right: 10 }}>
                            <Badge
                              count={daySlotsCount}
                              size="small"
                              style={{
                                backgroundColor: isSelected ? 'var(--primary-color)' : '#64748b',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                fontSize: '10px',
                                height: '18px',
                                minWidth: '18px',
                                lineHeight: '18px',
                                border: 'none'
                              }}
                            />
                          </div>
                        )}

                        {isToday && (
                          <div style={{
                            position: 'absolute',
                            top: 4,
                            left: 10,
                            fontSize: '8px',
                            fontWeight: 700,
                            color: isSelected ? 'var(--primary-color)' : '#ef4444',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '1px 4px',
                            borderRadius: 4,
                            backgroundColor: isSelected ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                          }}>
                            Hôm nay
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Daily Statistics */}
                <StatisticsCard
                  hideCard
                  loading={slotLoading}
                  rowGutter={16}
                  // borderleft={true}
                  colSpan={{ xs: 12, sm: 12, md: 6 }}
                  data={[
                    {
                      title: 'Tổng số ca',
                      value: dailyStats.total,
                      // icon: <ProjectOutlined />,
                      valueColor: 'var(--primary-color)'
                    },
                    {
                      title: 'Đang mở',
                      value: dailyStats.open,
                      // icon: <UnlockOutlined />,
                      valueColor: '#52c41a'
                    },
                    {
                      title: 'Đã khóa',
                      value: dailyStats.locked,
                      // icon: <LockOutlined />,
                      valueColor: '#ff4d4f'
                    },
                    {
                      title: 'Tổng nhân sự',
                      value: dailyStats.personnel,
                      // icon: <TeamOutlined />,
                      valueColor: '#1890ff'
                    }
                  ]}
                />
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
                <Tag color="processing" style={{ borderRadius: 6, padding: '4px 12px', fontSize: '14px', fontWeight: 600 }}>
                  {r.startTime} - {r.endTime}
                </Tag>
              )
            },
            {
              title: 'Ca & Kíp',
              dataIndex: 'shiftLabel',
              key: 'label',
              render: (val) => <Text strong style={{ color: '#1e293b' }}>{val}</Text>
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
              <Form form={coordinationForm} layout="vertical" onFinish={(v) => {
                const [start, end] = v.range;
                const days = [];
                let curr = dayjs(start);
                while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                  const dayKips = templates.flatMap(s => s.kips.map(k => ({ ...k, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime, shiftId: s.id }))).filter(k => (k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes((curr.day() + 6) % 7));
                  days.push({ date: curr.clone(), kips: dayKips, isSelected: dayKips.length > 0 });
                  curr = curr.add(1, 'day');
                }
                setPreviewDates(days); setIsReviewMode(true);
              }}>
                <Form.Item name="range" label="Khoảng ngày áp dụng" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100% ' }} size="large" /></Form.Item>
                <Space><Button type="primary" htmlType="submit" size="large">Xem trước</Button><Button danger ghost size="large" onClick={() => { const r = coordinationForm.getFieldValue('range'); if (r) dutyService.deleteRangeSlots(r[0].format('YYYY-MM-DD'), r[1].format('YYYY-MM-DD')).then(() => message.success('Đã xóa')); }}>Xóa vùng chọn</Button></Space>
              </Form>
            ) : (
              <div>
                <Space style={{ marginBottom: 16 }}><Button onClick={() => setIsReviewMode(false)}>Quay lại</Button><Button type="primary" loading={loading} onClick={async () => {
                  setLoading(true); try {
                    for (const d of previewDates.filter(x => x.isSelected)) {
                      for (const k of d.kips) {
                        await dutyService.createSlot({ shiftDate: d.date.format('YYYY-MM-DD'), shiftLabel: `${k.shiftName} - ${k.name}`, startTime: k.startTime || k.sStart, endTime: k.endTime || k.sEnd, order: k.order, kipId: k.id, shiftId: k.shiftId });
                      }
                    }
                    message.success('Đã tạo lịch'); setIsReviewMode(false); fetchSlots();
                  } catch (e) { message.error('Lỗi'); } finally { setLoading(false); }
                }}>Xác nhận tạo {previewDates.filter(x => x.isSelected).length} ngày</Button></Space>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                  {previewDates.map((d, i) => (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                      <Checkbox checked={d.isSelected} onChange={e => { const n = [...previewDates]; n[i].isSelected = e.target.checked; setPreviewDates(n); }}>{d.date.format('DD/MM')} ({d.date.locale('vi').format('dd')})</Checkbox>
                      <Text type="secondary">{d.kips.length} ca</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card title="Thêm Ca đơn lẻ" style={{ marginTop: 24 }} className="hifi-border">
            <Form form={manualSlotForm} layout="vertical" onFinish={async (v) => {
              const s = templates.find(x => x.id === v.shiftId);
              const k = s?.kips.find(x => x.id === v.kipId);
              const res = await dutyService.createSlot({
                shiftDate: v.date.format('YYYY-MM-DD'),
                shiftLabel: v.shiftLabel || `${s?.name} - ${k?.name}`,
                startTime: k?.startTime || s?.startTime, endTime: k?.endTime || s?.endTime, order: k?.order, kipId: k?.id, shiftId: s?.id
              });
              if (res.success) { message.success('Đã thêm'); manualSlotForm.resetFields(); fetchSlots(); }
            }}>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="date" label="Ngày"><DatePicker style={{ width: '100% ' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="shiftId" label="Ca Bản mẫu"><Select onChange={v => setSelectedShiftTemplate(v)} options={templates.map(s => ({ label: s.name, value: s.id }))} /></Form.Item></Col>
                <Col span={8}><Form.Item name="kipId" label="Kíp"><Select options={templates.find(s => s.id === selectedShiftTemplate)?.kips.map(k => ({ label: k.name, value: k.id })) || []} /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" block>Tạo kíp trực này</Button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div><Title level={4} style={{ margin: 0 }}>Bản mẫu Ca & Kíp</Title><Text type="secondary">Cấu hình khung giờ cố định</Text></div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingShift(null); shiftForm.resetFields(); setIsShiftModalOpen(true); }}>Thêm Ca mới</Button>
          </div>
          {templates.map(s => (
            <Card key={s.id} className="hifi-border" style={{ marginBottom: 20 }} title={<Space><Text strong>{s.name}</Text><Tag color="blue">{s.startTime} - {s.endTime}</Tag></Space>} extra={<Space><Button size="small" icon={<EditOutlined />} onClick={() => { setEditingShift(s); shiftForm.setFieldsValue({ ...s, timeRange: [dayjs(s.startTime, 'HH:mm'), dayjs(s.endTime, 'HH:mm')] }); setIsShiftModalOpen(true); }} /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteShift(s.id)} /></Space>}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text strong>Danh sách Kíp</Text><Button type="link" size="small" icon={<PlusOutlined />} onClick={() => { setEditingKip({ shiftId: s.id }); kipForm.resetFields(); kipForm.setFieldsValue({ shiftId: s.id }); setIsKipModalOpen(true); }}>Thêm Kíp</Button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.kips.map(k => (
                  <div key={k.id} style={{ padding: '10px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={0}><Text strong>{k.name}</Text><Text type="secondary" style={{ fontSize: '0.8rem' }}>Tiết: {k.order} {k.endPeriod ? ` - ${k.endPeriod}` : ''} • Chỉ tiêu: {k.capacity}</Text></Space>
                    <Space><Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditingKip(k); kipForm.setFieldsValue({ ...k, timeRange: k.startTime && k.endTime ? [dayjs(k.startTime, 'HH:mm'), dayjs(k.endTime, 'HH:mm')] : undefined }); setIsKipModalOpen(true); }} /><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteKip(k.id)} /></Space>
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

      {/* Modals for Shift, Kip, Slot Edit */}
      <Modal title={editingShift ? "Sửa Bản mẫu Ca" : "Thêm Ca mới"} open={isShiftModalOpen} onCancel={() => setIsShiftModalOpen(false)} onOk={() => shiftForm.submit()} destroyOnClose>
        <Form form={shiftForm} layout="vertical" onFinish={handleSubmitShift}>
          <Form.Item name="name" label="Tên Ca" rules={[{ required: true }]}><Input placeholder="VD: Ca Sáng" /></Form.Item>
          <Form.Item name="timeRange" label="Khung giờ" rules={[{ required: true }]}><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} /></Form.Item>
          <Form.Item name="order" label="Thứ tự"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingKip?.id ? "Sửa Kíp" : "Thêm Kíp mới"} open={isKipModalOpen} onCancel={() => setIsKipModalOpen(false)} onOk={() => kipForm.submit()} destroyOnClose>
        <Form form={kipForm} layout="vertical" onFinish={handleCreateKip}>
          <Form.Item name="shiftId" hidden><Input /></Form.Item>
          <Form.Item name="name" label="Tên Kíp" rules={[{ required: true }]}><Input placeholder="VD: Kíp 1" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="capacity" label="Chỉ tiêu" initialValue={1}><InputNumber min={1} style={{ width: '100% ' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="order" label="Tiết bắt đầu" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100% ' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="timeRange" label="Giờ riêng (Tùy chọn)"><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} /></Form.Item>
          <Form.Item name="daysOfWeek" label="Ngày áp dụng"><Select mode="multiple" options={[{ label: 'Thứ 2', value: 0 }, { label: 'Thứ 3', value: 1 }, { label: 'Thứ 4', value: 2 }, { label: 'Thứ 5', value: 3 }, { label: 'Thứ 6', value: 4 }, { label: 'Thứ 7', value: 5 }, { label: 'Chủ Nhật', value: 6 }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chỉnh sửa Kíp trực trực tiếp"
        open={isSlotEditModalOpen}
        onCancel={() => setIsSlotEditModalOpen(false)}
        onOk={() => slotEditForm.submit()}
        width={650}
      >
        <Form form={slotEditForm} layout="vertical" onFinish={async (v) => {
          try {
            const res = await dutyService.updateSlot(editingSlot?.id, {
              ...v,
              shiftDate: v.shiftDate?.format('YYYY-MM-DD'),
              startTime: v.timeRange?.[0]?.format('HH:mm'),
              endTime: v.timeRange?.[1]?.format('HH:mm')
            });
            if (res.success) {
              message.success('Cập nhật thành công');
              setIsSlotEditModalOpen(false);
              fetchSlots();
            }
          } catch (err) {
            message.error('Lỗi khi cập nhật');
          }
        }}>
          <Row gutter={16}>
            <Col span={16}><Form.Item label="Tên hiển thị" name="shiftLabel"><Input /></Form.Item></Col>
            <Col span={8}>
              <Form.Item label="Trạng thái" name="status">
                <Select options={[{ label: 'Mở (Đăng ký tự do)', value: 'open' }, { label: 'Khóa (Admin quản lý)', value: 'locked' }]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}><Form.Item label="Ngày trực" name="shiftDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Thời gian" name="timeRange"><TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item label="Tiết bắt đầu" name="order"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Tiết kết thúc" name="endPeriod"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Sĩ số tối đa" name="capacity"><InputNumber min={1} placeholder="Lấy từ kíp" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>

          <Form.Item label="Nhân sự trực (Thủ công)" name="assignedUserIds">
            <Select 
              mode="multiple" 
              placeholder="Thêm nhân sự trực tiếp"
              style={{ width: '100%' }}
              filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
              options={allUsers.map(u => ({ label: `${u.name} (${u.studentId || u.email})`, value: u.id }))}
            />
          </Form.Item>

          <Form.Item label="Xác nhận điểm danh (Thủ công)" name="attendedUserIds">
            <Select 
              mode="multiple" 
              placeholder="Chọn thành viên đã trực"
              style={{ width: '100%' }}
              filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
              options={allUsers.map(u => ({ label: `${u.name} (${u.studentId || u.email})`, value: u.id }))}
            />
          </Form.Item>

          <Form.Item label="Ghi chú / Địa điểm" name="note"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Hướng dẫn Quản lý Lịch trực"
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[<Button key="close" type="primary" onClick={() => setIsGuideModalOpen(false)}>Đã hiểu</Button>]}
      >
        <div style={{ padding: '8px 0' }}>
          <p>Hệ thống lập lịch trực hoạt động dựa trên quy trình 3 bước:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <b>1. Thiết lập Bản mẫu:</b> Định nghĩa các Ca (Sáng/Chiều/Tối) và các Kíp trực (Kíp 1, Kíp 2...) với khung giờ và số người (chỉ tiêu) cố định.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>2. Lập lịch Hàng loạt:</b> Dựa trên bản mẫu, hệ thống sẽ tự động tạo ra các "Slot" trực cho cả tuần hoặc tháng chỉ với vài click.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>3. Điều phối & Phê duyệt:</b> Bạn có thể chỉnh sửa thủ công từng kíp trực lẻ hoặc phê duyệt các đơn xin nghỉ của thành viên.
            </li>
          </ul>
          <Alert
            message="Lưu ý quan trọng"
            description="Mọi thay đổi trên Bản mẫu sẽ không ảnh hưởng đến các kíp trực đã lập. Để áp dụng thay đổi mới, bạn cần lập lịch lại cho tuần đó."
            type="warning"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};

export default DutyManagement;
