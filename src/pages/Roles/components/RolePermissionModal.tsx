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
  Alert,
  Tooltip,
  Form,
  Input
} from 'antd';
import { 
  SafetyOutlined, 
  AppstoreOutlined,
  PlusOutlined
} from '@ant-design/icons';
import roleService, { Role } from '@/services/role.service';
import permissionService from '@/services/permission.service';
import Button from '@/components/common/Button';
import { useAccess } from '@/hooks/useAccess';

const { Panel } = Collapse;
const { Text } = Typography;

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
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [permForm] = Form.useForm();
  const [currentModule, setCurrentModule] = useState<string>('');

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

  const handleCreatePermission = async (values: any) => {
    try {
      setSaving(true);
      const res = await permissionService.create(values);
      if (res.success) {
        message.success('Thêm hành động mới thành công');
        setIsPermModalVisible(false);
        fetchData(); // Refresh list to show new action
      }
    } catch (error) {
      message.error('Lỗi khi tạo hành động');
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
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Space>
            <SafetyOutlined style={{ color: 'var(--primary-color)' }} />
            <Text strong style={{ fontSize: 18 }}>
              Phân quyền chi tiết: {role?.name}
            </Text>
          </Space>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      centered
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
          <Button 
            variant="outline" 
            onClick={onCancel}
            style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            loading={saving} 
            onClick={handleSave}
            disabled={role?.key === 'admin'}
            style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Lưu thay đổi
          </Button>
        </div>
      }
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
                              setCurrentModule(group.category);
                              permForm.resetFields();
                              permForm.setFieldsValue({ module: group.category });
                              setIsPermModalVisible(true);
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

      {/* Quick Add Permission Modal */}
      <Modal
        title={
          <div style={{ textAlign: 'left', width: '100%' }}>
            <Space>
              <PlusOutlined style={{ color: 'var(--primary-color)' }} />
              <Text strong style={{ fontSize: 18 }}>
                Thêm hành động mới: {currentModule}
              </Text>
            </Space>
          </div>
        }
        open={isPermModalVisible}
        onCancel={() => setIsPermModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsPermModalVisible(false)}
              style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={() => permForm.submit()}
              loading={saving}
              style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Tạo hành động
            </Button>
          </div>
        }
        width={600}
        centered
        destroyOnClose
      >
        <Form
          form={permForm}
          layout="vertical"
          onFinish={handleCreatePermission}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="module" hidden><Input /></Form.Item>
          
          <Form.Item
            name="name"
            label="Tên hành động"
            rules={[{ required: true, message: 'Nhập tên hành động' }]}
          >
            <Input placeholder="VD: Gửi thông báo, In báo cáo..." size="large" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Mã định danh (Key)"
            rules={[
              { required: true, message: 'Nhập mã key' },
              { pattern: /^[a-z0-9_:]+$/, message: 'vd: module:action' }
            ]}
          >
            <Input placeholder="vd: documents:print" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default RolePermissionModal;
