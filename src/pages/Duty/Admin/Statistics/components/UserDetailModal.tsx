import React from 'react';
import { Modal, Row, Col, Avatar, Typography, Progress, Tabs, Card, List, Space, Tag, Empty, Statistic } from 'antd';
import { UserOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface UserDetailModalProps {
  open: boolean;
  user: any;
  onCancel: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ open, user, onCancel }) => {
  if (!user) return null;

  return (
    <Modal
      title="Chi tiết Hiệu suất Cá nhân"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ overflow: 'hidden' }}>
        <div className="modal-profile-header">
          <Row gutter={24} align="middle">
            <Col>
              <Avatar size={100} src={user.avatar} icon={<UserOutlined />} className="modal-avatar" />
            </Col>
            <Col flex="auto">
              <Title level={3} style={{ margin: 0 }}>{user.name}</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>{user.studentId} • {user.position}</Text>
              <div style={{ marginTop: 12 }}>
                <span className={`status-tag ${user.isWarning ? 'error' : 'success'}`}>
                  {user.isWarning ? `Thiếu ${user.deficiency.toFixed(1)} kíp` : 'Đã đạt định mức'}
                </span>
              </div>
            </Col>
          </Row>
        </div>
        
        <div style={{ padding: '24px' }}>
          <Tabs defaultActiveKey="overview">
            <Tabs.TabPane tab="Tổng quan" key="overview">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card bodyStyle={{ padding: 16 }} className="glass-card">
                    <Statistic title="Tổng Kíp" value={user.totalKips} valueStyle={{ color: '#6366f1' }} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bodyStyle={{ padding: 16 }} className="glass-card">
                    <Statistic title="Số Lỗi" value={user.violationCount} valueStyle={{ color: '#ef4444' }} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bodyStyle={{ padding: 16 }} className="glass-card">
                    <Statistic title="Tạm tính" value={(user.finalAmount / 1000).toLocaleString()} suffix="k" valueStyle={{ color: '#10b981' }} />
                  </Card>
                </Col>

              </Row>
              
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>Tỷ lệ hoàn thành định mức</Text>
                  <Text type="secondary">{Math.min(100, Math.round((user.totalKips / (user.deficiency + user.totalKips)) * 100)) || 0}%</Text>
                </div>
                <Progress 
                  percent={Math.min(100, Math.round((user.totalKips / (user.deficiency + user.totalKips)) * 100)) || 0} 
                  status={user.isWarning ? "exception" : "success"}
                  strokeColor={user.isWarning ? '#ef4444' : '#10b981'}
                  strokeWidth={12}
                />
              </div>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="Lịch sử Vi phạm" key="violations">
              <List
                dataSource={user.violations || []}
                renderItem={(v: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: '#fff1f0', color: '#ff4d4f' }} />}
                      title={<Space><Text strong>{v.type}</Text><Tag color="red">Hệ số {v.coefficient}</Tag></Space>}
                      description={v.note || 'Không có ghi chú'}
                    />
                    <Text type="secondary">{dayjs(v.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                  </List.Item>
                )}
                locale={{ emptyText: <Empty description="Không có vi phạm nào" /> }}
              />
            </Tabs.TabPane>

            <Tabs.TabPane tab="Đơn từ" key="requests">
              <Row gutter={16}>
                <Col span={12}>
                  <Card bodyStyle={{ padding: 16 }} className="glass-card">
                    <Statistic title="Đơn xin nghỉ" value={user.leaveCount} valueStyle={{ color: '#f59e0b' }} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card bodyStyle={{ padding: 16 }} className="glass-card">
                    <Statistic title="Đơn đổi ca" value={user.swapCount} valueStyle={{ color: '#3b82f6' }} />
                  </Card>
                </Col>
              </Row>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    </Modal>
  );
};

export default UserDetailModal;
