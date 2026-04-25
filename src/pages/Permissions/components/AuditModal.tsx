import React from 'react';
import { Modal, Tag, List, Avatar, Typography, Space, Empty, Tooltip } from 'antd';
import { Button } from '@/components/common';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
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
        <div style={{ textAlign: 'left', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TeamOutlined style={{ color: 'var(--primary-color)', fontSize: 20 }} />
            <div>
              <Text strong style={{ fontSize: 18, display: 'block' }}>Danh sách thành viên</Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                Cơ chế: <Text strong>{auditType === 'role' ? 'Theo vai trò' : auditType === 'permission' ? 'Theo quyền' : 'Theo module'}</Text> - 
                Mục: <Tag color="blue" style={{ borderRadius: 4, margin: 0 }}>{selectedAuditId}</Tag>
              </Text>
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Button 
            variant="outline" 
            onClick={onCancel}
            style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Đóng
          </Button>
        </div>
      }
      width={650}
      centered
      destroyOnClose
      className="premium-modal"
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 8px' }}>
        {auditedUsers.length > 0 ? (
          <List
            dataSource={auditedUsers}
            renderItem={item => (
              <List.Item 
                style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 0' }}
                actions={[
                  <Button 
                    key="view" 
                    variant="ghost" 
                    buttonSize="small"
                    onClick={() => onViewDetail(item)}
                  >
                    Chi tiết
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      size={48} 
                      src={item.avatar} 
                      icon={<UserOutlined />} 
                      style={{ border: '2px solid #f0f0f0' }}
                    />
                  }
                  title={<Text strong style={{ fontSize: 16 }}>{item.name}</Text>}
                  description={
                    <Space wrap style={{ marginTop: 4 }}>
                      <Tag color="blue" style={{ borderRadius: 4 }}>{item.department || 'Chưa xếp ban'}</Tag>
                      <Tag color="orange" style={{ borderRadius: 4 }}>{item.position || 'Thành viên'}</Tag>
                      {item.roleIds?.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ({roles.filter(r => item.roleIds.includes(r.id)).map(r => r.name).join(', ')})
                        </Text>
                      )}
                    </Space>
                  }
                />
                {item.customPermissions?.extra?.includes(selectedAuditId) && (
                  <Tooltip title="Được cấp quyền riêng lẻ (không qua vai trò)">
                    <Tag color="success" style={{ borderRadius: 10 }}>Quyền riêng (+)</Tag>
                  </Tooltip>
                )}
              </List.Item>
            )}
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
