import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Divider, Alert, DatePicker, Row, Col, Tooltip, Tag, Checkbox, Badge, Popconfirm, Dropdown, Menu, Tabs, Segmented, Switch } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ScheduleOutlined, SettingOutlined,
  InboxOutlined,
  LeftOutlined, RightOutlined, LayoutOutlined,
  QuestionCircleOutlined,
  LockOutlined, UnlockOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined, PlusSquareOutlined, InfoCircleOutlined,
  DownOutlined, UnorderedListOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import dutyService, { DutyShift } from '@/services/duty.service';
import DataTable from '@/components/common/DataTable';
import StatisticsCard from '@/components/common/StatisticsCard';
import ShiftTemplateModal from './components/ShiftTemplateModal';
import GroupModal from './components/GroupModal';
import KipModal from './components/KipModal';
import DutySlotModal from './components/DutySlotModal';
import './DutyCalendar.less';

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

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => slotFilterWeek.add(i, 'day')),
    [slotFilterWeek]
  );

  useEffect(() => {
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
    setSlotLoading(true);
    try {
      const res = await dutyService.getWeeklySchedule(slotFilterWeek.format('YYYY-MM-DD'));
      if (res.success && res.data) setSlots(res.data.slots || []);
    } catch (err) { message.error('Lỗi tải danh sách ca'); }
    finally { setSlotLoading(false); }
  };

  const currentDaySlots = useMemo(() => {
    if (!selectedDate) return slots;
    return slots.filter(s => dayjs(s.shiftDate).isSame(selectedDate, 'day'));
  }, [slots, selectedDate]);

  const dailyStats = useMemo(() => ({
    total: currentDaySlots.length,
    locked: currentDaySlots.filter(s => s.status === 'locked').length,
    open: currentDaySlots.filter(s => s.status === 'open').length,
    personnel: currentDaySlots.reduce((acc, s) => acc + (s.capacity || s.kip?.capacity || 0), 0)
  }), [currentDaySlots]);

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
    } catch (err) { message.error('Lỗi khi lưu'); }
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
                  return shDays.includes(dayOfWeek);
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
                    }, []).map((shift: any, sIdx: number) => (
                      <div
                        key={`shift-bg-${shift.id}-${sIdx}`}
                        className="calendar-shift-box"
                        style={{
                          top: `${getTimeTop(shift.startTime)}px`,
                          height: `${getTimeHeight(shift.startTime, shift.endTime)}px`,
                          opacity: previewDay ? (isSelected ? 1 : 0.3) : 0.15,
                          cursor: 'default'
                        }}
                      >
                        <div className="shift-tag">{shift.name}</div>
                      </div>
                    ))}

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
                  }, []).map((shift: any, sIdx: number) => (
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
                      <div className="shift-tag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{shift.name}</span>
                      </div>
                    </div>
                  ))}

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
    { key: '3', label: <span><LayoutOutlined /> Cấu hình Bản mẫu</span> },
    { key: '5', label: <span><SettingOutlined /> Cài đặt chung</span> },
  ];

  const renderTabSwitcher = () => (
    <div className="tab-switcher-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="hifi-tabs-management"
        items={tabList.map(t => ({ 
          ...t, 
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{t.label}</span> 
        }))}
      />
    </div>
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
                      value={slotFilterWeek}
                      allowClear={false}
                      bordered={false}
                      onChange={(val) => val && setSlotFilterWeek(val.startOf('isoWeek' as any))}
                      format="[Tuần] ww"
                      style={{ width: 85, fontWeight: 700, padding: 0 }}
                    />
                    <Button icon={<RightOutlined />} size="small" type="text" onClick={() => setSlotFilterWeek(slotFilterWeek.add(1, 'week'))} />
                    <Divider type="vertical" />
                    <Button
                      size="small"
                      type="text"
                      style={{
                        fontSize: '13px',
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

                        {isToday && (
                          <div style={{
                            position: 'absolute',
                            bottom: -4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 12,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? 'var(--primary-color)' : '#ef4444',
                          }} />
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
            <Button type="primary" icon={<PlusOutlined />} className="hifi-button" onClick={() => {
              manualSlotForm.setFieldsValue({ date: selectedDate || dayjs() });
              setActiveTab('2');
              message.info('Vui lòng thêm ca tại phần "Thêm Ca đơn lẻ" phía dưới');
            }}>Thêm ca</Button>
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
                      shape="circle"
                      icon={r.status === 'locked' ? <LockOutlined /> : <UnlockOutlined />}
                      onClick={() => toggleSlotStatus(r)}
                    />
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
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
                    <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ margin: 0 }}>Lập lịch Hàng loạt</Title>
                <Tooltip title="Tiện ích hỗ trợ tạo tự động toàn bộ Khung trực cho một khoảng thời gian dài dựa trên Bản mẫu.">
                  <QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
                </Tooltip>
              </div>
            </div>
            {!isReviewMode ? (
              <Form form={coordinationForm} layout="vertical" onFinish={async (v) => {
                const [start, end] = v.range;
                const genTemplateId = v.templateId;
                const genMode = v.mode || 'kips';
                const proceedPreview = async (targetTemplates: any[]) => {
                  const days = [];
                  let curr = dayjs(start);
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
              }}>
                <Row gutter={[24, 16]}>
                  <Col span={10}><Form.Item name="range" label="Khoảng ngày áp dụng" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100%', borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={7}><Form.Item name="templateId" label="Sử dụng Bản mẫu" tooltip="Để trống để tự động áp dụng theo Giai đoạn (nếu đã gắn Bản mẫu)"><Select allowClear placeholder="Theo Giai đoạn (Automatic)" options={templateGroups.map(g => ({ label: g.isDefault ? `${g.name} (Mặc định)` : g.name, value: g.id }))} style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={7}><Form.Item name="mode" label="Chế độ khởi tạo" initialValue="kips"><Select options={[{ label: 'Chỉ mình Ca (Shifts only)', value: 'shifts' }, { label: 'Chỉ mình Kíp (Kips only)', value: 'kips' }, { label: 'Cả 2 (Both)', value: 'all' }]} style={{ borderRadius: 8 }} /></Form.Item></Col>
                </Row>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Space>
                    <Button danger icon={<DeleteOutlined />} onClick={() => { const r = coordinationForm.getFieldValue('range'); if (r) { Modal.confirm({ title: 'Xóa toàn bộ Khung trực?', content: 'Hành động này sẽ xóa sạch tất cả Ca & Kíp trực trong khoảng thời gian đã chọn.', okText: 'Xóa ngay', okType: 'danger', cancelText: 'Hủy', onOk: () => dutyService.deleteRangeSlots(r[0].format('YYYY-MM-DD'), r[1].format('YYYY-MM-DD')).then(() => { message.success('Đã xóa vùng chọn'); fetchSlots(); }) }); } }}>Xóa vùng chọn</Button>
                    <Button type="primary" htmlType="submit" icon={<ScheduleOutlined />} style={{ borderRadius: 8 }}>Xem trước Lịch trực</Button>
                  </Space>
                </div>
              </Form>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space><Button onClick={() => setIsReviewMode(false)} icon={<LeftOutlined />}>Quay lại thiết lập</Button><Text type="secondary" style={{ fontSize: 13 }}>Có <Text strong>{previewDates.filter((x: any) => x.isSelected).length}</Text> ngày được chọn</Text></Space>
                  <Space>
                    <Segmented options={[{ label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> }, { label: 'Lịch tuần', value: 'week', icon: <CalendarOutlined /> }]} value={previewViewMode} onChange={(v) => { setPreviewViewMode(v as any); setPreviewWeekOffset(0); }} style={{ borderRadius: 8 }} />
                    <Button type="primary" loading={loading} icon={<ScheduleOutlined />} style={{ borderRadius: 8 }} onClick={async () => {
                      setLoading(true); try {
                        const range = coordinationForm.getFieldValue('range');
                        const genTemplateId = coordinationForm.getFieldValue('templateId') || currentTemplateId;
                        const genMode = coordinationForm.getFieldValue('mode') || 'kips';
                        const res = await dutyService.generateRangeSlots(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'), genTemplateId, genMode);
                        if (res.success) { message.success('Xác nhận tạo lịch thành công!'); setIsReviewMode(false); fetchSlots(); }
                      } catch (e) { message.error('Lỗi khi lập lịch'); } finally { setLoading(false); }
                    }}>Xác nhận tạo {previewDates.filter((x: any) => x.isSelected).length} ngày</Button>
                  </Space>
                </div>
                {previewViewMode === 'week' ? renderBulkPreviewCalendar() : (
                  <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    {previewDates.map((d: any, i: number) => (
                      <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: d.isSelected ? 'rgba(5, 150, 105, 0.03)' : undefined }}>
                        <Checkbox checked={d.isSelected} onChange={e => { const n = [...previewDates]; n[i].isSelected = e.target.checked; setPreviewDates(n); }}>
                          <Space>
                            <CalendarOutlined style={{ color: '#64748b' }} />
                            <Text strong style={{ color: '#1e293b' }}>{d.date.format('DD/MM/YYYY')}</Text>
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>({d.date.locale('vi').format('dddd')})</span>
                          </Space>
                        </Checkbox>
                        <Space>
                          {d.kips.filter((x: any) => x.isShift).length > 0 && <Tag color="blue" style={{ borderRadius: 6 }}>{d.kips.filter((x: any) => x.isShift).length} Ca</Tag>}
                          {d.kips.filter((x: any) => !x.isShift).length > 0 && <Tag color="cyan" style={{ borderRadius: 6 }}>{d.kips.filter((x: any) => !x.isShift).length} Kíp</Tag>}
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Divider style={{ margin: '32px 0', borderColor: '#e2e8f0', opacity: 0.6 }} />
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Title level={4} style={{ margin: 0 }}>Thêm Khung trực Đơn lẻ</Title>
                 <Tooltip title="Tạo một Ca hoặc Kíp phát sinh tùy chỉnh độc lập mà không cần dùng Bản mẫu.">
                   <QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
                 </Tooltip>
               </div>
             </div>
            <Form form={manualSlotForm} layout="vertical" onFinish={async (v) => {
              try {
                const s = templates.find(x => x.id === v.shiftId);
                const k = s?.kips.find(x => x.id === v.kipId);
                const res = await dutyService.createSlot({
                  shiftDate: v.date.format('YYYY-MM-DD'),
                  shiftLabel: v.shiftLabel || (k ? `${s?.name} - Kíp ${k?.order}` : s?.name || 'Kíp trực lẻ'),
                  startTime: v.timeRange?.[0]?.format('HH:mm') || k?.startTime || s?.startTime,
                  endTime: v.timeRange?.[1]?.format('HH:mm') || k?.endTime || s?.endTime,
                  order: v.order || k?.order || s?.order,
                  endPeriod: v.endPeriod || k?.endPeriod,
                  capacity: v.capacity || k?.capacity || 1,
                  kipId: k?.id,
                  shiftId: s?.id,
                  status: v.status || 'open'
                });
                if (res.success) { message.success('Đã thêm kíp trực mới'); manualSlotForm.resetFields(); fetchSlots(); }
              } catch (err) { message.error('Lỗi khi thêm ca lẻ'); }
            }} initialValues={{ status: 'open' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <Row gutter={[24, 16]}>
                  <Col span={6}><Form.Item name="date" label="Ngày trực" rules={[{ required: true }]}><DatePicker style={{ width: '100%', borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={18}>
                    <Form.Item name="templateSelection" label="Chọn Mẫu khung trực" rules={[{ required: true }]}>
                      <Select placeholder="Chọn mẫu Ca hoặc Kíp trực..." showSearch optionFilterProp="label" style={{ borderRadius: 8 }} onChange={(val: string) => {
                          const [type, id] = val.split(':'); const sId = Number(id);
                          if (type === 'shift') {
                            const s = templates.find(x => x.id === sId);
                            if (s) {
                              const targetDate = manualSlotForm.getFieldValue('date');
                              let nextOrder = s.order || 1;
                              if (targetDate) {
                                const dateStr = targetDate.format('YYYY-MM-DD');
                                const daySlots = slots.filter(sl => dayjs(sl.shiftDate).format('YYYY-MM-DD') === dateStr && String(sl.shiftId) === String(s.id));
                                if (daySlots.length > 0) { const maxOrder = Math.max(...daySlots.map(sl => sl.order || 0)); nextOrder = maxOrder + 1; }
                              }
                              manualSlotForm.setFieldsValue({ shiftId: s.id, kipId: undefined, shiftLabel: `${s.name} - Kíp ${nextOrder}`, timeRange: [dayjs(s.startTime, 'HH:mm'), dayjs(s.endTime, 'HH:mm')], order: nextOrder });
                            }
                          } else {
                            let foundKip: any = null; let parentShift: any = null;
                            for (const s of templates) { const k = s.kips?.find(x => x.id === sId); if (k) { foundKip = k; parentShift = s; break; } }
                            if (foundKip && parentShift) {
                              manualSlotForm.setFieldsValue({ shiftId: parentShift.id, kipId: foundKip.id, shiftLabel: `${parentShift.name} - Kíp ${foundKip.order}`, timeRange: foundKip.startTime && foundKip.endTime ? [dayjs(foundKip.startTime, 'HH:mm'), dayjs(foundKip.endTime, 'HH:mm')] : [dayjs(parentShift.startTime, 'HH:mm'), dayjs(parentShift.endTime, 'HH:mm')], order: foundKip.order, endPeriod: foundKip.endPeriod, capacity: foundKip.capacity });
                            }
                          }
                        }} options={[...templates.map(s => ({ label: `Ca: ${s.name} (${s.startTime}-${s.endTime})`, value: `shift:${s.id}`, group: 'Cấu hình Ca' })), ...templates.flatMap(s => (s.kips || []).map(k => ({ label: `${s.name} - ${k.name} (${k.startTime || s.startTime}-${k.endTime || s.endTime})`, value: `kip:${k.id}`, group: 'Cấu hình Kíp' })))]} />
                    </Form.Item>
                    <Form.Item name="shiftId" noStyle><Input type="hidden" /></Form.Item>
                    <Form.Item name="kipId" noStyle><Input type="hidden" /></Form.Item>
                  </Col>
                </Row>
                <Row gutter={[24, 16]}>
                  <Col span={10}><Form.Item name="shiftLabel" label="Tiêu đề hiển thị" rules={[{ required: true }]}><Input prefix={<EditOutlined style={{ color: 'var(--primary-color)' }} />} placeholder="VD: Ca Sáng - Kíp 1" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={14}><Form.Item name="timeRange" label="Khoảng thời gian (Thực tế)" rules={[{ required: true }]}><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ', borderRadius: 8 }} /></Form.Item></Col>
                </Row>
              </div>
              <div style={{ marginTop: 8 }}>
                <Button type="primary" htmlType="submit" icon={<PlusSquareOutlined />} style={{ borderRadius: 8 }}>Tạo kíp trực và đưa lên lịch</Button>
                <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}><InfoCircleOutlined style={{ marginRight: 6 }} /> Lưu ý: Ca trực lẻ này sẽ tạo ra bản sao độc lập, không ảnh hưởng bởi thay đổi bản mẫu gốc sau này.</div>
              </div>
            </Form>
          </div>
        </div>
      )
    },
    {
      key: '3',
      label: <span><LayoutOutlined /> Cấu hình Bản mẫu</span>,
      children: (
        <div className="templates-tab">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Bản mẫu Ca & Kíp</Title>
                <Tooltip title="Cấu hình khung giờ cố định cho nhóm đã chọn">
                  <QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
                </Tooltip>
              </div>
              <Space size="middle" wrap>
                <Select
                  style={{ width: 280 }}
                  value={currentTemplateId}
                  onChange={setCurrentTemplateId}
                  placeholder="Chọn nhóm bản mẫu..."
                  className="premium-select"
                  options={templateGroups.map(g => ({ 
                    label: (
                      <Space>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{g.name}</span>
                        {g.isDefault && <Tag color="gold" style={{ fontSize: '10px', height: '18px', lineHeight: '18px', border: 'none', borderRadius: 4, fontWeight: 700 }}>MẶC ĐỊNH</Tag>}
                      </Space>
                    ), 
                    value: g.id 
                  }))}
                />
                <Dropdown overlay={
                  <Menu>
                    <Menu.Item key="edit" icon={<EditOutlined />} disabled={!currentTemplateId} onClick={() => { setEditingGroup(templateGroups.find(g => g.id === currentTemplateId) || null); setIsGroupModalOpen(true); }}>Sửa nhóm đang chọn</Menu.Item>
                    <Menu.Item key="delete" icon={<DeleteOutlined />} danger disabled={!currentTemplateId} onClick={() => { if (currentTemplateId) handleDeleteGroup(currentTemplateId); }}>Xóa nhóm đang chọn</Menu.Item>
                  </Menu>
                }>
                  <Button icon={<SettingOutlined />} disabled={!currentTemplateId} style={{ borderRadius: 8 }}>Thiết lập nhóm <DownOutlined /></Button>
                </Dropdown>
                <Divider type="vertical" style={{ height: 24 }} />
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }} style={{ borderRadius: 8 }}>Thêm nhóm mới</Button>
              </Space>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
              <Button
                type="primary"
                icon={<ScheduleOutlined />}
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={() => {
                  coordinationForm.setFieldsValue({ templateId: currentTemplateId });
                  setActiveTab('2');
                }}
                disabled={!currentTemplateId}
              >
                Áp dụng sang Điều phối & Lập lịch
              </Button>
              <Space>
                <Segmented 
                  options={[
                    { label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> },
                    { label: 'Lịch tuần', value: 'calendar', icon: <CalendarOutlined /> }
                  ]} 
                  value={templateViewMode}
                  onChange={(val) => setTemplateViewMode(val as any)}
                  style={{ borderRadius: 8 }}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingShift(null); shiftForm.resetFields(); setIsShiftModalOpen(true); }} style={{ borderRadius: 8 }}>Thêm Ca mới</Button>
              </Space>
            </div>
          </div>
          <Divider style={{ marginTop: 0, marginBottom: 24, borderColor: '#e2e8f0', opacity: 0.6 }} />
          {templateViewMode === 'calendar' ? renderTemplateWeeklyView() : (
            <>
              {templates.length === 0 ? (
                <Card className="hifi-border" style={{ textAlign: 'center', padding: '60px 0', borderStyle: 'dashed', borderRadius: 8 }}>
                  <InboxOutlined style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
                  <div><Text type="secondary" style={{ fontSize: 16 }}>Chưa có bản mẫu Ca trực nào trong nhóm này.</Text></div>
                  <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 24, borderRadius: 8 }} onClick={() => { setEditingShift(null); setIsShiftModalOpen(true); }}>Bắt đầu tạo Ca đầu tiên</Button>
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
                          <Text strong style={{ fontSize: '18px', color: '#1e293b' }}>{s.name}</Text>
                          <Tag color="red-outline" style={{ borderRadius: 6, fontWeight: 700, padding: '0 8px', height: 24, lineHeight: '22px', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {s.startTime} - {s.endTime}
                          </Tag>
                          {s.daysOfWeek && s.daysOfWeek.length < 7 && (
                            <Tag color="processing" style={{ borderRadius: 6, padding: '0 8px', height: 24, lineHeight: '22px', fontSize: '12px' }}>
                              {s.daysOfWeek.map((d: number) => ['T2','T3','T4','T5','T6','T7','CN'][d]).join(', ')}
                            </Tag>
                          )}
                        </Space>
                      } 
                      extra={
                        <Space>
                          <Button size="small" shape="circle" icon={<EditOutlined />} style={{ color: 'var(--primary-color)' }} onClick={() => { setEditingShift(s); setIsShiftModalOpen(true); }} />
                          <Popconfirm title="Xác nhận xóa bản mẫu Ca?" description="Các kíp trực thuộc ca này cũng sẽ mất vĩnh viễn." onConfirm={() => handleDeleteShift(s.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                            <Button size="small" shape="circle" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text strong style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Kíp trực thành phần</Text>
                        <Button type="link" size="small" icon={<PlusOutlined />} style={{ fontWeight: 600, color: 'var(--primary-color)' }} onClick={() => { setEditingKip({ shiftId: s.id }); setIsKipModalOpen(true); }}>Thêm Kíp</Button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {s.kips.length === 0 ? (
                          <div style={{ padding: '16px', borderRadius: 12, border: '1px dashed #e2e8f0', textAlign: 'center' }}>
                            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '13px' }}>Chưa có kíp nào. Hãy nhấp "Thêm Kíp" để bắt đầu.</Text>
                          </div>
                        ) : s.kips.map(k => (
                          <div key={k.id} style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="kip-item-row-hover">
                            <Space size="middle">
                               <div style={{ width: 4, height: 32, borderRadius: 2, background: 'var(--primary-color)', opacity: 0.4 }} />
                               <div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                   <Text strong style={{ color: '#1e293b', fontSize: '15px' }}>{k.name}</Text>
                                   {(k.startTime || k.endTime) && (
                                     <Tag color="cyan" style={{ fontSize: '11px', fontWeight: 700, borderRadius: 6 }}>Giờ riêng: {k.startTime || '??:??'} - {k.endTime || '??:??'}</Tag>
                                   )}
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                                   <Text type="secondary" style={{ fontSize: '12px' }}>Tiết: <Text strong style={{ color: '#475569' }}>{k.order} {k.endPeriod ? ` - ${k.endPeriod}` : ''}</Text></Text>
                                   <Divider type="vertical" />
                                   <Text type="secondary" style={{ fontSize: '12px' }}>Chỉ tiêu: <Text strong style={{ color: 'var(--primary-color)' }}>{k.capacity}</Text> người</Text>
                                   {k.daysOfWeek && k.daysOfWeek.length < 7 && (
                                     <><Divider type="vertical" /><Text type="secondary" style={{ fontSize: '12px' }}>Ngày: <Text strong style={{ color: 'var(--primary-color)' }}>{k.daysOfWeek.map((d: number) => ['T2','T3','T4','T5','T6','T7','CN'][d]).join(', ')}</Text></Text></>
                                   )}
                                 </div>
                               </div>
                            </Space>
                            <Space>
                              <Tooltip title="Sửa kíp"><Button size="small" type="text" shape="circle" icon={<EditOutlined />} onClick={() => { setEditingKip(k); setIsKipModalOpen(true); }} /></Tooltip>
                              <Tooltip title="Xóa kíp"><Button size="small" type="text" shape="circle" danger icon={<DeleteOutlined />} onClick={() => handleDeleteKip(k.id)} /></Tooltip>
                            </Space>
                          </div>
                        ))}
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
      label: <span><SettingOutlined /> Cài đặt chung</span>,
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
                            style={{ width: '100%', height: 40 }} 
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
                  <Form.Item 
                    label={<span style={{ fontWeight: 600, color: '#1e293b' }}>Chính sách Hủy kíp</span>} 
                    name="allowUnregisterWhenFull" 
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox>
                      Cho phép <b>tự hủy</b> đăng ký khi kíp đã đủ người (Full slot)
                    </Checkbox>
                  </Form.Item>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '32px 0' }} />

            <Alert
              message={<span style={{ fontWeight: 600, fontSize: 14 }}>Hướng dẫn Cấu hình</span>}
              description={
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: 'var(--primary-color)' }}>1. Giới hạn tuần:</Text> 
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      Dùng để kiểm soát khối lượng công việc của từng thành viên. Khi đạt giới hạn, người dùng sẽ nhận được cảnh báo và không thể đăng ký thêm vào kíp trống.
                    </Text>
                  </div>
                  <div>
                    <Text strong style={{ color: 'var(--primary-color)' }}>2. Tự hủy khi đủ người:</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      Nên tắt cài đặt này nếu bạn muốn đảm bảo các kíp quan trọng luôn có người trực. Nếu tắt, thành viên phải liên hệ Quản trị viên để được xóa tên khỏi kíp đã full.
                    </Text>
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 32, borderRadius: 8, padding: '16px 20px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" loading={settingsLoading} icon={<SettingOutlined />} style={{ borderRadius: 8, height: 40, padding: '0 24px' }}>Lưu cấu hình</Button>
            </div>
          </Form>
        </div>
      )
    }
  ];

  return (
    <div className="duty-management-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Thiết lập lịch trực</Title>
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setIsGuideModalOpen(true)}
        >
          Hướng dẫn
        </Button>
      </div>

      <Card className="hifi-border">
        {renderTabSwitcher()}
        {tabItems.find(t => t.key === activeTab)?.children}
      </Card>

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
        onSubmit={handleCreateKip}
        templates={templates}
        loading={loading}
      />

      <DutySlotModal
        open={isSlotEditModalOpen}
        onCancel={() => setIsSlotEditModalOpen(false)}
        onSuccess={fetchSlots}
        slot={editingSlot}
        isAdmin={true}
        currentUserId={0} // Standardizing for admin context
        allSlots={slots}
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
            <Button key="close" type="primary" onClick={() => setIsGuideModalOpen(false)} style={{ minWidth: 120 }}>Đã hiểu</Button>
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
