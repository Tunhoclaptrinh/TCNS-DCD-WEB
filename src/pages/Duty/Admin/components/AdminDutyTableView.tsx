import React, { useMemo } from 'react';
import { Modal, Space, Tag, Button, Typography, Tooltip } from 'antd';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DutySlot, DutyShift } from '@/services/duty.service';

interface AdminDutyTableViewProps {
  loading: boolean;
  templates: DutyShift[];
  weekDays: dayjs.Dayjs[];

  slots: DutySlot[];
  isAdmin: boolean;
  openSlotDetail: (slot: DutySlot) => void;
  handleStampShift: (day: dayjs.Dayjs, shiftId: number) => void;
  openQuickCreate: (day: dayjs.Dayjs, yOffset: number, shiftArg?: any, kipArg?: any, viewMode?: 'shift' | 'kip') => void;
  collapsedGroups: string[];
  setCollapsedGroups: (groups: string[]) => void;
  eventFocusMode: 'off' | 'overlap' | 'all';
  showDefaultBoundaries: boolean;
  meetings?: any[];
  onViewMeeting?: (meeting: any) => void;
}

const AdminDutyTableView: React.FC<AdminDutyTableViewProps> = ({
  templates,
  weekDays,
  slots,
  isAdmin,
  openSlotDetail,
  handleStampShift,
  openQuickCreate,
  collapsedGroups,
  setCollapsedGroups,
  eventFocusMode,
  showDefaultBoundaries,
  meetings,
  onViewMeeting
}) => {


  const groupedShifts = useMemo(() => {
    const shiftMap = new Map();

    // Only group from DEFINITIONS (templates with templateId and no date)
    // to build the skeleton of the table rows.
    // If we have ad-hoc shifts in 'templates' prop, they should also be handled.
    templates.forEach(shift => {
      // If it's an actual instance (has date), we use its definition info for grouping if available
      const isInstance = !!shift.date;
      
      const shiftSig = `${shift.name}|${shift.startTime}|${shift.endTime}`;
      if (!shiftMap.has(shiftSig)) {
        shiftMap.set(shiftSig, {
          name: shift.name,
          time: `${shift.startTime} - ${shift.endTime}`,
          originalShift: shift,
          kips: new Map()
        });
      }

      const group = shiftMap.get(shiftSig);

      if (shift.kips && shift.kips.length > 0) {
        shift.kips.forEach((kip: any) => {
          const timeSig = `${kip.startTime || shift.startTime}-${kip.endTime || shift.endTime}`;
          const kipSig = `${kip.name}|${timeSig}`;
          
          if (!group.kips.has(kipSig)) {
            group.kips.set(kipSig, {
              key: `${shiftSig}|${kipSig}`,
              shiftId: isInstance ? (shift.fromTemplateShiftId || shift.id) : (shift.templateId || shift.id),
              kipId: isInstance ? (kip.fromTemplateKipId || kip.id) : kip.id,
              shift: shift,
              kip: kip,
              shortName: kip.name,
              time: `${kip.startTime || shift.startTime} - ${kip.endTime || shift.endTime}`,
              note: kip.description === 'INSTANCE' || shift.description === 'INSTANCE' ? '' : (kip.description || '')
            });
          }
        });
      } else {
        // Fallback for empty shifts (both templates and instances)
        // This ensures manually created shifts without kips show up as "Toàn ca"
        const kipSig = `Toàn ca|${shift.startTime}-${shift.endTime}`;
        if (!group.kips.has(kipSig)) {
          group.kips.set(kipSig, {
            key: `${shiftSig}|${kipSig}`,
            shiftId: isInstance ? shift.id : (shift.templateId || shift.id),
            kipId: null,
            shift: shift,
            kip: null,
            shortName: 'Toàn ca',
            time: `${shift.startTime} - ${shift.endTime}`,
            note: isInstance ? '' : (shift.description || '')
          });
        }
      }

    });

    return Array.from(shiftMap.values()).map(g => ({
      ...g,
      id: g.originalShift.id,
      kips: Array.from(g.kips.values())
    }));
  }, [templates]);


  return (
    <div className="matrix-view-container" style={{ overflowX: 'auto' }}>
      <table className="matrix-table excel-style" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
        <thead>
          <tr>
            <th className="sticky-col header-cell" style={{ minWidth: 160, background: '#fecaca', border: '1px solid #000', padding: 8 }}>Ca / Kíp trực</th>
            {weekDays.map((d, idx) => {
              const isToday = dayjs().startOf('day').isSame(d.startOf('day'));
              return (
                <th key={idx} className={`header-cell ${isToday ? 'is-today' : ''}`} style={{ minWidth: 120, background: '#fecaca', border: '1px solid #000', padding: 8 }}>
                  <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#e02424' : '#000' }}>{d.format('dddd')}</div>
                  <div style={{ fontSize: '12px', fontWeight: 'normal' }}>{d.format('DD/MM')}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groupedShifts
            .filter(group => {
              const isSpecial = group.originalShift.isSpecialEvent;
              if (eventFocusMode === 'all') return isSpecial;
              return true;
            })
            .map((group: any) => (
            <React.Fragment key={group.id}>
              {/* Shift Group Header */}
              {(() => {
                const isSpecialEvent = group.originalShift.isSpecialEvent;
                const isCollapsed = collapsedGroups.includes(String(group.id));
                const toggleCollapse = () => {
                  const gid = String(group.id);
                  if (isCollapsed) setCollapsedGroups(collapsedGroups.filter(g => g !== gid));
                  else setCollapsedGroups([...collapsedGroups, gid]);
                };

                return (
                  <tr className={`shift-group-header ${isSpecialEvent ? 'special-event-row' : ''}`} style={{ background: isSpecialEvent ? 'rgba(59, 130, 246, 0.08)' : '#f1f5f9' }}>
                    <td colSpan={weekDays.length + 1} style={{ border: '1px solid #000', borderLeft: isSpecialEvent ? '6px solid #3b82f6' : '1px solid #000', padding: '10px 12px', textAlign: 'left', fontWeight: 'bold', color: isSpecialEvent ? '#1e40af' : '#334155' }}>
                       <Space size={12}>
                         <Button 
                           type="text" 
                           size="small" 
                           onClick={toggleCollapse}
                           icon={isCollapsed ? <PlusSquareOutlined /> : <MinusSquareOutlined />}
                           style={{ color: isSpecialEvent ? '#3b82f6' : '#64748b' }}
                         />
                         <Space>
                           {isSpecialEvent && <Tag color="blue" style={{ borderRadius: 4, fontWeight: 'bold' }}>SỰ KIỆN</Tag>}
                           {group.name} 
                           <span style={{ fontWeight: 'normal', color: isSpecialEvent ? '#1e40af' : '#64748b', opacity: 0.7, fontSize: '13px', marginLeft: 8 }}>({group.time})</span>
                         </Space>
                       </Space>
                    </td>
                  </tr>
                );
              })()}
              
              {/* Kip Rows */}
              {!collapsedGroups.includes(String(group.id)) && group.kips.map((row: any, rIdx: number) => {
                const isSpecialRow = group.originalShift.isSpecialEvent;
                return (
                  <tr key={row.key} style={{ background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="sticky-col row-header" style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'middle', fontWeight: 600, textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', color: '#1e293b' }}>{row.shortName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{row.time}</div>
                      {row.note && <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>{row.note}</div>}
                    </td>
                    {weekDays.map((day, dIdx) => {
                      const dateStr = day.format('YYYY-MM-DD');
                      const actualShiftForDay = templates.find(t => t.date && dayjs(t.date).format('YYYY-MM-DD') === dateStr && (String(t.fromTemplateShiftId) === String(row.shiftId) || (t.name === group.name && t.startTime === group.originalShift.startTime)));

                      const isStamped = !!actualShiftForDay;
                      
                      const daySlots = slots.filter(s => {
                          if (dayjs(s.shiftDate).format('YYYY-MM-DD') !== dateStr) return false;
                          
                          const formatTime = (t: string) => t?.split(':').slice(0, 2).join(':');
                          const sTime = `${formatTime(s.startTime)}-${formatTime(s.endTime)}`;
                          const rowTime = row.time.replace(/\s+/g, '');
                          if (sTime !== rowTime) return false;

                          const sLabel = (s.shiftLabel || '').toLowerCase();
                          const rowShortName = row.shortName.toLowerCase();
                          const rowFullName = `${group.name} - ${row.shortName}`.toLowerCase();

                          return String(s.shiftId) === String(row.shiftId) && String(s.kipId || null) === String(row.kipId || null) ||
                                 sLabel === rowFullName || sLabel === rowShortName || sLabel.includes(rowShortName);
                      });

                      // Pick the "best" slot: prefer the one with users assigned, or the first one found
                      const slot = daySlots.sort((a, b) => (b.assignedUsers?.length || 0) - (a.assignedUsers?.length || 0))[0];

                      
                      const isPast = day.isBefore(dayjs().startOf('day')) || (day.isSame(dayjs(), 'day') && dayjs(`${dateStr} ${row.time.split(' - ')[0]}`).isBefore(dayjs()));

                      return (
                        <td
                          key={dIdx}
                          className={`matrix-cell excel-cell ${isPast ? 'is-past' : ''} ${isStamped ? 'shift-stamped' : ''}`}
                          style={{ 
                            border: '1px solid #000', 
                            padding: '0px',
                            verticalAlign: 'top',
                            cursor: 'pointer',
                            background: isPast ? 'rgba(0,0,0,0.02)' : (isStamped ? 'transparent' : 'rgba(0,0,0,0.05)'),
                            opacity: isPast ? 0.8 : 1,
                            height: '1px' // Hack for child 100% height
                          }}
                          onClick={() => {
                            if (slot) openSlotDetail(slot);
                            else if (!isPast) {
                              if (!isStamped) {
                                Modal.confirm({
                                  title: 'Áp dụng Ca trực?',
                                  content: `Chưa có phiên bản Ca "${group.name}" cho ngày ${day.format('DD/MM')}. Bạn có muốn áp dụng Ca này xuống ngày trước khi khởi tạo Kíp không?`,
                                  onOk: () => handleStampShift(day, row.shiftId)
                                });
                              } else {
                                openQuickCreate(day, 0, row.shift, row.kip);
                              }
                            }
                          }}
                        >
                            {slot ? (
                              <div className={`slot-container ${isSpecialRow ? 'special-slot' : 'normal-slot'}`} style={{ 
                                padding: '0px',
                                minHeight: '60px',
                                background: isPast ? '#e2e8f0' : (isSpecialRow ? 'rgba(59, 130, 246, 0.12)' : 'rgba(14, 165, 233, 0.15)'),
                                borderRadius: 0,
                                border: 'none',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                boxSizing: 'border-box'
                              }}>
                                {(() => {
                                  const currentUsers = slot.assignedUsers || [];
                                  const max = slot.capacity || row.kip?.capacity || 1;
                                  
                                  return (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                      {Array.from({ length: max }).map((_, idx) => {
                                        const user = currentUsers[idx];
                                        const isFirst = idx === 0;
                                        
                                        if (!user) {
                                          return (
                                            <div 
                                              key={idx} 
                                              style={{ 
                                                padding: '4px 8px', 
                                                borderBottom: idx < max - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                                                fontSize: '13px',
                                                color: 'rgba(0,0,0,0.25)',
                                                textAlign: 'center'
                                              }}
                                            >
                                              ---
                                            </div>
                                          );
                                        }

                                        return (
                                          <Tooltip key={idx} title={user.name}>
                                            <div 
                                              className="stacked-user"
                                              style={{ 
                                                padding: '4px 8px', 
                                                borderBottom: idx < max - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                                                fontSize: '12px',
                                                color: isFirst ? '#dc2626' : '#1e293b',
                                                textAlign: 'center',
                                                fontWeight: isFirst ? 700 : 500,
                                                cursor: isAdmin ? 'pointer' : 'default',
                                                transition: 'all 0.2s'
                                              }}
                                              onMouseEnter={(e) => {
                                                if (isAdmin) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                                              }}
                                              onMouseLeave={(e) => {
                                                if (isAdmin) e.currentTarget.style.backgroundColor = 'transparent';
                                              }}
                                              onClick={(e) => {
                                                if (!isAdmin) return;
                                                e.stopPropagation();
                                                window.open(`/users/detail/${user.id}`, '_blank');
                                              }}
                                            >
                                              <Typography.Text 
                                                ellipsis 
                                                style={{ 
                                                  width: '100%', 
                                                  fontSize: 'inherit', 
                                                  color: 'inherit',
                                                  fontWeight: 'inherit'
                                                }}
                                              >
                                                {user.name}
                                              </Typography.Text>
                                            </div>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                
                                {/* Slot Capacity Indicator */}
                                {(() => {
                                  const current = slot.assignedUsers?.length || 0;
                                  const max = slot.capacity || row.kip?.capacity || 1;
                                  const isFull = current >= max;
                                  return (
                                    <div style={{ 
                                      position: 'absolute', 
                                      bottom: 2, 
                                      right: 2, 
                                      padding: '1px 4px',
                                      background: isFull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.05)',
                                      borderRadius: 4,
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: isFull ? '#059669' : '#64748b',
                                      border: isFull ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(0,0,0,0.05)',
                                      pointerEvents: 'none'
                                    }}>
                                      {isFull ? 'FULL' : `${current}/${max}`}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              showDefaultBoundaries && !isPast && isAdmin && (
                                <div className="phantom-slot" style={{ 
                                  height: '100%', 
                                  minHeight: '48px', 
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  background: 'rgba(0,0,0,0.02)',
                                  border: '1px dashed rgba(0,0,0,0.1)'
                                }}>
                                  {(() => {
                                    const max = row.kip?.capacity || row.shift?.capacity || 1;
                                    return Array.from({ length: max }).map((_, idx) => (
                                      <div 
                                        key={idx} 
                                        style={{ 
                                          padding: '4px 8px', 
                                          borderBottom: idx < max - 1 ? '1px dashed rgba(0,0,0,0.05)' : 'none',
                                          fontSize: '13px',
                                          color: 'rgba(0,0,0,0.15)',
                                          textAlign: 'center',
                                          fontWeight: 500
                                        }}
                                      >
                                        ---
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )
                            )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              </React.Fragment>
            ))}

          {/* Meeting Row */}
          {meetings && meetings.length > 0 && (
            <>
              <tr style={{ background: '#f5f3ff' }}>
                <td colSpan={weekDays.length + 1} style={{ border: '1px solid #000', borderLeft: '6px solid #8b5cf6', padding: '10px 12px', textAlign: 'left', fontWeight: 'bold', color: '#5b21b6' }}>
                   <Space size={12}>
                     <Tag color="purple" style={{ borderRadius: 4, fontWeight: 'bold' }}>LỊCH HỌP</Tag>
                     <span>Danh sách các cuộc họp trong tuần</span>
                   </Space>
                </td>
              </tr>
              <tr>
                <td className="sticky-col row-header" style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'middle', fontWeight: 600, textAlign: 'left', background: '#fdfcfe' }}>
                  <div style={{ fontSize: '14px', color: '#5b21b6' }}>Cuộc họp</div>
                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 'normal' }}>Sự kiện phối hợp</div>
                </td>
                {weekDays.map((day, dIdx) => {
                  const dayMeetings = meetings.filter(m => dayjs(m.meetingAt).isSame(day, 'day'));
                  return (
                    <td key={dIdx} style={{ border: '1px solid #000', padding: '4px', verticalAlign: 'top', background: '#fdfcfe' }}>
                      {dayMeetings.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {dayMeetings.map(m => (
                            <Tooltip key={m.id} title={`Họp: ${m.title} tại ${m.location || 'Chưa rõ'}`}>
                              <div 
                                key={m.id} 
                                style={{ 
                                  padding: '4px 6px', 
                                  background: '#ede9fe', 
                                  borderRadius: 4, 
                                  fontSize: '11px', 
                                  borderLeft: '3px solid #8b5cf6',
                                  textAlign: 'left',
                                  color: '#5b21b6',
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewMeeting?.(m);
                                }}
                              >
                                <b>{dayjs(m.meetingAt).format('HH:mm')}{m.endAt ? `-${dayjs(m.endAt).format('HH:mm')}` : ''}</b>: {m.title}
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>Không có họp</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDutyTableView;
