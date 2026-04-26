import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Space, message, Typography, Select, Spin, Alert, Segmented, Tooltip, Divider, Modal } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
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
import MemberDutySlotModal from './components/MemberDutySlotModal';
import MemberDutyTableView from './components/MemberDutyTableView';
import MemberDutyTimelineView from './components/MemberDutyTimelineView';

const { Title, Paragraph, Text } = Typography;

const MemberCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  const [dutySettings, setDutySettings] = useState<any>(null);
  const [showDefaultBoundaries] = useState(false);
  const [eventFocusMode, setEventFocusMode] = useState<'off' | 'overlap' | 'all'>('off');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => currentWeek.add(i, 'day')),
    [currentWeek]
  );

  const [isSlotDetailOpen, setIsSlotDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [now, setNow] = useState(dayjs());

  const currentGeneration = dutySettings?.currentGeneration;
  const userGeneration = (user as any)?.generation;
  const isOldGeneration = currentGeneration && userGeneration && userGeneration !== currentGeneration;

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
        const rawSlots = res.data.slots || [];
        setSlots(Array.isArray(rawSlots) ? rawSlots : []);
        
        const rawAssignments = res.data.assignments || [];

        setAssignments(Array.isArray(rawAssignments) ? rawAssignments : []);
        
        // Merge "Snapshot" templates into the local pool to ensure historical rendering
        if (res.data?.templates && Array.isArray(res.data.templates)) {
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

    
    // Determine the "Authorized" template group for this day (Assigned or Global Default)
    const assignment = assignments.find(a => {
      const startStr = dayjs(a.startDate).format('YYYY-MM-DD');
      const endStr = dayjs(a.endDate).format('YYYY-MM-DD');
      return targetStr >= startStr && targetStr <= endStr;
    });
    const defaultGroup = templateGroups.find(g => g.isDefault);
    const activeGroupId = assignment?.templateId || defaultGroup?.id;

    let candidates: any[] = [];

    // 1. Add ACTUAL SHIFT instances for this day (The source of truth)
    const dayActualShifts = templates
      .filter(t => t.date && dayjs(t.date).format('YYYY-MM-DD') === targetStr)
      .map(t => ({ ...t, isStamped: true }));
    candidates = [...dayActualShifts];


    // 2. Add templates from the active group IF showDefaultBoundaries is ON
    if (showDefaultBoundaries && activeGroupId) {
      const activeGroupTemplates = templates.filter(t => 
        String(t.templateId) === String(activeGroupId) && 
        !t.date // Only definitions
      );
      
      // Only add if not already present as an actual instance
      activeGroupTemplates.forEach(tpl => {
        const alreadyStamped = dayActualShifts.some(act => 
          String(act.fromTemplateShiftId) === String(tpl.id) || 
          (act.name === tpl.name && act.startTime === tpl.startTime)
        );
        if (!alreadyStamped) {
          candidates.push({ ...tpl, isStamped: false });
        }
      });
    }


    // 3. Include Special Events ONLY IF Focus Mode is ON
    if (eventFocusMode !== 'off') {
       const specialEventShifts = templates.filter(t => 
         t.description !== 'INSTANCE' && 
         t.isSpecialEvent &&
         !candidates.find(c => String(c.id) === String(t.id))
       ).map(t => ({ ...t, isSpecial: true, isStamped: false }));
       candidates = [...candidates, ...specialEventShifts];
    }

    // Filter candidates by their specific daysOfWeek setting
    let filtered = candidates.filter(shift => (shift.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).map(String).includes(String(dIdx)));
    
    // --- SPECIAL EVENT FOCUS LOGIC ---
    if (eventFocusMode === 'all') {
      // Mode: Absolute Focus - ONLY show special events
      filtered = filtered.filter(s => s.isSpecialEvent);
    } else if (eventFocusMode === 'overlap') {
      // Mode: Overlap Focus - Only show events + non-conflicting regular shifts
      const specialEvents = filtered.filter(s => s.isSpecialEvent);
      if (specialEvents.length > 0) {
        filtered = filtered.filter(s => {
          const isSpecial = s.isSpecialEvent;
          if (isSpecial) return true;
          
          return !specialEvents.some(event => {
            const sStart = s.startTime;
            const sEnd = s.endTime;
            const eStart = event.startTime;
            const eEnd = event.endTime;
            if (!sStart || !sEnd || !eStart || !eEnd) return false;
            return (sStart < eEnd && sEnd > eStart);
          });
        });
      }
    }

    return { shifts: filtered, activeGroupId };
  };



  const openSlotDetail = (slot: DutySlot) => {
    setSelectedSlot(slot);
    setIsSlotDetailOpen(true);
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

  return (
    <div className="duty-calendar-container" style={{ padding: '0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b', fontSize: '24px', letterSpacing: '-0.5px' }}>Lịch trực tuần này</Title>
          <Text type="secondary">Đăng ký, xem lịch và quản lý ca trực của bạn.</Text>
        </div>
        <Space>
          <Button 
            icon={<QuestionCircleOutlined />}
            onClick={() => {
              Modal.info({
                title: 'Hướng dẫn sử dụng Lịch trực',
                width: 600,
                content: (
                  <div style={{ marginTop: 16 }}>
                    <Paragraph><strong>1. Đăng ký kíp:</strong> Nhấn vào các ô trống trong bảng hoặc nhấn "Đăng ký" trong giao diện lịch để tham gia kíp trực.</Paragraph>
                    <Paragraph><strong>2. Hủy kíp:</strong> Bạn có thể tự hủy đăng ký nếu kíp chưa đầy hoặc chưa bị khóa. Nếu không, hãy gửi đơn xin nghỉ.</Paragraph>
                    <Paragraph><strong>3. Đổi ca:</strong> Sử dụng tính năng "Đổi ca" để gửi yêu cầu cho thành viên khác hoặc chuyển ca cho Admin duyệt.</Paragraph>
                    <Paragraph><strong>4. Quy định:</strong> Tuân thủ giới hạn số kíp tối đa trong tuần theo cấu hình của Đội.</Paragraph>
                  </div>
                ),
                okText: 'Đã hiểu'
              });
            }}
            style={{ 
              borderRadius: 10, 
              fontWeight: 600,
              height: 40,
              background: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            Hướng dẫn
          </Button>
        </Space>
      </div>

      <Alert 
        message={<Text style={{ fontSize: 13, color: '#0369a1' }}><strong>Lưu ý:</strong> Mọi thay đổi (hủy/đổi) cần thực hiện sớm nhất có thể. Kíp đã khóa không thể tự ý thay đổi.</Text>}
        type="info"
        showIcon
        closable
        style={{ marginBottom: 16, borderRadius: 8, backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', padding: '8px 12px' }}
      />

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
          <Space size="middle" align="center">
            <Tooltip title="Chế độ hiển thị">
              <Select
                value={viewMode}
                onChange={setViewMode}
                bordered={false}
                size="small"
                options={[
                  { label: 'Lịch', value: 'calendar' },
                  { label: 'Bảng', value: 'table' }
                ]}
                style={{ width: 80, fontWeight: 600 }}
              />
            </Tooltip>

            <Divider type="vertical" style={{ height: 16, borderColor: '#e2e8f0' }} />

            <Space size={4}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Chế độ xem</span>
              <Segmented 
                size="small"
                options={[
                  { label: 'Bình thường', value: 'off' },
                  { label: viewMode === 'table' ? 'Tất cả' : 'Sự kiện + Ca', value: 'overlap' },
                  { label: 'Chỉ Sự kiện', value: 'all' }
                ]}
                value={eventFocusMode}
                onChange={(v: any) => setEventFocusMode(v)}
              />
            </Space>
            
            </Space>
            <Button 
              icon={<SyncOutlined spin={loading} />} 
              onClick={fetchSchedule} 
              loading={loading} 
              disabled={loading}
            />
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Spin spinning={loading}>
          {viewMode === 'table' ? (
            <MemberDutyTableView
              templates={templates}
              weekDays={weekDays}
              slots={slots}
              currentUserId={currentUserId}
              openSlotDetail={openSlotDetail}
              collapsedGroups={collapsedGroups}
              setCollapsedGroups={setCollapsedGroups}
              eventFocusMode={eventFocusMode}
              showDefaultBoundaries={showDefaultBoundaries}
            />
          ) : (
            <MemberDutyTimelineView
              now={now}
              currentWeek={currentWeek}
              weekDays={weekDays}
              slotsByDay={slotsByDay}
              templates={templates}
              getEffectiveTemplatesForDay={getEffectiveTemplatesForDay}
              showDefaultBoundaries={showDefaultBoundaries}
              currentUserId={currentUserId}
              openSlotDetail={openSlotDetail}
              eventFocusMode={eventFocusMode}
            />
          )}
        </Spin>
      </Card>

      <MemberDutySlotModal
        open={isSlotDetailOpen}
        onCancel={() => setIsSlotDetailOpen(false)}
        slot={selectedSlot}
        onSuccess={fetchSchedule}
        currentUserId={currentUserId ?? 0}
        allSlots={slots}
        isOldGeneration={isOldGeneration}
        settings={dutySettings}
      />
    </div>
  );
};

export default MemberCalendar;
