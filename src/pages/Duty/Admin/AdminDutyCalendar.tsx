import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Space, message, Typography, Select, Tooltip, Spin, Switch, Dropdown, Menu, Divider, Alert } from 'antd';
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

// Child Components
import QuickCreateModal from './components/QuickCreateModal';
import AdminDutySlotModal from './components/AdminDutySlotModal';
import SetupWeekModal from './components/SetupWeekModal';
import AssignTemplateModal from './components/AssignTemplateModal';
import AdminDutyTableView from './components/AdminDutyTableView';
import AdminDutyTimelineView from './components/AdminDutyTimelineView';

const { Title, Text } = Typography;

const AdminDutyCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.department === 'Ban Nhân sự';
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
  }, []);

  useEffect(() => {
    fetchSchedule();
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
            fetchSchedule();
          }
        } catch (err) {
          message.error('Lỗi khi xóa trắng tuần');
        }
      }
    });
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

  const relevantTemplates = useMemo(() => {
    const activeGroupIds = new Set();
    const defaultGroup = templateGroups.find(g => g.isDefault);
    if (defaultGroup) activeGroupIds.add(String(defaultGroup.id));

    // Get group IDs from assignments that overlap with the current week
    const weekStart = currentWeek.startOf('isoWeek' as any);
    const weekEnd = currentWeek.endOf('isoWeek' as any);
    
    assignments.forEach(a => {
      const start = dayjs(a.startDate);
      const end = dayjs(a.endDate);
      if (start.isSameOrBefore(weekEnd) && end.isSameOrAfter(weekStart)) {
        activeGroupIds.add(String(a.templateId));
      }
    });

    // Get shift IDs from existing slots and manual stamps in the current week
    const inUseShiftIds = new Set(slots.map(s => String(s.shiftId)));
    const stampedShiftIds = new Set(dutyDays.flatMap(d => (d.shiftTemplateIds || []).map(String)));

    return templates.filter(t => 
      activeGroupIds.has(String(t.templateId)) || 
      inUseShiftIds.has(String(t.id)) ||
      stampedShiftIds.has(String(t.id))
    );
  }, [templates, assignments, templateGroups, slots, dutyDays, currentWeek]);

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
              {viewMode === 'calendar' && (
                <>
                  <Divider type="vertical" style={{ margin: 0 }} />
                  <Space size={4}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hiện khung</span>
                    <Switch size="small" checked={showDefaultBoundaries} onChange={setShowDefaultBoundaries} />
                  </Space>
                </>
              )}
            </div>

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
          {viewMode === 'table' ? (
            <AdminDutyTableView
              loading={loading}
              templates={relevantTemplates}
              weekDays={weekDays}
              dutyDays={dutyDays}
              slots={slots}
              isAdmin={isAdmin}
              openSlotDetail={openSlotDetail}
              handleStampShift={handleStampShift}
              openQuickCreate={openQuickCreate}
            />
          ) : (
            <AdminDutyTimelineView 
              now={now}
              currentWeek={currentWeek}
              weekDays={weekDays}
              dutyDays={dutyDays}
              slotsByDay={slotsByDay}
              templates={relevantTemplates}
              getEffectiveTemplatesForDay={getEffectiveTemplatesForDay}
              showDefaultBoundaries={showDefaultBoundaries}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              openSlotDetail={openSlotDetail}
              openQuickCreate={openQuickCreate}
              handleRemoveShiftFromDay={handleRemoveShiftFromDay}
            />
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

      <AdminDutySlotModal
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        onSuccess={fetchSchedule}
        slot={selectedSlot}
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

export default AdminDutyCalendar;
