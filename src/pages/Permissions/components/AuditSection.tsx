import React from 'react';
import { Row, Col, Card, Space, Typography, Select, Divider, Empty, List, Avatar, Tag, Tooltip } from 'antd';
import { TeamOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { Button } from '@/components/common';
import { Role } from '@/services/role.service';

const { Text } = Typography;

interface AuditSectionProps {
  auditType: 'role' | 'permission' | 'module';
  setAuditType: (type: any) => void;
  selectedAuditId: any;
  setSelectedAuditId: (id: any) => void;
  roles: Role[];
  permissionGroups: any[];
  auditedUsers: any[];
  onEditAccess: (user: any) => void;
}

const AuditSection: React.FC<AuditSectionProps> = ({
  auditType,
  setAuditType,
  selectedAuditId,
  setSelectedAuditId,
  roles,
  permissionGroups,
  auditedUsers,
  onEditAccess
}) => {
  return (
    <Row gutter={24}>
      <Col span={8}>
        <Card title="Chọn tiêu chí kiểm tra" style={{ borderRadius: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">Loại kiểm tra:</Text>
            <Select 
              style={{ width: '100%' }} 
              value={auditType} 
              onChange={(val) => {
                setAuditType(val);
                setSelectedAuditId(null);
              }}
            >
              <Select.Option value="role">Theo Vai trò (Group)</Select.Option>
              <Select.Option value="permission">Theo Quyền hạn (Permission)</Select.Option>
              <Select.Option value="module">Theo Nhóm chức năng (Module)</Select.Option>
            </Select>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Text type="secondary">
              {auditType === 'role' ? 'Chọn vai trò:' : 
               auditType === 'permission' ? 'Chọn quyền hạn:' : 
               'Chọn nhóm chức năng:'}
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn mục cần kiểm tra..."
              showSearch
              value={selectedAuditId}
              onChange={setSelectedAuditId}
            >
              {auditType === 'role' ? (
                roles.map(r => <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>)
              ) : auditType === 'module' ? (
                permissionGroups.map(g => <Select.Option key={g.category} value={g.category}>{g.category}</Select.Option>)
              ) : (
                permissionGroups.flatMap(g => g.actions).map(a => (
                  <Select.Option key={a.key} value={a.key}>{a.name} ({a.key})</Select.Option>
                ))
              )}
            </Select>
          </Space>
        </Card>
      </Col>
      <Col span={16}>
        <Card 
          title={
            <Space>
              <TeamOutlined />
              <span>Danh sách người dùng ({auditedUsers.length})</span>
            </Space>
          }
          style={{ borderRadius: 12 }}
        >
          {!selectedAuditId ? (
            <Empty description="Vui lòng chọn tiêu chí để xem danh sách" />
          ) : (
            <List
              dataSource={auditedUsers}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                    title={<Text strong>{item.name}</Text>}
                    description={
                      <Space>
                        <Tag color="cyan">{item.department || 'Không ban'}</Tag>
                        <Tag color="purple">{item.position || 'Thành viên'}</Tag>
                      </Space>
                    }
                  />
                  <Space>
                    {item.customPermissions?.extra?.length > 0 && (
                      <Tooltip title={`Được cấp thêm: ${item.customPermissions.extra.join(', ')}`}>
                        <Tag color="orange">Quyền riêng (+)</Tag>
                      </Tooltip>
                    )}
                    <Button 
                      variant="ghost" 
                      buttonSize="small"
                      icon={<EditOutlined />} 
                      onClick={() => onEditAccess(item)}
                    >
                      Chỉnh sửa
                    </Button>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default AuditSection;
