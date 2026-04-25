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
  List,
  Avatar,
  Row,
  Col,
  Dropdown,
  Menu
} from 'antd';
import UsersDetailModal from '../Users/components/Detail';
import { 
  SafetyCertificateOutlined, 
  TeamOutlined, 
  CalendarOutlined, 
  BarChartOutlined,
  SettingOutlined,
  SearchOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  AppstoreOutlined,
  EditOutlined,
  DeleteOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  UserOutlined,
  SolutionOutlined,
  StopOutlined,
  CheckCircleOutlined,
  MoreOutlined
} from '@ant-design/icons';
import roleService, { Role } from '../../services/role.service';
import permissionService, { Permission } from '../../services/permission.service';
import userService from '../../services/user.service';
import Button from '@/components/common/Button';
import { useAccess } from '@/hooks/useAccess';
import { formatDateTime } from '@/utils/formatters';
import './styles.less';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PermissionsPage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('matrix');
  
   // Audit states
  const [auditType, setAuditType] = useState<'role' | 'permission' | 'module'>('role');
  const [selectedAuditId, setSelectedAuditId] = useState<any>(null);
  const [isAuditModalVisible, setIsAuditModalVisible] = useState(false);
  const [isUserDetailVisible, setIsUserDetailVisible] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any>(null);

  // Modal states
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [isUserAccessModalVisible, setIsUserAccessModalVisible] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [editingUserAccess, setEditingUserAccess] = useState<any>(null);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [userAccessForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, groupsRes, usersRes] = await Promise.all([
        roleService.getAll(),
        permissionService.getGroupedPermissions(),
        userService.getAll({ limit: 1000 }) // Fetch all for audit (up to 1000)
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (groupsRes) {
        setPermissionGroups(groupsRes);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
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

      const res = await roleService.patch(role.id, { permissions: newPermissions });
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

  const handleUpdateUserAccess = async (values: any) => {
    if (!editingUserAccess) return;
    try {
      setLoading(true);
      const res = await userService.patch(editingUserAccess.id, values);
      if (res.success) {
        message.success(`Đã cập nhật quyền hạn cho ${editingUserAccess.name}`);
        setIsUserAccessModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Lỗi khi cập nhật quyền hạn người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (values: any) => {
    try {
      setLoading(true);
      const res = await roleService.create({ ...values, isActive: true, permissions: [] });
      if (res.success) {
        message.success(`Đã tạo vai trò mới: ${values.name}`);
        setIsRoleModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Lỗi khi tạo vai trò mới');
    } finally {
      setLoading(false);
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

  // Audit calculations
  const auditedUsers = useMemo(() => {
    if (!selectedAuditId) return [];
    
    if (auditType === 'role') {
      return users.filter(u => Array.isArray(u.roleIds) && u.roleIds.includes(selectedAuditId));
    } else if (auditType === 'permission') {
      const targetPerm = selectedAuditId;
      return users.filter(u => {
        if (u.customPermissions?.extra?.includes(targetPerm)) return true;
        if (u.customPermissions?.denied?.includes(targetPerm)) return false;
        const userRoles = roles.filter(r => u.roleIds?.includes(r.id));
        return userRoles.some(r => r.permissions?.includes(targetPerm) || r.permissions?.includes('*'));
      });
    } else if (auditType === 'module') {
      // Find all permissions in this module
      const group = permissionGroups.find(g => g.category === selectedAuditId);
      if (!group) return [];
      const modulePerms = group.actions.map((a: any) => a.key);
      
      return users.filter(u => {
        // Has ANY extra permission from this module
        if (u.customPermissions?.extra?.some((p: string) => modulePerms.includes(p))) return true;
        
        // Has ANY role that has ANY permission from this module
        const userRoles = roles.filter(r => u.roleIds?.includes(r.id));
        return userRoles.some(r => 
          r.permissions?.includes('*') || 
          r.permissions?.some((p: string) => modulePerms.includes(p))
        );
      });
    }
    return [];
  }, [auditType, selectedAuditId, users, roles, permissionGroups]);

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
        width: 260,
        render: (text: string, record: any) => (
          <div className="permission-row-info">
            <Space direction="vertical" size={0}>
              <Text strong>{text}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.key}</Text>
            </Space>
            <div className="permission-row-actions">
              <Dropdown
                trigger={['click']}
                overlay={
                  <Menu items={[
                    {
                      key: 'audit',
                      icon: <UserOutlined />,
                      label: 'Xem người dùng',
                      onClick: () => {
                        setAuditType('permission');
                        setSelectedAuditId(record.key);
                        setIsAuditModalVisible(true);
                      }
                    },
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Chỉnh sửa',
                      onClick: () => {
                        setEditingPerm(record);
                        form.setFieldsValue(record);
                        setIsPermModalVisible(true);
                      }
                    },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Xóa quyền',
                      danger: true,
                      onClick: () => {
                        Modal.confirm({
                          title: 'Xác nhận xóa quyền?',
                          content: `Bạn có chắc chắn muốn xóa quyền "${record.name}"? Hành động này không thể hoàn tác.`,
                          okText: 'Xóa',
                          okType: 'danger',
                          cancelText: 'Hủy',
                          onOk: () => handleDeletePermission(record.id)
                        });
                      }
                    }
                  ]} />
                }
              >
                <Button variant="ghost" icon={<MoreOutlined />} />
              </Dropdown>
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
        scroll={{ x: 'max-content' }}
      />
    );
  };

  return (
    <div className="permissions-matrix-page">
      <div className="page-header-wrapper" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              <SafetyCertificateOutlined style={{ marginRight: 12, color: 'var(--primary-color)' }} />
              Phân quyền hệ thống
            </Title>
            <Text type="secondary">Quản lý ma trận vai trò, hành động và kiểm soát truy cập chi tiết</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space size="small" wrap>
              <Input 
                placeholder="Tìm hành động..." 
                prefix={<SearchOutlined />} 
                style={{ width: 220, borderRadius: 6 }}
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
                    Tạo CRUD
                  </Button>
                  <Button 
                    variant="outline" 
                    icon={<TeamOutlined />} 
                    onClick={() => {
                      roleForm.resetFields();
                      setIsRoleModalVisible(true);
                    }}
                    style={{ color: '#1890ff' }}
                  >
                    Thêm vai trò
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
          </Col>
        </Row>
      </div>

      <Card bordered={false} className="main-content-card">

      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'matrix',
            label: <Space><BlockOutlined />Ma trận Quyền hạn</Space>,
            children: (
              <>
                <Alert
                  message="Mẹo quản trị"
                  description="Bạn có thể tạo thêm Vai trò mới trong mục 'Quản lý Vai trò' và các cột sẽ tự động hiển thị tại đây. Nhấn vào biểu tượng User để xem danh sách người dùng có quyền đó."
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
                              <Tooltip title="Xem tất cả người dùng có quyền trong nhóm này">
                                <Button 
                                  variant="ghost" 
                                  buttonSize="small"
                                  icon={<UserOutlined />} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAuditType('module');
                                    setSelectedAuditId(group.category);
                                    setIsAuditModalVisible(true);
                                  }}
                                />
                              </Tooltip>
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
                        style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', borderRadius: 0, paddingBottom: 16 }}
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
            label: <Space><SolutionOutlined />Kiểm tra Người dùng</Space>,
            children: (
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
                                onClick={() => {
                                  setEditingUserAccess(item);
                                  userAccessForm.setFieldsValue({
                                    roleIds: item.roleIds,
                                    customPermissions: item.customPermissions || { extra: [], denied: [] }
                                  });
                                  setIsUserAccessModalVisible(true);
                                }}
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
            )
          }
        ]}
      />
    </Card>

      {/* Permission Modal */}
      <Modal
        title={
          <div style={{ textAlign: 'left', width: '100%' }}>
            <Space>
              <PlusSquareOutlined style={{ color: 'var(--primary-color)' }} />
              <Text strong style={{ fontSize: 18 }}>
                {editingPerm ? "Cấu hình hành động" : "Định nghĩa Hành động"}
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
              onClick={() => form.submit()}
              style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              {editingPerm ? "Lưu lại" : "Tạo ngay"}
            </Button>
          </div>
        }
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
        title={
          <div style={{ textAlign: 'left', width: '100%' }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#722ed1' }} />
              <Text strong style={{ fontSize: 18 }}>Tạo nhanh bộ quyền CRUD</Text>
            </Space>
          </div>
        }
        open={isBulkModalVisible}
        onCancel={() => setIsBulkModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsBulkModalVisible(false)}
              style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={() => bulkForm.submit()}
              style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Tạo ngay
            </Button>
          </div>
        }
        width={550}
        centered
        destroyOnClose
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

      {/* User Access Modal */}
      <Modal
        title={
          <div style={{ textAlign: 'left', width: '100%' }}>
            <Space>
              <SafetyCertificateOutlined style={{ color: '#faad14' }} />
              <Text strong style={{ fontSize: 18 }}>Thiết lập quyền đặc biệt</Text>
            </Space>
          </div>
        }
        open={isUserAccessModalVisible}
        onCancel={() => setIsUserAccessModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsUserAccessModalVisible(false)}
              style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={() => userAccessForm.submit()}
              style={{ minWidth: 150, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Lưu thiết lập
            </Button>
          </div>
        }
        width={650}
        centered
        destroyOnClose
      >
        <Form
          form={userAccessForm}
          layout="vertical"
          onFinish={handleUpdateUserAccess}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="roleIds" label={<Text strong>Vai trò hệ thống (Groups)</Text>}>
            <Select
              mode="multiple"
              placeholder="Chọn vai trò..."
              style={{ width: '100%' }}
              options={roles.map(r => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />
          <Alert 
            message="Quyền tùy chỉnh sẽ ghi đè lên quyền từ vai trò. Extra sẽ thêm quyền mới, Denied sẽ chặn quyền hiện có."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name={['customPermissions', 'extra']} 
                label={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> Cấp thêm quyền riêng</Space>}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn thêm quyền..."
                  options={permissionGroups.flatMap(g => g.actions).map(a => ({ label: a.name, value: a.key }))}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name={['customPermissions', 'denied']} 
                label={<Space><StopOutlined style={{ color: '#ff4d4f' }} /> Chặn quyền cụ thể</Space>}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn quyền cần chặn..."
                  options={permissionGroups.flatMap(g => g.actions).map(a => ({ label: a.name, value: a.key }))}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Audit User Modal */}
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
        open={isAuditModalVisible}
        onCancel={() => setIsAuditModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsAuditModalVisible(false)}
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
                      onClick={() => {
                        setSelectedUserForDetail(item);
                        setIsUserDetailVisible(true);
                      }}
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

      {/* Quick Role Create Modal */}
      <Modal
        title={
          <div style={{ textAlign: 'center', width: '100%', paddingRight: 32 }}>
            <Title level={4} style={{ margin: 0 }}>
              <TeamOutlined style={{ marginRight: 12, color: '#1890ff' }} />
              Thêm Vai trò mới
            </Title>
            <Text type="secondary">Định nghĩa nhóm vai trò mới cho hệ thống</Text>
          </div>
        }
        open={isRoleModalVisible}
        onCancel={() => setIsRoleModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsRoleModalVisible(false)}
              style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={() => roleForm.submit()}
              style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Tạo vai trò
            </Button>
          </div>
        }
        width={500}
        centered
        destroyOnClose
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={handleCreateRole}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên vai trò"
            rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
          >
            <Input placeholder="VD: Ban Kỹ thuật, Trưởng nhóm..." size="large" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Mã định danh (Key)"
            rules={[
              { required: true, message: 'Vui lòng nhập mã key' },
              { pattern: /^[a-z0-9_]+$/, message: 'Chữ thường, số và dấu gạch dưới' }
            ]}
          >
            <Input placeholder="vd: ban_ky_thuat" size="large" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả phạm vi quyền hạn của vai trò này..." />
          </Form.Item>
        </Form>
      </Modal>


      {/* User Detail Modal Connection */}
      <UsersDetailModal
        open={isUserDetailVisible}
        user={selectedUserForDetail}
        avatarFallback="https://ui-avatars.com/api/?background=random"
        formatDateTime={formatDateTime}
        onCancel={() => {
          setIsUserDetailVisible(false);
          setSelectedUserForDetail(null);
        }}
      />
    </div>
  );
};

export default PermissionsPage;
