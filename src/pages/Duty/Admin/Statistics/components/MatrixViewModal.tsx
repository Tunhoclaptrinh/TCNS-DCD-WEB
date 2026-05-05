import React, { useMemo } from 'react';
import { Modal, Space, Typography, Button, Radio, Tooltip, Tag, DatePicker } from 'antd';
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

  // Safely extract data with multiple fallbacks
  const { details = [], meta = {} } = stats || { details: [], meta: {} };
  const { slots = [], kips = [] } = meta || { slots: [], kips: [] };



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
      footer={null}
      bodyStyle={{ padding: '0 16px 16px 16px' }}
    >
      {/* Toolbar Area */}
      <div style={{ 
        background: '#fff', 
        padding: '16px 0', 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 16
      }}>
        <Space size={16} wrap>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '4px 8px', borderRadius: '6px' }}>
            <Button type="text" icon={<LeftOutlined />} onClick={handlePrevRange} size="small" />
            <Text strong style={{ margin: '0 8px', color: '#1d39c4', minWidth: 140, textAlign: 'center' }}>{dateRangeText}</Text>
            <Button type="text" icon={<RightOutlined />} onClick={handleNextRange} size="small" />
          </div>
          
          <Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>Chọn khoảng ngày:</Text>
            <DatePicker.RangePicker 
              size="middle"
              value={filters.dateRange}
              onChange={(val) => val && onFilterChange({ ...filters, dateRange: [val[0], val[1]], viewType: 'range' })}
              style={{ width: 280 }}
            />
          </Space>

          {weekGroups.some(w => w.isFragmented) && (
            <Tooltip title="Khoảng ngày chọn chứa các tuần không đầy đủ (dưới 7 ngày).">
              <Tag icon={<ExclamationCircleOutlined />} color="warning" style={{ margin: 0 }}>Tuần dở dang</Tag>
            </Tooltip>
          )}
        </Space>


        
        <Space size={16}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f6ffed', border: '1px solid #b7eb8f', marginRight: 4 }}></div>
            <Text style={{ fontSize: 12 }}>Đã trực</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fffbe6', border: '1px solid #ffe58f', marginRight: 4 }}></div>
            <Text style={{ fontSize: 12 }}>Chưa điểm danh</Text>
          </div>
        </Space>
      </div>
      
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
                
                <td style={{ ...stickyColumnStyle, left: 'auto', right: '140px', backgroundColor: '#e6f7ff', textAlign: 'center', fontWeight: 'bold', borderLeft: '2px solid #adc6ff', zIndex: 20 }}>{user.totalKips}</td>
                <td style={{ ...stickyColumnStyle, left: 'auto', right: '70px', backgroundColor: '#fff1f0', textAlign: 'center', color: (user.simulatedQuota !== undefined) ? '#8c8c8c' : '#faad14', zIndex: 20 }}>
                  {user.simulatedQuota !== undefined ? user.simulatedQuota : '--'}
                </td>
                <td style={{ ...stickyColumnStyle, left: 'auto', right: 0, backgroundColor: '#f9f0ff', textAlign: 'center', fontWeight: 'bold', color: (user.simulatedDeficiency ?? 0) > 0 ? '#cf1322' : '#52c41a', zIndex: 20 }}>
                  {user.simulatedDeficiency !== undefined ? (user.simulatedDeficiency > 0 ? user.simulatedDeficiency : '✓') : '--'}
                </td>



              </tr>
            ))}
          </tbody>
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
