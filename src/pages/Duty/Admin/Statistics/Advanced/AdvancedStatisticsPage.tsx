import React, { useState, useEffect, useMemo } from 'react';
import { Card, Space, Button, Typography, message, Tag, Radio, DatePicker, Spin, Empty, Tooltip } from 'antd';
import { 
  TableOutlined, 
  CalendarOutlined,
  SaveOutlined,
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { dutyService } from '@/services/duty.service';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import QuotaSettingsModal from '../components/QuotaSettingsModal';

dayjs.extend(isoWeek);

const { Text } = Typography;

const stickyHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 30,
  backgroundColor: '#fafafa',
  border: '1px solid #f0f0f0',
  padding: '8px',
  textAlign: 'center',
  fontWeight: 'bold',
  backgroundClip: 'padding-box',
};

const stickyColumnStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 10,
  backgroundColor: '#fff',
  border: '1px solid #f0f0f0',
  padding: '8px',
  backgroundClip: 'padding-box',
};

const AdvancedStatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [quotaSettingsOpen, setQuotaSettingsOpen] = useState(false);
  const [selectedWeekRange, setSelectedWeekRange] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [templateGroups, setTemplateGroups] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs],
    viewType: 'week' as 'week' | 'month' | 'range',
    week: dayjs()
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch template groups for the modal
      const groupRes = await dutyService.getTemplateGroups();
      if (groupRes.success) setTemplateGroups(groupRes.data || []);

      let start, end;
      if (filters.viewType === 'week') {
        start = filters.week.startOf('isoWeek').toISOString();
        end = filters.week.endOf('isoWeek').toISOString();
      } else {
        start = filters.dateRange[0].toISOString();
        end = filters.dateRange[1].toISOString();
      }

      const res = await dutyService.getComprehensiveStats({ startDate: start, endDate: end });
      if (res.success) setStats(res.data);
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.week, filters.dateRange, filters.viewType]);

  // Logic calculation for Matrix View
  const { details = [], meta = {} } = stats || { details: [], meta: {} };
  const { slots = [], kips = [] } = meta || { slots: [], kips: [] };

  const dates = useMemo(() => {
    if (!stats?.meta) return [];
    const startDate = dayjs(stats.period?.startDate || (filters.viewType === 'week' ? filters.week.startOf('isoWeek') : filters.dateRange[0]));
    const endDate = dayjs(stats.period?.endDate || (filters.viewType === 'week' ? filters.week.endOf('isoWeek') : filters.dateRange[1]));

    const dateList: string[] = [];
    let curr = startDate.clone();
    while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
      dateList.push(curr.format('YYYY-MM-DD'));
      curr = curr.add(1, 'day');
    }
    return dateList;
  }, [stats?.period, filters]);

  const groupedData = useMemo(() => {
    const data: Record<string, any[]> = {};
    if (!stats?.meta) return data;
    
    dates.forEach(dateStr => {
      const daySlots = (slots || []).filter((s: any) => dayjs(s.date).format('YYYY-MM-DD') === dateStr);
      const kipIdsInDay = new Set(daySlots.map((s: any) => String(s.kipId)));
      const dayKips = (kips || []).filter((k: any) => kipIdsInDay.has(String(k.id)));
      
      const grouped: Record<string, { shiftName: string, kips: any[] }> = {};
      dayKips.forEach((k: any) => {
        const sName = k.shiftName || 'Khác';
        if (!grouped[sName]) grouped[sName] = { shiftName: sName, kips: [] };
        if (!grouped[sName].kips.find(existing => existing.name === k.name)) {
          grouped[sName].kips.push(k);
        }
      });

      data[dateStr] = Object.values(grouped)
        .sort((a, b) => a.shiftName.localeCompare(b.shiftName))
        .map(g => ({
          ...g,
          kips: g.kips.sort((a, b) => a.name.localeCompare(b.name))
        }));
    });
    return data;
  }, [dates, slots, kips]);

  const weekGroups = useMemo(() => {
    const groups: { weekNum: number, year: number, dates: string[], isFragmented: boolean }[] = [];
    dates.forEach(date => {
      const d = dayjs(date);
      const weekNum = d.isoWeek();
      const year = d.year();
      
      let lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.weekNum === weekNum && lastGroup.year === year) {
        lastGroup.dates.push(date);
      } else {
        groups.push({ weekNum, year, dates: [date], isFragmented: false });
      }
    });
    return groups.map(g => ({ ...g, isFragmented: g.dates.length < 7 }));
  }, [dates]);

  const weekSpans = useMemo(() => {
    return weekGroups.map(week => {
      let totalColSpan = 0;
      week.dates.forEach(date => {
        const dayShifts = groupedData[date] || [];
        const dayKipsCount = dayShifts.reduce((acc, g) => acc + (g.kips?.length || 0), 0);
        totalColSpan += Math.max(1, dayKipsCount);
      });
      return totalColSpan;
    });
  }, [weekGroups, groupedData]);

  const userSlotMap = useMemo(() => {
    const map = new Map<string, any>();
    (slots || []).forEach((slot: any) => {
      const dateKey = dayjs(slot.date).format('YYYY-MM-DD');
      const kipMeta = (kips || []).find((k: any) => String(k.id) === String(slot.kipId));
      if (kipMeta) {
        const key = `${dateKey}_${kipMeta.shiftName}_${kipMeta.name}`;
        map.set(key, slot);
      }
    });
    return map;
  }, [slots, kips]);

  const dayColors: Record<number, string> = {
    1: '#e6f7ff', 2: '#fff7e6', 3: '#f6ffed', 4: '#fff0f6', 5: '#f9f0ff', 6: '#fff7e6', 0: '#fff1f0',
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Premium Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginBottom: 20,
        background: '#fff',
        padding: '16px 24px',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        border: '1px solid #f1f5f9'
      }}>
        <Space size={12}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 8, 
            background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <TableOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Báo cáo Quyết toán Matrix</div>
            <Space size={4}>
              <Tag color="blue" icon={<CalendarOutlined />} style={{ borderRadius: 4, margin: 0 }}>Dữ liệu Định mức</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>Báo cáo chi tiết kíp trực & tiền trực</Text>
            </Space>
          </div>
        </Space>

        <Space size={16}>
          <Radio.Group 
            value={filters.viewType} 
            onChange={(e) => setFilters({ ...filters, viewType: e.target.value })}
            size="middle"
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="week">Theo tuần</Radio.Button>
            <Radio.Button value="month">Theo tháng</Radio.Button>
          </Radio.Group>
          
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          <Button type="primary" icon={<SaveOutlined />} style={{ background: '#059669', borderColor: '#059669' }}>Chốt Quyết toán</Button>
        </Space>
      </div>

      {/* Spreadsheet Container */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
           <Space size={16}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Button type="text" icon={<LeftOutlined />} onClick={() => setFilters({...filters, week: filters.week.subtract(1, 'week')})} size="small" />
                <Text strong style={{ margin: '0 8px', color: '#2563eb', minWidth: 140, textAlign: 'center' }}>
                  {filters.viewType === 'week' ? `Tuần ${filters.week.isoWeek()} (${filters.week.startOf('isoWeek').format('DD/MM')} - ${filters.week.endOf('isoWeek').format('DD/MM')})` : 'Toàn bộ tháng'}
                </Text>
                <Button type="text" icon={<RightOutlined />} onClick={() => setFilters({...filters, week: filters.week.add(1, 'week')})} size="small" />
              </div>
              <DatePicker.RangePicker 
                size="middle"
                value={filters.dateRange}
                onChange={(val) => {
                  if (val && val[0] && val[1]) {
                    setFilters({ ...filters, dateRange: [val[0], val[1]], viewType: 'range' });
                  }
                }}
                style={{ width: 260, borderRadius: 8 }}
              />
           </Space>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', position: 'relative' }}>
          {loading ? (
            <div style={{ padding: 100, textAlign: 'center' }}><Spin tip="Đang tải dữ liệu..." /></div>
          ) : !stats ? (
            <Empty style={{ padding: 100 }} />
          ) : (
            <table className="matrix-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, left: 0, zIndex: 100, backgroundColor: '#fff', width: '40px' }}>TT</th>
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, left: '40px', zIndex: 100, width: '100px', backgroundColor: '#fff' }}>Họ</th>
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, left: '140px', zIndex: 100, width: '100px', backgroundColor: '#fff' }}>Tên</th>
                  {weekGroups.map((week, idx) => (
                    <th key={`week-${idx}`} colSpan={weekSpans[idx]} style={{ ...stickyHeaderStyle, backgroundColor: week.isFragmented ? '#fffbe6' : '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                      <Space>
                        <span>Tuần {week.weekNum} ({week.year})</span>
                        <Tooltip title="Thiết lập định mức tuần">
                          <Button type="text" size="small" icon={<SettingOutlined style={{ fontSize: 12, color: '#3b82f6' }} />} onClick={async () => {
                            const start = dayjs(week.dates[0]).startOf('day');
                            const end = dayjs(week.dates[week.dates.length - 1]).endOf('day');
                            setSelectedWeekRange([start, end]);
                            try {
                              const res = await dutyService.getPeriodConfig(start.toISOString(), end.toISOString());
                              if (res.success) setEditingConfig(res.data);
                            } finally {
                              setQuotaSettingsOpen(true);
                            }
                          }} />
                        </Tooltip>
                      </Space>
                    </th>
                  ))}
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: '140px', backgroundColor: '#eff6ff', minWidth: '70px', zIndex: 110, borderLeft: '2px solid #bfdbfe' }}>Tổng</th>
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: '70px', backgroundColor: '#fff1f2', minWidth: '70px', zIndex: 110 }}>Định mức</th>
                  <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: 0, backgroundColor: '#f5f3ff', minWidth: '70px', zIndex: 110 }}>Thiếu</th>
                </tr>
                <tr>
                  {dates.map(date => {
                    const totalKips = (groupedData[date] || []).reduce((acc, g) => acc + (g.kips?.length || 0), 0);
                    return <th key={`date-${date}`} colSpan={Math.max(1, totalKips)} style={{ ...stickyHeaderStyle, top: '32px', zIndex: 30, backgroundColor: totalKips > 0 ? (dayColors[dayjs(date).day()] || '#fafafa') : '#f8fafc' }}>
                      <div>{dayjs(date).format('dd').toUpperCase()}</div>
                      <div style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'normal' }}>{dayjs(date).format('DD/MM')}</div>
                    </th>;
                  })}
                </tr>
                <tr>
                  {dates.map(date => {
                    const dayShifts = groupedData[date] || [];
                    if (dayShifts.length === 0) return <th key={`no-shift-${date}`} style={{ ...stickyHeaderStyle, top: '64px', backgroundColor: '#f8fafc' }}>-</th>;
                    return dayShifts.map((group: any) => <th key={`${date}-${group.shiftName}`} colSpan={group.kips?.length || 1} style={{ ...stickyHeaderStyle, top: '58px', zIndex: 30, fontSize: '9px', color: '#2563eb' }}>{group.shiftName}</th>);
                  })}
                </tr>
                <tr>
                  {dates.map(date => {
                    const dayShifts = groupedData[date] || [];
                    if (dayShifts.length === 0) return <th key={`no-kip-${date}`} style={{ ...stickyHeaderStyle, top: '88px', backgroundColor: '#f8fafc' }}>-</th>;
                    return dayShifts.map((group: any) => (group.kips || []).map((kip: any) => <th key={`${date}-${kip.id}`} style={{ ...stickyHeaderStyle, top: '80px', zIndex: 30, minWidth: '40px', fontSize: '9px', color: '#64748b', fontWeight: 'normal' }}>{kip.name?.replace('Kíp ', 'K')}</th>));
                  })}
                </tr>
              </thead>
              <tbody>
                {details.map((user: any, index: number) => (
                  <tr key={user.userId} className="matrix-row">
                    <td style={{ ...stickyColumnStyle, left: 0, zIndex: 20, textAlign: 'center', width: '40px' }}>{index + 1}</td>
                    <td style={{ ...stickyColumnStyle, left: '40px', zIndex: 20, width: '100px', whiteSpace: 'nowrap' }}>{user.lastName}</td>
                    <td style={{ ...stickyColumnStyle, left: '140px', zIndex: 20, width: '100px', whiteSpace: 'nowrap', borderRight: '2px solid #f1f5f9' }}><Text strong>{user.firstName}</Text></td>
                    {dates.map(date => {
                      const dayShifts = groupedData[date] || [];
                      if (dayShifts.length === 0) return <td key={`empty-${date}`} style={{ textAlign: 'center', color: '#f1f5f9' }}>·</td>;
                      return dayShifts.map((group: any) => (group.kips || []).map((kip: any) => {
                        const key = `${date}_${group.shiftName}_${kip.name}`;
                        const slot = userSlotMap.get(key);
                        const isAssigned = slot?.assignedUserIds?.includes(user.userId);
                        const isAttended = slot?.attendedUserIds?.includes(user.userId);
                        return <td key={key} style={{ textAlign: 'center', backgroundColor: isAssigned ? (isAttended ? '#f0fdf4' : '#fffbeb') : 'transparent' }}>
                          {isAssigned ? <div style={{ fontWeight: 'bold', color: isAttended ? '#16a34a' : '#d97706' }}>{kip.coefficient}</div> : <span style={{ color: '#f1f5f9' }}>·</span>}
                        </td>;
                      }));
                    })}
                    <td style={{ ...stickyColumnStyle, right: '140px', backgroundColor: '#eff6ff', textAlign: 'center', fontWeight: 'bold', borderLeft: '2px solid #bfdbfe', zIndex: 20 }}>{user.totalKips}</td>
                    <td style={{ ...stickyColumnStyle, right: '70px', backgroundColor: '#fff1f2', textAlign: 'center', color: (user.simulatedQuota !== undefined) ? '#64748b' : '#f59e0b', zIndex: 20 }}>{user.simulatedQuota !== undefined ? user.simulatedQuota : '--'}</td>
                    <td style={{ ...stickyColumnStyle, right: 0, backgroundColor: '#f5f3ff', textAlign: 'center', fontWeight: 'bold', color: (user.simulatedDeficiency ?? 0) > 0 ? '#dc2626' : '#16a34a', zIndex: 20 }}>{user.simulatedDeficiency !== undefined ? (user.simulatedDeficiency > 0 ? user.simulatedDeficiency : '✓') : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      
      <style>{`
        .matrix-table th, .matrix-table td { border: 1px solid #f1f5f9; padding: 6px 4px; }
        .matrix-row:hover td { background-color: #f8fafc !important; }
        .matrix-table thead { position: sticky; top: 0; z-index: 100; }
      `}</style>

      <QuotaSettingsModal
        open={quotaSettingsOpen}
        onCancel={() => setQuotaSettingsOpen(false)}
        onSave={async (values) => {
          if (!selectedWeekRange) return;
          const res = await dutyService.updatePeriodConfig({
            ...values,
            startDate: selectedWeekRange[0].toISOString(),
            endDate: selectedWeekRange[1].toISOString(),
          });
          if (res.success) {
            message.success('Đã cập nhật định mức');
            fetchData();
          }
          setQuotaSettingsOpen(false);
        }}
        departments={[]}
        initialDateRange={selectedWeekRange}
        initialData={editingConfig}
        templateGroups={templateGroups}
      />
    </div>
  );
};

export default AdvancedStatisticsPage;
