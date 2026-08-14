import React from 'react';
import { Row, Col, Space, Typography, Select, Divider, Empty, List, Avatar, Tag, Tooltip } from 'antd';
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

const getUserDisplayName = (user: any) => {
  if (!user) return 'Thành viên';

  // 1. Prioritize Họ và tên đệm + Tên (lastName + firstName)
  if (user.lastName || user.firstName) {
    const fullName = `${user.lastName || ''} ${user.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  // 2. fullName property if non-email
  if (user.fullName && typeof user.fullName === 'string' && user.fullName.trim() && !user.fullName.includes('@')) {
    return user.fullName.trim();
  }

  // 3. displayName property if non-email
  if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim() && !user.displayName.includes('@')) {
    return user.displayName.trim();
  }

  // 4. name property if non-email
  if (user.name && typeof user.name === 'string' && user.name.trim() && !user.name.includes('@')) {
    return user.name.trim();
  }

  // 5. Fallbacks to name, username, or email
  if (user.name && typeof user.name === 'string' && user.name.trim()) return user.name.trim();
  if (user.username && typeof user.username === 'string' && user.username.trim()) return user.username.trim();
  if (user.email && typeof user.email === 'string' && user.email.trim()) return user.email.trim();

  return 'Thành viên';
};

const getDepartmentName = (user: any) => {
  if (!user) return 'Chưa xếp ban';
  if (typeof user.department === 'string' && user.department.trim()) return user.department.trim();
  if (user.department?.name) return user.department.name;
  if (user.departmentName) return user.departmentName;
  return 'Chưa xếp ban';
};

const getPositionName = (user: any) => {
  if (!user) return null;
  if (typeof user.position === 'string' && user.position.trim()) return user.position.trim();
  if (user.position?.name) return user.position.name;
  if (user.positionName) return user.positionName;
  return null;
};

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
    <Row gutter={24} style={{ marginTop: 8 }}>
      <Col xs={24} md={8}>
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16, color: '#1f2937' }}>
            Chọn tiêu chí kiểm tra
          </Text>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Loại kiểm tra:</Text>
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
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
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
            </div>
          </Space>
        </div>
      </Col>

      <Col xs={24} md={16}>
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space align="center">
              <TeamOutlined style={{ color: 'var(--primary-color)', fontSize: 18 }} />
              <Text strong style={{ fontSize: 16 }}>Danh sách TV ({auditedUsers.length})</Text>
            </Space>
          </div>

          {!selectedAuditId ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Empty description="Vui lòng chọn tiêu chí bên trái để xem danh sách thành viên" />
            </div>
          ) : auditedUsers.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Empty description="Không có thành viên nào thỏa mãn tiêu chí kiểm tra này" />
            </div>
          ) : (
            <List
              dataSource={auditedUsers}
              renderItem={item => {
                const displayName = getUserDisplayName(item);
                const deptName = getDepartmentName(item);
                const posName = getPositionName(item);

                return (
                  <List.Item
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      marginBottom: 10,
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={42} 
                          icon={<UserOutlined />} 
                          src={item.avatar} 
                          style={{ border: '1px solid #e8e8e8', backgroundColor: 'var(--primary-color)' }}
                        />
                      }
                      title={<Text strong style={{ fontSize: 14 }}>{displayName}</Text>}
                      description={
                        <Space wrap size={6} style={{ marginTop: 4 }}>
                          <Tag color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>{deptName}</Tag>
                          {posName && (
                            <Tag color="orange" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>{posName}</Tag>
                          )}
                        </Space>
                      }
                    />
                    <Space size={8}>
                      {item.customPermissions?.extra?.length > 0 && (
                        <Tooltip title={`Được cấp thêm quyền riêng: ${item.customPermissions.extra.join(', ')}`}>
                          <Tag color="orange" style={{ borderRadius: 10, margin: 0, fontSize: 10 }}>Quyền riêng (+)</Tag>
                        </Tooltip>
                      )}
                      <Button 
                        variant="outline" 
                        buttonSize="small"
                        icon={<EditOutlined />} 
                        onClick={() => onEditAccess(item)}
                        style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                      >
                        Chỉnh sửa
                      </Button>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </Col>
    </Row>
  );
};

export default AuditSection;
