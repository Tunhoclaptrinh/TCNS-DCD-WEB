import React from 'react';
import { Space, Tooltip, Avatar, Tag } from 'antd';
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons';
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
  openSlotDetail: (slot: DutySlot) => void;
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
  openSlotDetail
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
  );
};

export default MemberDutyTimelineView;
