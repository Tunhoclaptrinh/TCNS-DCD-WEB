import React from 'react';
import { Space, Tooltip, Avatar, Modal } from 'antd';
import { InfoCircleOutlined, CloseOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { DutySlot, DutyShift } from '@/services/duty.service';

interface AdminDutyTimelineViewProps {
  now: dayjs.Dayjs;
  currentWeek: dayjs.Dayjs;
  weekDays: dayjs.Dayjs[];
  slotsByDay: Record<string, DutySlot[]>;
  templates: DutyShift[];
  getEffectiveTemplatesForDay: (day: dayjs.Dayjs) => { shifts: any[], activeGroupId: any };
  showDefaultBoundaries: boolean;
  isAdmin: boolean;
  currentUserId: number | undefined;
  openSlotDetail: (slot: DutySlot) => void;
  openQuickCreate: (day: dayjs.Dayjs, yOffset: number, shiftArg?: any, kipArg?: any, viewMode?: 'shift' | 'kip') => void;
  handleRemoveShiftFromDay: (date: string, shiftId: number) => void;
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

const AdminDutyTimelineView: React.FC<AdminDutyTimelineViewProps> = ({
  now,
  currentWeek,
  weekDays,
  slotsByDay,
  templates,
  getEffectiveTemplatesForDay,
  showDefaultBoundaries,
  isAdmin,
  currentUserId,
  openSlotDetail,
  openQuickCreate,
  handleRemoveShiftFromDay,
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
              <span className="time-label" style={{ 
                position: 'absolute', 
                left: -45, 
                top: -8, 
                background: '#ef4444', 
                color: '#fff', 
                fontSize: '10px', 
                padding: '2px 4px', 
                borderRadius: '4px',
                fontWeight: 800,
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
              }}>
                {now.format('HH:mm')}
              </span>
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

            // Filter Actual Slots based on Focus Mode
            let filteredDaySlots = daySlots;
            if (eventFocusMode === 'all') {
              // Mode: Absolute Focus - ONLY show special events
              filteredDaySlots = daySlots.filter(s => !!s.isSpecialEvent);
            } else if (eventFocusMode === 'off') {
              // Mode: Standard - Show EVERYTHING
              filteredDaySlots = daySlots;
            } else {
              // Mode: Overlap (Shift + Event)
              const specialEvents = effectiveShifts.filter(s => !!s.isSpecialEvent);
              if (specialEvents.length > 0) {
                filteredDaySlots = daySlots.filter(s => {
                  const isSpecial = !!s.isSpecialEvent;
                  if (isSpecial) return true;
                  
                  return !specialEvents.some(event => {
                    const sStart = s.startTime || s.kip?.startTime || (templates.find(t => String(t.id) === String(s.shiftId))?.startTime);
                    const sEnd = s.endTime || s.kip?.endTime || (templates.find(t => String(t.id) === String(s.shiftId))?.endTime);
                    const eStart = event.startTime;
                    const eEnd = event.endTime;
                    if (!sStart || !sEnd || !eStart || !eEnd) return false;
                    return (sStart < eEnd && sEnd > eStart);
                  });
                });
              }
            }

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
                  const isSpecialEvent = !!shift.isSpecialEvent;
                  return (
                    <div
                      key={`shift-${shift.id}-${dIdx}-${sIdx}`}
                      className={`calendar-shift-box ${isDraftShift ? 'draft' : ''} ${isSpecialEvent ? 'special-event' : ''}`}
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
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>{shift.name}</span>
                        <Space size={4}>
                          <EditOutlined
                            className="shift-edit-icon"
                            style={{ 
                              fontSize: 10, 
                              cursor: 'pointer', 
                              padding: '2px', 
                              background: 'rgba(0,0,0,0.05)', 
                              borderRadius: '2px',
                              color: '#3b82f6',
                              transition: 'all 0.2s'
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              openQuickCreate(day, getTimeTop(shift.startTime), shift, null, 'shift');
                            }}
                          />
                          {shift.isStamped && (
                            <CloseOutlined
                              className="shift-delete-icon"
                              style={{ 
                                fontSize: 10, 
                                cursor: 'pointer', 
                                padding: '2px', 
                                background: 'rgba(0,0,0,0.05)', 
                                borderRadius: '2px',
                                transition: 'all 0.2s'
                              }}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                Modal.confirm({
                                  title: 'Xác nhận xóa lẻ',
                                  content: `Bạn có chắc muốn xóa khung ca "${shift.name}" chỉ riêng cho ngày ${day.format('DD/MM')} này không?`,
                                  okText: 'Xóa',
                                  cancelText: 'Hủy',
                                  okType: 'danger',
                                  onOk: () => handleRemoveShiftFromDay(day.format('YYYY-MM-DD'), shift.id)
                                });
                              }}
                            />
                          )}
                        </Space>
                      </div>
                      {isSpecialEvent && (
                        <div style={{ position: 'absolute', top: 4, right: 8, opacity: 0.1, fontSize: '24px', pointerEvents: 'none' }}>
                          <SyncOutlined spin={false} />
                        </div>
                      )}
                    </div>
                  );
                })}

                <AnimatePresence>
                  {filteredDaySlots.map(slot => {

                    const isPastSlot = isPastDay || (isToday && dayjs(`${dateStr} ${slot.startTime}`).isBefore(now));
                    return (
                      <motion.div
                        key={slot.id}
                        layoutId={String(slot.id)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`calendar-slot-box ${slot.status === 'locked' || isPastSlot ? 'locked' : ''} ${slot.isSpecialEvent ? 'special-event' : ''} ${!isAdmin && !slot.assignedUserIds?.includes(currentUserId || 0) && (slot.assignedUserIds?.length || 0) < (slot.capacity || slot.kip?.capacity || 0) ? 'can-join' : ''}`}
                        style={{
                          top: `${getTimeTop(slot.startTime)}px`,
                          height: `${getTimeHeight(slot.startTime, slot.endTime)}px`
                        }}
                        onClick={() => openSlotDetail(slot)}
                      >
                        <div className="slot-header">
                          <span className="slot-title">
                            {slot.shiftLabel}
                            {slot.note && slot.note !== 'INSTANCE' && (
                              <Tooltip title={slot.note}>
                                <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 10, color: 'inherit' }} />
                              </Tooltip>
                            )}
                          </span>
                          <span className="slot-count">
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
                            <span style={{ fontSize: '0.65rem', color: '#a16207', opacity: 0.7, fontStyle: 'italic' }}>
                              {slot.capacity || slot.kip?.capacity || 0} người
                            </span>
                          )}
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {dayTemplates.filter(k => {
                  const kStart = k.startTime || k.sStart;
                  if (!kStart) return false;

                  // Logic: Show if boundaries are ON OR if it's a Special Event
                  const shift = templates.find(s => String(s.id) === String(k.shiftId));
                  const isSpecialEvent = !!shift?.isSpecialEvent;
                  if (!showDefaultBoundaries && !isSpecialEvent) return false;
                  
                  const existingSlot = daySlots.find(s => String(s.shiftId) === String(k.shiftId) && String(s.kipId) === String(k.id));
                  return !existingSlot;
                }).map(k => {
                  const kStart = k.startTime || k.sStart;
                  const kEnd = k.endTime || k.sEnd;
                    const shift = templates.find(s => String(s.id) === String(k.shiftId));
                    const isSpecialEvent = !!shift?.isSpecialEvent;
                    return (
                      <div
                        key={`draft-${k.id}`}
                        className={`calendar-slot-box draft ${isSpecialEvent ? 'special-event' : ''}`}
                        style={{ top: `${getTimeTop(kStart)}px`, height: `${getTimeHeight(kStart, kEnd)}px` }}
                        onClick={() => {
                          openQuickCreate(day, getTimeTop(kStart), shift, k);
                        }}
                      >
                        <div className="slot-title">{k.name}</div>
                        <div className="slot-time">{kStart} - {kEnd} (Mẫu)</div>
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

export default AdminDutyTimelineView;
