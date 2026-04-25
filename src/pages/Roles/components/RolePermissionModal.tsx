import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Checkbox, 
  Collapse, 
  Space, 
  Typography, 
  Tag, 
  Row, 
  Col, 
  Spin, 
  message,
  Divider,
  Alert
} from 'antd';
import { 
  SafetyOutlined, 
  AppstoreOutlined,
  CheckCircleFilled,
  PlusOutlined
} from '@ant-design/icons';
import roleService, { Role } from '@/services/role.service';
import permissionService from '@/services/permission.service';
import Button from '@/components/common/Button';
import { useAccess } from '@/hooks/useAccess';

const { Panel } = Collapse;
const { Text, Title } = Typography;

interface RolePermissionModalProps {
  open: boolean;
  role: Role | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const RolePermissionModal: React.FC<RolePermissionModalProps> = ({ 
  open, 
  role, 
  onCancel, 
  onSuccess 
}) => {
  const { hasPermission } = useAccess();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (open && role) {
      fetchData();
      setSelectedPermissions(role.permissions || []);
    }
  }, [open, role]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const groups = await permissionService.getGroupedPermissions();
      setPermissionGroups(groups || []);
    } catch (error) {
      message.error('Không thể tải danh sách quyền hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllInGroup = (groupActions: any[], checked: boolean) => {
    const actionKeys = groupActions.map(a => a.key);
    if (checked) {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...actionKeys])));
    } else {
      setSelectedPermissions(prev => prev.filter(key => !actionKeys.includes(key)));
    }
  };

  const handleTogglePermission = (key: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, key]);
    } else {
      setSelectedPermissions(prev => prev.filter(k => k !== key));
    }
  };

  const handleSave = async () => {
    if (!role) return;

    try {
      setSaving(true);
      
      // Sử dụng patch để cập nhật một phần (chỉ gửi permissions)
      // Điều này giúp tránh việc phải gửi đầy đủ các trường bắt buộc (key, name)
      const res = await roleService.patch(role.id, {
        permissions: selectedPermissions
      });
      
      if (res && res.success) {
        message.success(`Cập nhật quyền thành công`);
        onSuccess();
      } else {
        message.error(res.message || 'Lưu thất bại');
      }
    } catch (error: any) {
      console.error('Save Permission Error:', error);
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || 'Lưu thất bại';
      message.error(`Lỗi: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = (groupActions: any[]) => {
    return groupActions.every(a => selectedPermissions.includes(a.key));
  };

  const isIndeterminate = (groupActions: any[]) => {
    const selectedCount = groupActions.filter(a => selectedPermissions.includes(a.key)).length;
    return selectedCount > 0 && selectedCount < groupActions.length;
  };

  return (
    <Modal
      title={
        <Space>
          <SafetyOutlined style={{ color: 'var(--primary-color)' }} />
          <span>Phân quyền chi tiết: <Text strong>{role?.name}</Text></span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      centered
      destroyOnClose
      footer={[
        <Button key="cancel" variant="ghost" onClick={onCancel}>Hủy</Button>,
        <Button 
          key="save" 
          variant="primary" 
          loading={saving} 
          onClick={handleSave}
          disabled={role?.key === 'admin'}
        >
          Lưu thay đổi
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '4px 16px' }}>
          {role?.key === 'admin' && (
            <Alert 
              message="Vai trò Admin"
              description="Vai trò này mặc định có toàn bộ quyền trong hệ thống (*) và không thể chỉnh sửa."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Collapse ghost defaultActiveKey={permissionGroups.map(g => g.category)}>
            {permissionGroups.map(group => (
              <Panel 
                key={group.category} 
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Space>
                      <AppstoreOutlined />
                      <Text strong>{group.category}</Text>
                      <Tag color="blue">{group.actions.length} hành động</Tag>
                    </Space>
                    <Space size="middle" onClick={e => e.stopPropagation()}>
                      {hasPermission?.('system:permissions:edit') && (
                        <Tooltip title="Thêm hành động mới vào nhóm này">
                          <Button 
                            variant="ghost" 
                            icon={<PlusOutlined />} 
                            buttonSize="small"
                            onClick={() => {
                              // We don't have the permission modal here, 
                              // but we can at least show a message or redirect.
                              // Actually, to keep it simple, I will add a way to open a small input?
                              // Or just tell the user to use the matrix?
                              // Let's stick to the matrix for complex adding, 
                              // but I'll make the matrix ADD button very clear.
                              message.info('Vui lòng vào trang "Ma trận Phân quyền" để thêm hành động mới.');
                            }}
                          />
                        </Tooltip>
                      )}
                      <Checkbox
                        indeterminate={isIndeterminate(group.actions)}
                        checked={isAllSelected(group.actions)}
                        onChange={e => handleToggleAllInGroup(group.actions, e.target.checked)}
                        disabled={role?.key === 'admin'}
                      >
                        Chọn tất cả
                      </Checkbox>
                    </Space>
                  </div>
                }
                style={{ marginBottom: 8, background: '#f8f9fa', borderRadius: 8 }}
              >
                <Row gutter={[16, 16]}>
                  {group.actions.map((action: any) => (
                    <Col span={12} key={action.key}>
                      <Checkbox
                        checked={selectedPermissions.includes(action.key) || selectedPermissions.includes('*')}
                        onChange={e => handleTogglePermission(action.key, e.target.checked)}
                        disabled={role?.key === 'admin' || selectedPermissions.includes('*')}
                      >
                        <Space direction="vertical" size={0}>
                          <Text style={{ fontSize: 13 }}>{action.name}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{action.key}</Text>
                        </Space>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Panel>
            ))}
          </Collapse>
        </div>
      </Spin>
    </Modal>
  );
};

export default RolePermissionModal;
