import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Space, message, Typography, Select, Tooltip, Avatar, Spin, Tag } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
  LockOutlined,
  InfoCircleOutlined,
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
import '../DutyCalendar.less';

// Child Components
import DutySlotModal from '../components/DutySlotModal';

const { Title } = Typography;

const MemberCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  const [dutySettings, setDutySettings] = useState<any>(null);
  const [showDefaultBoundaries, setShowDefaultBoundaries] = useState(false);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => currentWeek.add(i, 'day')),
    [currentWeek]
  );

  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

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
        setDays(res.data.days || []);
        setAssignments(res.data.assignments || []);
        
        // Merge "Snapshot" templates into the local pool to ensure historical rendering
        if (res.data?.templates) {
          setTemplates(res.data.templates);
        }

        const gRes = await dutyService.getTemplateGroups();
        if (gRes.success && gRes.data) {
          setTemplateGroups(gRes.data);
        }
      }
    } catch (err) {
      message.error('Không thể tải lịch trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchDutySettings();
  }, [currentWeek]);

  const handlePrevWeek = () => setCurrentWeek(prev => prev.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentWeek(next => next.add(1, 'week'));
  const handleToday = () => setCurrentWeek(dayjs().startOf('isoWeek' as any));

  const getEffectiveTemplatesForDay = (day: dayjs.Dayjs) => {
    const targetStr = day.format('YYYY-MM-DD');
    const dIdx = (day.day() + 6) % 7; // 0=Mon, ..., 6=Sun
    const dayData = days.find(d => dayjs(d.date).format('YYYY-MM-DD') === targetStr);
    
    const assignment = assignments.find(a => {
      const startStr = dayjs(a.startDate).format('YYYY-MM-DD');
      const endStr = dayjs(a.endDate).format('YYYY-MM-DD');
      return targetStr >= startStr && targetStr <= endStr;
    });
    const defaultGroup = templateGroups.find(g => g.isDefault);
    const activeGroupId = assignment?.templateId || defaultGroup?.id;

    let candidates: any[] = [];
    if (dayData) {
      const templateIds = (dayData.shiftTemplateIds || []);
      candidates = templateIds.map((id: number) => {
        const t = templates.find(temp => String(temp.id) === String(id));
        return t ? { ...t, isStamped: true } : null;
      }).filter(Boolean);
    } else if (showDefaultBoundaries) {
      if (assignment) {
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(assignment.templateId)).map(t => ({ ...t, isStamped: false }));
      } else if (defaultGroup) {
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(defaultGroup.id)).map(t => ({ ...t, isStamped: false }));
      }
    }

    const filtered = candidates.filter(shift => (shift.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(dIdx));
    return { shifts: filtered, activeGroupId };
  };

  const handleRegister = async (slotId: number) => {
    const weeklyLimit = Number(dutySettings?.weeklyKipLimit);
    if (weeklyLimit > 0 && currentUserId) {
      const userWeekKips = slots.filter(s => 
        s.assignedUserIds?.some((id: any) => String(id) === String(currentUserId)) && 
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

  const openSlotDetail = (slot: DutySlot) => {
    setSelectedSlot(slot);
    setIsSlotDetailOpen(true);
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

  const isSelectedWeekCurrent = now.startOf('isoWeek' as any).isSame(currentWeek.startOf('isoWeek' as any), 'day');
  const currentDayIndex = (now.day() + 6) % 7;
  const redLineTop = isSelectedWeekCurrent && now.hour() >= START_HOUR && now.hour() < END_HOUR
    ? (now.hour() - START_HOUR) * PX_PER_HOUR + (now.minute() / 60) * PX_PER_HOUR
    : null;

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
                            onClick={() => { if (slot) openSlotDetail(slot); }}
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
                                 {!isPast && (
                                   <div className="slot-capacity-tag">
                                     <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>
                                       {slot.assignedUserIds.length}/{slot.capacity || 0} người
                                     </div>
                                     {currentUserId && slot.assignedUserIds.includes(currentUserId) ? (
                                       <Button size="small" type="link" danger onClick={(e) => { e.stopPropagation(); handleUnregister(slot.id); }}>Hủy đ.ký</Button>
                                     ) : (
                                       slot.assignedUserIds.length < (slot.capacity || 0) && (
                                         <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); handleRegister(slot.id); }}>+ Đăng ký</Button>
                                       )
                                     )}
                                   </div>
                                 )}
                               </div>
                             ) : null}
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

  return (
    <div className="duty-calendar-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Lịch trực của tôi</Title>
        <Space>
          <Button icon={<QuestionCircleOutlined />}>Hướng dẫn</Button>
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
              <Space size={4}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hiện mẫu</span>
                <Select
                  value={showDefaultBoundaries}
                  onChange={setShowDefaultBoundaries}
                  bordered={false}
                  options={[
                    { label: 'Bật', value: true },
                    { label: 'Tắt', value: false }
                  ]}
                  style={{ width: 60 }}
                />
              </Space>
              <Select
                value={viewMode}
                onChange={setViewMode}
                bordered={false}
                options={[
                  { label: 'Lịch', value: 'calendar' },
                  { label: 'Bảng', value: 'table' }
                ]}
                style={{ width: 80 }}
              />
            </div>
            <Button icon={<SyncOutlined />} onClick={fetchSchedule} loading={loading} />
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
                  const isToday = isSelectedWeekCurrent && idx === currentDayIndex;
                  return (
                    <div key={idx} className={`header-day ${isToday ? 'is-today' : ''}`}>
                      <div className="day-header-content">
                        <Space direction="vertical" align="center" size={0}>
                          {isToday && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', marginBottom: -2 }}>HÔM NAY</span>}
                          <Space size={4}>
                            <span className="day-name">{d.locale('vi').format('ddd')},</span>
                            <span className="day-date">{d.format('DD')}</span>
                          </Space>
                        </Space>
                      </div>
                    </div>
                  );
                })}
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

                    // Synchronized Logic with Admin View
                    const { shifts: effectiveShifts, activeGroupId } = getEffectiveTemplatesForDay(day);
                    const effectiveShiftIds = effectiveShifts.map(s => String(s.id));

                    const dayTemplates = templates.flatMap(s => (s.kips || []).map(k => ({ ...k, shiftId: s.id, sStart: s.startTime, sEnd: s.endTime })))
                      .filter(k => {
                        const shiftParent = templates.find(s => s.id === k.shiftId);
                        if (!effectiveShiftIds.includes(String(k.shiftId))) return false;
                        if (shiftParent?.description === 'INSTANCE') return true;
                        return String(shiftParent?.templateId) === String(activeGroupId);
                      });

                    return (
                      <div key={dIdx} className={`day-column ${isToday ? 'is-today' : ''} ${isPastDay ? 'is-past' : ''}`}>
                         {isToday && redLineTop !== null && (
                          <div className="current-time-line today-indicator" style={{ top: `${redLineTop}px` }}>
                            <span className="time-label">{now.format('HH:mm')}</span>
                          </div>
                        )}

                        {/* Shift (Ca) Backgrounds */}
                        {effectiveShifts.map((shift: any, sIdx: number) => (
                           <div
                              key={`shift-${shift.id}-${dIdx}-${sIdx}`}
                              className="calendar-shift-box"
                              style={{
                                top: `${getTimeTop(shift.startTime)}px`,
                                height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                                position: 'absolute',
                                width: '100%',
                                zIndex: 1
                              }}
                            >
                               <div className="shift-tag">
                                 <span>{shift.name}</span>
                               </div>
                            </div>
                        ))}
                        
                        <AnimatePresence>
                          {daySlots
                            .filter(slot => {
                              // If it's a Shift-level slot (kipId null), check if there are any Kip-level slots for the same shift
                              if (slot.kipId === null || slot.kipId === undefined) {
                                const hasKips = daySlots.some(s => s.kipId !== null && s.kipId !== undefined && String(s.shiftId) === String(slot.shiftId));
                                if (hasKips) return false;
                              }
                              return true;
                            })
                            .map(slot => {
                            const isPastSlot = isPastDay || (isToday && dayjs(`${dateStr} ${slot.startTime}`).isBefore(now));
                            const isMySlot = currentUserId && slot.assignedUserIds?.includes(currentUserId);
                            
                            return (
                              <motion.div
                                key={slot.id}
                                layoutId={String(slot.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`calendar-slot-box ${isPastSlot ? 'locked' : ''} ${isMySlot ? 'my-slot' : ''} ${slot.status === 'locked' ? 'admin-locked' : ''}`}
                                style={{
                                  top: `${getTimeTop(slot.startTime)}px`,
                                  height: `${getTimeHeight(slot.startTime, slot.endTime)}px`,
                                  borderLeft: isMySlot ? '4px solid #d4a574' : (slot.status === 'locked' ? '4px solid #94a3b8' : undefined),
                                  background: isMySlot ? 'rgba(212, 165, 116, 0.1)' : (slot.status === 'locked' ? 'rgba(148, 163, 184, 0.05)' : undefined)
                                }}
                                onClick={() => openSlotDetail(slot)}
                              >
                                <div className="slot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div className="title-area">
                                    <span className="slot-title" style={{ fontWeight: 600 }}>{slot.shiftLabel || 'Kíp trực'}</span>
                                    {slot.status === 'locked' && <LockOutlined style={{ fontSize: 10, marginLeft: 4, color: '#64748b' }} />}
                                    {slot.note && <Tooltip title={slot.note}><InfoCircleOutlined style={{ marginLeft: 4, fontSize: 10, color: '#64748b' }} /></Tooltip>}
                                  </div>
                                  <span className="slot-count" style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 10 }}>
                                    {slot.assignedUserIds?.length || 0}/{slot.capacity || 0}
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
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{slot.capacity || 0} người</span>
                                  )}
                                </div>
                                {/* In Calendar View, we prioritize the Modal for registration and details as per user request */}
                                {isMySlot && (
                                  <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 10 }}>
                                    <Tag color="gold" style={{ border: 'none', margin: 0, padding: '0 4px', fontSize: 9 }}>CỦA TÔI</Tag>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {/* Draft slots from Template (only if showDefaultBoundaries is ON) */}
                        {showDefaultBoundaries && dayTemplates.filter((k: any) => {
                          const kStart = k.startTime || k.sStart;
                          if (!kStart) return false;
                          
                          // More robust check for existing slots matching this template kip
                          const existingSlot = daySlots.find(s => 
                            String(s.shiftId) === String(k.shiftId) && 
                            String(s.kipId) === String(k.id)
                          );
                          return !existingSlot;
                        }).map((k: any) => {
                          const kStart = k.startTime || k.sStart;
                          const kEnd = k.endTime || k.sEnd;
                          return (
                            <div
                              key={`draft-${k.id}`}
                              className="calendar-slot-box draft"
                              style={{ top: `${getTimeTop(kStart)}px`, height: `${getTimeHeight(kStart, kEnd)}px` }}
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

      <DutySlotModal
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        slot={selectedSlot}
        onSuccess={fetchSchedule}
        isAdmin={false}
        currentUserId={currentUserId ?? 0}
        allSlots={slots}
      />
    </div>
  );
};

export default MemberCalendar;
