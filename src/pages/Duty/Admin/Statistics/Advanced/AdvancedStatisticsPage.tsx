import React, { useState, useEffect } from 'react';
import { Card, Space, Button, Typography, message, Row, Col, DatePicker, Tag } from 'antd';
import { 
  SaveOutlined, 
  TableOutlined, 
  HistoryOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';

import { dutyService } from '@/services/duty.service';
import dayjs from 'dayjs';
import { useStatisticsSimulation } from '../hooks/useStatisticsSimulation';
import SimulatorPanel from './components/SimulatorPanel';
import MatrixViewModal from '../components/MatrixViewModal';
import SnapshotModal from './components/SnapshotModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AdvancedStatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rawStats, setRawStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs],
    viewType: 'range' as 'week' | 'month' | 'range'
  });

  const { params, simulatedData, updateParam } = useStatisticsSimulation(rawStats, settings);


  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        dutyService.getComprehensiveStats({
          startDate: filters.dateRange[0].toISOString(),
          endDate: filters.dateRange[1].toISOString()
        }),
        dutyService.getSettings()
      ]);

      if (statsRes.success) setRawStats(statsRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.dateRange]);

  const handleSaveSnapshot = async (payload: any) => {
    try {
      const res = await dutyService.createSnapshot(payload);
      if (res.success) {
        message.success('Đã lưu snapshot quyết toán thành công!');
        setSnapshotOpen(false);
      }
    } catch (err) {
      message.error('Lỗi khi lưu snapshot');
    }
  };


  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space direction="vertical" size={0}>
          <Space>
            <Title level={3} style={{ margin: 0 }}>Hệ thống Giả lập & Quyết toán</Title>
            <Tag color="gold" icon={<ThunderboltOutlined />}>Advanced</Tag>
          </Space>
          <Text type="secondary">Phân tích chuyên sâu, giả lập định mức và chốt quyết toán kỳ trực.</Text>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          <Button icon={<TableOutlined />} onClick={() => setMatrixOpen(true)}>Matrix View</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => setSnapshotOpen(true)}>Chốt Quyết toán</Button>
        </Space>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size={16}>
              <Text strong>Khoảng thời gian:</Text>
              <RangePicker 
                value={filters.dateRange} 
                onChange={(val) => val && setFilters({ ...filters, dateRange: [val[0]!, val[1]!] })}
              />
            </Space>
          </Col>
          <Col>
             <Space>
                <Button type="link" icon={<HistoryOutlined />}>Xem lịch sử Snapshot</Button>
             </Space>
          </Col>
        </Row>
      </Card>

      {/* Simulator Panel */}
      <SimulatorPanel 
        params={params}
        simulatedData={simulatedData}
        onParamChange={updateParam as any}
      />


      {/* Matrix View Modal */}
      <MatrixViewModal 
        open={matrixOpen}
        onCancel={() => setMatrixOpen(false)}
        stats={simulatedData || rawStats}
        dateRangeText={simulatedData?.meta?.periodText}
        filters={{ ...filters, week: dayjs() }}
        onFilterChange={(newFilters) => {
          if (newFilters.dateRange) {
             setFilters({ ...filters, dateRange: newFilters.dateRange });
          }
        }}
        departments={settings?.departments || []}
        onSaveQuotaSettings={async (values) => {
           const res = await dutyService.updateSettings(values);
           if (res.success) {
             message.success('Đã cập nhật định mức thành công');
             fetchData(); // Refetch to sync simulation
           }
        }}
        isPeriodInitialized={simulatedData?.meta?.isPeriodInitialized}
      />



      {/* Snapshot Modal */}
      {simulatedData && (
        <SnapshotModal 
          open={snapshotOpen}
          onCancel={() => setSnapshotOpen(false)}
          onSave={handleSaveSnapshot}
          simulatedData={simulatedData}
          params={params}
        />
      )}
    </div>
  );
};

export default AdvancedStatisticsPage;
