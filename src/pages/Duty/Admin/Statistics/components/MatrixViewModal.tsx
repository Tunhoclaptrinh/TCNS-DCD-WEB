import React, { useMemo } from 'react';
import { Modal, Space, Typography, Button, Radio, Tooltip, Tag, DatePicker, Segmented, Row, Col, Card, InputNumber } from 'antd';
import { 
  TableOutlined, 
  LeftOutlined, 
  RightOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);
import { dutyService } from '@/services/duty.service';


import QuotaSettingsModal from './QuotaSettingsModal';

const { Text } = Typography;

interface MatrixViewModalProps {
  open: boolean;
  onCancel: () => void;
  stats: any;
  dateRangeText?: string;
  filters: any;
  onFilterChange: (newFilters: any) => void;
  departments?: any[];
  onSaveQuotaSettings?: (values: any) => Promise<void>;
  isPeriodInitialized?: boolean;
}



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

const MatrixViewModal: React.FC<MatrixViewModalProps> = ({ 
  open, onCancel, stats, dateRangeText, filters, onFilterChange, 
  departments = [], onSaveQuotaSettings, isPeriodInitialized 
}) => {

  const [quotaSettingsOpen, setQuotaSettingsOpen] = React.useState(false);
  const [selectedWeekRange, setSelectedWeekRange] = React.useState<any>(null);
  const [editingConfig, setEditingConfig] = React.useState<any>(null);
  const [loadingConfig, setLoadingConfig] = React.useState(false);
  const [showFinance, setShowFinance] = React.useState(false);
  
  // Simulation States
  const [simQuota, setSimQuota] = React.useState<number | null>(null);
  const [simPrice, setSimPrice] = React.useState<number | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);

  // Safely extract data with multiple fallbacks
  const { details: rawDetails = [], meta = {} } = stats || { details: [], meta: {} };
  const { slots = [], kips = [] } = meta || { slots: [], kips: [] };

  const details = useMemo(() => {
    if (!isSimulating) return rawDetails;
    return rawDetails.map((u: any) => {
      const q = simQuota !== null ? simQuota : (u.userQuota || 0);
      const p = simPrice !== null ? simPrice : (u.userKipPrice || 0);
      
      const earnings = (u.totalKips || 0) * p;
      // We don't have violation count in details directly, so we might need to approximate or skip penalties in sim
      // But let's assume we use the ratio if possible or just update earnings
      return {
        ...u,
        simulatedQuota: q,
        simulatedDeficiency: Math.max(0, q - (u.totalKips || 0)),
        totalEarnings: earnings,
        netEarnings: earnings - (u.totalPenalties || 0) // Keep original penalties for now
      };
    });
  }, [rawDetails, isSimulating, simQuota, simPrice]);



  // 1. Generate all dates in range
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


  // 2. Pre-calculate grouped kips for each date
  const groupedData = useMemo(() => {
    const data: Record<string, any[]> = {};
    if (!stats?.meta) return data;
    const { slots, kips } = stats.meta;

    dates.forEach(dateStr => {
      const daySlots = slots.filter((s: any) => dayjs(s.date).format('YYYY-MM-DD') === dateStr);
      const kipIdsInDay = new Set(daySlots.map((s: any) => String(s.kipId)));
      const dayKips = kips.filter((k: any) => kipIdsInDay.has(String(k.id)));
      
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

  // 3. Group dates into weeks
  const weekGroups = useMemo(() => {
    const groups: { weekNum: number, year: number, dates: string[], isFragmented: boolean }[] = [];
    dates.forEach(date => {
      const d = dayjs(date);
      const weekNum = d.isoWeek();
      const year = d.year(); // Fallback to standard year if isoWeekYear plugin is missing

      
      let lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.weekNum === weekNum && lastGroup.year === year) {
        lastGroup.dates.push(date);
      } else {
        groups.push({ 
          weekNum, 
          year, 
          dates: [date],
          isFragmented: false
        });
      }
    });

    return groups.map(g => ({
      ...g,
      isFragmented: g.dates.length < 7
    }));
  }, [dates]);

  // 4. Calculate colspans
  const weekSpans = useMemo(() => {
    return weekGroups.map(week => {
      let totalColSpan = 0;
      week.dates.forEach(date => {
        const dayShifts = groupedData[date];
        const dayKipsCount = dayShifts.reduce((acc, g) => acc + g.kips.length, 0);
        totalColSpan += Math.max(1, dayKipsCount);
      });
      return totalColSpan;
    });
  }, [weekGroups, groupedData]);

  const totalKipCols = useMemo(() => {
    return dates.reduce((acc, date) => {
      const dayShifts = groupedData[date];
      const dayKipsCount = dayShifts.reduce((sum, g) => sum + g.kips.length, 0);
      return acc + Math.max(1, dayKipsCount);
    }, 0);
  }, [dates, groupedData]);

  // 5. Lookup map
  const userSlotMap = useMemo(() => {
    const map = new Map<string, any>();
    slots.forEach((slot: any) => {
      const dateKey = dayjs(slot.date).format('YYYY-MM-DD');
      const kipMeta = kips.find((k: any) => String(k.id) === String(slot.kipId));
      if (kipMeta) {
        const key = `${dateKey}_${kipMeta.shiftName}_${kipMeta.name}`;
        map.set(key, slot);
      }
    });
    return map;
  }, [slots, kips]);

  if (!stats || !stats.meta) return null;


  const getDayName = (dateStr: string) => {
    const d = dayjs(dateStr);
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[d.day()];
  };

  const handlePrevRange = () => {
    if (filters.viewType === 'week') {
      onFilterChange({ ...filters, week: filters.week.subtract(1, 'week') });
    } else {
      const newStart = filters.dateRange[0].subtract(1, 'month').startOf('month');
      const newEnd = newStart.endOf('month');
      onFilterChange({ ...filters, dateRange: [newStart, newEnd] });
    }
  };

  const handleNextRange = () => {
    if (filters.viewType === 'week') {
      onFilterChange({ ...filters, week: filters.week.add(1, 'week') });
    } else {
      const newStart = filters.dateRange[0].add(1, 'month').startOf('month');
      const newEnd = newStart.endOf('month');
      onFilterChange({ ...filters, dateRange: [newStart, newEnd] });
    }
  };

  const dayColors: Record<number, string> = {
    1: '#e6f7ff', 2: '#fff7e6', 3: '#f6ffed', 4: '#fff0f6', 5: '#f9f0ff', 6: '#fff7e6', 0: '#fff1f0',
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 32 }}>
          <Space>
            <TableOutlined style={{ color: '#1890ff' }} />
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Báo cáo chi tiết (Matrix View)</div>
            <Tag color="blue" icon={<CalendarOutlined />}>Phân tầng Tuần</Tag>
          </Space>
          <Radio.Group 
            value={filters.viewType} 
            onChange={(e) => onFilterChange({ ...filters, viewType: e.target.value })}
            size="small"
          >
            <Radio.Button value="week">Theo tuần</Radio.Button>
            <Radio.Button value="month">Theo tháng</Radio.Button>
          </Radio.Group>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width="99%"
      style={{ top: 10 }}
      bodyStyle={{ padding: '0 24px 24px 24px', background: '#f8fafc' }}
    >
      {/* Simulation & Controls Bar */}
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        marginBottom: 20,
        border: '1px solid #e2e8f0',
        borderTop: 'none'
      }}>
        <Row gutter={24} align="middle">
          <Col span={10}>
            <Space size={12}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px' }}>
                <Button type="text" icon={<LeftOutlined />} onClick={handlePrevRange} size="small" />
                <Text strong style={{ margin: '0 12px', color: '#1e293b', minWidth: 140, textAlign: 'center', fontSize: 13 }}>{dateRangeText}</Text>
                <Button type="text" icon={<RightOutlined />} onClick={handleNextRange} size="small" />
              </div>
              <DatePicker.RangePicker 
                size="small"
                value={filters.dateRange}
                onChange={(val) => val && onFilterChange({ ...filters, dateRange: [val[0], val[1]], viewType: 'range' })}
                style={{ width: 220, borderRadius: 8 }}
              />
            </Space>
          </Col>
          
          <Col span={14} style={{ textAlign: 'right' }}>
            <Space size={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: isSimulating ? '#fff1f0' : '#f8fafc', borderRadius: 10, border: `1px solid ${isSimulating ? '#ffccc7' : '#e2e8f0'}` }}>
                <Text style={{ fontSize: 12, fontWeight: 600 }}>Mô phỏng:</Text>
                <InputNumber 
                  size="small" 
                  placeholder="Đ.mức" 
                  style={{ width: 60, borderRadius: 6 }} 
                  value={simQuota} 
                  onChange={v => { setSimQuota(v); setIsSimulating(true); }} 
                />
                <InputNumber 
                  size="small" 
                  placeholder="Giá" 
                  style={{ width: 80, borderRadius: 6 }} 
                  value={simPrice} 
                  onChange={v => { setSimPrice(v); setIsSimulating(true); }} 
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
                {isSimulating && (
                  <Button 
                    type="link" 
                    danger 
                    size="small" 
                    onClick={() => { setIsSimulating(false); setSimQuota(null); setSimPrice(null); }}
                    style={{ padding: 0 }}
                  >
                    Hủy
                  </Button>
                )}
              </div>

              <Segmented
                options={[
                  { label: <Space><TableOutlined style={{ fontSize: 12 }} /><span>Chuyên môn</span></Space>, value: 'duty' },
                  { label: <Space><SettingOutlined style={{ fontSize: 12 }} /><span>Tài chính</span></Space>, value: 'finance' }
                ]}
                value={showFinance ? 'finance' : 'duty'}
                onChange={(v) => setShowFinance(v === 'finance')}
                style={{ borderRadius: 8 }}
              />
              
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setQuotaSettingsOpen(true)}
                style={{ borderRadius: 8 }}
              >
                Cấu hình Gốc
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary Dashboard */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, color: '#0050b3' }}>TỔNG KÍP TRỰC</Text>
              <Text style={{ fontSize: 24, fontWeight: 800, color: '#003a8c' }}>
                {details.reduce((acc: number, u: any) => acc + (u.totalKips || 0), 0)}
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, color: '#237804' }}>TỔNG ĐỊNH MỨC</Text>
              <Text style={{ fontSize: 24, fontWeight: 800, color: '#135200' }}>
                {details.reduce((acc: number, u: any) => acc + (u.userQuota || u.simulatedQuota || 0), 0).toFixed(1)}
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, background: '#fff7e6', border: '1px solid #ffd591' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, color: '#874d00' }}>TỔNG THU NHẬP</Text>
              <Text style={{ fontSize: 24, fontWeight: 800, color: '#613400' }}>
                {(details.reduce((acc: number, u: any) => acc + (u.totalEarnings || 0), 0) / 1000000).toFixed(2)}M
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, background: '#fff1f0', border: '1px solid #ffa39e' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, color: '#a8071a' }}>TỔNG TIỀN PHẠT</Text>
              <Text style={{ fontSize: 24, fontWeight: 800, color: '#820014' }}>
                {(details.reduce((acc: number, u: any) => acc + (u.totalPenalties || 0), 0) / 1000).toLocaleString()}k
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'auto', 
        maxHeight: '75vh', 
        position: 'relative',
        border: '1px solid #f0f0f0', 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        backgroundColor: '#fff'
      }}>
        <table className="matrix-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '11px' }}>
          <thead>
            {/* Row 1: Week */}
            <tr>
              <th rowSpan={4} style={{ ...stickyHeaderStyle, left: 0, zIndex: 100, backgroundColor: '#fff', width: '40px', minWidth: '40px' }}>TT</th>
              <th rowSpan={4} style={{ ...stickyHeaderStyle, left: '40px', zIndex: 100, width: '100px', minWidth: '100px', backgroundColor: '#fff' }}>Họ</th>
              <th rowSpan={4} style={{ ...stickyHeaderStyle, left: '140px', zIndex: 100, width: '100px', minWidth: '100px', backgroundColor: '#fff' }}>Tên</th>



              {weekGroups.map((week, idx) => (
                <th key={`week-${idx}`} colSpan={weekSpans[idx]} style={{ 
                  ...stickyHeaderStyle, 
                  backgroundColor: week.isFragmented ? '#fffbe6' : '#f0f5ff',
                  borderBottom: '2px solid #adc6ff'
                }}>
                  <Space>
                    <span>Tuần {week.weekNum} ({week.year})</span>
                    {!isPeriodInitialized && (
                      <Tooltip title="Tuần này chưa được khởi tạo định mức chính thức!">
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                      </Tooltip>
                    )}

                    <Tooltip title="Cấu hình định mức chuyên sâu cho tuần này">
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<SettingOutlined style={{ fontSize: 12, color: '#1890ff' }} />} 
                        onClick={async () => {
                          const start = dayjs(week.dates[0]).startOf('day');
                          const end = dayjs(week.dates[week.dates.length - 1]).endOf('day');
                          setSelectedWeekRange([start, end]);
                          
                          setLoadingConfig(true);
                          try {
                            const res = await dutyService.getPeriodConfig(start.toISOString(), end.toISOString());
                            if (res.success) {
                              setEditingConfig(res.data);
                            }
                          } finally {
                            setLoadingConfig(false);
                            setQuotaSettingsOpen(true);
                          }
                        }}
                      />
                    </Tooltip>

                  </Space>
                </th>
              ))}

              <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: '140px', backgroundColor: '#e6f7ff', minWidth: '70px', zIndex: 110, borderLeft: '2px solid #adc6ff' }}>Tổng</th>
              <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: '70px', backgroundColor: '#fff1f0', minWidth: '70px', zIndex: 110 }}>Định mức</th>
              <th rowSpan={4} style={{ ...stickyHeaderStyle, position: 'sticky', right: 0, backgroundColor: '#f9f0ff', minWidth: '70px', zIndex: 110 }}>Thiếu</th>

            </tr>
            {/* Row 2: Date */}
            <tr>
              {dates.map(date => {
                const dayShifts = groupedData[date];
                const totalKips = dayShifts.reduce((acc, g) => acc + g.kips.length, 0);
                const hasData = totalKips > 0;
                return (
                  <th key={`date-${date}`} colSpan={Math.max(1, totalKips)} style={{ 
                    ...stickyHeaderStyle, 
                    top: '32px',
                    zIndex: 30,
                    backgroundColor: hasData ? (dayColors[dayjs(date).day()] || '#fafafa') : '#f5f5f5', 
                  }}>

                    <div>{getDayName(date)}</div>
                    <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: 'normal' }}>{dayjs(date).format('DD/MM')}</div>
                  </th>
                );
              })}
            </tr>
            {/* Row 3: Shift */}
            <tr>
              {dates.map(date => {
                const dayShifts = groupedData[date];
                if (dayShifts.length === 0) return <th key={`no-shift-${date}`} style={{ ...stickyHeaderStyle, top: '64px', backgroundColor: '#f5f5f5' }}>-</th>;
                return dayShifts.map((group: any) => (
                  <th key={`${date}-${group.shiftName}`} colSpan={group.kips.length} style={{ ...stickyHeaderStyle, top: '58px', zIndex: 30, fontSize: '9px', color: '#1890ff' }}>

                    {group.shiftName}
                  </th>
                ));

              })}
            </tr>
            {/* Row 4: Kip */}
            <tr>
              {dates.map(date => {
                const dayShifts = groupedData[date];
                if (dayShifts.length === 0) return <th key={`no-kip-${date}`} style={{ ...stickyHeaderStyle, top: '88px', backgroundColor: '#f5f5f5' }}>-</th>;
                return dayShifts.map((group: any) => 
                  group.kips.map((kip: any) => (
                    <th key={`${date}-${kip.id}`} style={{ ...stickyHeaderStyle, top: '80px', zIndex: 30, minWidth: '40px', fontSize: '9px', color: '#595959', fontWeight: 'normal' }}>

                      {kip.name.replace('Kíp ', 'K')}
                    </th>
                  ))
                );

              })}
              
              <th style={{ ...stickyHeaderStyle, top: '80px', right: showFinance ? '280px' : '140px', zIndex: 31, width: '70px', backgroundColor: '#e6f7ff' }}>Kíp</th>
              <th style={{ ...stickyHeaderStyle, top: '80px', right: showFinance ? '210px' : '70px', zIndex: 31, width: '70px', backgroundColor: '#fff7e6' }}>Đ.mức</th>
              <th style={{ ...stickyHeaderStyle, top: '80px', right: showFinance ? '140px' : 0, zIndex: 31, width: '70px', backgroundColor: '#fff1f0' }}>Thiếu</th>

              {showFinance && (
                <>
                  <th style={{ ...stickyHeaderStyle, top: '80px', right: '70px', zIndex: 31, width: '70px', backgroundColor: '#f9f0ff' }}>Phạt</th>
                  <th style={{ ...stickyHeaderStyle, top: '80px', right: 0, zIndex: 31, width: '70px', backgroundColor: '#f6ffed' }}>Thực nhận</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {details.map((user: any, index: number) => (
              <tr key={user.userId} className="matrix-row">
                <td style={{ ...stickyColumnStyle, left: 0, zIndex: 20, textAlign: 'center', width: '40px', minWidth: '40px' }}>{index + 1}</td>
                <td style={{ ...stickyColumnStyle, left: '40px', zIndex: 20, width: '100px', minWidth: '100px', whiteSpace: 'nowrap' }}>{user.lastName}</td>
                <td style={{ ...stickyColumnStyle, left: '140px', zIndex: 20, width: '100px', minWidth: '100px', whiteSpace: 'nowrap', borderRight: '2px solid #f0f0f0' }}><Text strong>{user.firstName}</Text></td>

                {dates.map(date => {
                  const dayShifts = groupedData[date];
                  if (dayShifts.length === 0) return <td key={`empty-${date}`} style={{ textAlign: 'center', color: '#f0f0f0' }}>·</td>;
                  return dayShifts.map((group: any) => 
                    group.kips.map((kip: any) => {
                      const key = `${date}_${group.shiftName}_${kip.name}`;
                      const slot = userSlotMap.get(key);
                      const isAssigned = slot?.assignedUserIds?.includes(user.userId);
                      const isAttended = slot?.attendedUserIds?.includes(user.userId);
                      
                      return (
                        <td key={key} style={{ 
                          textAlign: 'center',
                          backgroundColor: isAssigned ? (isAttended ? '#f6ffed' : '#fffbe6') : 'transparent',
                        }}>
                          {isAssigned ? (
                            <div style={{ fontWeight: 'bold', color: isAttended ? '#52c41a' : '#faad14' }}>
                              {kip.coefficient}
                            </div>
                          ) : <span style={{ color: '#f5f5f5' }}>·</span>}
                        </td>
                      );
                    })
                  );
                })}
                
                <td style={{ ...stickyColumnStyle, left: 'auto', right: showFinance ? '280px' : '140px', backgroundColor: '#e6f7ff', textAlign: 'center', fontWeight: 'bold', borderLeft: '2px solid #adc6ff', zIndex: 20 }}>{user.totalKips}</td>
                <td style={{ ...stickyColumnStyle, left: 'auto', right: showFinance ? '140px' : 0, backgroundColor: '#fff1f0', textAlign: 'center', fontWeight: 'bold', borderRight: showFinance ? '1px solid #f0f0f0' : 'none', zIndex: 20 }}>
                  {(user.deficiency !== undefined) ? (
                    user.deficiency > 0 ? (
                      <span style={{ 
                        color: user.deficiency > 2 ? '#cf1322' : '#fa8c16',
                        background: user.deficiency > 2 ? '#fff1f0' : '#fff7e6',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${user.deficiency > 2 ? '#ffa39e' : '#ffd591'}`
                      }}>
                        -{user.deficiency}
                      </span>
                    ) : <Tag color="success" style={{ margin: 0, borderRadius: 4 }}>✓ Đủ</Tag>
                  ) : (user.simulatedDeficiency !== undefined ? (
                    user.simulatedDeficiency > 0 ? (
                      <span style={{ color: '#cf1322', fontWeight: 'bold' }}>-{user.simulatedDeficiency}</span>
                    ) : <Tag color="success" style={{ margin: 0, borderRadius: 4 }}>✓ Đủ</Tag>
                  ) : '--')}
                </td>

                {showFinance && (
                  <>
                    <td style={{ ...stickyColumnStyle, left: 'auto', right: '70px', backgroundColor: '#f9f0ff', textAlign: 'center', zIndex: 20 }}>
                      <Tooltip title={`Hệ số phạt: ${((user.userPenaltyRate || 0) * 100).toFixed(0)}%`}>
                        <span style={{ color: user.totalPenalties ? '#cf1322' : '#8c8c8c', fontWeight: 600 }}>
                          {user.totalPenalties ? `-${(user.totalPenalties / 1000).toLocaleString()}k` : '0'}
                        </span>
                      </Tooltip>
                    </td>
                    <td style={{ ...stickyColumnStyle, left: 'auto', right: 0, backgroundColor: '#f6ffed', textAlign: 'center', fontWeight: 'bold', color: '#52c41a', zIndex: 20 }}>
                      <Tooltip title={`Thu nhập (${(user.totalEarnings / 1000).toLocaleString()}k) - Phạt (${(user.totalPenalties / 1000).toLocaleString()}k)`}>
                        <span>{((user.netEarnings || 0) / 1000).toLocaleString()}k</span>
                      </Tooltip>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 30, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
            <tr>
              <td colSpan={3} style={{ ...stickyColumnStyle, left: 0, backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', textAlign: 'right', paddingRight: 16 }}>TỔNG CỘNG</td>
              {/* Empty cells for kips */}
              {Array.from({ length: totalKipCols }).map((_, i) => (
                <td key={`foot-${i}`} style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}></td>
              ))}
              <td style={{ ...stickyColumnStyle, left: 'auto', right: showFinance ? '280px' : '140px', textAlign: 'center', backgroundColor: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                {details.reduce((acc: number, u: any) => acc + (u.totalKips || 0), 0)}
              </td>
              <td style={{ ...stickyColumnStyle, left: 'auto', right: showFinance ? '210px' : '70px', textAlign: 'center', backgroundColor: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                {details.reduce((acc: number, u: any) => acc + (u.userQuota || u.simulatedQuota || 0), 0).toFixed(1)}
              </td>
              <td style={{ ...stickyColumnStyle, left: 'auto', right: showFinance ? '140px' : 0, textAlign: 'center', backgroundColor: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                {details.reduce((acc: number, u: any) => acc + Math.max(0, u.deficiency || u.simulatedDeficiency || 0), 0).toFixed(1)}
              </td>
              {showFinance && (
                <>
                  <td style={{ ...stickyColumnStyle, left: 'auto', right: '70px', textAlign: 'center', backgroundColor: '#fff1f0', borderTop: '2px solid #e2e8f0', color: '#cf1322' }}>
                    -{(details.reduce((acc: number, u: any) => acc + (u.totalPenalties || 0), 0) / 1000).toLocaleString()}k
                  </td>
                  <td style={{ ...stickyColumnStyle, left: 'auto', right: 0, textAlign: 'center', backgroundColor: '#f6ffed', borderTop: '2px solid #e2e8f0', color: '#52c41a' }}>
                    {(details.reduce((acc: number, u: any) => acc + (u.netEarnings || 0), 0) / 1000).toLocaleString()}k
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
      
      <style>{`
        .matrix-table th, .matrix-table td {
          border: 1px solid #f0f0f0;
          padding: 4px;
        }
        .matrix-row:hover td {
          background-color: #f0f7ff !important;
        }
        .matrix-table thead th {
          white-space: nowrap;
        }
        /* Fix for sticky header border-gap */
        .matrix-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .matrix-table thead th {
          box-shadow: inset 0 -1px 0 #f0f0f0;
        }
        /* Ensure headers stay on top of body during scroll */
        .matrix-table thead {
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .matrix-table thead tr th {
          background-color: #fafafa;
        }
        .matrix-table thead tr:first-child th[rowSpan] {
          z-index: 110;
        }
        /* Fix for horizontal sticky alignment */
        .matrix-table td[style*="position: sticky"] {
          background-clip: padding-box;
        }
      `}</style>
      <QuotaSettingsModal
        open={quotaSettingsOpen}
        onCancel={() => setQuotaSettingsOpen(false)}
        onSave={async (values) => {
          if (onSaveQuotaSettings && selectedWeekRange) {
            const payload = {
              ...values,
              startDate: selectedWeekRange[0].toISOString(),
              endDate: selectedWeekRange[1].toISOString(),
            };
            await onSaveQuotaSettings(payload);
          }
          setQuotaSettingsOpen(false);
        }}
        departments={departments}
        initialDateRange={selectedWeekRange}
        initialData={editingConfig}
        loading={loadingConfig}
      />
    </Modal>
  );
};

export default MatrixViewModal;
