import React from 'react';
import { Card, Row, Col, Statistic, Space, InputNumber, Divider, Typography, List, Avatar, Tag, Progress, Tooltip } from 'antd';
import { 
  DollarOutlined, 
  TeamOutlined, 
  RiseOutlined, 
  FallOutlined,
  CheckCircleOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Text } = Typography;


interface SimulatorPanelProps {
  params: any;
  simulatedData: any;
  onParamChange: (key: string, value: any) => void;
}

const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ params, simulatedData, onParamChange }) => {
  if (!simulatedData) return null;

  const { insights, meta } = simulatedData;

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {/* Settings Column */}
        <Col span={8}>
          <Card title="Tham số Giả lập" size="small" style={{ borderRadius: 8, height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Đơn giá kíp (VNĐ)</Text>
                <InputNumber 
                  value={params.kipPrice} 
                  onChange={(val) => onParamChange('kipPrice', val)} 
                  style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  step={1000}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Hệ số phạt lỗi (0-1)</Text>
                <InputNumber 
                  value={params.violationPenaltyRate} 
                  onChange={(val) => onParamChange('violationPenaltyRate', val)} 
                  style={{ width: '100%' }}
                  min={0} max={1} step={0.1}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Định mức cơ bản (kíp/tuần)</Text>
                <InputNumber 
                  value={params.defaultQuota} 
                  onChange={(val) => onParamChange('defaultQuota', val)} 
                  style={{ width: '100%' }}
                  min={0} step={0.5}
                />
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ background: '#f0f5ff', padding: '12px', borderRadius: '6px' }}>
                <Text strong style={{ color: '#1d39c4' }}>Phân tích kỳ trực:</Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">Phạm vi: </Text> <Text strong>{meta.totalDays} ngày</Text>
                </div>
                <div>
                  <Text type="secondary">Hệ số tỷ lệ: </Text> <Text strong>x{meta.weekScale.toFixed(2)}</Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Global Stats Column */}
        <Col span={16}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8 }}>
                <Statistic 
                  title="Tổng ngân sách dự kiến" 
                  value={insights.totalBudget} 
                  prefix={<DollarOutlined />} 
                  valueStyle={{ color: '#3f8600' }}
                  suffix="đ"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8 }}>
                <Statistic 
                  title="Tỷ lệ hoàn thành" 
                  value={insights.completionRate} 
                  precision={1}
                  prefix={<CheckCircleOutlined />} 
                  suffix="%"
                />
                <Progress percent={insights.completionRate} size="small" showInfo={false} strokeColor="#52c41a" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderRadius: 8 }}>
                <Statistic 
                  title="Số kíp trung bình" 
                  value={insights.averageKips} 
                  precision={1}
                  prefix={<TeamOutlined />} 
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {/* Top Performers */}
            <Col span={12}>
              <Card title={<Space><RiseOutlined style={{ color: '#52c41a' }} />Top Năng nổ</Space>} size="small" style={{ borderRadius: 8 }}>
                <List
                  size="small"
                  dataSource={insights.topPerformers}
                  renderItem={(u: any) => (
                    <List.Item>
                      <Space>
                        <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
                        <Text strong style={{ fontSize: 12 }}>{u.name}</Text>
                      </Space>
                      <Tag color="green">{u.totalKips} kíp</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            {/* Under Performers */}
            <Col span={12}>
              <Card title={<Space><FallOutlined style={{ color: '#cf1322' }} />Chưa đủ định mức</Space>} size="small" style={{ borderRadius: 8 }}>
                <List
                  size="small"
                  dataSource={insights.underPerformers.slice(0, 5)}
                  renderItem={(u: any) => (
                    <List.Item>
                      <Space>
                        <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
                        <Text strong style={{ fontSize: 12 }}>{u.name}</Text>
                      </Space>
                      <Tooltip title={`Thiếu ${u.simulatedDeficiency} kíp so với định mức ${u.simulatedQuota}`}>
                        <Tag color="red">-{u.simulatedDeficiency}</Tag>
                      </Tooltip>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default SimulatorPanel;
