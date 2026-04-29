import React from 'react';
import { Modal, Space, Typography, Button, Radio } from 'antd';
import { 
  TableOutlined, 
  LeftOutlined, 
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface MatrixViewModalProps {
  open: boolean;
  onCancel: () => void;
  stats: any;
  dateRangeText?: string;
  filters: any;
  onFilterChange: (newFilters: any) => void;
}

const stickyHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  left: 0,
  zIndex: 20,
  backgroundColor: '#fafafa',
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'center'
};

const stickyColumnStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 10,
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  padding: '8px'
};

const MatrixViewModal: React.FC<MatrixViewModalProps> = ({ open, onCancel, stats, dateRangeText, filters, onFilterChange }) => {
  if (!stats || !stats.meta) return null;

  const { details, meta } = stats;
  const { slots, kips } = meta;

  // Generate all dates in the range
  const startDate = dayjs(stats.period?.startDate || (filters.viewType === 'week' ? filters.week.startOf('isoWeek') : filters.dateRange[0]));
  const endDate = dayjs(stats.period?.endDate || (filters.viewType === 'week' ? filters.week.endOf('isoWeek') : filters.dateRange[1]));
  
  const dates: string[] = [];
  let curr = startDate.clone();
  while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
    dates.push(curr.format('YYYY-MM-DD'));
    curr = curr.add(1, 'day');
  }
  
  // Group kips for a date: Get unique kips based on name and shiftName
  const getGroupedKipsForDate = (dateStr: string) => {
    const daySlots = slots.filter((s: any) => dayjs(s.date).format('YYYY-MM-DD') === dateStr);
    const kipIdsInDay = new Set(daySlots.map((s: any) => String(s.kipId)));
    
    const dayKips = kips.filter((k: any) => kipIdsInDay.has(String(k.id)));
    
    // Group by shiftName then name
    const grouped: Record<string, { shiftName: string, kips: any[] }> = {};
    
    dayKips.forEach((k: any) => {
      const sName = k.shiftName || 'Khác';
      if (!grouped[sName]) grouped[sName] = { shiftName: sName, kips: [] };
      
      // Only add if name not already in this shift (deduplicate by name)
      if (!grouped[sName].kips.find(existing => existing.name === k.name)) {
        grouped[sName].kips.push(k);
      }
    });

    // Convert back to sorted array of shifts
    return Object.values(grouped).sort((a, b) => a.shiftName.localeCompare(b.shiftName)).map(g => ({
      ...g,
      kips: g.kips.sort((a, b) => a.name.localeCompare(b.name))
    }));
  };

  const getDayName = (dateStr: string) => {
    const d = dayjs(dateStr);
    if (!d.isValid()) return 'N/A';
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[d.day()];
  };

  const handlePrevWeek = () => {
    if (filters.viewType === 'week') {
      onFilterChange({ ...filters, week: filters.week.subtract(1, 'week') });
    } else {
      const newStart = filters.dateRange[0].subtract(1, 'month').startOf('month');
      const newEnd = newStart.endOf('month');
      onFilterChange({ ...filters, dateRange: [newStart, newEnd] });
    }
  };

  const handleNextWeek = () => {
    if (filters.viewType === 'week') {
      onFilterChange({ ...filters, week: filters.week.add(1, 'week') });
    } else {
      const newStart = filters.dateRange[0].add(1, 'month').startOf('month');
      const newEnd = newStart.endOf('month');
      onFilterChange({ ...filters, dateRange: [newStart, newEnd] });
    }
  };

  const dayColors: Record<number, string> = {
    1: '#e6f7ff', // Thứ 2
    2: '#fff7e6', // Thứ 3
    3: '#f6ffed', // Thứ 4
    4: '#fff0f6', // Thứ 5
    5: '#f9f0ff', // Thứ 6
    6: '#fff7e6', // Thứ 7
    0: '#fff1f0', // Chủ nhật
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TableOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Báo cáo chi tiết dạng bảng (Matrix View)</div>
          </div>
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
      width="98%"
      style={{ top: 10 }}
      footer={null}
      bodyStyle={{ padding: '0 16px 16px 16px' }}
    >
      <div style={{ 
        background: '#f0f5ff', 
        padding: '12px 16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #adc6ff'
      }}>
        <Space size={24}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              icon={<LeftOutlined />} 
              onClick={handlePrevWeek} 
              size="small" 
              style={{ marginRight: 12 }}
            />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Thời gian báo cáo:</Text>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1d39c4', lineHeight: 1.2 }}>
                {dateRangeText || 'Tháng hiện tại'}
              </div>
            </div>
            <Button 
              icon={<RightOutlined />} 
              onClick={handleNextWeek} 
              size="small" 
              style={{ marginLeft: 12 }}
            />
          </div>
        </Space>
        
        <Space size={16}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f6ffed', border: '1px solid #b7eb8f', marginRight: 4 }}></div>
            <Text style={{ fontSize: 12 }}>Đã trực</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fffbe6', border: '1px solid #ffe58f', marginRight: 4 }}></div>
            <Text style={{ fontSize: 12 }}>Chưa điểm danh</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fff1f0', border: '1px solid #ffa39e', marginRight: 4 }}></div>
            <Text style={{ fontSize: 12 }}>Vắng/Vi phạm</Text>
          </div>
        </Space>
      </div>
      
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
        <table className="matrix-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '12px' }}>
          <thead>
            {/* Tầng 1: Ngày */}
            <tr>
              <th rowSpan={3} style={stickyHeaderStyle}>STT</th>
              <th rowSpan={3} style={{ ...stickyHeaderStyle, left: '50px', minWidth: '120px' }}>Họ</th>
              <th rowSpan={3} style={{ ...stickyHeaderStyle, left: '170px', minWidth: '80px' }}>Tên</th>
              {dates.map(date => {
                const groupedShifts = getGroupedKipsForDate(date);
                const totalKips = groupedShifts.reduce((acc, g) => acc + g.kips.length, 0);
                const hasData = totalKips > 0;
                
                return (
                  <th key={date} colSpan={hasData ? totalKips : 1} style={{ 
                    border: '1px solid #f0f0f0', 
                    padding: '8px', 
                    backgroundColor: hasData ? (dayColors[dayjs(date).day()] || '#fafafa') : '#f5f5f5', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    opacity: hasData ? 1 : 0.6,
                    minWidth: hasData ? totalKips * 50 : 60
                  }}>
                    <div style={{ color: hasData ? '#141414' : '#8c8c8c', fontSize: '13px' }}>{getDayName(date)}</div>
                    <div style={{ color: '#595959', fontSize: '10px', fontWeight: 'normal' }}>{dayjs(date).format('DD/MM/YYYY')}</div>
                  </th>
                );
              })}
              <th rowSpan={3} style={{ ...stickyHeaderStyle, position: 'relative', left: 'auto', backgroundColor: '#e6f7ff', minWidth: '70px', verticalAlign: 'middle' }}>Tổng kíp</th>
              <th rowSpan={3} style={{ ...stickyHeaderStyle, position: 'relative', left: 'auto', backgroundColor: '#fff1f0', minWidth: '70px', verticalAlign: 'middle' }}>Số kíp thiếu</th>
            </tr>
            {/* Tầng 2: Ca */}
            <tr>
              {dates.map(date => {
                const groupedShifts = getGroupedKipsForDate(date);
                if (groupedShifts.length === 0) return <th key={`empty-shift-${date}`} style={{ border: '1px solid #f0f0f0', backgroundColor: '#f5f5f5' }}>-</th>;
                
                return groupedShifts.map(group => (
                  <th key={`${date}-${group.shiftName}`} colSpan={group.kips.length} style={{ 
                    border: '1px solid #f0f0f0', 
                    padding: '4px', 
                    backgroundColor: '#fff', 
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#1890ff',
                    fontWeight: 'bold'
                  }}>
                    {group.shiftName}
                  </th>
                ));
              })}
            </tr>
            {/* Tầng 3: Kíp */}
            <tr>
              {dates.map(date => {
                const groupedShifts = getGroupedKipsForDate(date);
                if (groupedShifts.length === 0) return <th key={`empty-kip-${date}`} style={{ border: '1px solid #f0f0f0', backgroundColor: '#f5f5f5' }}>-</th>;
                
                return groupedShifts.map(group => 
                  group.kips.map(kip => (
                    <th key={`${date}-${kip.id}`} style={{ 
                      border: '1px solid #f0f0f0', 
                      padding: '4px', 
                      minWidth: '50px', 
                      textAlign: 'center', 
                      backgroundColor: '#fafafa',
                      fontSize: '11px',
                      color: '#595959'
                    }}>
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
                <td style={{ ...stickyColumnStyle, textAlign: 'center', backgroundColor: '#fff' }}>{index + 1}</td>
                <td style={{ ...stickyColumnStyle, left: '50px', whiteSpace: 'nowrap', backgroundColor: '#fff' }}>
                  {user.lastName || '--'}
                </td>
                <td style={{ ...stickyColumnStyle, left: '170px', whiteSpace: 'nowrap', backgroundColor: '#fff' }}>
                  <Text strong>{user.firstName || user.name}</Text>
                </td>
                {dates.map(date => {
                  const groupedShifts = getGroupedKipsForDate(date);
                  if (groupedShifts.length === 0) return <td key={`empty-cell-${date}`} style={{ border: '1px solid #f0f0f0', backgroundColor: '#f9f9f9', textAlign: 'center' }}>-</td>;
                  
                  return groupedShifts.map(group => 
                    group.kips.map(kip => {
                      // Note: We deduplicated by name in groupedShifts, but we need to find ANY slot that matches this name/shift on this day
                      // because the user might be assigned to multiple K1 objects (though unlikely after our deduplication).
                      // We search by comparing name and shiftName from the metadata.
                      const slotIdsInKips = kips.filter((k: any) => k.name === kip.name && k.shiftName === group.shiftName).map((k: any) => String(k.id));
                      
                      const slot = slots.find((s: any) => 
                        dayjs(s.date).format('YYYY-MM-DD') === date && 
                        slotIdsInKips.includes(String(s.kipId))
                      );
                      const isAssigned = slot?.assignedUserIds?.includes(user.userId);
                      const isAttended = slot?.attendedUserIds?.includes(user.userId);
                      
                      return (
                        <td key={`${date}-${kip.id}`} style={{ 
                          border: '1px solid #f0f0f0', 
                          textAlign: 'center',
                          backgroundColor: isAssigned ? (isAttended ? '#f6ffed' : '#fffbe6') : 'transparent',
                          padding: '4px'
                        }}>
                          {isAssigned ? (
                            <div style={{ fontWeight: 'bold', color: isAttended ? '#52c41a' : '#faad14' }}>
                              {kip.coefficient}
                            </div>
                          ) : '-'}
                        </td>
                      );
                    })
                  );
                })}
                <td style={{ border: '1px solid #f0f0f0', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e6f7ff' }}>
                  {user.totalKips}
                </td>
                <td style={{ border: '1px solid #f0f0f0', textAlign: 'center', fontWeight: 'bold', color: '#cf1322', backgroundColor: '#fff1f0' }}>
                  {user.deficiency > 0 ? user.deficiency : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <style>{`
        .matrix-table th, .matrix-table td {
          border: 1px solid #f0f0f0;
        }
        .matrix-row:hover td {
          background-color: #f0f0f0 !important;
        }
        .matrix-row:hover td[style*="position: sticky"] {
          background-color: #f0f0f0 !important;
        }
      `}</style>
    </Modal>
  );
};

export default MatrixViewModal;
