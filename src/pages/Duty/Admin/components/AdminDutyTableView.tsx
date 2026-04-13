import React, { useMemo } from 'react';
import { Modal, Space, Tag, Button } from 'antd';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DutySlot, DutyShift } from '@/services/duty.service';

interface AdminDutyTableViewProps {
  loading: boolean;
  templates: DutyShift[];
  weekDays: dayjs.Dayjs[];
  dutyDays: any[];
  slots: DutySlot[];
  isAdmin: boolean;
  openSlotDetail: (slot: DutySlot) => void;
  handleStampShift: (day: dayjs.Dayjs, shiftId: number) => void;
  openQuickCreate: (day: dayjs.Dayjs, yOffset: number, shiftArg?: any, kipArg?: any) => void;
  collapsedGroups: string[];
  setCollapsedGroups: (groups: string[]) => void;
  eventFocusMode: 'off' | 'overlap' | 'all';
  showDefaultBoundaries: boolean;
}

const AdminDutyTableView: React.FC<AdminDutyTableViewProps> = ({
  templates,
  weekDays,
  dutyDays,
  slots,
  isAdmin,
  openSlotDetail,
  handleStampShift,
  openQuickCreate,
  collapsedGroups,
  setCollapsedGroups,
  eventFocusMode,
  showDefaultBoundaries
}) => {

  const groupedShifts = useMemo(() => {
    const shiftMap = new Map();

    templates.forEach(shift => {
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
              shiftId: shift.templateId || shift.id,
              kipId: kip.id,
              shift: shift,
              kip: kip,
              shortName: kip.name,
              time: `${kip.startTime || shift.startTime} - ${kip.endTime || shift.endTime}`,
              note: kip.description === 'INSTANCE' || shift.description === 'INSTANCE' ? '' : (kip.description || '')
            });
          }
        });
      } else {
        const kipSig = `Toàn ca|${shift.startTime}-${shift.endTime}`;
        if (!group.kips.has(kipSig)) {
          group.kips.set(kipSig, {
            key: `${shiftSig}|${kipSig}`,
            shiftId: shift.templateId || shift.id,
            kipId: null,
            shift: shift,
            kip: null,
            shortName: 'Toàn ca',
            time: `${shift.startTime} - ${shift.endTime}`,
            note: shift.description === 'INSTANCE' ? '' : (shift.description || '')
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
              if (eventFocusMode === 'off') return !isSpecial;
              if (isSpecial) return true;
              if (eventFocusMode === 'all') return false;
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
                      const dayData = dutyDays.find(d => dayjs(d.date).format('YYYY-MM-DD') === dateStr);
                      const isStamped = (dayData?.shiftTemplateIds || []).map(String).includes(String(row.shiftId));
                      
                      const slot = slots.find(s => {
                          if (dayjs(s.shiftDate).format('YYYY-MM-DD') !== dateStr) return false;
                          const targetShift = templates.find(t => String(t.id) === String(s.shiftId));
                          const targetKip = targetShift?.kips?.find((k: any) => String(k.id) === String(s.kipId));
                          const sName = targetShift?.name || s.shiftLabel || '';
                          const kName = targetKip?.name || s.kip?.name || 'Toàn ca';
                          const kStart = targetKip?.startTime || targetShift?.startTime || s.kip?.startTime || s.startTime || '';
                          const kEnd = targetKip?.endTime || targetShift?.endTime || s.kip?.endTime || s.endTime || '';
                          const sig = `${sName}|${kName}|${kStart}-${kEnd}`;
                          const rowShiftSig = `${group.name}|${row.shortName}|${row.time.replace(' - ', '-')}`;
                          return sig === rowShiftSig;
                      });
                      
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
                                        return (
                                          <div 
                                            key={idx} 
                                            className="stacked-user"
                                            style={{ 
                                              padding: '4px 8px', 
                                              borderBottom: idx < max - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                                              fontSize: '13px',
                                              color: user ? (isFirst ? '#dc2626' : '#1e293b') : 'rgba(0,0,0,0.25)',
                                              textAlign: 'center',
                                              fontWeight: isFirst ? 700 : 500
                                            }}
                                          >
                                            {user ? user.name : '---'}
                                          </div>
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
        </tbody>
      </table>
    </div>
  );
};

export default AdminDutyTableView;
