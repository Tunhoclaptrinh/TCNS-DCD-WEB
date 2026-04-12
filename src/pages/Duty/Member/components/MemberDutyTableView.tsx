import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { DutySlot, DutyShift } from '@/services/duty.service';

interface MemberDutyTableViewProps {
  templates: DutyShift[];
  weekDays: dayjs.Dayjs[];
  slots: DutySlot[];
  currentUserId: number | undefined;
  openSlotDetail: (slot: DutySlot) => void;
}

const MemberDutyTableView: React.FC<MemberDutyTableViewProps> = ({
  templates,
  weekDays,
  slots,
  currentUserId,
  openSlotDetail
}) => {

  const flatRows = useMemo(() => {
    const signatureMap = new Map();

    templates.forEach(shift => {
      if (shift.kips && shift.kips.length > 0) {
        shift.kips.forEach((kip: any) => {
          const timeSig = `${kip.startTime || shift.startTime}-${kip.endTime || shift.endTime}`;
          const sig = `${shift.name}|${kip.name}|${timeSig}`;
          
          if (!signatureMap.has(sig)) {
            signatureMap.set(sig, {
              key: sig,
              shiftId: shift.templateId || shift.id,
              kipId: kip.id,
              name: shift.name,
              shortName: kip.name,
              time: `${kip.startTime || shift.startTime} - ${kip.endTime || shift.endTime}`,
              note: kip.description === 'INSTANCE' || shift.description === 'INSTANCE' ? '' : (kip.description || '')
            });
          }
        });
      } else {
        const timeSig = `${shift.startTime}-${shift.endTime}`;
        const sig = `${shift.name}|Toàn ca|${timeSig}`;
        
        if (!signatureMap.has(sig)) {
          signatureMap.set(sig, {
            key: sig,
            shiftId: shift.templateId || shift.id,
            kipId: null,
            name: shift.name,
            shortName: 'Toàn ca',
            time: `${shift.startTime} - ${shift.endTime}`,
            note: shift.description === 'INSTANCE' ? '' : (shift.description || '')
          });
        }
      }
    });

    return Array.from(signatureMap.values());
  }, [templates]);

  return (
    <div className="matrix-view-container" style={{ overflowX: 'auto' }}>
      <table className="matrix-table excel-style" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
        <thead>
          <tr>
            <th className="sticky-col header-cell" style={{ minWidth: 160, background: '#f8d7da', border: '1px solid #000', padding: 8 }}>Ca / Kíp trực</th>
            {weekDays.map((d, idx) => {
              const isToday = dayjs().startOf('day').isSame(d.startOf('day'));
              return (
                <th key={idx} className={`header-cell ${isToday ? 'is-today' : ''}`} style={{ minWidth: 120, background: '#f8d7da', border: '1px solid #000', padding: 8 }}>
                  <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#e02424' : '#000' }}>{d.format('dddd')}</div>
                  <div style={{ fontSize: '12px', fontWeight: 'normal' }}>{d.format('DD/MM')}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row, rIdx) => {
            return (
              <tr key={row.key} style={{ background: rIdx % 2 === 0 ? '#fdf2f8' : '#e0f2fe' }}>
                <td className="sticky-col row-header" style={{ border: '1px solid #000', padding: '12px 8px', verticalAlign: 'middle', fontWeight: 600 }}>
                  <div style={{ fontSize: '14px' }}>{row.name}</div>
                  <div style={{ fontSize: '12px', color: '#1f2937' }}>{row.shortName} ({row.time})</div>
                  {row.note && <div style={{ fontSize: '11px', color: '#4b5563', fontStyle: 'italic', marginTop: 4 }}>{row.note}</div>}
                </td>
                {weekDays.map((day, dIdx) => {
                  const dateStr = day.format('YYYY-MM-DD');
                  const slot = slots.find(s => {
                      if (dayjs(s.shiftDate).format('YYYY-MM-DD') !== dateStr) return false;
                      const targetShift = templates.find(t => String(t.id) === String(s.shiftId));
                      const targetKip = targetShift?.kips?.find((k: any) => String(k.id) === String(s.kipId));
                      
                      const sName = targetShift?.name || s.shiftLabel || '';
                      const kName = targetKip?.name || s.kip?.name || 'Toàn ca';
                      const kStart = targetKip?.startTime || targetShift?.startTime || s.kip?.startTime || s.startTime || '';
                      const kEnd = targetKip?.endTime || targetShift?.endTime || s.kip?.endTime || s.endTime || '';
                      
                      const sig = `${sName}|${kName}|${kStart}-${kEnd}`;
                      return sig === row.key;
                  });
                  
                  const isPast = day.isBefore(dayjs().startOf('day')) || (day.isSame(dayjs(), 'day') && dayjs(`${dateStr} ${row.time.split(' - ')[0]}`).isBefore(dayjs()));

                  return (
                    <td
                      key={dIdx}
                      className={`matrix-cell excel-cell ${isPast ? 'is-past' : ''}`}
                      style={{ 
                        border: '1px solid #000', 
                        padding: '2px',
                        verticalAlign: 'top',
                        cursor: slot ? 'pointer' : 'default',
                        background: isPast ? 'rgba(0,0,0,0.02)' : 'transparent',
                        opacity: isPast ? 0.8 : 1
                      }}
                      onClick={() => { if (slot) openSlotDetail(slot); }}
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
                                  color: u.id === currentUserId ? '#b91c1c' : '#1e293b',
                                  fontWeight: u.id === currentUserId ? 600 : 400
                                }}
                                >
                                  {u.name}
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Trống</div>
                            )}
                          </div>
                        ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MemberDutyTableView;
