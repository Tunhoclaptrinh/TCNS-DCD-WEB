import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Space, message, Typography, Tooltip, Avatar, Spin, Dropdown, Menu, Alert } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  CalendarOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DownOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/vi';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import '../DutyCalendar.less';

import QuickCreateModal from './components/QuickCreateModal';
import AdminDutySlotModal from './components/AdminDutySlotModal';
import SetupWeekModal from './components/SetupWeekModal';
import AssignTemplateModal from './components/AssignTemplateModal';

const { Title, Text } = Typography;

const AdminDutyCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = true;
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

  const [now, setNow] = useState(dayjs());
  const [dutySettings, setDutySettings] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchTemplates = async () => {
    try {
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
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchDutySettings();
  }, [currentWeek]);

  const handlePrevWeek = () => setCurrentWeek(prev => prev.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentWeek(next => next.add(1, 'week'));
  const handleToday = () => setCurrentWeek(dayjs().startOf('isoWeek' as any));

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
              shift: shift,
              kip: kip,
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
            shift: shift,
            kip: null,
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
            <Space size={8}>
              <Tooltip title="Tải lại dữ liệu">
                <Button icon={<SyncOutlined />} onClick={fetchSchedule} loading={loading} />
              </Tooltip>
              <Tooltip title="Xuất dữ liệu Excel">
                <Button icon={<CloudDownloadOutlined />} />
              </Tooltip>
              
              <Dropdown overlay={adminMenu} placement="bottomRight">
                <Button type="primary" className="hifi-button">
                  Quản trị <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Spin spinning={loading}>
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
                        const dayData = dutyDays.find(d => dayjs(d.date).format('YYYY-MM-DD') === dateStr);
                        const isStamped = (dayData?.shiftTemplateIds || []).map(String).includes(String(row.shiftId));
                        
                        const slot = slots.find(s => {
                           if (dayjs(s.shiftDate).format('YYYY-MM-DD') !== dateStr) return false;
                           const targetShift = templates.find(t => String(t.id) === String(s.shiftId));
                           const targetKip = targetShift?.kips?.find((k: any) => String(k.id) === String(s.kipId));
                           
                           const sName = targetShift?.name || s.shift?.name || '';
                           const kName = targetKip?.name || s.kip?.name || 'Toàn ca';
                           const kStart = targetKip?.startTime || targetShift?.startTime || s.kip?.startTime || s.shift?.startTime || '';
                           const kEnd = targetKip?.endTime || targetShift?.endTime || s.kip?.endTime || s.shift?.endTime || '';
                           
                           const sig = `${sName}|${kName}|${kStart}-${kEnd}`;
                           return sig === row.key;
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
                                    content: `Chưa có phiên bản Ca "${row.name}" cho ngày ${day.format('DD/MM')}. Bạn có muốn áp dụng Ca này xuống ngày trước khi khởi tạo Kíp không?`,
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
                                        borderBottom: uIdx < slot.assignedUsers.length - 1 ? '1px dashed #cbd5e1' : 'none',
                                        fontSize: '13px',
                                        color: '#1e293b'
                                      }}
                                     >
                                        {u.name}
                                     </div>
                                   ))
                                 ) : (
                                   <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[Kíp rỗng]</div>
                                 )}
                               </div>
                             ) : (
                               !isPast && isAdmin && (
                                 <div className="add-kip-hint" style={{ padding: '8px', fontSize: '12px', color: '#cbd5e1', textAlign: 'center' }}>+ Tạo mới</div>
                               )
                             )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      <AdminDutySlotModal
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        onSuccess={fetchSchedule}
        slot={selectedSlot}
        allSlots={slots}
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
                 <Text strong>Click vào ô lưới trống:</Text> Tự động tạo Kíp nhanh dựa trên dòng đó.
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Click vào ô đã có người:</Text> Mở bảng xem và tùy chỉnh thông tin nhân sự.
               </li>
            </ul>
          </div>

          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Dành cho Quản trị viên:</Text>
            <ul style={{ paddingLeft: 20, color: '#475569' }}>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Khởi tạo Tuần:</Text> Sao chép toàn bộ bản mẫu của một Nhóm sang tuần khởi động hiện tại.
               </li>
               <li style={{ marginBottom: 8 }}>
                 <Text strong>Xóa trắng tuần:</Text> Dọn sạch toàn bộ ca để khôi phục lại từ con số không.
               </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDutyCalendar;
