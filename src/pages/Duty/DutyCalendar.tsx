import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Button, Space, message, Modal, Form, Input, InputNumber, TimePicker, Row, Col, Select, Spin } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ClearOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { motion, AnimatePresence } from 'framer-motion';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import './DutyCalendar.less';

const { Title } = Typography;

interface DutyCalendarProps {
  isAdmin?: boolean;
  user?: any;
}

const DutyCalendar: React.FC<DutyCalendarProps> = ({ isAdmin = false, user }) => {
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const currentUserId = user?.id;

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => currentWeek.add(i, 'day')),
    [currentWeek]
  );

  const [isQuickCreateVisible, setIsQuickCreateVisible] = useState(false);
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [quickCreateForm] = Form.useForm();
  const [detailForm] = Form.useForm();
  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<dayjs.Dayjs | null>(null);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [leaveForm] = Form.useForm();

  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await dutyService.getTemplates();
      if (res.success) setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to fetch templates');
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const start = currentWeek.startOf('isoWeek' as any).toISOString();
      const res = await dutyService.getWeeklySchedule(start);
      if (res.success) setSlots(res.data || []);
    } catch (err) {
      message.error('Không thể tải lịch trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [currentWeek]);

  // Actions
  const handlePrevWeek = () => setCurrentWeek(currentWeek.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentWeek(currentWeek.add(1, 'week'));
  const handleToday = () => setCurrentWeek(dayjs().startOf('isoWeek' as any));

  const handleClearWeek = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa sạch lịch tuần này?',
      okText: 'Xóa sạch',
      okType: 'danger',
      onOk: async () => {
        try {
          const start = currentWeek.startOf('isoWeek' as any).toISOString();
          const res = await dutyService.clearWeek(start);
          if (res.success) {
            message.success('Đã xóa lịch tuần');
            fetchSchedule();
          }
        } catch (err) {
          message.error('Lỗi khi xóa lịch');
        }
      }
    });
  };

  const handleCopyWeek = async () => {
    try {
      const prevWeekStart = currentWeek.subtract(1, 'week').startOf('isoWeek' as any).toISOString();
      const targetStart = currentWeek.startOf('isoWeek' as any).toISOString();
      const res = await dutyService.copyWeek(prevWeekStart, targetStart);
      if (res.success) {
        message.success('Đã sao chép lịch tuần trước');
        setIsSetupModalVisible(false);
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi sao chép');
    }
  };

  const generateScheduleFromTemplates = async () => {
    try {
      const start = currentWeek.startOf('isoWeek' as any).toISOString();
      const res = await dutyService.generateWeekSlots(start);
      if (res.success) {
        message.success('Đã khởi tạo từ bản mẫu');
        setIsSetupModalVisible(false);
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi khởi tạo');
    }
  };

  const openQuickCreate = (day: dayjs.Dayjs, yOffset: number) => {
    if (!isAdmin) return;
    setQuickCreateDate(day);
    const totalMinutes = Math.floor((yOffset / 60) * 60);
    const h = 7 + Math.floor(totalMinutes / 60);
    const m = Math.floor((totalMinutes % 60) / 15) * 15;
    const start = dayjs().hour(h).minute(m).second(0);
    const end = start.add(1, 'hour');
    quickCreateForm.resetFields();
    quickCreateForm.setFieldsValue({
      timeRange: [start, end],
      capacity: 1,
      shiftLabel: ''
    });
    setIsQuickCreateVisible(true);
  };

  const handleQuickCreate = async (values: any) => {
    try {
      const { timeRange, ...rest } = values;
      const payload = {
        ...rest,
        shiftDate: quickCreateDate?.toISOString(),
        weekStart: currentWeek.startOf('isoWeek' as any).toISOString(),
        startTime: timeRange?.[0]?.format('HH:mm'),
        endTime: timeRange?.[1]?.format('HH:mm'),
        status: 'open' as const
      };
      const res = await dutyService.createSlot(payload);
      if (res.success) {
        message.success('Đã tạo ca trực');
        setIsQuickCreateVisible(false);
        fetchSchedule();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Tạo thất bại');
    }
  };

  const openSlotDetail = (slot: DutySlot) => {
    setSelectedSlot(slot);
    detailForm.setFieldsValue({
      ...slot,
      timeRange: slot.startTime && slot.endTime ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] : undefined
    });
    setIsSlotDetailOpen(true);
  };

  const handleUpdateDetail = async (values: any) => {
    if (!selectedSlot) return;
    try {
      const { timeRange, ...rest } = values;
      const data = {
        ...rest,
        startTime: timeRange?.[0]?.format('HH:mm'),
        endTime: timeRange?.[1]?.format('HH:mm'),
      };
      const res = await dutyService.updateSlot(selectedSlot.id, data);
      if (res.success) {
        message.success('Đã cập nhật');
        setIsSlotDetailOpen(false);
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    Modal.confirm({
      title: 'Xóa ca trực?',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await dutyService.deleteSlot(slotId);
          if (res.success) {
            message.success('Đã xóa');
            fetchSchedule();
            setIsSlotDetailOpen(false);
          }
        } catch (err) {
          message.error('Xóa thất bại');
        }
      }
    });
  };

  const handleRegister = async (slotId: number) => {
    try {
      const res = await dutyService.registerToSlot(slotId);
      if (res.success) {
        message.success('Đã đăng ký ca trực');
        fetchSchedule();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  const START_HOUR = 5;
  const END_HOUR = 24;
  const PX_PER_HOUR = 60;

  const getTimeTop = (timeStr: string | undefined) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h - START_HOUR) * PX_PER_HOUR + (m / 60) * PX_PER_HOUR;
  };

  const getTimeHeight = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return PX_PER_HOUR;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(30, (duration / 60) * PX_PER_HOUR);
  };

  const slotsByDay = useMemo(() =>
    slots.reduce((acc: Record<string, DutySlot[]>, slot) => {
      const date = dayjs(slot.shiftDate).format('YYYY-MM-DD');
      if (!acc[date]) acc[date] = [];
      acc[date].push(slot);
      return acc;
    }, {}),
    [slots]
  );

  const isSelectedWeekCurrent = now.isSame(currentWeek, 'week');
  const currentDayIndex = (now.day() + 6) % 7;
  const redLineTop = isSelectedWeekCurrent && now.hour() >= START_HOUR && now.hour() < END_HOUR
    ? (now.hour() - START_HOUR) * PX_PER_HOUR + (now.minute() / 60) * PX_PER_HOUR
    : null;

  return (
    <div className="duty-page">
      <Card
        title={
          <Space size="large">
            <Space>
              <Button icon={<LeftOutlined />} onClick={handlePrevWeek} shape="circle" size="small" />
              <Button onClick={handleToday} size="small" type={isSelectedWeekCurrent ? 'primary' : 'default'}>Hôm nay</Button>
              <Button icon={<RightOutlined />} onClick={handleNextWeek} shape="circle" size="small" />
            </Space>
            <Title level={4} style={{ margin: 0 }}>
              {currentWeek.format('DD/MM')} - {currentWeek.add(6, 'day').format('DD/MM/YYYY')}
            </Title>
          </Space>
        }
        extra={isAdmin && (
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setIsSetupModalVisible(true)} type="primary">Cài đặt tuần</Button>
          </Space>
        )}
        bodyStyle={{ padding: 0 }}
      >
        <Spin spinning={loading}>
          <div className="duty-calendar-pro">
            <div className="calendar-header">
              <div className="header-axis-spacer" />
              {weekDays.map((d, idx) => (
                <div key={idx} className={`header-day ${isSelectedWeekCurrent && idx === currentDayIndex ? 'is-today' : ''}`}>
                  <span className="day-name">{d.locale('vi').format('ddd')},</span>
                  <span className="day-date">{d.format('DD')}</span>
                </div>
              ))}
              <div className="header-scroll-spacer" />
            </div>

            <div className="calendar-body">
              <div className="time-axis">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <div key={i} className="axis-hour">
                    <span>{String(START_HOUR + i).padStart(2, '0')}:00</span>
                  </div>
                ))}
                <div className="axis-hour"><span>24:00</span></div>
                {redLineTop !== null && (
                  <div className="current-time-line axis-indicator" style={{ top: `${redLineTop}px` }}>
                    <span className="time-label">{now.format('HH:mm')}</span>
                  </div>
                )}
              </div>

              <div className="grid-container">
                <div className="grid-lines-bg">
                  {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div key={i} className="grid-line" />
                  ))}
                </div>

                {weekDays.map((day, dIdx) => {
                  const dateStr = day.format('YYYY-MM-DD');
                  const daySlots = slotsByDay[dateStr] || [];
                  const isToday = isSelectedWeekCurrent && dIdx === currentDayIndex;

                  const dayTemplates = templates.flatMap(s => (s.kips || []).map(k => ({ ...k, shiftId: s.id, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime })))
                    .filter(k => (k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dIdx));

                  return (
                    <div key={dIdx} className={`day-column ${isToday ? 'is-today' : ''}`}>
                      {isToday && redLineTop !== null && (
                        <div className="current-time-line today-indicator" style={{ top: `${redLineTop}px` }}>
                          <span className="time-label">{now.format('HH:mm')}</span>
                        </div>
                      )}
                      <div
                        className="column-click-overlay"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          openQuickCreate(day, e.clientY - rect.top);
                        }}
                      />

                      {/* Shift (Ca) Backgrounds */}
                      {templates.map(shift => {
                        const hasKipToday = (shift.kips || []).some(k => (k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dIdx));
                        if (!hasKipToday) return null;

                        return (
                          <div
                            key={`shift-${shift.id}`}
                            className="calendar-shift-box"
                            style={{
                              top: `${getTimeTop(shift.startTime)}px`,
                              height: `${getTimeHeight(shift.startTime, shift.endTime)}px`
                            }}
                          >
                            <div className="shift-tag">{shift.name}</div>
                          </div>
                        );
                      })}

                      <AnimatePresence>
                        {daySlots.map(slot => (
                          <motion.div
                            key={slot.id}
                            layoutId={String(slot.id)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={`calendar-slot-box ${slot.status === 'locked' ? 'locked' : ''}`}
                            style={{
                              top: `${getTimeTop(slot.startTime)}px`,
                              height: `${getTimeHeight(slot.startTime, slot.endTime)}px`
                            }}
                            onClick={() => openSlotDetail(slot)}
                          >
                            <div className="slot-title">{slot.shiftLabel}</div>
                            <div className="slot-time">{slot.startTime} - {slot.endTime}</div>
                            <div className="slot-users">
                              {slot.assignedUsers?.map((u: any) => (
                                <span key={u.id} className="user-abbr">{u.name.split(' ').pop()}</span>
                              ))}
                              {(!slot.assignedUsers || slot.assignedUsers.length === 0) && (
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{slot.capacity} người</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {dayTemplates.map(kip => {
                        const kStart = kip.startTime || kip.sStart;
                        const kEnd = kip.endTime || kip.sEnd;
                        const hasRealSlot = daySlots.some(s => {
                          if (!s.startTime || !s.endTime || !kStart || !kEnd) return false;
                          return (kStart < s.endTime && kEnd > s.startTime);
                        });
                        if (hasRealSlot) return null;
                        return (
                          <div
                            key={`draft-${kip.id}`}
                            className="calendar-slot-box draft"
                            style={{ top: `${getTimeTop(kStart)}px`, height: `${getTimeHeight(kStart, kEnd)}px` }}
                            onClick={() => openQuickCreate(day, getTimeTop(kStart))}
                          >
                            <div className="slot-title">{kip.name}</div>
                            <div className="slot-time">{kStart} - {kEnd}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Spin>
      </Card>

      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <span>Tạo ca trực nhanh ({quickCreateDate?.format('DD/MM/YYYY')})</span>
          </Space>
        }
        open={isQuickCreateVisible}
        onCancel={() => setIsQuickCreateVisible(false)}
        onOk={() => quickCreateForm.submit()}
      >
        <Form form={quickCreateForm} layout="vertical" onFinish={handleQuickCreate}>
          <Form.Item label="Chọn từ bản mẫu">
            <Select
              placeholder="Chọn một kíp mẫu"
              onChange={(val) => {
                const kips = templates.flatMap(s => s.kips.map(k => ({ ...k, shiftName: s.name, startTime: s.startTime, endTime: s.endTime })));
                const kip = kips.find(k => k.id === val);
                if (kip) {
                  quickCreateForm.setFieldsValue({
                    shiftLabel: `${kip.shiftName} - ${kip.name}`,
                    capacity: kip.capacity,
                    timeRange: kip.startTime && kip.endTime ? [dayjs(kip.startTime, 'HH:mm'), dayjs(kip.endTime, 'HH:mm')] : undefined,
                  });
                }
              }}
              options={templates.flatMap(s => s.kips.map(k => ({
                label: `${s.name} - ${k.name}`,
                value: k.id
              })))}
            />
          </Form.Item>
          <Form.Item name="shiftLabel" label="Tên Ca / Kíp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="timeRange" label="Thời gian" rules={[{ required: true }]}>
                <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="capacity" label="Số lượng">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thiết lập tuần"
        open={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button block type="primary" icon={<SettingOutlined />} onClick={() => {
            Modal.confirm({
              title: 'Khởi tạo từ bản mẫu?',
              onOk: generateScheduleFromTemplates
            });
          }}>Khởi tạo từ bản mẫu (Xếp lịch trống)</Button>
          <Button block icon={<CopyOutlined />} onClick={() => {
            Modal.confirm({
              title: 'Sao chép từ tuần trước?',
              onOk: handleCopyWeek
            });
          }}>Sao chép toàn bộ từ tuần trước</Button>
          <Button block danger icon={<ClearOutlined />} onClick={handleClearWeek}>Xóa sạch lịch tuần này</Button>
        </Space>
      </Modal>

      <Modal
        title="Chi tiết ca trực"
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        footer={isAdmin ? [
          <Button key="del" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSlot(selectedSlot!.id)}>Xóa ca</Button>,
          <Button key="save" type="primary" onClick={() => detailForm.submit()}>Lưu thay đổi</Button>
        ] : [
          selectedSlot?.assignedUserIds?.includes(currentUserId) ?
            <Button key="leave" danger icon={<StopOutlined />} onClick={() => setIsLeaveModalVisible(true)}>Xin nghỉ</Button> :
            <Button key="reg" type="primary" icon={<PlusOutlined />} onClick={() => handleRegister(selectedSlot!.id)}>Đăng ký ca này</Button>
        ]}
      >
        {selectedSlot && (
          <Form form={detailForm} layout="vertical" onFinish={handleUpdateDetail} disabled={!isAdmin}>
            <Form.Item label="Tên ca" name="shiftLabel"><Input /></Form.Item>
            <Form.Item label="Thời gian" name="timeRange"><TimePicker.RangePicker format="HH:mm" /></Form.Item>
            <Form.Item label="Số lượng" name="capacity"><InputNumber min={1} /></Form.Item>
            <Title level={5}>Thành viên ({selectedSlot.assignedUsers?.length || 0})</Title>
            <Space wrap>
              {selectedSlot.assignedUsers?.map((u: any) => (
                <div key={u.id} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>{u.name}</div>
              ))}
            </Space>
          </Form>
        )}
      </Modal>

      <Modal
        title="Đơn xin nghỉ"
        open={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onOk={() => leaveForm.submit()}
      >
        <Form form={leaveForm} layout="vertical" onFinish={async (values) => {
          if (!selectedSlot) return;
          const res = await dutyService.requestLeave(selectedSlot.id, values.reason);
          if (res.success) {
            message.success('Đã gửi đơn');
            setIsLeaveModalVisible(false);
            setIsSlotDetailOpen(false);
          }
        }}>
          <Form.Item name="reason" label="Lý do cụ thể" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DutyCalendar;
