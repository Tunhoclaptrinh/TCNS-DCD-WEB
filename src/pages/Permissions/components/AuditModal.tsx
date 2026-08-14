import React from 'react';
import { Modal, Tag, List, Avatar, Typography, Space, Empty, Tooltip } from 'antd';
import { Button } from '@/components/common';
import { TeamOutlined, UserOutlined, CrownOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Role } from '@/services/role.service';

const { Text } = Typography;

interface AuditModalProps {
  visible: boolean;
  onCancel: () => void;
  auditType: 'role' | 'permission' | 'module';
  selectedAuditId: string | null;
  auditedUsers: any[];
  roles: Role[];
  onViewDetail: (user: any) => void;
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

const AuditModal: React.FC<AuditModalProps> = ({
  visible,
  onCancel,
  auditType,
  selectedAuditId,
  auditedUsers,
  roles,
  onViewDetail
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--primary-color-bg, #e6f7ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TeamOutlined style={{ color: 'var(--primary-color)', fontSize: 18 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16, lineHeight: 1.3, display: 'block' }}>Danh sách TV</Text>
            <Space size={6} style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Cơ chế:</Text>
              <Text strong style={{ fontSize: 12 }}>{auditType === 'role' ? 'Theo vai trò' : auditType === 'permission' ? 'Theo quyền' : 'Theo module'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>• Mục:</Text>
              <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>{selectedAuditId}</Tag>
            </Space>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px 0' }}>
          <Button 
            variant="outline" 
            buttonSize="small"
            onClick={onCancel}
            style={{ minWidth: 88, height: 32 }}
          >
            Đóng
          </Button>
        </div>
      }
      width={600}
      destroyOnClose
      className="premium-modal"
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 4px' }}>
        {auditedUsers.length > 0 ? (
          <List
            dataSource={auditedUsers}
            renderItem={item => {
              const displayName = getUserDisplayName(item);
              const deptName = getDepartmentName(item);
              const posName = getPositionName(item);
              const matchedRoles = roles.filter(r => 
                item.roleIds?.includes(r.id) || item.roleId === r.id || item.role?.id === r.id
              );
              const userRolesText = matchedRoles.map(r => r.name).join(', ');
              const hasAdminSuper = matchedRoles.some(r => r.permissions?.includes('*'));
              const isExtraPerm = selectedAuditId && item.customPermissions?.extra?.includes(selectedAuditId);

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
                        src={item.avatar} 
                        icon={<UserOutlined />} 
                        style={{ border: '1px solid #e8e8e8', backgroundColor: 'var(--primary-color)' }}
                      />
                    }
                    title={
                      <Space size={8} align="center">
                        <Text strong style={{ fontSize: 14 }}>{displayName}</Text>
                        {hasAdminSuper ? (
                          <Tooltip title="Thành viên có quyền tối cao Admin System (*)">
                            <Tag color="gold" style={{ borderRadius: 10, margin: 0, fontSize: 10, display: 'inline-flex', alignItems: 'center' }}>
                              <CrownOutlined style={{ marginRight: 4 }} /> Admin (Toàn quyền)
                            </Tag>
                          </Tooltip>
                        ) : isExtraPerm ? (
                          <Tooltip title="Được cấp quyền riêng lẻ (không qua vai trò)">
                            <Tag color="success" style={{ borderRadius: 10, margin: 0, fontSize: 10, display: 'inline-flex', alignItems: 'center' }}>
                              <ThunderboltOutlined style={{ marginRight: 4 }} /> Quyền riêng (+)
                            </Tag>
                          </Tooltip>
                        ) : matchedRoles.length > 0 ? (
                          <Tooltip title={`Quyền được kế thừa từ Vai trò (${userRolesText})`}>
                            <Tag color="purple" style={{ borderRadius: 10, margin: 0, fontSize: 10, display: 'inline-flex', alignItems: 'center' }}>
                              <SafetyCertificateOutlined style={{ marginRight: 4 }} /> Qua Vai trò
                            </Tag>
                          </Tooltip>
                        ) : null}
                      </Space>
                    }
                    description={
                      <Space wrap size={6} style={{ marginTop: 4 }}>
                        <Tag color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>{deptName}</Tag>
                        {posName && (
                          <Tag color="orange" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>{posName}</Tag>
                        )}
                        {userRolesText && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            (Vai trò: {userRolesText})
                          </Text>
                        )}
                      </Space>
                    }
                  />
                  <Button 
                    key="view" 
                    variant="outline" 
                    buttonSize="small"
                    onClick={() => onViewDetail(item)}
                    style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                  >
                    Chi tiết
                  </Button>
                </List.Item>
              );
            }}
          />
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Empty description="Không tìm thấy thành viên nào thỏa mãn điều kiện này" />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AuditModal;
