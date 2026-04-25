import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  Checkbox, 
  Card, 
  Typography, 
  Tag, 
  message, 
  Spin, 
  Space, 
  Alert,
  Input,
  Collapse,
  Modal,
  Form,
  Select,
  Divider,
  Empty,
  Tooltip,
  Tabs,
  Popconfirm
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  TeamOutlined, 
  CalendarOutlined, 
  BarChartOutlined,
  SettingOutlined,
  SearchOutlined,
  PlusOutlined,
  AppstoreOutlined,
  EditOutlined,
  DeleteOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import roleService, { Role } from '../../services/role.service';
import permissionService, { Permission } from '../../services/permission.service';
import Button from '@/components/common/Button';
import { useAccess } from '@/hooks/useAccess';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PermissionsPage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  
  // Modal states
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, groupsRes] = await Promise.all([
        roleService.getAll(),
        permissionService.getGroupedPermissions()
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (groupsRes) {
        setPermissionGroups(groupsRes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePermission = async (role: Role, permissionKey: string, checked: boolean) => {
    if (role.key === 'admin' && permissionKey === '*') {
      message.warning('Không thể thay đổi quyền tối cao của Admin');
      return;
    }

    try {
      setUpdating(`${role.id}-${permissionKey}`);
      
      let newPermissions = [...(role.permissions || [])];
      if (checked) {
        if (!newPermissions.includes(permissionKey)) {
          newPermissions.push(permissionKey);
        }
      } else {
        newPermissions = newPermissions.filter(p => p !== permissionKey);
      }

      const res = await roleService.update(role.id, { permissions: newPermissions });
      if (res.success) {
        setRoles(prev => prev.map(r => r.id === role.id ? { ...r, permissions: newPermissions } : r));
        message.success(`Đã cập nhật quyền cho nhóm ${role.name}`);
      }
    } catch (error) {
      message.error('Lỗi khi cập nhật quyền');
    } finally {
      setUpdating(null);
    }
  };

  const handleSavePermission = async (values: any) => {
    try {
      if (editingPerm) {
        const res = await permissionService.update(editingPerm.id, values);
        if (res.success) message.success('Cập nhật quyền hạn thành công');
      } else {
        const res = await permissionService.create(values);
        if (res.success) message.success('Thêm quyền hạn mới thành công');
      }
      setIsPermModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Thao tác thất bại');
    }
  };

  const handleBulkCreate = async (values: any) => {
    const { moduleKey, moduleName, actions } = values;
    const actionsToCreate = [
      { key: `${moduleKey}:list`, name: `Xem danh sách ${moduleName}`, module: moduleKey },
      { key: `${moduleKey}:read`, name: `Xem chi tiết ${moduleName}`, module: moduleKey },
      { key: `${moduleKey}:create`, name: `Thêm mới ${moduleName}`, module: moduleKey },
      { key: `${moduleKey}:update`, name: `Cập nhật ${moduleName}`, module: moduleKey },
      { key: `${moduleKey}:delete`, name: `Xóa ${moduleName}`, module: moduleKey },
    ].filter(a => actions.includes(a.key.split(':').pop()));

    try {
      setLoading(true);
      await Promise.all(actionsToCreate.map(a => permissionService.create(a)));
      message.success(`Đã tạo bộ quyền CRUD cho module ${moduleName}`);
      setIsBulkModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Lỗi khi tạo bộ quyền');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async (id: number) => {
    try {
      const res = await permissionService.delete(id);
      if (res.success) {
        message.success('Đã xóa quyền hạn');
        fetchData();
      }
    } catch (error) {
      message.error('Lỗi khi xóa');
    }
  };

  // Filter groups and actions based on search
  const filteredGroups = useMemo(() => {
    if (!searchText) return permissionGroups;
    
    return permissionGroups.map(group => {
      const filteredActions = group.actions.filter((action: any) => 
        action.name.toLowerCase().includes(searchText.toLowerCase()) ||
        action.key.toLowerCase().includes(searchText.toLowerCase()) ||
        group.category.toLowerCase().includes(searchText.toLowerCase())
      );
      
      if (filteredActions.length > 0) {
        return { ...group, actions: filteredActions };
      }
      return null;
    }).filter(Boolean);
  }, [permissionGroups, searchText]);

  const getModuleIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('thành viên')) return <TeamOutlined style={{ color: '#1890ff' }} />;
    if (lower.includes('trực')) return <CalendarOutlined style={{ color: '#52c41a' }} />;
    if (lower.includes('thưởng')) return <SafetyCertificateOutlined style={{ color: '#f5222d' }} />;
    if (lower.includes('báo cáo')) return <BarChartOutlined style={{ color: '#722ed1' }} />;
    if (lower.includes('hệ thống')) return <SettingOutlined style={{ color: '#faad14' }} />;
    return <AppstoreOutlined />;
  };

  const renderMatrixTable = (actions: any[]) => {
    const columns = [
      {
        title: 'Hành động / Quyền hạn',
        dataIndex: 'name',
        key: 'name',
        width: 360,
        render: (text: string, record: any) => (
          <div className="permission-row-info">
            <Space direction="vertical" size={0}>
              <Text strong>{text}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.key}</Text>
            </Space>
            <div className="permission-row-actions">
              <Tooltip title="Chỉnh sửa">
                <Button variant="ghost" icon={<EditOutlined />} onClick={() => {
                  setEditingPerm(record);
                  form.setFieldsValue(record);
                  setIsPermModalVisible(true);
                }} />
              </Tooltip>
              <Popconfirm title="Xác nhận xóa quyền?" onConfirm={() => handleDeletePermission(record.id)}>
                <Button variant="ghost" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </div>
          </div>
        )
      },
      ...roles.map(role => ({
        title: (
          <div style={{ textAlign: 'center' }}>
            <Tooltip title={role.description}>
              <Text strong style={{ fontSize: 13, display: 'block' }}>{role.name}</Text>
              <Tag color={role.isActive ? 'blue' : 'default'} style={{ fontSize: 9, margin: 0 }}>
                {role.key.toUpperCase()}
              </Tag>
            </Tooltip>
          </div>
        ),
        key: role.key,
        width: 130,
        align: 'center' as const,
        render: (_: any, record: any) => {
          const hasPermission = role.permissions?.includes('*') || role.permissions?.includes(record.key);
          const isAdminWildcard = role.key === 'admin' && role.permissions?.includes('*');
          const isPending = updating === `${role.id}-${record.key}`;

          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {isPending ? (
                <Spin size="small" />
              ) : (
                <Checkbox 
                  checked={hasPermission}
                  disabled={isAdminWildcard || !role.isActive}
                  onChange={(e) => handleTogglePermission(role, record.key, e.target.checked)}
                />
              )}
            </div>
          );
        }
      }))
    ];

    return (
      <Table 
        columns={columns} 
        dataSource={actions} 
        pagination={false} 
        size="small" 
        bordered
        rowKey="key"
        className="matrix-inner-table"
      />
    );
  };

  return (
    <div className="permissions-matrix-page">
      <Card bordered={false} className="premium-card shadow-sm" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <SafetyCertificateOutlined style={{ marginRight: 12, color: 'var(--primary-color)' }} />
              Hệ thống Phân quyền Toàn diện
            </Title>
            <Text type="secondary">Thiết lập chi tiết Hành động, Nhóm chức năng và Vai trò trong tổ chức</Text>
          </div>
          <Space size="middle">
            <Input 
              placeholder="Tìm kiếm hành động..." 
              prefix={<SearchOutlined />} 
              style={{ width: 250, borderRadius: 8 }}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
            {hasPermission('system:permissions:edit') && (
              <>
                <Button 
                  variant="ghost" 
                  icon={<ThunderboltOutlined />} 
                  onClick={() => setIsBulkModalVisible(true)}
                  style={{ color: '#722ed1' }}
                >
                  Tạo nhanh CRUD
                </Button>
                <Button 
                  variant="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setEditingPerm(null);
                    form.resetFields();
                    setIsPermModalVisible(true);
                  }}
                >
                  Thêm hành động
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      <Tabs 
        defaultActiveKey="matrix" 
        items={[
          {
            key: 'matrix',
            label: <Space><BlockOutlined />Ma trận Quyền hạn</Space>,
            children: (
              <>
                <Alert
                  message="Mẹo quản trị"
                  description="Bạn có thể tạo thêm Vai trò mới trong mục 'Quản lý Vai trò' và các cột sẽ tự động hiển thị tại đây. Nhấn vào tên nhóm chức năng để đóng/mở."
                  type="success"
                  showIcon
                  style={{ marginBottom: 24, borderRadius: 12 }}
                />

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Đang đồng bộ dữ liệu..." />
                  </div>
                ) : filteredGroups.length > 0 ? (
                  <Collapse 
                    defaultActiveKey={filteredGroups.map(g => g.category)}
                    ghost
                    expandIconPosition="right"
                    className="matrix-collapse"
                  >
                    {filteredGroups.map(group => (
                      <Panel 
                        header={
                          <div className="matrix-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space size="middle">
                              <div className="module-icon-wrapper">
                                {getModuleIcon(group.category)}
                              </div>
                              <Text strong style={{ fontSize: 16 }}>{group.category}</Text>
                              <Tag color="blue" style={{ borderRadius: 10 }}>{group.actions.length} hành động</Tag>
                            </Space>
                            {hasPermission('system:permissions:edit') && (
                              <Button 
                                variant="ghost" 
                                icon={<PlusOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPerm(null);
                                  form.resetFields();
                                  form.setFieldsValue({ module: group.category });
                                  setIsPermModalVisible(true);
                                }}
                              >
                                Thêm hành động
                              </Button>
                            )}
                          </div>
                        } 
                        key={group.category}
                        className="matrix-panel"
                      >
                        {renderMatrixTable(group.actions)}
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <Empty description="Không tìm thấy hành động nào" />
                )}
              </>
            )
          },
          {
            key: 'audit',
            label: <Space><InfoCircleOutlined />Nhật ký Thay đổi</Space>,
            children: <Card style={{ borderRadius: 12 }}><Empty description="Tính năng đang phát triển" /></Card>
          }
        ]}
      />

      {/* Permission Modal */}
      <Modal
        title={editingPerm ? "Cấu hình hành động" : "Định nghĩa Hành động mới"}
        open={isPermModalVisible}
        onCancel={() => setIsPermModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
        centered
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSavePermission}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên hành động / Quyền hạn"
            rules={[{ required: true, message: 'Nhập tên hành động' }]}
          >
            <Input placeholder="VD: Duyệt đơn xin nghỉ, Gắn kíp trực..." size="large" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Mã định danh (Permission Key)"
            rules={[
              { required: true, message: 'Nhập mã key' },
              { pattern: /^[a-z0-9_:]+$/, message: 'Định dạng module:action (vd: duty:approve)' }
            ]}
          >
            <Input placeholder="vd: users:promote" disabled={!!editingPerm} size="large" />
          </Form.Item>

          <Form.Item
            name="module"
            label="Nhóm chức năng (Module)"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập nhóm chức năng' }]}
          >
            <Select 
              placeholder="Chọn nhóm hoặc nhập tên nhóm mới" 
              showSearch
              mode="tags"
              size="large"
              options={permissionGroups.map(g => ({ value: g.category, label: g.category }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '0 8px 4px' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Gõ tên nhóm mới và nhấn Enter để tạo
                    </Text>
                  </div>
                </>
              )}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả tác vụ này cho phép làm gì..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk CRUD Modal */}
      <Modal
        title={<Space><ThunderboltOutlined /> Tạo nhanh bộ quyền CRUD</Space>}
        open={isBulkModalVisible}
        onCancel={() => setIsBulkModalVisible(false)}
        onOk={() => bulkForm.submit()}
        centered
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkCreate}
          initialValues={{ actions: ['list', 'read', 'create', 'update', 'delete'] }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="moduleName" label="Tên chức năng (VD: Thiết bị)" rules={[{ required: true }]}>
            <Input placeholder="VD: Quản lý Kho" size="large" />
          </Form.Item>
          <Form.Item name="moduleKey" label="Mã Module (VD: devices)" rules={[{ required: true }]}>
            <Input placeholder="vd: files" size="large" />
          </Form.Item>
          <Form.Item name="actions" label="Các hành động cần tạo">
            <Checkbox.Group options={[
              { label: 'Xem danh sách', value: 'list' },
              { label: 'Xem chi tiết', value: 'read' },
              { label: 'Thêm mới', value: 'create' },
              { label: 'Cập nhật', value: 'update' },
              { label: 'Xóa', value: 'delete' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .permissions-matrix-page .matrix-collapse .ant-collapse-item {
          background: #fff;
          margin-bottom: 20px;
          border-radius: 16px !important;
          border: 1px solid #f0f0f0;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .permissions-matrix-page .matrix-panel-header {
          width: 100%;
        }
        .permissions-matrix-page .module-icon-wrapper {
          width: 40px;
          height: 40px;
          background: #fff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .permissions-matrix-page .permission-row-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .permissions-matrix-page .permission-row-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .permissions-matrix-page tr:hover .permission-row-actions {
          opacity: 1;
        }
        .permissions-matrix-page .matrix-inner-table {
          margin: -16px;
        }
        .permissions-matrix-page .ant-tabs-nav::before {
          border-bottom: none;
        }
        .permissions-matrix-page .ant-tabs-tab {
          font-weight: 600;
          padding: 12px 16px;
        }
      `}} />
    </div>
  );
};

export default PermissionsPage;
