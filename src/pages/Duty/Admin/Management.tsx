import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Space, message, Typography, Select, Divider, Alert, DatePicker, Row, Col, Tooltip, Tag, Checkbox, Badge, Popconfirm, Dropdown, Menu, Tabs, Segmented, Switch, InputNumber } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ScheduleOutlined, SettingOutlined,
  InboxOutlined,
  LeftOutlined, RightOutlined, LayoutOutlined,
  QuestionCircleOutlined,
  LockOutlined, UnlockOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  StopOutlined, SyncOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import dutyService, { DutyShift } from '@/services/duty.service';
import { DataTable, StatisticsCard, TabSwitcher } from '@/components/common';
import ShiftTemplateModal from './components/ShiftTemplateModal';
import GroupModal from './components/GroupModal';
import KipModal from './components/KipModal';
import AdminDutySlotModal from './components/AdminDutySlotModal';
import '../DutyCalendar.less';
import { useSocket } from '@/contexts/SocketContext';
import { Progress } from 'antd';
import BulkSchedulingForm from './components/BulkSchedulingForm';
import ManualSlotForm from './components/ManualSlotForm';

const { Text, Title } = Typography;

const DutyManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotFilterWeek, setSlotFilterWeek] = useState(dayjs().startOf('isoWeek' as any));

  // Modals Visibility
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isKipModalOpen, setIsKipModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSlotEditModalOpen, setIsSlotEditModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [percent, setPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const { socket } = useSocket();

  // Forms
  const [shiftForm] = Form.useForm();
  const [coordinationForm] = Form.useForm();
  const [manualSlotForm] = Form.useForm();
  
  // Selected Items for Editing
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [editingKip, setEditingKip] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [previewDates, setPreviewDates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('1');
  const [templateViewMode, setTemplateViewMode] = useState<'list' | 'calendar'>('list');
  const [previewViewMode, setPreviewViewMode] = useState<'list' | 'week'>('week');
  const [previewWeekOffset, setPreviewWeekOffset] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm] = Form.useForm();

  const manualOrder = Form.useWatch('order', manualSlotForm);
  const manualShiftId = Form.useWatch('shiftId', manualSlotForm);

  useEffect(() => {
    if (activeTab !== '2') return;
    const currentLabel = manualSlotForm.getFieldValue('shiftLabel');
    const shift = templates.find(s => s.id === manualShiftId);
    if (!shift) return;

    const autoPattern = new RegExp(`^${shift.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - Kíp \\d+$`);
    if (!currentLabel || autoPattern.test(currentLabel) || currentLabel === shift.name) {
      manualSlotForm.setFieldsValue({ shiftLabel: `${shift.name} - Kíp ${manualOrder || 1}` });
    }
  }, [manualOrder, manualShiftId, templates, activeTab]);

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs().startOf('day'));

  const currentParentShift = useMemo(() => {
    if (!editingKip || !editingKip.shiftId) return null;
    return templates.find(s => s.id === editingKip.shiftId) || null;
  }, [editingKip, templates]);

  const weekDays = useMemo(() => {
    if (!slotFilterWeek || !slotFilterWeek.isValid()) return [];
    return Array.from({ length: 7 }).map((_, i) => slotFilterWeek.add(i, 'day'));
  }, [slotFilterWeek]);

  useEffect(() => {
    if (!slotFilterWeek) return;
    fetchGroups();
    fetchSlots();
    fetchDutySettings();
  }, [slotFilterWeek]);

  const fetchDutySettings = async () => {
    try {
      const res = await dutyService.getSettings();
      if (res.success && res.data) {
        settingsForm.setFieldsValue({
          ...res.data,
          weeklyLimitEnabled: !!(res.data.weeklyKipLimit && res.data.weeklyKipLimit > 0)
        });
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình');
    }
  };

  const handleUpdateSettings = async (values: any) => {
    setSettingsLoading(true);
    try {
      const { weeklyLimitEnabled, ...rest } = values;
      const payload = {
        ...rest,
        weeklyKipLimit: weeklyLimitEnabled ? values.weeklyKipLimit : null
      };
      const res = await dutyService.updateSettings(payload);
      if (res.success) {
        message.success('Đã cập nhật cấu hình hệ thống');
      }
    } catch (err) {
      message.error('Lỗi khi cập nhật cấu hình');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentTemplateId]);


  const fetchGroups = async () => {
    try {
      const res = await dutyService.getTemplateGroups();
      if (res.success && res.data) {
        setTemplateGroups(res.data);
        if (!currentTemplateId && res.data.length > 0) {
          const def = res.data.find((g: any) => g.isDefault) || res.data[0];
          setCurrentTemplateId(def.id);
        }
      }
    } catch (err) { message.error('Lỗi tải nhóm bản mẫu'); }
  };

  const fetchTemplates = async () => {
    if (!currentTemplateId) return;
    try {
      const res = await dutyService.getShiftTemplates(currentTemplateId);
      if (res.success && res.data) setTemplates(res.data);
    } catch (err) { message.error('Lỗi tải bản mẫu'); }
  };

  const fetchSlots = async () => {
    if (!slotFilterWeek) return;
    setSlotLoading(true);
    try {
      const res = await dutyService.getWeeklySchedule(slotFilterWeek.format('YYYY-MM-DD'));
      if (res.success && res.data) setSlots(res.data.slots || []);
    } catch (err) { message.error('Lỗi tải danh sách ca'); }
    finally { setSlotLoading(false); }
  };

  const currentDaySlots = useMemo(() => {
    if (!selectedDate || !Array.isArray(slots)) return slots || [];
    return slots.filter(s => dayjs(s.shiftDate).isSame(selectedDate, 'day'));
  }, [slots, selectedDate]);

  const dailyStats = useMemo(() => {
    const defaultStats = { total: 0, locked: 0, open: 0, personnel: 0 };
    if (!Array.isArray(currentDaySlots)) return defaultStats;
    
    return {
      total: currentDaySlots.length,
      locked: currentDaySlots.filter(s => s.status === 'locked').length,
      open: currentDaySlots.filter(s => s.status === 'open').length,
      personnel: currentDaySlots.reduce((acc, s) => acc + (s.capacity || s.kip?.capacity || 0), 0)
    };
  }, [currentDaySlots]);

  const handleSubmitGroup = async (values: any) => {
    try {
      const res = editingGroup
        ? await dutyService.updateTemplateGroup(editingGroup.id, values)
        : await dutyService.createTemplateGroup(values);
      if (res.success) {
        message.success('Đã lưu nhóm bản mẫu');
        setIsGroupModalOpen(false);
        fetchGroups();
      }
    } catch (err) { message.error('Lỗi khi lưu nhóm bản mẫu'); }
  };

  const handleDeleteGroup = (id: number) => {
    Modal.confirm({
      title: 'Xóa lịch trực?',
      content: 'Bạn có chắc chắn muốn xóa lịch trực này không? Tất cả các ca và kíp thuộc nhóm này sẽ bị xóa vĩnh viễn.',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteTemplateGroup(id);
        if (res.success) {
          message.success('Đã xóa nhóm bản mẫu');
          if (currentTemplateId === id) setCurrentTemplateId(null);
          fetchGroups();
        }
      }
    });
  };

  const handleCreateKip = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      startTime: timeRange?.[0]?.format('HH:mm'),
      endTime: timeRange?.[1]?.format('HH:mm')
    };
    try {
      const res = editingKip?.id
        ? await dutyService.updateKipTemplate(editingKip.id, data)
        : await dutyService.createKipTemplate(data);
      if (res.success) {
        message.success('Đã cập nhật lịch trực');
        setIsKipModalOpen(false);
        fetchTemplates();
      }
    } catch (err: any) { 
      message.error(err.response?.data?.message || 'Lỗi khi lưu'); 
    }
  };

  const formatDaysCompact = (days: number[] | undefined) => {
    if (!days || days.length === 0) return 'Chưa chọn';
    const sorted = [...days].sort((a, b) => a - b);
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    
    if (sorted.length === 7) return 'Hàng ngày';
    
    // Check if consecutive
    let isConsecutive = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i-1] + 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && sorted.length >= 3) {
      return `${dayNames[sorted[0]]} - ${dayNames[sorted[sorted.length - 1]]}`;
    }
    
    return sorted.map(d => dayNames[d]).join(', ');
  };

  const handleDeleteShift = (id: number) => {
    Modal.confirm({
      title: 'Xóa bản mẫu Ca?',
      content: 'Tất cả kíp thuộc ca này cũng sẽ bị xóa.',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteShiftTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const handleDeleteKip = (id: number) => {
    Modal.confirm({
      title: 'Xóa kíp?',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteKipTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const toggleSlotStatus = async (slot: any) => {
    const res = await dutyService.updateSlot(slot.id, {
      ...slot,
      status: slot.status === 'locked' ? 'open' : 'locked'
    });
    if (res.success) {
      message.success('Đã cập nhật trạng thái');
      fetchSlots();
    }
  };

  const openSlotEdit = (slot: any) => {
    setEditingSlot(slot);
    setIsSlotEditModalOpen(true);
  };

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

  const calculateEventLayout = (events: any[]) => {
    if (!events.length) return [];
    const sorted = [...events].sort((a, b) => {
      const startA = a.startTime || a.start || a.sStart || '';
      const startB = b.startTime || b.start || b.sStart || '';
      return startA.localeCompare(startB);
    });

    const columns: any[][] = [];
    return sorted.map(event => {
      const start = event.startTime || event.start || event.sStart || '';
      let colIdx = 0;
      while (columns[colIdx]) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1];
        if (lastInCol && lastInCol.end > start) {
          colIdx++;
        } else {
          break;
        }
      }
      if (!columns[colIdx]) columns[colIdx] = [];
      const end = event.endTime || event.end || event.sEnd || '';
      columns[colIdx].push({ ...event, end });
      return { event, colIdx };
    }).map((res, _, all) => {
      const cluster = all.filter(r => {
        const rStart = r.event.startTime || r.event.start || r.event.sStart || '';
        const rEnd = r.event.endTime || r.event.end || r.event.sEnd || '';
        const resStart = res.event.startTime || res.event.start || res.event.sStart || '';
        const resEnd = res.event.endTime || res.event.end || res.event.sEnd || '';
        return rStart < resEnd && rEnd > resStart;
      });
      const maxCols = Math.max(...cluster.map(c => c.colIdx)) + 1;
      return { ...res, totalCols: maxCols };
    });
  };

  const renderBulkPreviewCalendar = () => {
    if (!previewDates.length) return null;

    // Get the week anchor from the first date in the preview range
    const firstDate = previewDates[0].date;
    const weekStart = firstDate.startOf('isoWeek' as any).add(previewWeekOffset, 'week');
    const weekDays7 = Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day'));
    const dayLabels = ['Th\u1ee9 2', 'Th\u1ee9 3', 'Th\u1ee9 4', 'Th\u1ee9 5', 'Th\u1ee9 6', 'Th\u1ee9 7', 'CN'];

    // Check if any day in this week is in the preview range
    const hasAnyDayInWeek = weekDays7.some(d =>
      previewDates.some(p => p.date.format('YYYY-MM-DD') === d.format('YYYY-MM-DD'))
    );

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Button size="small" icon={<LeftOutlined />} onClick={() => setPreviewWeekOffset(o => o - 1)}>Tuần trước</Button>
            <Text strong style={{ fontSize: 14 }}>
              Tuần {weekStart.isoWeek ? weekStart.isoWeek() : ''}: {weekStart.format('DD/MM')} - {weekStart.add(6,'day').format('DD/MM/YYYY')}
            </Text>
            <Button size="small" icon={<RightOutlined />} onClick={() => setPreviewWeekOffset(o => o + 1)}>Tuần sau</Button>
          </Space>
          {!hasAnyDayInWeek && (
            <Tag color="warning">Tuần này không có ngày nào trong khoảng chọn</Tag>
          )}
        </div>

        <div className="duty-calendar-pro">
          {/* Header */}
          <div className="calendar-header">
            <div className="header-axis-spacer" />
            {weekDays7.map((d, idx) => {
              const dateStr = d.format('YYYY-MM-DD');
              const previewDay = previewDates.find(p => p.date.format('YYYY-MM-DD') === dateStr);
              const inRange = !!previewDay;
              const isSelected = previewDay?.isSelected;
              return (
                <div
                  key={idx}
                  className={`header-day${isSelected ? ' is-today' : ''}`}
                  style={{ opacity: inRange ? 1 : 0.35 }}
                >
                  <div className="day-header-content">
                    <Space direction="vertical" align="center" size={0}>
                      <span className="day-name">{dayLabels[idx]}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{d.format('DD/MM')}</span>
                      {inRange && (
                        <Checkbox
                          checked={isSelected}
                          onChange={e => {
                            const n = previewDates.map(p =>
                              p.date.format('YYYY-MM-DD') === dateStr
                                ? { ...p, isSelected: e.target.checked }
                                : p
                            );
                            setPreviewDates(n);
                          }}
                          style={{ marginTop: 4 }}
                        />
                      )}
                    </Space>
                  </div>
                </div>
              );
            })}
            <div className="header-scroll-spacer" />
          </div>

          {/* Body */}
          <div className="calendar-body">
            <div className="time-axis">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                <div key={i} className="axis-hour">
                  <span>{String(START_HOUR + i).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            <div className="grid-container">
              <div className="grid-lines-bg">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <div key={i} className="grid-line" />
                ))}
              </div>

              {weekDays7.map((d, dIdx) => {
                const dateStr = d.format('YYYY-MM-DD');
                const previewDay = previewDates.find((p: any) => p.date.format('YYYY-MM-DD') === dateStr);
                const isSelected = previewDay?.isSelected;
                const dayOfWeek = (d.day() + 6) % 7; // 0=Mon, 6=Sun

                // Always show shift backgrounds from templates for visual context
                const dayShiftTemplates = templates.filter(sh => {
                  const shDays = sh.daysOfWeek && sh.daysOfWeek.length > 0 ? sh.daysOfWeek : [0,1,2,3,4,5,6];
                  return shDays.map(String).includes(String(dayOfWeek));
                });

                // Get kip slots from the preview data (filtering out isShift entries)
                const dayKipSlots = (previewDay?.kips || [])
                  .filter((k: any) => !k.isShift)
                  .sort((a: any, b: any) => (a.startTime || a.sStart || '').localeCompare(b.startTime || b.sStart || ''));

                return (
                  <div
                    key={dIdx}
                    className="day-column"
                    style={{ opacity: previewDay ? 1 : 0.15, background: isSelected === false ? 'repeating-linear-gradient(45deg, #fee2e2, #fee2e2 4px, transparent 4px, transparent 14px)' : undefined }}
                  >
                    {/* Shift Template Backgrounds (always shown) */}
                    {dayShiftTemplates.reduce((acc: any[], curr: any) => {
                      if (!acc.find(x => x.id === curr.id || (x.name === curr.name && x.startTime === curr.startTime))) acc.push(curr);
                      return acc;
                    }, []).map((shift: any, sIdx: number) => {
                      const isSpecialEvent = shift.name && shift.name.toLowerCase().includes('sự kiện');
                      return (
                        <div
                          key={`shift-bg-${shift.id}-${sIdx}`}
                          className={`calendar-shift-box ${isSpecialEvent ? 'special-event' : ''}`}
                          style={{
                            top: `${getTimeTop(shift.startTime)}px`,
                            height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                            opacity: previewDay ? (isSelected ? 1 : 0.3) : 0.15,
                            cursor: 'default',
                            position: 'absolute',
                            width: '100%',
                            zIndex: 1
                          }}
                        >
                          <div className="shift-tag" style={{ fontWeight: 800 }}>{shift.name}</div>
                          {isSpecialEvent && (
                            <div style={{ position: 'absolute', top: 4, right: 8, opacity: 0.1, fontSize: '24px', pointerEvents: 'none' }}>
                              <SyncOutlined spin={false} />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Kip Slots from preview data */}
                    {calculateEventLayout(dayKipSlots).map((layout: any, i: number) => {
                      const { event: slot, colIdx, totalCols } = layout;
                      // Find parent shift for fallback times
                      const parentShift = templates.find(s => s.id === slot.shiftId || s.name === slot.shiftName);
                      const start = slot.startTime || slot.sStart || parentShift?.startTime;
                      const end = slot.endTime || slot.sEnd || parentShift?.endTime;
                      if (!start || !end) return null;
                      return (
                        <div
                          key={i}
                          className="calendar-slot-box"
                          style={{
                            top: `${getTimeTop(start)}px`,
                            height: `${getTimeHeight(start, end)}px`,
                            opacity: isSelected ? 1 : 0.35,
                            width: `calc((100% - 12px) / ${totalCols})`,
                            left: `calc(6px + (100% - 12px) * ${colIdx} / ${totalCols})`,
                            zIndex: 15 + colIdx
                          }}
                        >
                          <div className="slot-header">
                            <span className="slot-title">{slot.name}</span>
                          </div>
                          <div className="slot-time">{start} - {end}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderTemplateWeeklyView = () => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    
    // 0=Mon, 1=Tue, ..., 6=Sun
    const kipsGrid: Record<number, any[]> = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};
    const shiftsGrid: Record<number, any[]> = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};
    
    templates.forEach(sh => {
      const shDays = sh.daysOfWeek && sh.daysOfWeek.length > 0 ? sh.daysOfWeek : [0,1,2,3,4,5,6];
      
      shDays.forEach(d => {
        if (shiftsGrid[d]) {
          shiftsGrid[d].push(sh);
        }
      });

      sh.kips.forEach(k => {
        const kDays = k.daysOfWeek && k.daysOfWeek.length > 0 ? k.daysOfWeek : shDays;
        const start = k.startTime || sh.startTime;
        const end = k.endTime || sh.endTime;
        kDays.forEach(d => {
          if (kipsGrid[d]) {
            kipsGrid[d].push({ ...k, shiftName: sh.name, shiftId: sh.id, start, end });
          }
        });
      });
    });
    
    Object.values(kipsGrid).forEach(list => list.sort((a,b) => (a.start || '').localeCompare(b.start || '')));

    return (
      <div className="duty-calendar-pro" style={{ marginTop: 16 }}>
        <div className="calendar-header">
          <div className="header-axis-spacer" />
          {days.map((d, idx) => (
            <div key={idx} className="header-day">
              <div className="day-header-content">
                <Space direction="vertical" align="center" size={0}>
                  <Space size={4}>
                    <span className="day-name">{d}</span>
                  </Space>
                </Space>
              </div>
            </div>
          ))}
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
          </div>

          <div className="grid-container">
            <div className="grid-lines-bg">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                <div key={i} className="grid-line" />
              ))}
            </div>

            {days.map((_, dIdx) => {
              const dayShifts = shiftsGrid[dIdx] || [];
              const dayKips = kipsGrid[dIdx] || [];

              return (
                <div key={dIdx} className="day-column">
                  <div className="column-click-overlay" />

                  {/* Shift (Ca) Backgrounds */}
                  {dayShifts.reduce((acc: any[], curr: any) => {
                    if (!acc.find(x => x.id === curr.id)) acc.push(curr);
                    return acc;
                  }, []).map((shift: any, sIdx: number) => {
                    const isSpecialEvent = shift.name && shift.name.toLowerCase().includes('sự kiện');
                    return (
                      <div
                        key={`shift-${shift.id}-${dIdx}-${sIdx}`}
                        className={`calendar-shift-box ${isSpecialEvent ? 'special-event' : ''}`}
                        style={{
                          top: `${getTimeTop(shift.startTime)}px`,
                          height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                          position: 'absolute',
                          width: '100%',
                          zIndex: 1
                        }}
                      >
                        <div className="shift-tag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{shift.name}</span>
                        </div>
                        {isSpecialEvent && (
                          <div style={{ position: 'absolute', top: 4, right: 8, opacity: 0.1, fontSize: '24px', pointerEvents: 'none' }}>
                            <SyncOutlined spin={false} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Kips */}
                  {calculateEventLayout(dayKips).map((layout, i) => {
                    const { event: slot, colIdx, totalCols } = layout;
                    return (
                      <div
                        key={i}
                        className="calendar-slot-box"
                        style={{
                          top: `${getTimeTop(slot.start)}px`,
                          height: `${getTimeHeight(slot.start, slot.end)}px`,
                          width: `calc((100% - 12px) / ${totalCols})`,
                          left: `calc(6px + (100% - 12px) * ${colIdx} / ${totalCols})`,
                          zIndex: 15 + colIdx
                        }}
                        onClick={(e) => { e.stopPropagation(); setEditingKip({ ...slot, shiftId: slot.shiftId }); setIsKipModalOpen(true); }}
                      >
                        <div className="slot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="slot-title" style={{ fontWeight: 600 }}>{slot.name}</span>
                          <span className="slot-count" style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 10 }}>
                            {slot.capacity} ng
                          </span>
                        </div>
                        <div className="slot-time">{slot.start} - {slot.end}</div>
                        <div className="slot-users" style={{ padding: 0, marginTop: 4 }}>
                           <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Thuộc: {slot.shiftName}</span>
                        </div>
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

  const tabList = [
    { key: '1', label: <span><InboxOutlined /> Lịch trực hiện tại</span> },
    { key: '2', label: <span><ScheduleOutlined /> Điều phối & Lập lịch</span> },
    { key: '3', label: <span><LayoutOutlined /> Cấu hình bản mẫu</span> },
    { key: '5', label: <span><SettingOutlined /> Cấu hình hệ thống</span> },
  ];

  const renderTabSwitcher = () => (
    <TabSwitcher className="tab-switcher-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="hifi-tabs-management"
        tabBarGutter={24}
        items={tabList.map(t => ({ 
          ...t, 
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>{t.label}</span> 
        }))}
      />
    </TabSwitcher>
  );

  const tabItems = [
    {
      key: '1',
      label: <span><InboxOutlined /> Quản lý ca & kíp</span>,
      children: (
        <DataTable
          hideCard={true}
          loading={slotLoading}
          dataSource={currentDaySlots}
          rowKey="id"
          pagination={{ total: currentDaySlots.length, pageSize: 10, showSizeChanger: true }}
          searchable={false}
          onRefresh={fetchSlots}
          headerContent={
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                backgroundColor: '#ffffff',
              }}>
                <Space size="middle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f5f5f5', padding: '2px 8px', borderRadius: 8 }}>
                    <Button icon={<LeftOutlined />} size="small" type="text" onClick={() => setSlotFilterWeek(slotFilterWeek.subtract(1, 'week'))} />
                    <DatePicker
                      picker="week"
                      size="small"
                      value={slotFilterWeek}
                      allowClear={false}
                      bordered={false}
                      onChange={(val) => val && setSlotFilterWeek(val.startOf('isoWeek' as any))}
                      format="[Tuần] ww"
                      style={{ width: 85, fontWeight: 700, padding: 0 }}
                    />
                    <Button icon={<RightOutlined />} size="small" type="text" onClick={() => setSlotFilterWeek(slotFilterWeek.add(1, 'week'))} />
                    <Divider type="vertical" style={{ height: 16 }} />
                    <Button
                      size="small"
                      type="text"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: slotFilterWeek.isSame(dayjs().startOf('isoWeek' as any), 'week')
                          ? 'var(--primary-color)'
                          : '#8c8c8c'
                      }}
                      onClick={() => {
                        const today = dayjs();
                        setSlotFilterWeek(today.startOf('isoWeek' as any));
                        setSelectedDate(null);
                      }}
                    >
                      Tuần này
                    </Button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ScheduleOutlined style={{ color: 'var(--primary-color)', fontSize: 16 }} />
                    <Text strong style={{ fontSize: '13px', color: '#1e293b' }}>
                      {selectedDate ? selectedDate.locale('vi').format('dddd, DD/MM/YYYY') : `Tất cả các ca trong tuần từ ${slotFilterWeek.format('DD/MM')} đến ${slotFilterWeek.add(6, 'day').format('DD/MM/YYYY')}`}
                    </Text>
                  </div>
                </Space>

                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                  {slotFilterWeek.format('[Tuần] ww, YYYY')}
                </Tag>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 16,
                  width: '100%',
                  alignItems: 'center',
                  overflowX: 'auto',
                  paddingBottom: 4
                }}>
                  <div
                    onClick={() => setSelectedDate(null)}
                    style={{
                      flex: '0 0 90px',
                      padding: '6px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: !selectedDate ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                      backgroundColor: !selectedDate ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.05)' : '#fff',
                      color: !selectedDate ? 'var(--primary-color)' : '#64748b',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 52,
                      zIndex: !selectedDate ? 2 : 1,
                    }}
                  >
                    <CalendarOutlined style={{ fontSize: '0.9rem', marginBottom: 2 }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cả tuần</div>
                  </div>

                  <Divider type="vertical" style={{ height: 32, borderLeft: '1px solid #e2e8f0', margin: '0 4px' }} />

                  {weekDays.map(d => {
                    const isSelected = selectedDate && d.isSame(selectedDate, 'day');
                    const daySlotsCount = slots.filter(s => dayjs(s.shiftDate).isSame(d, 'day')).length;
                    const isToday = d.isSame(dayjs(), 'day');

                    return (
                      <div
                        key={d.toISOString()}
                        onClick={() => setSelectedDate(d)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          borderRadius: 8,
                          border: isSelected ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? 'rgba(var(--primary-rgb, 201, 33, 39), 0.05)' : (isToday ? '#fff1f0' : '#fff'),
                          color: isSelected ? 'var(--primary-color)' : '#1e293b',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 52,
                          zIndex: isSelected ? 2 : 1
                        }}
                      >
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isSelected ? 'var(--primary-color)' : '#94a3b8'
                        }}>
                          {d.locale('vi').format('ddd')}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{d.format('DD/MM')}</div>

                        {daySlotsCount > 0 && (
                          <div style={{ position: 'absolute', top: 4, right: 6 }}>
                            <Badge
                              count={daySlotsCount}
                              size="small"
                              style={{
                                backgroundColor: isSelected ? 'var(--primary-color)' : '#94a3b8',
                                fontSize: '9px',
                                height: '16px',
                                minWidth: '16px',
                                lineHeight: '16px',
                                border: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <StatisticsCard
                    hideCard
                    loading={slotLoading}
                    rowGutter={12}
                    colSpan={{ xs: 12, sm: 12, md: 6, lg: 6 }}
                    data={[
                      { title: 'Tổng số ca', value: dailyStats.total, valueColor: 'var(--primary-color)' },
                      { title: 'Đang mở', value: dailyStats.open, valueColor: '#10b981' },
                      { title: 'Đã khóa', value: dailyStats.locked, valueColor: '#f43f5e' },
                      { title: 'Tổng nhân sự', value: dailyStats.personnel, valueColor: '#3b82f6' }
                    ]}
                  />
                </div>
              </div>
            </div>
          }
          title={null}
          filters={[]}
          extra={
            <Button 
              type="default" 
              icon={<PlusOutlined />} 
              style={{ 
                borderRadius: 8, 
                height: 32, 
                padding: '4px 16px',
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)',
                fontWeight: 600
              }} 
              onClick={() => {
                manualSlotForm.setFieldsValue({ date: selectedDate || dayjs() });
                setActiveTab('2');
                message.info('Vui lòng thêm ca tại phần "Thêm Ca đơn lẻ" phía dưới');
              }}
            >
              Thêm ca
            </Button>
          }
          columns={[
            ...(!selectedDate ? [{
              title: 'Ngày trực',
              dataIndex: 'shiftDate',
              key: 'shiftDate',
              width: 140,
              render: (date: string) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text strong>{dayjs(date).locale('vi').format('dddd')}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(date).format('DD/MM/YYYY')}</Text>
                </div>
              )
            }] : []),
            {
              title: 'Khung giờ',
              key: 'time',
              width: 180,
              render: (_, r: any) => (
                <Tag color={r.kipId ? "processing" : "error"} style={{ borderRadius: 6, padding: '4px 12px', fontSize: '14px', fontWeight: 600 }}>
                  {r.startTime} - {r.endTime}
                </Tag>
              )
            },
            {
              title: 'Ca & Kíp',
              dataIndex: 'shiftLabel',
              key: 'label',
              render: (val) => (
                <Space direction="vertical" size={0}>
                  <Text strong style={{ color: '#1e293b' }}>{val}</Text>
                </Space>
              )
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              align: 'center',
              width: 140,
              render: (s) => (
                <Tag color={s === 'locked' ? 'error' : 'success'} style={{ borderRadius: 8, padding: '0 12px' }}>
                  {s === 'locked' ? 'Đã khóa' : 'Đang mở'}
                </Tag>
              )
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 150,
              align: 'center',
              render: (_, r: any) => (
                <Space>
                  <Tooltip title={r.status === 'locked' ? 'Mở khóa' : 'Khóa ca'}>
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={r.status === 'locked' ? <LockOutlined /> : <UnlockOutlined />}
                      onClick={() => toggleSlotStatus(r)}
                    />
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<EditOutlined />}
                      style={{ color: 'var(--primary-color)' }}
                      onClick={() => openSlotEdit(r)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Xác nhận xóa ca này?"
                    description="Hành động này không thể hoàn tác."
                    onConfirm={async () => {
                      const res = await dutyService.deleteSlot(r.id);
                      if (res.success) { message.success('Đã xóa'); fetchSlots(); }
                    }}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  >
                    <Button type="text" size="small" shape="circle" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      )
    },
    {
      key: '2',
      label: <span><ScheduleOutlined /> Điều phối & Lập lịch</span>,
      children: (
        <div id="bulk-scheduling-section" className="coordination-tab">
          <div>
            {!isReviewMode ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '15px' }}>
                    <div style={{ width: 3, height: 14, background: 'var(--primary-color)', borderRadius: 2 }} />
                    Lập lịch tự động theo Bản mẫu
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>Khởi tạo hàng loạt kíp trực dựa trên cấu trúc bản mẫu.</Text>
                </div>
                <BulkSchedulingForm 
                  form={coordinationForm}
                  templateGroups={templateGroups}
                  onPreview={(values) => {
                    const range = values.range;
                    if (!range) return;
                    const start = range[0];
                    const end = range[1];
                    const genTemplateId = values.templateId;
                    const genMode = values.mode;

                    const proceedPreview = async (targetTemplates: any[]) => {
                      let curr = start.clone();
                      const days: any[] = [];
                      let assignments: any[] = [];
                      try {
                        if (!genTemplateId) {
                          const res = await dutyService.getTemplateAssignments();
                          if (res.success && res.data) assignments = res.data;
                        }
                      } catch (e) { console.error(e); }
                      while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                        const dateStr = curr.format('YYYY-MM-DD');
                        const dayOfWeek = (curr.day() + 6) % 7;
                        const daySlots: any[] = [];
                        let effectiveTemplates = targetTemplates;
                        if (!genTemplateId) {
                          const assignment = assignments.find(a => dayjs(dateStr).isSameOrAfter(dayjs(a.startDate), 'day') && dayjs(dateStr).isSameOrBefore(dayjs(a.endDate), 'day'));
                          if (assignment) {
                            const assignedShifts = await dutyService.getShiftTemplates(assignment.templateId);
                            if (assignedShifts.success && assignedShifts.data) effectiveTemplates = assignedShifts.data;
                          }
                        }
                        effectiveTemplates.forEach(s => {
                          const shiftDays = s.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                          if (!shiftDays.includes(dayOfWeek) || !s.kips) return;
                          if (genMode === 'shifts' || genMode === 'all') daySlots.push({ name: s.name, startTime: s.startTime, endTime: s.endTime, isShift: true });
                          if (genMode === 'kips' || genMode === 'all') {
                            s.kips.forEach((k: any) => {
                              const kipDays = k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                              if (kipDays.includes(dayOfWeek)) daySlots.push({ ...k, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime, isShift: false });
                            });
                          }
                        });
                        days.push({ date: curr.clone(), kips: daySlots, isSelected: daySlots.length > 0 });
                        curr = curr.add(1, 'day');
                      }
                      setPreviewDates(days); setIsReviewMode(true); setPreviewWeekOffset(0);
                    };
                    
                    if (genTemplateId && genTemplateId !== currentTemplateId) {
                      setLoading(true);
                      dutyService.getShiftTemplates(genTemplateId).then((res: any) => {
                        if (res.success && res.data) proceedPreview(res.data);
                        else message.error('Không thể lấy thông tin bản mẫu');
                      }).finally(() => setLoading(false));
                    } else { proceedPreview(templates); }
                  }}
                  onRefresh={fetchSlots}
                  loading={loading}
                />
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space><Button size="small" onClick={() => setIsReviewMode(false)} icon={<LeftOutlined />}>Quay lại</Button><Text type="secondary" style={{ fontSize: 13 }}>Có <Text strong>{previewDates.filter((x: any) => x.isSelected).length}</Text> ngày được chọn</Text></Space>
                  <Space>
                    <Segmented size="small" options={[{ label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> }, { label: 'Lịch tuần', value: 'week', icon: <CalendarOutlined /> }]} value={previewViewMode} onChange={(v) => { setPreviewViewMode(v as any); setPreviewWeekOffset(0); }} />
                    <Button type="primary" size="small" loading={loading} icon={<ScheduleOutlined />} style={{ fontWeight: 700, padding: '0 24px', background: 'var(--primary-color)', borderColor: 'var(--primary-color)' }} onClick={async () => {
                      setLoading(true);
                      setPercent(0);
                      setStatusText('Đang khởi tạo kết nối...');
                      const jobId = Math.random().toString(36).substring(2, 15);
                      
                      if (socket) {
                        socket.emit('joinRoom', jobId);
                        socket.on('job_progress', (data: { percent: number, text: string }) => {
                          setPercent(data.percent);
                          setStatusText(data.text);
                        });
                      }

                      try {
                        const range = coordinationForm.getFieldValue('range');
                        const genTemplateId = coordinationForm.getFieldValue('templateId') || currentTemplateId;
                        const genMode = coordinationForm.getFieldValue('mode') || 'kips';
                        const res = await dutyService.generateRangeSlots(
                          range[0].format('YYYY-MM-DD'), 
                          range[1].format('YYYY-MM-DD'), 
                          genTemplateId, 
                          genMode,
                          jobId
                        );
                        if (res.success) { 
                          message.success('Xác nhận tạo lịch thành công!'); 
                          setIsReviewMode(false); 
                          fetchSlots(); 
                        }
                      } catch (e) { 
                        message.error('Lỗi khi lập lịch'); 
                      } finally { 
                        if (socket) {
                          socket.off('job_progress');
                          socket.emit('leaveRoom', jobId);
                        }
                        setLoading(false); 
                      }
                    }}>Xác nhận & Đưa lên lịch</Button>
                  </Space>
                </div>
                 {previewViewMode === 'week' ? renderBulkPreviewCalendar() : (
                  <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 12, background: '#fff' }}>
                    {previewDates.map((d: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          padding: '12px 20px', 
                          borderBottom: i === previewDates.length - 1 ? 'none' : '1px solid #f1f5f9', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          background: d.isSelected ? 'rgba(5, 150, 105, 0.02)' : undefined,
                          transition: 'all 0.2s'
                        }}
                      >
                        <Checkbox checked={d.isSelected} onChange={e => { const n = [...previewDates]; n[i].isSelected = e.target.checked; setPreviewDates(n); }}>
                          <Space size={12}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: 8, 
                              background: d.isSelected ? '#f0fdf4' : '#f8fafc', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                              <CalendarOutlined style={{ color: d.isSelected ? '#10b981' : '#94a3b8' }} />
                            </div>
                            <div>
                              <Text strong style={{ color: '#1e293b', display: 'block' }}>{d.date.format('DD/MM/YYYY')}</Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>{d.date.locale('vi').format('dddd')}</Text>
                            </div>
                          </Space>
                        </Checkbox>
                        <Space size={8}>
                          {d.kips.filter((x: any) => x.isShift).length > 0 && (
                            <Tag color="blue" bordered={false} style={{ borderRadius: 6, margin: 0 }}>
                              {d.kips.filter((x: any) => x.isShift).length} Ca
                            </Tag>
                          )}
                          {d.kips.filter((x: any) => !x.isShift).length > 0 && (
                            <Tag color="cyan" bordered={false} style={{ borderRadius: 6, margin: 0 }}>
                              {d.kips.filter((x: any) => !x.isShift).length} Kíp
                            </Tag>
                          )}
                          {d.kips.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Trống</Text>}
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
                {loading && (
                  <div style={{ marginTop: 20, padding: '16px 24px', background: '#fef2f2', borderRadius: 12, border: '1px dashed #fca5a5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong style={{ color: '#b91c1c' }}>{statusText}</Text>
                      <Text type="secondary">{percent}%</Text>
                    </div>
                    <Progress percent={percent} strokeColor={{ '0%': '#fca5a5', '100%': '#991b1b' }} status="active" showInfo={false} />
                  </div>
                )}
              </div>
            )}
          </div>

          {!isReviewMode && (
            <div className="manual-section" style={{ marginTop: 24, borderTop: '1px dashed #e2e8f0', paddingTop: 20 }}>
               <div style={{ marginBottom: 12 }}>
                  <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '15px' }}>
                    <div style={{ width: 3, height: 14, background: '#10b981', borderRadius: 2 }} />
                    Bổ sung Kíp trực lẻ
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>Thêm thủ công các kíp trực phát sinh ngoài bản mẫu.</Text>
                </div>
                <ManualSlotForm 
                  form={manualSlotForm}
                  templates={templates}
                  onSuccess={fetchSlots}
                  loading={loading}
                />
            </div>
          )}
        </div>
      ),
    },
    {
      key: '3',
      label: <span><LayoutOutlined /> Cấu hình Bản mẫu</span>,
      children: (
        <div className="templates-tab">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space size={8}>
              <Title level={4} style={{ margin: 0, fontSize: 18 }}>Bản mẫu Ca & Kíp</Title>
              <Tooltip title="Cấu hình khung giờ cố định.">
                <QuestionCircleOutlined style={{ color: '#94a3b8', fontSize: 14 }} />
              </Tooltip>
            </Space>
            <Button
              type="primary"
              icon={<ScheduleOutlined />}
              style={{ borderRadius: 8, fontWeight: 600, padding: '0 16px', background: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
              onClick={() => {
                coordinationForm.setFieldsValue({ templateId: currentTemplateId });
                setActiveTab('2');
              }}
              disabled={!currentTemplateId}
            >
              Áp dụng Bản mẫu sang Lập lịch
            </Button>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 12,
            marginBottom: 20,
          }}>
            <Space size={8} wrap>
              <Select
                style={{ width: 220, borderRadius: 8 }}
                dropdownMatchSelectWidth={false}
                value={currentTemplateId}
                onChange={setCurrentTemplateId}
                placeholder="Chọn nhóm..."
                options={templateGroups.map(g => ({ 
                  label: (
                    <Space>
                      <span style={{ fontWeight: 500 }}>{g.name}</span>
                      {g.isDefault && <Tag color="blue" style={{ fontSize: 9, borderRadius: 4 }}>MẶC ĐỊNH</Tag>}
                    </Space>
                  ), 
                  value: g.id 
                }))}
              />
              <Dropdown overlay={
                <Menu>
                  <Menu.Item key="edit" icon={<EditOutlined />} disabled={!currentTemplateId} onClick={() => { setEditingGroup(templateGroups.find(g => g.id === currentTemplateId) || null); setIsGroupModalOpen(true); }}>Đổi tên</Menu.Item>
                  <Menu.Item key="delete" icon={<DeleteOutlined />} danger disabled={!currentTemplateId} onClick={() => { if (currentTemplateId) handleDeleteGroup(currentTemplateId); }}>Xóa nhóm</Menu.Item>
                </Menu>
              }>
                <Button icon={<SettingOutlined />} disabled={!currentTemplateId} style={{ borderRadius: 8, height: 32 }} />
              </Dropdown>
              <Tooltip title="Thêm Nhóm bản mẫu mới">
                <Button 
                  icon={<PlusOutlined />} 
                  onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }} 
                  style={{ 
                    borderRadius: 8, 
                    height: 32, 
                    width: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#eff6ff',
                    borderColor: '#dbeafe',
                    color: '#2563eb',
                    padding: 0
                  }} 
                />
              </Tooltip>
            </Space>

            <Space size={8}>
              <Segmented 
                options={[
                  { label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> },
                  { label: 'Lịch', value: 'calendar', icon: <CalendarOutlined /> }
                ]} 
                value={templateViewMode}
                onChange={(val) => setTemplateViewMode(val as any)}
              />
              <Divider type="vertical" style={{ height: 24 }} />
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={() => { setEditingShift(null); shiftForm.resetFields(); setIsShiftModalOpen(true); }} 
                style={{ 
                  borderRadius: 8, 
                  fontWeight: 600, 
                  height: 32, 
                  padding: '4px 16px', 
                  borderColor: 'var(--primary-color)',
                  color: 'var(--primary-color)'
                }}
              >
                Thêm Ca
              </Button>
            </Space>
          </div>
          {templateViewMode === 'calendar' ? renderTemplateWeeklyView() : (
            <>
              {templates.length === 0 ? (
                  <Card className="hifi-border" style={{ textAlign: 'center', padding: '60px 0', borderStyle: 'dashed', borderRadius: 8 }}>
                    <InboxOutlined style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
                    <div><Text type="secondary" style={{ fontSize: 16 }}>Chưa có bản mẫu Ca trực nào trong nhóm này.</Text></div>
                    <Button 
                      type="default" 
                      icon={<PlusOutlined />} 
                      style={{ 
                        marginTop: 24, 
                        borderRadius: 8, 
                        borderColor: 'var(--primary-color)',
                        color: 'var(--primary-color)',
                        fontWeight: 600,
                        padding: '0 24px',
                        height: 40
                      }} 
                      onClick={() => { setEditingShift(null); setIsShiftModalOpen(true); }}
                    >
                      Bắt đầu tạo Ca đầu tiên
                    </Button>
                  </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {templates.map(s => (
                    <Card 
                      key={s.id} 
                      className="hifi-border hifi-shift-card" 
                      style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }} 
                      title={
                        <Space size="middle">
                          <Text strong style={{ fontSize: '16px', color: '#1e293b' }}>{s.name}</Text>
                          <Tag color="red-outline" style={{ borderRadius: 6, fontWeight: 700, padding: '0 8px', height: 24, lineHeight: '22px', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {s.startTime} - {s.endTime}
                          </Tag>
                          {s.daysOfWeek && s.daysOfWeek.length < 7 && (
                            <Tag color="processing" style={{ borderRadius: 6, padding: '0 8px', height: 24, lineHeight: '22px', fontSize: '12px' }}>
                              {formatDaysCompact(s.daysOfWeek)}
                            </Tag>
                          )}
                        </Space>
                      } 
                      extra={
                        <Space>
                          <Button shape="circle" icon={<EditOutlined />} style={{ color: 'var(--primary-color)' }} onClick={() => { setEditingShift(s); setIsShiftModalOpen(true); }} />
                          <Popconfirm title="Xác nhận xóa bản mẫu Ca?" description="Các kíp trực thuộc ca này cũng sẽ mất vĩnh viễn." onConfirm={() => handleDeleteShift(s.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                            <Button shape="circle" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kíp trực thành phần</Text>
                        <Button 
                          type="default" 
                          icon={<PlusOutlined />} 
                          style={{ 
                            fontWeight: 600, 
                            color: 'var(--primary-color)', 
                            fontSize: 11,
                            height: 28,
                            borderRadius: 6,
                            borderColor: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center'
                          }} 
                          onClick={() => { setEditingKip({ shiftId: s.id }); setIsKipModalOpen(true); }}
                        >
                          Thêm Kíp
                        </Button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {s.kips.length === 0 ? (
                          <div style={{ padding: '24px', borderRadius: 12, border: '1px dashed #e2e8f0', textAlign: 'center', background: '#fcfcfc' }}>
                            <InboxOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8 }} />
                            <div><Text type="secondary" style={{ fontStyle: 'italic', fontSize: '13px' }}>Chưa có kíp nào trong bản mẫu này.</Text></div>
                            <Button 
                              type="default" 
                              style={{ 
                                marginTop: 8, 
                                borderRadius: 6, 
                                color: 'var(--primary-color)', 
                                borderColor: 'var(--primary-color)',
                                fontWeight: 600
                              }} 
                              onClick={() => { setEditingKip({ shiftId: s.id }); setIsKipModalOpen(true); }}
                            >
                              Thêm kíp ngay
                            </Button>
                          </div>
                        ) : (
                          <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
                            {s.kips.map((k, idx) => (
                              <div 
                                key={k.id} 
                                style={{ 
                                  padding: '10px 16px', 
                                  background: '#fff', 
                                  borderBottom: idx === s.kips.length - 1 ? 'none' : '1px solid #f1f5f9', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  transition: 'all 0.2s'
                                }} 
                                className="kip-item-row-refined"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                                  <div style={{ width: 3, height: 16, borderRadius: 2, background: 'var(--primary-color)', opacity: 0.3 }} />
                                  
                                  {/* GROUP 1: NAME & TIME */}
                                  <div style={{ width: '30%', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Text strong style={{ color: '#1e293b', fontSize: '14px', whiteSpace: 'nowrap' }}>{k.name}</Text>
                                    {(k.startTime || k.endTime) && (
                                      <Tag color="default" style={{ fontSize: '11px', borderRadius: 4, background: '#f1f5f9', border: 'none', color: '#64748b', margin: 0 }}>
                                        {k.startTime || '??:??'} - {k.endTime || '??:??'}
                                      </Tag>
                                    )}
                                  </div>

                                  {/* GROUP 2: CAPACITY & DAYS */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, color: '#64748b' }}>
                                    <Space size={6}>
                                      <UserOutlined style={{ fontSize: 12, opacity: 0.7 }} />
                                      <Text style={{ fontSize: '13px' }}>{k.capacity} người</Text>
                                    </Space>
                                    
                                    <div style={{ width: 1, height: 14, background: '#e2e8f0' }} />
                                    
                                    <Space size={6}>
                                      <CalendarOutlined style={{ fontSize: 12, opacity: 0.7 }} />
                                      <Tooltip title={JSON.stringify(k.daysOfWeek?.sort()) === JSON.stringify(s.daysOfWeek?.sort()) ? "Sử dụng toàn bộ các ngày của Ca trực" : "Lịch trực riêng"}>
                                        <Text style={{ fontSize: '13px' }}>
                                          {formatDaysCompact(k.daysOfWeek)}
                                          {JSON.stringify(k.daysOfWeek?.sort()) === JSON.stringify(s.daysOfWeek?.sort()) && (
                                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4, opacity: 0.6 }}>(Theo Ca)</Text>
                                          )}
                                        </Text>
                                      </Tooltip>
                                    </Space>
                                  </div>
                                </div>

                                {/* GROUP 3: ORDER & ACTIONS */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                  {k.order !== undefined && k.order > 0 && (
                                    <Text style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>#{k.order}</Text>
                                  )}
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <Tooltip title="Chỉnh sửa"><Button type="text" shape="circle" icon={<EditOutlined />} style={{ color: '#94a3b8' }} onClick={() => { setEditingKip(k); setIsKipModalOpen(true); }} /></Tooltip>
                                    <Tooltip title="Xóa"><Button type="text" shape="circle" danger icon={<DeleteOutlined />} style={{ opacity: 0.6 }} onClick={() => handleDeleteKip(k.id)} /></Tooltip>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    },
    {
      key: '5',
      label: <span><SettingOutlined /> Cấu hình hệ thống</span>,
      children: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0 }}>Cấu hình Hệ thống</Title>
            <Tooltip title="Các thiết lập này ảnh hưởng đến toàn bộ quy trình đăng ký, mở đợt và đổi kíp trực.">
              <QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
            </Tooltip>
          </div>

          <Form form={settingsForm} layout="vertical" onFinish={handleUpdateSettings}>
            <Row gutter={[32, 24]}>
              <Col xs={24} md={12}>
                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>Giới hạn số kíp đăng ký/tuần</span>
                    <Form.Item name="weeklyLimitEnabled" valuePropName="checked" noStyle>
                      <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                    </Form.Item>
                  </div>
                  <Form.Item 
                    noStyle 
                    shouldUpdate={(prev, curr) => prev.weeklyLimitEnabled !== curr.weeklyLimitEnabled}
                  >
                    {({ getFieldValue }) => (
                      getFieldValue('weeklyLimitEnabled') ? (
                        <Form.Item name="weeklyKipLimit" noStyle rules={[{ required: true, message: 'Vui lòng nhập số kíp' }]}>
                          <InputNumber 
                            min={1} 
                            placeholder="Ví dụ: 2" 
                            style={{ width: '100%' }} 
                            addonAfter="kíp / tuần"
                          />
                        </Form.Item>
                      ) : (
                        <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f1f5f9', borderRadius: 8, color: '#64748b', fontSize: 13 }}>
                          <StopOutlined style={{ marginRight: 8, fontSize: 12 }} /> Không giới hạn (Unset)
                        </div>
                      )
                    )}
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>Chính sách Hủy kíp</span>
                    <Tooltip 
                      color="white"
                      overlayInnerStyle={{ color: '#1e293b', padding: '12px', borderRadius: 8 }}
                      title={
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ color: '#166534' }}>● Chế độ Chặt chẽ (Tắt):</Text><br/>
                            Khi kíp đã FULL, thành viên không thể tự hủy. Giúp đảm bảo quân số trực ổn định.
                          </div>
                          <div>
                            <Text strong style={{ color: '#9a3412' }}>● Chế độ Linh hoạt (Bật):</Text><br/>
                            Cho phép tự hủy tự do. Rủi ro thiếu hụt nhân sự phút chót.
                          </div>
                        </div>
                      }
                    >
                      <QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
                    </Tooltip>
                  </div>
                  <Form.Item name="allowUnregisterWhenFull" valuePropName="checked" noStyle>
                    <Checkbox>Cho phép tự hủy đăng ký ngay cả khi kíp đã FULL</Checkbox>
                  </Form.Item>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '32px 0' }} />

            <Alert
              message={<span style={{ fontWeight: 600, fontSize: 14 }}>Hướng dẫn Cấu hình Hệ thống</span>}
              description={
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: 'var(--primary-color)' }}>1. Giới hạn tuần:</Text> 
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      Dùng để kiểm soát khối lượng công việc của từng thành viên. Khi đạt giới hạn, người dùng sẽ nhận được cảnh báo và không thể đăng ký thêm vào kíp trống.
                    </Text>
                  </div>
                  <div>
                    <Text strong style={{ color: 'var(--primary-color)' }}>2. Chính sách Hủy kíp:</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      Chế độ <b>"Chặt chẽ"</b> ngăn thành viên tự rút tên khỏi kíp đã đủ người (Full). Chế độ <b>"Linh hoạt"</b> cho phép hủy tự do nhưng rủi ro thiếu hụt nhân sự.
                    </Text>
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 32, borderRadius: 8, padding: '16px 20px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="default" 
                htmlType="submit" 
                loading={settingsLoading} 
                icon={<SettingOutlined />} 
                style={{ 
                  borderRadius: 8, 
                  padding: '0 24px', 
                  fontWeight: 600,
                  borderColor: 'var(--primary-color)',
                  color: 'var(--primary-color)',
                  height: 40
                }}
              >
                Lưu cấu hình
              </Button>
            </div>
          </Form>
        </div>
      )
    }
  ];

  return (
    <div className="duty-management-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space size={12}>
          <Title level={4} style={{ margin: 0, fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px', color: '#1e293b' }}>
            Thiết lập lịch trực
          </Title>
          <Tag color="blue" bordered={false} style={{ borderRadius: 6, fontWeight: 500 }}>Admin</Tag>
        </Space>
        <Button
          type="default"
          icon={<QuestionCircleOutlined />}
          onClick={() => setIsGuideModalOpen(true)}
          style={{ 
            borderRadius: 8, 
            display: 'flex', 
            alignItems: 'center', 
            fontWeight: 500,
            height: 32
          }}
        >
          Hướng dẫn
        </Button>
      </div>

      <div className="management-content-wrapper" style={{ background: '#fff', padding: '16px', borderRadius: 16,  boxShadow: '0 4px 20px -10px rgba(0,0,0,0.03)' }}>
        {renderTabSwitcher()}
        <div style={{ marginTop: 0 }}>
          {tabItems.find(t => t.key === activeTab)?.children}
        </div>
      </div>

      <GroupModal
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        onSuccess={fetchGroups}
        editingGroup={editingGroup}
        onSubmit={handleSubmitGroup}
        loading={loading}
      />

      <ShiftTemplateModal
        open={isShiftModalOpen}
        onCancel={() => setIsShiftModalOpen(false)}
        editingShift={editingShift}
        groupId={currentTemplateId}
        onSuccess={fetchTemplates}
      />

      <KipModal
        open={isKipModalOpen}
        onCancel={() => setIsKipModalOpen(false)}
        onSuccess={fetchTemplates}
        editingKip={editingKip}
        parentShift={currentParentShift}
        onSubmit={handleCreateKip}
        loading={loading}
      />

      <AdminDutySlotModal
        open={isSlotEditModalOpen}
        onCancel={() => setIsSlotEditModalOpen(false)}
        onSuccess={fetchSlots}
        slot={editingSlot}
        templates={templates}
        loading={loading}
      />


      <Modal
        title={
          <Space>
            <div style={{ width: 4, height: 18, background: 'var(--primary-color)', borderRadius: 2 }} />
            <span>Hướng dẫn Quản lý Lịch trực</span>
          </Space>
        }
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Button key="close" type="default" onClick={() => setIsGuideModalOpen(false)} style={{ minWidth: 120, borderColor: 'var(--primary-color)', color: 'var(--primary-color)', fontWeight: 600 }}>Đã hiểu</Button>
          </div>
        ]}
        width={600}
        className="premium-modal"
      >
        <div style={{ padding: '8px 4px' }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>Quy trình vận hành 3 bước:</Text>
          <ul style={{ paddingLeft: 20, color: '#475569' }}>
            <li style={{ marginBottom: 12 }}>
              <Text strong>1. Thiết lập Bản mẫu:</Text> Định nghĩa các Ca (Sáng/Chiều/Tối) và các Kíp trực (Kíp 1, Kíp 2...) với khung giờ và số người (chỉ tiêu) cố định.
            </li>
            <li style={{ marginBottom: 12 }}>
              <Text strong>2. Lập lịch Hàng loạt:</Text> Dựa trên bản mẫu, hệ thống sẽ tự động tạo ra các "Slot" trực cho cả tuần hoặc tháng chỉ với vài click.
            </li>
            <li style={{ marginBottom: 12 }}>
              <Text strong>3. Điều phối & Phê duyệt:</Text> Bạn có thể chỉnh sửa thủ công từng kíp trực lẻ hoặc phê duyệt các đơn xin nghỉ của thành viên.
            </li>
          </ul>
          <Alert
            message="Công nghệ Snapshot-Independent"
            description="Sau khi dập khuôn, lịch trực sẽ được lưu dưới dạng các bản ghi vật lý độc lập. Việc xóa hay sửa bản mẫu sau đó sẽ không làm mất dữ liệu lịch đã tạo."
            type="info"
            showIcon
            style={{ marginTop: 16, borderRadius: 12 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DutyManagement;
