import React from 'react';
import { Space, Tooltip, Avatar, Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, LockOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { DutySlot, DutyShift } from '@/services/duty.service';

interface MemberDutyTimelineViewProps {
  now: dayjs.Dayjs;
  currentWeek: dayjs.Dayjs;
  weekDays: dayjs.Dayjs[];
  slotsByDay: Record<string, DutySlot[]>;
  templates: DutyShift[];
  getEffectiveTemplatesForDay: (day: dayjs.Dayjs) => { shifts: any[], activeGroupId: any };
  showDefaultBoundaries: boolean;
  currentUserId: number | undefined;
  openSlotDetail: (slot: DutySlot, onSuccess: () => void) => void;
  openAttendanceModal: (slot: DutySlot) => void;
  onSelfCheckIn: (slotId: number) => Promise<void>;
  eventFocusMode: 'off' | 'overlap' | 'all';
  meetings?: any[];
  onViewMeeting?: (meeting: any) => void;
}

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

const MemberDutyTimelineView: React.FC<MemberDutyTimelineViewProps> = ({
  now,
  currentWeek,
  weekDays,
  slotsByDay,
  templates,
  getEffectiveTemplatesForDay,
  showDefaultBoundaries,
  currentUserId,
  openSlotDetail,
  openAttendanceModal,
  onSelfCheckIn,
  eventFocusMode,
  meetings,
  onViewMeeting
}) => {

  const isSelectedWeekCurrent = now.startOf('isoWeek' as any).isSame(currentWeek.startOf('isoWeek' as any), 'day');
  const currentDayIndex = (now.day() + 6) % 7;
  const redLineTop = isSelectedWeekCurrent && now.hour() >= START_HOUR && now.hour() < END_HOUR
    ? (now.hour() - START_HOUR) * PX_PER_HOUR + (now.minute() / 60) * PX_PER_HOUR
    : null;

  return (
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

            // Filter Actual Slots based on Focus Mode
            let filteredDaySlots = daySlots;
            if (eventFocusMode === 'all') {
              filteredDaySlots = daySlots.filter(s => !!s.isSpecialEvent);
            } else if (eventFocusMode === 'off') {
              filteredDaySlots = daySlots.filter(s => !s.isSpecialEvent);
            } else {
              // Mode: Overlap
              const specialEvents = effectiveShifts.filter(s => !!s.isSpecialEvent);
              if (specialEvents.length > 0) {
                filteredDaySlots = daySlots.filter(s => {
                  const isSpecial = !!s.isSpecialEvent;
                  if (isSpecial) return true;
                  return !specialEvents.some(event => {
                    const sStart = s.startTime || s.kip?.startTime || (templates.find(t => String(t.id) === String(s.shiftId))?.startTime);
                    const sEnd = s.endTime || s.kip?.endTime || (templates.find(t => String(t.id) === String(s.shiftId))?.endTime);
                    const eStart = event.startTime; const eEnd = event.endTime;
                    if (!sStart || !sEnd || !eStart || !eEnd) return false;
                    return (sStart < eEnd && sEnd > eStart);
                  });
                });
              }
            }

            const dayTemplates = templates.flatMap(s => (s.kips || []).map(k => ({ ...k, shiftId: s.id, sStart: s.startTime, sEnd: s.endTime, shiftName: s.name })))
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
                {effectiveShifts.map((shift: any, sIdx: number) => {
                  const isSpecialEvent = !!shift.isSpecialEvent;
                  return (
                    <div
                      key={`shift-${shift.id}-${dIdx}-${sIdx}`}
                      className={`calendar-shift-box ${isSpecialEvent ? 'special-event' : ''}`}
                      style={{
                        top: `${getTimeTop(shift.startTime)}px`,
                        height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                        position: 'absolute',
                        width: '100%',
                        zIndex: 1,
                        background: isSpecialEvent ? 'rgba(139, 92, 246, 0.05)' : undefined,
                        borderLeft: isSpecialEvent ? '4px solid #8b5cf6' : undefined
                      }}
                    >
                        <div className="shift-tag">
                          <Space>
                            {isSpecialEvent && <SyncOutlined spin style={{ fontSize: 10 }} />}
                            <span>{shift.name}</span>
                          </Space>
                        </div>
                    </div>
                  );
                })}
                
                <AnimatePresence>
                  {filteredDaySlots
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
                    const isAdminAssigned = currentUserId && (slot as any).config?.adminAssignedUserIds?.includes(currentUserId);
                    const isSpecialEvent = !!slot.isSpecialEvent;
                    
                    const isAssigned = isAdminAssigned || slot.status === 'locked' || isSpecialEvent;

                    return (
                      <motion.div
                        key={slot.id}
                        layoutId={String(slot.id)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`calendar-slot-box ${isPastSlot ? 'locked' : ''} ${isMySlot ? 'my-slot' : ''} ${isAssigned ? 'assigned-slot' : ''}`}
                        style={{
                          top: `${getTimeTop(slot.startTime)}px`,
                          height: `${getTimeHeight(slot.startTime, slot.endTime)}px`,
                          border: isMySlot ? `1px solid ${isAssigned ? '#dbeafe' : '#d1fae5'}` : undefined,
                          borderLeft: isMySlot 
                            ? `5px solid ${isAssigned ? '#2563eb' : '#059669'}` 
                            : (slot.status === 'locked' ? '5px solid #94a3b8' : undefined),
                          background: isMySlot 
                            ? (isAssigned ? '#eff6ff' : '#ecfdf5') 
                            : (slot.status === 'locked' ? '#f8fafc' : undefined),
                          boxShadow: isMySlot ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                          padding: '6px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden'
                        }}
                        onClick={() => openSlotDetail(slot, () => {})}
                      >
                        <div className="slot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div className="title-area" style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {isMySlot && (
                                <Tag 
                                  color={isAssigned ? "blue" : "emerald"} 
                                  style={{ 
                                    fontSize: '9px', 
                                    margin: 0, 
                                    lineHeight: '14px', 
                                    padding: '0 4px',
                                    borderRadius: 4,
                                    border: 'none',
                                    fontWeight: 700,
                                    background: isAssigned ? '#3b82f6' : '#10b981',
                                    color: '#fff'
                                  }}
                                >
                                  {isAssigned ? 'PHÂN CÔNG' : 'CỦA TÔI'}
                                </Tag>
                              )}
                              <span className="slot-title" style={{ 
                                fontWeight: 700, 
                                fontSize: '12px', 
                                color: isMySlot ? (isAssigned ? '#1e40af' : '#065f46') : '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                              }}>
                                {slot.shiftLabel || 'Kíp trực'}
                              </span>
                              {(slot as any).coefficient > 0 && (slot as any).coefficient !== 1 && (
                                <Tag style={{ fontSize: '9px', margin: 0, padding: '0 4px', borderRadius: 4 }}>
                                  {(slot as any).coefficient} kíp
                                </Tag>
                              )}
                            </div>
                          </div>
                          
                          <div className="slot-count" style={{ 
                            fontSize: '10px', 
                            color: '#64748b', 
                            background: 'rgba(0,0,0,0.05)', 
                            padding: '1px 6px', 
                            borderRadius: 6,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginLeft: 4
                          }}>
                            {slot.assignedUserIds?.length || 0}/{slot.capacity || 0}
                          </div>
                        </div>

                        <div className="slot-time" style={{ fontSize: '11px', color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                           <ClockCircleOutlined style={{ fontSize: 10 }} />
                           {slot.startTime} - {slot.endTime}
                        </div>

                        {/* Dual Action Buttons: Self Check-in vs Management */}
                        {(() => {
                          const uid = currentUserId || 0;
                          const isAssigned = slot.assignedUserIds?.includes(uid);
                          const isAttended = slot.attendedUserIds?.includes(uid);
                          
                          const startTime = dayjs(`${dateStr} ${slot.startTime}`);
                          const endTime = dayjs(`${dateStr} ${slot.endTime}`);
                          const now = dayjs();
                          
                          const isCheckInWindow = Math.abs(now.diff(startTime, 'minute')) <= 2;
                          const isDuringShift = now.isAfter(startTime) && now.isBefore(endTime);
                          const isActingLeader = (slot.assignedUserIds?.[0] === uid && isAttended) || ((slot as any).tempLeaderId === uid);

                          // 1. Self Check-in button (For any assigned member in window)
                          if (isAssigned && !isAttended && isCheckInWindow) {
                            return (
                              <div style={{ marginTop: 4, marginBottom: 8 }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelfCheckIn(slot.id);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 0',
                                    background: '#10b981', // Green for check-in
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
                                >
                                  <SyncOutlined style={{ fontSize: 11 }} />
                                  TỰ ĐIỂM DANH
                                </button>
                              </div>
                            );
                          }

                          // 2. Management button (For Acting Leader during shift)
                          if (isActingLeader && isDuringShift) {
                            return (
                              <div style={{ marginTop: 4, marginBottom: 8 }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAttendanceModal(slot);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 0',
                                    background: '#fbbf24', // Gold for management
                                    color: '#78350f',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    boxShadow: '0 2px 4px rgba(251, 191, 36, 0.3)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#f59e0b'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#fbbf24'}
                                >
                                  <CheckCircleOutlined style={{ fontSize: 11 }} />
                                  QUẢN LÝ KÍP
                                </button>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}

                        <div className="slot-users" style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
                          <Avatar.Group maxCount={3} size="small" maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf', fontSize: 10 }}>
                            {slot.assignedUsers?.map((u: any) => (
                              <Tooltip key={u.id} title={u.name}>
                                <Avatar size={18} src={u.avatar} style={{ border: '1px solid #fff' }}>
                                  {u.name.split(' ').pop()?.charAt(0)}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                          {slot.status === 'locked' && <LockOutlined style={{ fontSize: 10, marginLeft: 'auto', color: '#94a3b8' }} />}
                        </div>
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
                  const shift = templates.find(s => String(s.id) === String(k.shiftId));
                  const isSpecialEvent = !!shift?.isSpecialEvent;
                  
                  return (
                    <div
                      key={`draft-${k.id}`}
                      className={`calendar-slot-box draft ${isSpecialEvent ? 'special-event' : ''}`}
                      style={{ 
                        top: `${getTimeTop(kStart)}px`, 
                        height: `${getTimeHeight(kStart, kEnd)}px`,
                      }}
                    >
                      <div className="slot-title">
                        {isSpecialEvent && <Tag color="blue" style={{ fontSize: 8, padding: '0 4px', marginRight: 4 }}>EVENT</Tag>}
                        {k.name}
                      </div>
                      <div className="slot-time">{kStart} - {kEnd} {isSpecialEvent ? '(Sự kiện)' : '(Mẫu)'}</div>
                    </div>
                  );
                })}

                {/* Render Meetings on Timeline */}
                {meetings && meetings.filter(m => dayjs(m.meetingAt).isSame(day, 'day')).map(meeting => {
                  const mStart = dayjs(meeting.meetingAt).format('HH:mm');
                  const displayEnd = meeting.endAt ? dayjs(meeting.endAt).format('HH:mm') : dayjs(meeting.meetingAt).add(1, 'hour').format('HH:mm');
                  
                  return (
                    <Tooltip key={`meeting-${meeting.id}`} title={`Họp: ${meeting.title} (${mStart} - ${displayEnd}) tại ${meeting.location || 'Chưa rõ'}`}>
                      <div
                        className="calendar-slot-box meeting-event"
                        style={{
                          top: `${getTimeTop(mStart)}px`,
                          height: `${getTimeHeight(mStart, displayEnd)}px`,
                          position: 'absolute',
                          width: '94%',
                          left: '3%',
                          zIndex: 10,
                          backgroundColor: '#f5f3ff',
                          border: '1px solid #c4b5fd',
                          borderLeft: '4px solid #8b5cf6',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)',
                          cursor: 'pointer',
                          transition: 'transform 0.1s'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewMeeting?.(meeting);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5b21b6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📅 {meeting.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7c3aed', opacity: 0.8 }}>
                          {mStart} - {displayEnd}
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MemberDutyTimelineView;
