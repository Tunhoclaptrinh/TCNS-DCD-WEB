import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Tooltip, Avatar, Tag, Checkbox, Spin, Divider, Row, Col, Alert, DatePicker } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  EditOutlined,
  PlusCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/vi';
dayjs.extend(isoWeek);
import { motion, AnimatePresence } from 'framer-motion';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import userService from '@/services/user.service';
import './DutyCalendar.less';

const { Title, Text } = Typography;
const { Option } = Select;

interface DutyCalendarProps {
  isAdmin?: boolean;
  user?: any;
}

const DutyCalendar: React.FC<DutyCalendarProps> = ({ isAdmin: propsIsAdmin, user: propsUser }) => {
  const { user: storeUser } = useSelector((state: RootState) => state.auth);
  const user = propsUser || storeUser;
  const isAdmin = propsIsAdmin ?? (user?.role === 'admin');
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [dutyDays, setDutyDays] = useState<any[]>([]); // Added dutyDays state
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

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
  const [selectedShiftTemplate, setSelectedShiftTemplate] = useState<number | null>(null);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [leaveForm] = Form.useForm();

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
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

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll({ _limit: 100 });
      if (res.success) setAllUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const start = currentWeek.format('YYYY-MM-DD');
      const res = await dutyService.getWeeklySchedule(start);
      if (res.success && res.data) {
        setSlots(res.data.slots || []);
        setDutyDays(res.data.days || []);
      }
    } catch (err) {
      message.error('Không thể tải lịch trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

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
          const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
          const res = await dutyService.deleteWeeklySlots(start);
          if (res.success) {
            message.success('Đã xóa lịch tuần');
            fetchSchedule();
            setIsSetupModalVisible(false);
          }
        } catch (err) {
          message.error('Lỗi khi xóa lịch');
        }
      }
    });
  };

  const handleCopyWeek = async (force: boolean = false) => {
    try {
      const prevWeekStart = currentWeek.subtract(1, 'week').startOf('isoWeek' as any).format('YYYY-MM-DD');
      const targetStart = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      
      const res = await dutyService.copyWeekSchedule(prevWeekStart, targetStart);
      if (res.success) {
        message.success('Đã sao chép lịch tuần trước');
        setIsSetupModalVisible(false);
        fetchSchedule();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg === 'Target week already has slots' && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và sao chép lại từ tuần trước không?',
          okText: 'Xóa và Sao chép',
          okType: 'danger',
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
              await dutyService.deleteWeeklySlots(start);
              return handleCopyWeek(true);
            } catch (e: any) {
              message.error('Lỗi khi dọn dẹp lịch cũ: ' + (e.response?.data?.message || e.message));
            }
          }
        });
      } else {
        message.error('Lỗi khi sao chép: ' + errorMsg);
      }
    }
  };

  const generateScheduleFromTemplates = async (force: boolean = false) => {
    try {
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');
      const res = await dutyService.generateRangeSlots(start, end);
      if (res.success) {
        message.success('Đã khởi tạo từ bản mẫu');
        setIsSetupModalVisible(false);
        fetchSchedule();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      // Note: Backend generateRangeSlots currently deletes automatically, 
      // but in case of other overlapping errors:
      if ((errorMsg.includes('already has slots') || errorMsg.includes('already exists')) && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và khởi tạo lại theo bản mẫu không?',
          okText: 'Xóa và Khởi tạo',
          okType: 'danger',
          onOk: async () => {
            try {
              const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
              await dutyService.deleteWeeklySlots(start);
              return generateScheduleFromTemplates(true);
            } catch (e: any) {
              message.error('Lỗi khi dọn dẹp lịch cũ: ' + (e.response?.data?.message || e.message));
            }
          }
        });
      } else {
        message.error('Lỗi khi khởi tạo: ' + errorMsg);
      }
    }
  };

  const openQuickCreate = (day: dayjs.Dayjs, top: number) => {
    if (!isAdmin) return;
    setQuickCreateDate(day);

    const getTimeFromTop = (yOffset: number) => {
      const totalMinutes = Math.floor((yOffset / PX_PER_HOUR) * 60);
      const h = START_HOUR + Math.floor(totalMinutes / 60);
      const m = Math.floor((totalMinutes % 60) / 15) * 15;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const time = getTimeFromTop(top);
    const dayOfWeek = (day.day() + 6) % 7; // Monday = 0

    // Auto-detect template for this time
    let prefilledShift: any = null;
    let prefilledKip: any = null;

    for (const shift of templates) {
      for (const kip of shift.kips) {
        if ((kip.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dayOfWeek)) {
          const kStart = kip.startTime || shift.startTime;
          const kEnd = kip.endTime || shift.endTime;
          // click time within kip range
          if (time >= kStart && time <= kEnd) {
            prefilledShift = shift;
            prefilledKip = kip;
            break;
          }
        }
      }
      if (prefilledShift) break;
    }

    quickCreateForm.resetFields();
    quickCreateForm.setFieldsValue({
      date: day,
      shiftId: prefilledShift?.id,
      kipId: prefilledKip?.id,
      shiftLabel: prefilledShift && prefilledKip ? `${prefilledShift.name} - ${prefilledKip.name}` : '',
      timeRange: [dayjs(time, 'HH:mm'), dayjs(time, 'HH:mm').add(2, 'hour')],
      capacity: prefilledKip?.capacity || 1
    });

    if (prefilledKip) {
      const kStart = prefilledKip.startTime || prefilledShift.startTime;
      const kEnd = prefilledKip.endTime || prefilledShift.endTime;
      quickCreateForm.setFieldsValue({
        timeRange: [dayjs(kStart, 'HH:mm'), dayjs(kEnd, 'HH:mm')]
      });
    }

    setSelectedShiftTemplate(prefilledShift?.id || null);
    setIsQuickCreateVisible(true);
  };

  const handleShiftClick = (shift: DutyShift, day: dayjs.Dayjs) => {
    if (!isAdmin) return;
    Modal.confirm({
      title: (
        <Space>
          <ThunderboltOutlined style={{ color: '#ef4444' }} />
          <span>Quản lý {shift.name} - {day.format('DD/MM')}</span>
        </Space>
      ),
      icon: null,
      content: (
        <div style={{ marginTop: 16 }}>
          <p>Bạn muốn thực hiện thao tác nào cho toàn bộ ca trực này?</p>
          <Alert
            message="Xóa ca sẽ xóa tất cả kíp hiện có thuộc ca này trong ngày hôm nay."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>
      ),
      okText: 'Thêm Kíp mới',
      cancelText: 'Hủy',
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Xác nhận xóa toàn bộ ca?',
                content: `Tất cả các kíp trong ${shift.name} ngày ${day.format('DD/MM')} sẽ bị xóa.`,
                okText: 'Xác nhận Xóa',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await dutyService.deleteShiftSlots(day.format('YYYY-MM-DD'), shift.id);
                    message.success('Đã xóa toàn bộ kíp của ca');
                    fetchSchedule();
                    Modal.destroyAll();
                  } catch (err) {
                    message.error('Lỗi khi xóa ca');
                  }
                }
              });
            }}
          >
            Xóa toàn bộ ca
          </Button>
          <OkBtn />
          <CancelBtn />
        </div>
      ),
      onOk: () => {
        openQuickCreate(day, getTimeTop(shift.startTime));
      }
    });
  };

  const handleQuickCreate = async (values: any) => {
    try {
      const { timeRange, ...rest } = values;
      const payload = {
        ...rest,
        shiftDate: quickCreateDate?.format('YYYY-MM-DD'),
        weekStart: currentWeek.format('YYYY-MM-DD'),
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
      shiftDate: dayjs(slot.shiftDate),
      timeRange: slot.startTime && slot.endTime ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] : undefined
    });
    setIsSlotDetailOpen(true);
  };

  const handleUpdateDetail = async (values: any) => {
    if (!selectedSlot) return;
    try {
      const { timeRange, shiftDate, ...rest } = values;
      const data = {
        ...rest,
        shiftDate: shiftDate.format('YYYY-MM-DD'),
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
      if (res.success && res.data) {
        message.success('Đã đăng ký ca trực');
        if (isSlotDetailOpen) {
          setSelectedSlot(res.data);
        }
        fetchSchedule();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  const handleUnregister = async (slotId: number) => {
    try {
      const res = await dutyService.cancelRegistration(slotId);
      if (res.success && res.data) {
        message.success('Đã hủy đăng ký');
        if (isSlotDetailOpen) {
          setSelectedSlot(res.data);
        }
        fetchSchedule();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Hủy thất bại');
    }
  };

  const handleAttendance = async (slotId: number) => {
    try {
      // Backend expects an array of IDs for attended users. 
      // For a member checking in themselves:
      await dutyService.markAttendance(slotId, [currentUserId]);
      message.success('Điểm danh thành công! Chúc bạn ca trực vui vẻ.');
      fetchSchedule();
      setIsSlotDetailOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Điểm danh thất bại');
    }
  };

  const handleLeaveRequest = async (values: { reason: string }) => {
    if (!selectedSlot) return;
    try {
      await dutyService.requestLeave(selectedSlot.id, values.reason);
      message.success('Đã gửi yêu cầu xin nghỉ. Vui lòng chờ Admin phê duyệt.');
      setIsLeaveModalVisible(false);
      fetchSchedule();
      setIsSlotDetailOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Gửi yêu cầu thất bại');
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
    let duration = (eh * 60 + em) - (sh * 60 + sm);
    if (duration < 0) duration += 24 * 60;
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

  const renderTableView = () => {
    return (
      <div className="matrix-view-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="sticky-col">Ca / Kíp trực</th>
              {weekDays.map((d, idx) => (
                <th key={idx} className={idx === currentDayIndex ? 'is-today' : ''}>
                  <div className="day-name">{d.format('dddd')}</div>
                  <div className="day-date">{d.format('DD/MM')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map(shift => (
              <React.Fragment key={shift.id}>
                <tr className="shift-row-header">
                  <td colSpan={8}><strong>{shift.name}</strong> ({shift.startTime} - {shift.endTime})</td>
                </tr>
                {shift.kips.map((kip, kIdx) => {
                  const absoluteKipIndex = templates.slice(0, templates.indexOf(shift)).reduce((acc, s) => acc + s.kips.length, 0) + kIdx;
                  return (
                    <tr key={kip.id} className={`kip-row ${absoluteKipIndex % 2 === 0 ? 'row-pink' : 'row-blue'}`}>
                      <td className="kip-label-col sticky-col">
                        <div className="kip-name">{kip.name}</div>
                        <div className="kip-time">{kip.startTime || shift.startTime} - {kip.endTime || shift.endTime}</div>
                      </td>
                      {weekDays.map((day, dIdx) => {
                        const dateStr = day.format('YYYY-MM-DD');
                        const slot = slots.find(s => s.kipId === kip.id && dayjs(s.shiftDate).format('YYYY-MM-DD') === dateStr);
                        const isPast = day.isBefore(dayjs().startOf('day')) || (day.isSame(dayjs(), 'day') && dayjs(`${dateStr} ${kip.startTime || shift.startTime}`).isBefore(dayjs()));

                        return (
                          <td
                            key={dIdx}
                            className={`matrix-cell ${slot ? 'has-slot' : 'empty-slot'} ${isPast ? 'is-past' : ''}`}
                            onClick={() => {
                              if (slot) openSlotDetail(slot);
                              else if (isAdmin && !isPast) openQuickCreate(day, 0);
                            }}
                          >
                            {slot ? (
                              <div className="cell-slot-info">
                                <div className="assigned-users-list">
                                  {slot.assignedUsers?.map(u => (
                                    <div key={u.id} className="user-row-mini">
                                      <Avatar size={16} src={u.avatar} />
                                      <span>{u.name}</span>
                                    </div>
                                  ))}
                                </div>
                                {slot.assignedUserIds.length < slot.capacity && !isPast && (
                                  <div className="slot-capacity-tag">
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>
                                      {slot.assignedUserIds.length}/{slot.capacity} người
                                    </div>
                                    {slot.assignedUserIds.includes(currentUserId) ?
                                      <Button size="small" type="link" danger onClick={(e) => { e.stopPropagation(); handleUnregister(slot.id); }}>Hủy đ.ký</Button> :
                                      <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); handleRegister(slot.id); }}>+ Đăng ký</Button>
                                    }
                                  </div>
                                )}
                                {slot.assignedUserIds.length >= slot.capacity && (
                                  <div className="slot-capacity-tag">
                                    <Tag color="default">{slot.assignedUserIds.length}/{slot.capacity} đủ</Tag>
                                  </div>
                                )}
                              </div>
                            ) : (
                              isAdmin && !isPast && <div className="add-slot-placeholder">+ Trống</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const isSelectedWeekCurrent = now.startOf('isoWeek' as any).isSame(currentWeek.startOf('isoWeek' as any), 'day');
  const currentDayIndex = (now.day() + 6) % 7;
  const redLineTop = isSelectedWeekCurrent && now.hour() >= START_HOUR && now.hour() < END_HOUR
    ? (now.hour() - START_HOUR) * PX_PER_HOUR + (now.minute() / 60) * PX_PER_HOUR
    : null;

  return (
    <div className="duty-calendar-container">
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Lịch trực tuần</Title>
      </div>
      <Card
        className="duty-calendar-card"
        title={
          <Space size="large">
            <Space>
              <Button icon={<LeftOutlined />} onClick={handlePrevWeek} />
              <Button icon={<RightOutlined />} onClick={handleNextWeek} />
              <Button onClick={handleToday}>Hiện tại</Button>
            </Space>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
              Tuần {currentWeek.format('ww')} ({currentWeek.format('DD/MM')} - {currentWeek.add(6, 'day').format('DD/MM/YYYY')})
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={fetchSchedule}
              loading={loading}
              title="Tải lại lịch trực"
            >
              Tải lại
            </Button>
            <Select
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: 'Chế độ Lịch', value: 'calendar' },
                { label: 'Chế độ Bảng', value: 'table' }
              ]}
              style={{ width: 140 }}
            />
            {isAdmin && (
              <>
                <Button type="primary" icon={<SettingOutlined />} onClick={() => setIsSetupModalVisible(true)}>Cài đặt tuần</Button>
                <Button icon={<CloudDownloadOutlined />}>Xuất Excel</Button>
              </>
            )}
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Spin spinning={loading}>
          {viewMode === 'table' ? renderTableView() : (
            <div className="duty-calendar-pro">
              <div className="calendar-header">
                <div className="header-axis-spacer" />
                {weekDays.map((d, idx) => {
                  const dateStr = d.format('YYYY-MM-DD');
                  const dayData = dutyDays.find(dd => dayjs(dd.date).format('YYYY-MM-DD') === dateStr);
                  const isToday = isSelectedWeekCurrent && idx === currentDayIndex;

                  return (
                    <div key={idx} className={`header-day ${isToday ? 'is-today' : ''} ${dayData?.status === 'locked' ? 'is-locked' : ''}`}>
                      <div className="day-header-content">
                        <Space direction="vertical" align="center" size={0}>
                          {isToday && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', marginBottom: -2 }}>HÔM NAY</span>}
                          <Space size={4}>
                            <span className="day-name">{d.locale('vi').format('ddd')},</span>
                            <span className="day-date">{d.format('DD')}</span>
                            {dayData?.note && (
                              <Tooltip title={dayData.note}>
                                <InfoCircleOutlined style={{ marginLeft: 4, color: '#3b82f6', fontSize: 12 }} />
                              </Tooltip>
                            )}
                          </Space>
                        </Space>
                      </div>
                    </div>
                  );
                })}
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
                    const isPastDay = day.isBefore(now.startOf('day'));

                    const dayTemplates = templates.flatMap(s => (s.kips || []).map(k => ({ ...k, shiftId: s.id, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime })))
                      .filter(k => (k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dIdx));

                    return (
                      <div key={dIdx} className={`day-column ${isToday ? 'is-today' : ''} ${isPastDay ? 'is-past' : ''}`}>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShiftClick(shift, day);
                              }}
                            >
                              <div className="shift-tag">{shift.name}</div>
                            </div>
                          );
                        })}

                        <AnimatePresence>
                          {daySlots.map(slot => {
                            const isPastSlot = isPastDay || (isToday && dayjs(`${dateStr} ${slot.startTime}`).isBefore(now));
                            return (
                              <motion.div
                                key={slot.id}
                                layoutId={String(slot.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className={`calendar-slot-box ${slot.status === 'locked' || isPastSlot ? 'locked' : ''} ${!isAdmin && !slot.assignedUserIds?.includes(currentUserId) && (slot.assignedUserIds?.length || 0) < slot.capacity ? 'can-join' : ''}`}
                                style={{
                                  top: `${getTimeTop(slot.startTime)}px`,
                                  height: `${getTimeHeight(slot.startTime, slot.endTime)}px`
                                }}
                                onClick={() => openSlotDetail(slot)}
                              >
                                <div className="slot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="slot-title" style={{ fontWeight: 600 }}>
                                    {slot.shiftLabel}
                                    {slot.note && <Tooltip title={slot.note}><InfoCircleOutlined style={{ marginLeft: 4, fontSize: 10, color: '#fff' }} /></Tooltip>}
                                  </span>
                                  <span className="slot-count" style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 10 }}>
                                    {slot.assignedUserIds?.length || 0}/{slot.capacity}
                                  </span>
                                </div>
                                <div className="slot-time">{slot.startTime} - {slot.endTime}</div>
                                <div className="slot-users">
                                  {slot.assignedUsers?.map((u: any) => (
                                    <Tooltip key={u.id} title={u.name}>
                                      <Avatar size={18} src={u.avatar} className="user-avatar-mini">{u.name.split(' ').pop()?.charAt(0)}</Avatar>
                                    </Tooltip>
                                  ))}
                                  {(!slot.assignedUsers || slot.assignedUsers.length === 0) && (
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{slot.capacity} người</span>
                                  )}
                                </div>
                                {(!isAdmin && !isPastSlot && slot.assignedUserIds?.includes(currentUserId)) && (
                                  <div className="quick-join-overlay danger" onClick={(e) => { e.stopPropagation(); handleUnregister(slot.id); }}>
                                    <ClearOutlined /> Hủy đ.ký
                                  </div>
                                )}
                                {(!isAdmin && !isPastSlot && !slot.assignedUserIds?.includes(currentUserId) && (slot.assignedUserIds?.length || 0) < slot.capacity) && (
                                  <div className="quick-join-overlay" onClick={(e) => { e.stopPropagation(); handleRegister(slot.id); }}>
                                    <PlusOutlined /> Đăng ký
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
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
                              <div className="slot-title" style={{ fontStyle: 'italic', opacity: 0.7 }}>Bản mẫu: {kip.name}</div>
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
          )}
        </Spin>
      </Card>

      {/* Quick Create Modal */}
      <Modal
        title={
          <Space>
            <PlusCircleOutlined style={{ color: '#52c41a' }} />
            <span>Tạo ca trực nhanh ({quickCreateDate?.format('DD/MM/YYYY')})</span>
          </Space>
        }
        open={isQuickCreateVisible}
        onCancel={() => setIsQuickCreateVisible(false)}
        onOk={() => quickCreateForm.submit()}
        width={500}
      >
        <Form form={quickCreateForm} layout="vertical" onFinish={handleQuickCreate} initialValues={{ useTemplate: true }}>
          <Form.Item name="useTemplate" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox onChange={(e) => {
              if (!e.target.checked) {
                quickCreateForm.setFieldsValue({ shiftId: undefined, kipId: undefined });
                setSelectedShiftTemplate(null);
              }
            }}>Sử dụng Bản mẫu (Recommended)</Checkbox>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.useTemplate !== curr.useTemplate}>
            {({ getFieldValue }) => getFieldValue('useTemplate') ? (
              <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="shiftId" label="1. Chọn Ca" rules={[{ required: true, message: 'Vui lòng chọn Ca' }]}>
                      <Select
                        placeholder="Chọn Ca"
                        onChange={(val) => {
                          setSelectedShiftTemplate(val);
                          const shift = templates.find(s => s.id === val);
                          if (shift) {
                            quickCreateForm.setFieldsValue({
                              shiftLabel: shift.name,
                              timeRange: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
                              kipId: undefined
                            });
                          }
                        }}
                        options={templates.map(s => ({ label: s.name, value: s.id }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="kipId" label="2. Chọn Kíp" rules={[{ required: true, message: 'Vui lòng chọn Kíp' }]}>
                      <Select
                        placeholder="Chọn Kíp"
                        disabled={!selectedShiftTemplate}
                        onChange={(val) => {
                          const shift = templates.find(s => s.id === selectedShiftTemplate);
                          const kip = shift?.kips.find(k => k.id === val);
                          if (kip) {
                            quickCreateForm.setFieldsValue({
                              shiftLabel: `${shift!.name} - ${kip.name}`,
                              capacity: kip.capacity,
                              timeRange: kip.startTime && kip.endTime ? [dayjs(kip.startTime, 'HH:mm'), dayjs(kip.endTime, 'HH:mm')] : [dayjs(shift!.startTime, 'HH:mm'), dayjs(shift!.endTime, 'HH:mm')],
                            });
                          }
                        }}
                        options={templates.find(s => s.id === selectedShiftTemplate)?.kips.map(k => ({
                          label: k.name,
                          value: k.id
                        })) || []}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ) : (
              <Alert
                message="Tạo ca trực tự do (Không theo bản mẫu)"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </Form.Item>

          <Form.Item name="shiftLabel" label="Tên Hiển thị trên Lịch" rules={[{ required: true }]}>
            <Input placeholder="VD: Ca Sáng - Kíp 1" prefix={<EditOutlined />} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="timeRange" label="Thời gian thực tế" rules={[{ required: true }]}>
                <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="capacity" label="Số người">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú / Địa điểm">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Setup Week Modal */}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>Thiết lập lịch trình nhanh (Tuần)</span>
            <Tooltip title="Các thao tác tác động lên toàn bộ dữ liệu của tuần hiện tại">
              <QuestionCircleOutlined style={{ fontSize: 14, color: '#1890ff' }} />
            </Tooltip>
          </Space>
        }
        open={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        footer={null}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Tooltip title="Tự động tạo các khung giờ kíp trực dựa trên cấu hình Bản mẫu đã thiết lập" placement="right">
            <Button block type="primary" size="large" icon={<SettingOutlined />} onClick={() => {
              Modal.confirm({
                title: 'Xác nhận khởi tạo?',
                content: 'Hệ thống sẽ dựa vào Bản mẫu để tạo các kíp trực cho tuần này. Các kíp đã có sẽ không bị ảnh hưởng.',
                onOk: generateScheduleFromTemplates
              });
            }}>Khởi tạo từ Bản mẫu</Button>
          </Tooltip>

          <Tooltip title="Lấy dữ liệu kíp trực của tuần trước đó áp dụng cho tuần này" placement="right">
            <Button block size="large" icon={<CopyOutlined />} onClick={() => {
              Modal.confirm({
                title: 'Xác nhận sao chép?',
                content: 'Toàn bộ kíp trực từ tuần trước sẽ được nhân bản sang tuần này.',
                onOk: handleCopyWeek
              });
            }}>Sao chép từ tuần trước</Button>
          </Tooltip>

          <Divider style={{ margin: '8px 0' }} />

          <Tooltip title="Xóa toàn bộ các kíp trực trong tuần này để làm lại từ đầu" placement="right">
            <Button block danger ghost size="large" icon={<ClearOutlined />} onClick={handleClearWeek}>Xóa sạch lịch tuần</Button>
          </Tooltip>
        </Space>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>Chi tiết ca trực</span>
          </Space>
        }
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        footer={selectedSlot && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100% ' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteSlot(selectedSlot.id)}>Xóa ca</Button>}
            </div>
            <Space>
              {isAdmin && <Button loading={loading} onClick={() => detailForm.submit()} type="primary" disabled={dayjs(selectedSlot.shiftDate).isBefore(now.startOf('day'))}>Lưu thay đổi</Button>}
              {!isAdmin && !dayjs(selectedSlot.shiftDate).isBefore(now.startOf('day')) && (
                selectedSlot.assignedUserIds?.includes(currentUserId) ? (
                  <Space>
                    {/* Attendance button if current time is within slot time */}
                    {(() => {
                      const slotStart = dayjs(`${dayjs(selectedSlot.shiftDate).format('YYYY-MM-DD')} ${selectedSlot.startTime}`);
                      const slotEnd = dayjs(`${dayjs(selectedSlot.shiftDate).format('YYYY-MM-DD')} ${selectedSlot.endTime}`);
                      const isActive = now.isAfter(slotStart.subtract(15, 'minute')) && now.isBefore(slotEnd);
                      const isAttended = selectedSlot.attendedUserIds?.includes(currentUserId);

                      if (isAttended) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã điểm danh</Tag>;
                      if (isActive) return <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAttendance(selectedSlot.id)}>Điểm danh ngay</Button>;
                      return null;
                    })()}

                    <Button danger icon={<ClearOutlined />} onClick={() => handleUnregister(selectedSlot.id)}>Hủy đăng ký</Button>
                    <Button icon={<StopOutlined />} onClick={() => setIsLeaveModalVisible(true)}>Xin nghỉ</Button>
                  </Space>
                ) : (
                  (selectedSlot.assignedUserIds?.length || 0) < selectedSlot.capacity && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleRegister(selectedSlot.id)}>Đăng ký ca này</Button>
                  )
                )
              )}
              <Button onClick={() => setIsSlotDetailOpen(false)}>Đóng</Button>
            </Space>
          </div>
        )}
      >
        {selectedSlot && (
          <>
            <Alert
              message={
                <span>
                  Ca này thuộc <b>Tuần {dayjs(selectedSlot.shiftDate).format('ww')}</b> - <b>{dayjs(selectedSlot.shiftDate).format('DD/MM/YYYY')}</b>
                  {dayjs(selectedSlot.shiftDate).isBefore(dayjs().startOf('day')) && (
                    <Tag color="error" style={{ marginLeft: 8 }}>Đã quá hạn</Tag>
                  )}
                </span>
              }
              type={dayjs(selectedSlot.shiftDate).isBefore(dayjs().startOf('day')) ? "warning" : "info"}
              showIcon
              style={{ marginBottom: 16 }}
            />
            {isAdmin ? (
              <Form form={detailForm} layout="vertical" onFinish={handleUpdateDetail} disabled={dayjs(selectedSlot.shiftDate).isBefore(dayjs().startOf('day'))}>
                <Row gutter={16}>
                  <Col span={10}>
                    <Form.Item label="Ngày trực" name="shiftDate" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={14}>
                    <Form.Item label="Tên ca (Hiển thị)" name="shiftLabel" rules={[{ required: true }]}><Input /></Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item label="Khung giờ" name="timeRange" rules={[{ required: true }]}><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Số người" name="capacity"><InputNumber min={1} style={{ width: '100% ' }} /></Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>

                <Form.Item label="Gán người trực (Admin)" name="assignedUserIds">
                  <Select
                    mode="multiple"
                    placeholder="Chọn thành viên"
                    style={{ width: '100%' }}
                    optionLabelProp="label"
                  >
                    {allUsers.map(u => (
                      <Option key={u.id} value={u.id} label={u.name}>
                        <Space>
                          <Avatar size="small" src={u.avatar} />
                          {u.name} ({u.role})
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            ) : (
              <div style={{ marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 8 }}>
                <Title level={4} style={{ margin: 0 }}>{selectedSlot.shiftLabel}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </Text>
                {selectedSlot.note && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>Ghi chú: </Text>
                    <Text>{selectedSlot.note}</Text>
                  </div>
                )}
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />
            <Title level={5}>Thành viên hiện tại ({selectedSlot.assignedUsers?.length || 0}/{selectedSlot.capacity})</Title>
            <Space wrap>
              {selectedSlot.assignedUsers?.length ? selectedSlot.assignedUsers.map((u: any) => (
                <Tag key={u.id} color={u.id === currentUserId ? "orange" : "blue"} style={{ padding: '4px 8px', borderRadius: 16 }}>
                  <Space>
                    <Avatar size="small" src={u.avatar}>{u.name.charAt(0)}</Avatar>
                    {u.name} {u.id === currentUserId && "(Bạn)"}
                  </Space>
                </Tag>
              )) : <Text type="secondary" italic>Chứa có ai đăng ký</Text>}
            </Space>
          </>
        )}
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        title="Yêu cầu xin nghỉ"
        open={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onOk={() => leaveForm.submit()}
      >
        <Alert
          message="Lưu ý: Bạn nên tìm người thay thế trước khi xin nghỉ để đảm bảo quân số cho ca trực."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={leaveForm} layout="vertical" onFinish={handleLeaveRequest}>
          <Form.Item
            label="Lý do xin nghỉ"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập lý do chi tiết..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DutyCalendar;
