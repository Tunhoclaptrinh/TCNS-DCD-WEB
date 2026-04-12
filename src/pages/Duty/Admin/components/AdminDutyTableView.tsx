import React, { useMemo } from 'react';
import { Modal } from 'antd';
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
          {groupedShifts.map((group, sIdx) => (
            <React.Fragment key={sIdx}>
              {/* Shift Header Row */}
              <tr className="shift-group-header" style={{ background: '#f1f5f9' }}>
                <td colSpan={weekDays.length + 1} style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'left', fontWeight: 'bold', color: '#334155' }}>
                   {group.name} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '13px', marginLeft: 8 }}>({group.time})</span>
                </td>
              </tr>
              {/* Kip Rows */}
              {group.kips.map((row: any, rIdx: number) => {
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
                            padding: '2px',
                            verticalAlign: 'top',
                            cursor: 'pointer',
                            background: isPast ? 'rgba(0,0,0,0.02)' : (isStamped ? 'transparent' : 'rgba(0,0,0,0.05)'),
                            opacity: isPast ? 0.8 : 1
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
                              <div className="members-stack" style={{ display: 'flex', flexDirection: 'column' }}>
                                {slot.assignedUsers && slot.assignedUsers.length > 0 ? (
                                  slot.assignedUsers.map((u: any, uIdx: number) => (
                                    <div 
                                    key={u.id} 
                                    className="stacked-user"
                                    style={{ 
                                      padding: '4px', 
                                      borderBottom: slot.assignedUsers && uIdx < slot.assignedUsers.length - 1 ? '1px dashed #cbd5e1' : 'none',
                                      fontSize: '13px',
                                      color: '#1e293b'
                                    }}
                                    >
                                      {u.name}
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ padding: '8px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[Trống]</div>
                                )}
                              </div>
                            ) : (
                              !isPast && isAdmin && (
                                <div className="add-kip-hint" style={{ padding: '12px 8px', fontSize: '11px', color: '#cbd5e1', textAlign: 'center' }}>+</div>
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
