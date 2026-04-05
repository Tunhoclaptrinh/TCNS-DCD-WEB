import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Space, message, Typography, Select, Tooltip, Avatar, Tag, Spin, Switch, Dropdown, Menu, Divider, Alert } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  PlusOutlined,
  ClearOutlined,
  CloseOutlined,
  PlusSquareOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DownOutlined,
  QuestionCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/vi';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { motion, AnimatePresence } from 'framer-motion';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import './DutyCalendar.less';

// Child Components
import QuickCreateModal from './components/QuickCreateModal';
import SlotDetailModal from './components/SlotDetailModal';
import SetupWeekModal from './components/SetupWeekModal';
import AssignTemplateModal from './components/AssignTemplateModal';

const { Title, Text } = Typography;

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
  const [dutyDays, setDutyDays] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => currentWeek.add(i, 'day')),
    [currentWeek]
  );

  const [isQuickCreateVisible, setIsQuickCreateVisible] = useState(false);
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<dayjs.Dayjs | null>(null);
  const [quickCreateContext, setQuickCreateContext] = useState<any>(null);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [now, setNow] = useState(dayjs());
  const [showDefaultBoundaries, setShowDefaultBoundaries] = useState(false);
  const [dutySettings, setDutySettings] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchTemplates = async () => {
    try {
      // Fetch ALL shifts across ALL groups for background boundaries
      const res = await dutyService.getShiftTemplates(null);
      if (res.success) setTemplates(res.data || []);

      const gRes = await dutyService.getTemplateGroups();
      if (gRes.success && gRes.data) {
        setTemplateGroups(gRes.data);
      }
    } catch (err) {
      console.error('Lỗi tải bản mẫu');
    }
  };

  const fetchDutySettings = async () => {
    try {
      const res = await dutyService.getSettings();
      if (res.success && res.data) setDutySettings(res.data);
    } catch (err) {
      console.error('Lỗi tải cấu hình');
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
        setAssignments(res.data.assignments || []);
        
        // Merge "Snapshot" templates into the local pool to ensure historical rendering
        if (res.data?.templates) {
          setTemplates(prev => {
            const existingIds = new Set(prev.map(t => String(t.id)));
            const newTemplates = (res.data?.templates || []).filter((t: any) => !existingIds.has(String(t.id)));
            return [...prev, ...newTemplates];
          });
        }
      }
    } catch (err) {
      message.error('Không thể tải lịch trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [isAdmin]);

  useEffect(() => {
    fetchSchedule();
    fetchDutySettings();
  }, [currentWeek]);


  const getEffectiveTemplatesForDay = (day: dayjs.Dayjs) => {
    const targetStr = day.format('YYYY-MM-DD');
    const dIdx = (day.day() + 6) % 7; // 0=Mon, ..., 6=Sun
    const dayData = dutyDays.find(d => dayjs(d.date).format('YYYY-MM-DD') === targetStr);
    
    // Determine the "Authorized" template group for this day (Assigned or Global Default)
    const assignment = assignments.find(a => {
      const startStr = dayjs(a.startDate).format('YYYY-MM-DD');
      const endStr = dayjs(a.endDate).format('YYYY-MM-DD');
      return targetStr >= startStr && targetStr <= endStr;
    });
    const defaultGroup = templateGroups.find(g => g.isDefault);
    const activeGroupId = assignment?.templateId || defaultGroup?.id;

    let candidates: any[] = [];

    // 1. Check for manual/stamped day record (The "Stencil" source of truth)
    if (dayData) {
      // Map IDs back to objects (IDs now point to persistent clones or originals)
      const templateIds = (dayData.shiftTemplateIds || []);
      candidates = templateIds.map((id: number) => {
        const t = templates.find(temp => String(temp.id) === String(id));
        return t ? { ...t, isStamped: true } : null;
      }).filter(Boolean);
    } else if (showDefaultBoundaries) {
      // 2. Fallback to range-based assignment or default (Only if toggle is ON)
      if (assignment) {
        // Option A: Assigned group for this range (Exclude ad-hoc instances)
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(assignment.templateId)).map(t => ({ ...t, isStamped: false }));
      } else if (defaultGroup) {
        // Option B: Global default group (Exclude ad-hoc instances)
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(defaultGroup.id)).map(t => ({ ...t, isStamped: false }));
      }
    }

    // Filter candidates by their specific daysOfWeek setting
    const filtered = candidates.filter(shift => (shift.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dIdx));
    
    return { shifts: filtered, activeGroupId };
  };

  const handlePrevWeek = () => setCurrentWeek(prev => prev.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentWeek(next => next.add(1, 'week'));
  const handleToday = () => setCurrentWeek(dayjs().startOf('isoWeek' as any));

  const handleRegister = async (slotId: number) => {
    // 1. Check Weekly Limit (Frontend side for better UX)
    const weeklyLimit = Number(dutySettings?.weeklyKipLimit);
    if (weeklyLimit > 0) {
      const userWeekKips = slots.filter(s => 
        s.assignedUserIds?.includes(currentUserId) && 
        dayjs(s.shiftDate).isSame(currentWeek, 'week')
      ).length;

      if (userWeekKips >= weeklyLimit) {
        message.warning(`Bạn đã đạt giới hạn đăng ký trong tuần (${weeklyLimit} kíp).`);
        return;
      }
    }

    try {
      const res = await dutyService.registerToSlot(slotId);
      if (res.success) {
        message.success('Đăng ký thành công');
        fetchSchedule();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đăng ký');
    }
  };

  const handleUnregister = async (slotId: number) => {
    try {
      const res = await dutyService.cancelRegistration(slotId);
      if (res.success) {
        message.success('Hủy đăng ký thành công');
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi hủy đăng ký');
    }
  };

  const handleStampShift = async (day: dayjs.Dayjs, shiftId: number) => {
    try {
      const res = await dutyService.addShiftToDay(day.format('YYYY-MM-DD'), shiftId);
      if (res.success) {
        message.success('Áp dụng ca thành công');
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi áp dụng ca');
    }
  };

  const handleRemoveShiftFromDay = async (date: string, shiftId: number) => {
    try {
      const res = await dutyService.removeShiftFromDay(date, shiftId);
      if (res.success) {
        message.success('Đã xóa khung ca');
        fetchSchedule();
      }
    } catch (err) {
      message.error('Lỗi khi xóa khung ca');
    }
  };

  const openQuickCreate = (day: dayjs.Dayjs, yOffset: number, shiftArg?: any, kipArg?: any) => {
    setQuickCreateDate(day);
    setQuickCreateContext({ day, yOffset, shift: shiftArg, kip: kipArg });
    setIsQuickCreateVisible(true);
  };

  const openSlotDetail = (slot: DutySlot) => {
    setSelectedSlot(slot);
    setIsSlotDetailOpen(true);
  };

  const handleClearWeek = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa trắng tuần?',
      content: 'Toàn bộ các bản ghi ca/kíp của TUẦN này sẽ bị xóa vĩnh viễn (bao gồm cả phân công người trực). Bạn có chắc chắn?',
      okText: 'Xóa vĩnh viễn',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await dutyService.deleteWeeklySlots(currentWeek.format('YYYY-MM-DD'));
          if (res.success) {
            message.success('Đã xóa trắng tuần');
            fetchSchedule();
          }
        } catch (err) {
          message.error('Lỗi khi xóa trắng tuần');
        }
      }
    });
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
                  <td colSpan={8}><strong>{shift.name}</strong></td>
                </tr>
                <tr className="kip-row row-shift-only">
                  <td className="kip-label-col sticky-col" style={{ background: '#fff1f2' }}>
                    <div className="kip-name" style={{ color: '#ef4444' }}>Dữ liệu Ca (Chung)</div>
                    <div className="kip-time">{shift.startTime} - {shift.endTime}</div>
                  </td>
                  {weekDays.map((day, dIdx) => {
                    const dateStr = day.format('YYYY-MM-DD');
                    const dayData = dutyDays.find(d => dayjs(d.date).format('YYYY-MM-DD') === dateStr);
                    const isStamped = (dayData?.shiftTemplateIds || []).map(String).includes(String(shift.id));
                    const slot = slots.find(s => !s.kipId && s.shiftId === shift.id && dayjs(s.shiftDate).format('YYYY-MM-DD') === dateStr);
                    const isPast = day.isBefore(dayjs().startOf('day'));

                    return (
                      <td
                        key={dIdx}
                        className={`matrix-cell ${slot ? 'has-slot' : 'empty-slot'} ${isPast ? 'is-past' : ''} ${isStamped ? 'shift-stamped' : ''}`}
                        style={isStamped ? { borderTop: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' } : {}}
                        onClick={() => {
                          if (slot) openSlotDetail(slot);
                          else if (isAdmin && !isPast) {
                            if (!isStamped) {
                              Modal.confirm({
                                title: 'Áp dụng Ca trực?',
                                content: `Bạn có muốn áp dụng "${shift.name}" cho ngày ${day.format('DD/MM')} không? Sau khi áp dụng bạn có thể thêm các Kíp chi tiết.`,
                                onOk: () => handleStampShift(day, shift.id)
                              });
                            } else {
                              openQuickCreate(day, getTimeTop(shift.startTime), shift);
                            }
                          }
                        }}
                      >
                        {slot ? (
                          <div className="cell-slot-info">
                            <div className="assigned-users-list">
                              {slot.assignedUsers?.map(u => (
                                <div key={u.id} className="user-row-mini" style={{ color: '#ef4444' }}>
                                  <Avatar size={16} src={u.avatar} />
                                  <span>{u.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (isStamped && isAdmin && !isPast ? (
                          <div className="add-kip-hint"><PlusOutlined /> Thêm Kíp</div>
                        ) : (!slot && isStamped ? <div className="shift-active-indicator">Ca Trống</div> : null))}
                        {!isStamped && isAdmin && !isPast && (
                          <div className="stamp-hint"><PlusSquareOutlined /> Áp dụng Ca</div>
                        )}
                      </td>
                    );
                  })}
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
                        const dayData = dutyDays.find(d => dayjs(d.date).format('YYYY-MM-DD') === dateStr);
                        const isStamped = (dayData?.shiftTemplateIds || []).map(String).includes(String(shift.id));
                        const slot = slots.find(s => s.kipId === kip.id && dayjs(s.shiftDate).format('YYYY-MM-DD') === dateStr);
                        const shiftSlot = slots.find(s => s.kipId === null && String(s.shiftId) === String(shift.id) && dayjs(s.shiftDate).format('YYYY-MM-DD') === dateStr);
                        const displaySlot = slot || shiftSlot;
                        const isPast = day.isBefore(dayjs().startOf('day')) || (day.isSame(dayjs(), 'day') && dayjs(`${dateStr} ${kip.startTime || shift.startTime}`).isBefore(dayjs()));

                        return (
                          <td
                            key={dIdx}
                            className={`matrix-cell ${slot ? 'has-slot' : 'empty-slot'} ${isPast ? 'is-past' : ''} ${isStamped ? 'shift-stamped' : ''}`}
                            style={isStamped ? { borderLeft: '2px dashed #fecaca', borderRight: '1px dashed #fecaca' } : { borderLeft: '1px solid #f1f5f9' }}
                            onClick={() => {
                              if (slot) openSlotDetail(slot);
                              else if (isAdmin && !isPast) {
                                if (!isStamped) {
                                  message.warning(`Cần áp dụng "${shift.name}" trước khi tạo Kíp.`);
                                } else {
                                  openQuickCreate(day, 0, shift, kip);
                                }
                              }
                            }}
                          >
                             {displaySlot ? (
                               <div className={`cell-slot-info ${!slot && shiftSlot ? 'is-shift-level' : ''}`}>
                                 <div className="assigned-users-list">
                                   {displaySlot.assignedUsers?.map(u => (
                                     <div key={u.id} className="user-row-mini">
                                       <Avatar size={16} src={u.avatar} />
                                       <span>{u.name}</span>
                                     </div>
                                   ))}
                                 </div>
                                 {!isPast && (
                                   <div className="slot-capacity-tag">
                                     <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>
                                       {displaySlot.assignedUserIds.length}/{displaySlot.capacity || displaySlot.kip?.capacity || 0} người
                                     </div>
                                     {displaySlot.assignedUserIds.includes(currentUserId) ? (
                                       // Only allow unregister if not full OR if policy allows it
                                       (dutySettings?.allowUnregisterWhenFull || displaySlot.assignedUserIds.length < (displaySlot.capacity || displaySlot.kip?.capacity || 0)) ? (
                                         <Button size="small" type="link" danger onClick={(e) => { e.stopPropagation(); handleUnregister(displaySlot.id); }}>Hủy đ.ký</Button>
                                       ) : (
                                         <Tooltip title="Kíp đã đủ người, không thể tự ý hủy. Hãy liên hệ Admin nếu cần.">
                                           <Button size="small" type="link" disabled><LockOutlined style={{ fontSize: 10 }} /> Đã khóa</Button>
                                         </Tooltip>
                                       )
                                     ) : (
                                       displaySlot.assignedUserIds.length < (displaySlot.capacity || displaySlot.kip?.capacity || 0) && (
                                         <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); handleRegister(displaySlot.id); }}>+ Đăng ký</Button>
                                       )
                                     )}
                                   </div>
                                 )}
                                 {!slot && shiftSlot && <div className="shift-active-indicator">(Cả ca)</div>}
                                 {displaySlot.assignedUserIds.length >= (displaySlot.capacity || displaySlot.kip?.capacity || 0) && !displaySlot.assignedUserIds.includes(currentUserId) && (
                                   <div className="slot-capacity-tag">
                                     <Tag color="default">{displaySlot.assignedUserIds.length}/{displaySlot.capacity || displaySlot.kip?.capacity || 0} đủ</Tag>
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

  const adminMenu = (
    <Menu onClick={({ key }) => {
      if (key === 'setup') setIsSetupModalVisible(true);
      else if (key === 'assign') setIsAssignModalVisible(true);
      else if (key === 'clear') handleClearWeek();
    }}>
      <Menu.Item key="setup" icon={<SettingOutlined />}>Khởi tạo Tuần</Menu.Item>
      <Menu.Item key="assign" icon={<CalendarOutlined />}>Gắn Bản mẫu</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="clear" icon={<DeleteOutlined />} danger>Xóa trắng tuần</Menu.Item>
    </Menu>
  );

  return (
    <div className="duty-calendar-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Lịch trực tuần</Title>
        <Space>
          <Button 
            icon={<QuestionCircleOutlined />} 
            onClick={() => setIsGuideModalOpen(true)}
          >
            Hướng dẫn
          </Button>
        </Space>
      </div>
      <Card
        className="duty-calendar-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="week-nav-group" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: 8 }}>
              <Button icon={<LeftOutlined />} type="text" size="small" onClick={handlePrevWeek} />
              <Button type="text" size="small" onClick={handleToday} style={{ fontSize: '12px', fontWeight: 600 }}>H.tại</Button>
              <Button icon={<RightOutlined />} type="text" size="small" onClick={handleNextWeek} />
            </div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>
              Tuần {currentWeek.format('ww')} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '14px' }}>({currentWeek.format('DD/MM')} - {currentWeek.add(6, 'day').format('DD/MM')})</span>
            </Title>
          </div>
        }
        extra={
          <Space size="middle">
            <div className="view-controls" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
              <Tooltip title="Chế độ hiển thị">
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  bordered={false}
                  options={[
                    { label: 'Lịch', value: 'calendar' },
                    { label: 'Bảng', value: 'table' }
                  ]}
                  style={{ width: 80 }}
                  className="view-mode-select"
                />
              </Tooltip>
              <Divider type="vertical" style={{ margin: 0 }} />
              <Space size={4}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hiện khung</span>
                <Switch size="small" checked={showDefaultBoundaries} onChange={setShowDefaultBoundaries} />
              </Space>
            </div>

            <Space size={8}>
              <Tooltip title="Tải lại dữ liệu">
                <Button icon={<SyncOutlined />} onClick={fetchSchedule} loading={loading} />
              </Tooltip>
              <Tooltip title="Xuất dữ liệu Excel">
                <Button icon={<CloudDownloadOutlined />} />
              </Tooltip>
              
              {isAdmin && (
                <Dropdown overlay={adminMenu} placement="bottomRight">
                  <Button type="primary" className="hifi-button">
                    Quản trị <DownOutlined />
                  </Button>
                </Dropdown>
              )}
            </Space>
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



                    const { shifts: effectiveShifts, activeGroupId } = getEffectiveTemplatesForDay(day);
                    const effectiveShiftIds = effectiveShifts.map(s => String(s.id));

                    // Only show ghost kips if they belong to the ACTIVE group (Default or Assigned)
                    const dayTemplates = templates.flatMap(s => (s.kips || []).map(k => ({ ...k, shiftId: s.id, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime })))
                      .filter(k => {
                        const shiftParent = templates.find(s => s.id === k.shiftId);
                        // 1. Must be in effectiveShiftIds (Belong to a valid boundary on this day)
                        if (!effectiveShiftIds.includes(String(k.shiftId))) return false;
                        
                        // 2. If it's a fixed instance (stamped), we show its kips regardless of group matching
                        if (shiftParent?.description === 'INSTANCE') return true;

                        // 3. Otherwise (Draft boundaries), must belong to the Authorized/Active Group for this day
                        return String(shiftParent?.templateId) === String(activeGroupId);
                      });

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
                        {effectiveShifts.map((shift, sIdx) => {
                          const isDraftShift = !shift.isStamped;
                          return (
                            <div
                              key={`shift-${shift.id}-${dIdx}-${sIdx}`}
                              className={`calendar-shift-box ${isDraftShift ? 'draft' : ''}`}
                              style={{
                                top: `${getTimeTop(shift.startTime)}px`,
                                height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                                position: 'absolute',
                                width: '100%',
                                zIndex: 1
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickCreate(day, getTimeTop(shift.startTime), shift);
                              }}
                            >
                              <div className="shift-tag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{shift.name}</span>
                                {isAdmin && (
                                  <CloseOutlined
                                    className="shift-delete-icon"
                                    style={{ fontSize: 10, cursor: 'pointer', padding: '2px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px' }}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      Modal.confirm({
                                        title: 'Xác nhận xóa lẻ',
                                        content: `Bạn có chắc muốn xóa khung ca "${shift.name}" chỉ riêng cho ngày ${day.format('DD/MM')} này không?`,
                                        onOk: () => handleRemoveShiftFromDay(day.format('YYYY-MM-DD'), shift.id)
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <AnimatePresence>
                          {daySlots
                            .filter(slot => {
                              // If it's a Shift-level slot (kipId null), check if there are any Kip-level slots for the same shift
                              if (slot.kipId === null) {
                                const hasKips = daySlots.some(s => s.kipId !== null && String(s.shiftId) === String(slot.shiftId));
                                if (hasKips) return false; // Hide redundant shift container slot
                              }
                              return true;
                            })
                            .map(slot => {
                            const isPastSlot = isPastDay || (isToday && dayjs(`${dateStr} ${slot.startTime}`).isBefore(now));
                            return (
                              <motion.div
                                key={slot.id}
                                layoutId={String(slot.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className={`calendar-slot-box ${slot.status === 'locked' || isPastSlot ? 'locked' : ''} ${!isAdmin && !slot.assignedUserIds?.includes(currentUserId) && (slot.assignedUserIds?.length || 0) < (slot.capacity || slot.kip?.capacity || 0) ? 'can-join' : ''}`}
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
                                    {slot.assignedUserIds?.length || 0}/{slot.capacity || slot.kip?.capacity || 0}
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
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{slot.capacity || slot.kip?.capacity || 0} người</span>
                                  )}
                                </div>
                                {(!isAdmin && !isPastSlot && slot.assignedUserIds?.includes(currentUserId)) && (
                                  <div className="quick-join-overlay danger" onClick={(e) => { e.stopPropagation(); handleUnregister(slot.id); }}>
                                    <ClearOutlined /> Hủy đ.ký
                                  </div>
                                )}
                                {(!isAdmin && !isPastSlot && !slot.assignedUserIds?.includes(currentUserId) && (slot.assignedUserIds?.length || 0) < (slot.kip?.capacity || 0)) && (
                                  <div className="quick-join-overlay" onClick={(e) => { e.stopPropagation(); handleRegister(slot.id); }}>
                                    <PlusOutlined /> Đăng ký
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {showDefaultBoundaries && dayTemplates.filter(k => {
                          const kStart = k.startTime || k.sStart;
                          if (!kStart) return false;
                          
                          const existingSlot = daySlots.find(s => String(s.shiftId) === String(k.shiftId) && String(s.kipId) === String(k.id));
                          return !existingSlot;
                        }).map(k => {
                          const kStart = k.startTime || k.sStart;
                          const kEnd = k.endTime || k.sEnd;
                          return (
                            <div
                              key={`draft-${k.id}`}
                              className="calendar-slot-box draft"
                              style={{ top: `${getTimeTop(kStart)}px`, height: `${getTimeHeight(kStart, kEnd)}px` }}
                              onClick={() => {
                                openQuickCreate(day, getTimeTop(kStart), templates.find(s => String(s.id) === String(k.shiftId)), k);
                              }}
                            >
                              <div className="slot-title">{k.name}</div>
                              <div className="slot-time">{kStart} - {kEnd} (Mẫu)</div>
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

      <QuickCreateModal
        open={isQuickCreateVisible}
        onCancel={() => setIsQuickCreateVisible(false)}
        onSuccess={fetchSchedule}
        date={quickCreateDate}
        context={quickCreateContext}
        templates={templates}
        existingSlots={slots}
      />

      <SlotDetailModal
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        onSuccess={fetchSchedule}
        slot={selectedSlot}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />

      <SetupWeekModal
        open={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        onSuccess={fetchSchedule}
        currentWeek={currentWeek}
        templateGroups={templateGroups}
      />

      <AssignTemplateModal
        open={isAssignModalVisible}
        onCancel={() => setIsAssignModalVisible(false)}
        onSuccess={fetchSchedule}
        templateGroups={templateGroups}
      />

      <Modal
        title={
          <Space>
            <div style={{ width: 4, height: 18, background: 'var(--primary-color)', borderRadius: 2 }} />
            <span>Hướng dẫn sử dụng Lịch trực tuần</span>
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
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Tương tác cơ bản:</Text>
            <ul style={{ paddingLeft: 20, color: '#475569' }}>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Click vào vùng trống trong Ca:</Text> Khởi tạo nhanh một kíp trực mới dựa trên khung giờ của Ca mẫu đó.
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Click vào Kíp trực (màu):</Text> Xem chi tiết nhân sự, Đăng ký trực hoặc Hủy đăng ký (nếu chưa bị khóa).
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Nút "Hiện khung":</Text> Hiển thị các Ca và Kíp mẫu (màu xám) chưa được áp dụng vào ngày đó để bạn dễ dàng "dập khuôn".
               </li>
            </ul>
          </div>

          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Dành cho Quản trị viên:</Text>
            <ul style={{ paddingLeft: 20, color: '#475569' }}>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Khởi tạo Tuần:</Text> Sao chép toàn bộ bản mẫu của một Nhóm sang tuần được chọn.
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Gắn Bản mẫu:</Text> Gắn một Nhóm kíp trực cố định vào tuần này (Snapshot).
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Xóa trắng tuần:</Text> Xóa toàn bộ dữ liệu trực của tuần hiện tại để thiết lập lại từ đầu.
               </li>
            </ul>
          </div>

          <Alert
            message="Lưu ý về Dữ liệu"
            description="Lịch trực tuần hoạt động theo cơ chế Độc lập. Mọi thay đổi trong phần 'Thiết lập' sẽ không ảnh hưởng đến các tuần đã được khởi tạo trước đó."
            type="info"
            showIcon
            style={{ marginTop: 16, borderRadius: 12 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DutyCalendar;
