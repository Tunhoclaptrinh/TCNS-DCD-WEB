import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Space, message, Typography, Select, Spin, Alert, Segmented } from 'antd';
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

const { Title } = Typography;

const MemberCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  const [dutySettings, setDutySettings] = useState<any>(null);
  const [showDefaultBoundaries, setShowDefaultBoundaries] = useState(false);
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
        
        const rawDays = res.data.days || [];
        setDays(Array.isArray(rawDays) ? rawDays : []);
        
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
    const dayData = days.find(d => dayjs(d.date).format('YYYY-MM-DD') === targetStr);
    
    // Determine the "Authorized" template group for this day (Assigned or Global Default)
    const assignment = assignments.find(a => {
      const startStr = dayjs(a.startDate).format('YYYY-MM-DD');
      const endStr = dayjs(a.endDate).format('YYYY-MM-DD');
      return targetStr >= startStr && targetStr <= endStr;
    });
    const defaultGroup = templateGroups.find(g => g.isDefault);
    const activeGroupId = assignment?.templateId || defaultGroup?.id;

    let candidates: any[] = [];

    // 1. Check for manual/stamped day record
    if (dayData) {
      const templateIds = (dayData.shiftTemplateIds || []);
      candidates = templateIds.map((id: number) => {
        const t = templates.find(temp => String(temp.id) === String(id));
        return t ? { ...t, isStamped: true } : null;
      }).filter(Boolean);
    } else if (showDefaultBoundaries) {
      // 2. Fallback to range-based assignment
      if (assignment) {
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(assignment.templateId)).map(t => ({ ...t, isStamped: false }));
      } else if (defaultGroup) {
        candidates = templates.filter(t => t.description !== 'INSTANCE' && String(t.templateId) === String(defaultGroup.id)).map(t => ({ ...t, isStamped: false }));
      }
    }

    // 3. Include Special Events ONLY IF Focus Mode is ON
    if (eventFocusMode !== 'off') {
       const specialEventShifts = templates.filter(t => 
         t.description !== 'INSTANCE' && 
         t.name?.toLowerCase().includes('sự kiện') &&
         !candidates.find(c => String(c.id) === String(t.id))
       ).map(t => ({ ...t, isSpecial: true, isStamped: false }));
       candidates = [...candidates, ...specialEventShifts];
    }

    // Filter candidates by their specific daysOfWeek setting
    let filtered = candidates.filter(shift => (shift.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).map(String).includes(String(dIdx)));
    
    // --- SPECIAL EVENT FOCUS LOGIC ---
    if (eventFocusMode === 'all') {
      // Mode: Absolute Focus - ONLY show special events
      filtered = filtered.filter(s => s.name?.toLowerCase().includes('sự kiện'));
    } else if (eventFocusMode === 'overlap') {
      // Mode: Overlap Focus - Only show events + non-conflicting regular shifts
      const specialEvents = filtered.filter(s => s.name?.toLowerCase().includes('sự kiện'));
      if (specialEvents.length > 0) {
        filtered = filtered.filter(s => {
          const isSpecial = s.name?.toLowerCase().includes('sự kiện');
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
    <div className="duty-calendar-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Lịch trực của tôi</Title>
        <Space>
          {isOldGeneration && (
            <Alert 
              message={`Chế độ lưu trữ: Thế hệ ${userGeneration}`} 
              type="warning" 
              showIcon 
              style={{ padding: '4px 12px', borderRadius: 8 }}
            />
          )}
          <Button icon={<QuestionCircleOutlined />}>Hướng dẫn</Button>
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
              <Space size={4}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Chế độ xem</span>
                <Segmented 
                  size="small"
                  options={[
                    { label: 'Bình thường', value: 'off' },
                    { label: 'Sự kiện + Ca', value: 'overlap' },
                    { label: 'Chỉ Sự kiện', value: 'all' }
                  ]}
                  value={eventFocusMode}
                  onChange={(v: any) => setEventFocusMode(v)}
                />
              </Space>
              <Space size={4}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hiện mẫu</span>
                <Select
                  value={showDefaultBoundaries}
                  onChange={setShowDefaultBoundaries}
                  bordered={false}
                  options={[
                    { label: 'Bật', value: true },
                    { label: 'Tắt', value: false }
                  ]}
                  style={{ width: 60 }}
                />
              </Space>
              <Select
                value={viewMode}
                onChange={setViewMode}
                bordered={false}
                options={[
                  { label: 'Lịch', value: 'calendar' },
                  { label: 'Bảng', value: 'table' }
                ]}
                style={{ width: 80 }}
              />
            </div>
            <Button icon={<SyncOutlined />} onClick={fetchSchedule} loading={loading} />
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
      />
    </div>
  );
};

export default MemberCalendar;
