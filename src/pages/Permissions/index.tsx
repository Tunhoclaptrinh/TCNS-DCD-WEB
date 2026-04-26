import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Typography, 
  message, 
  Spin, 
  Space, 
  Collapse,
  Tabs,
  Row,
  Col,
  Modal,
  Form,
  Tag,
  Empty,
  Input,
  Dropdown,
  Menu,
  Tooltip
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  PlusOutlined, 
  BlockOutlined, 
  ThunderboltOutlined,
  SolutionOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  DownOutlined
} from '@ant-design/icons';

// Services
import roleService, { Role } from '@/services/role.service';
import permissionService, { Permission } from '@/services/permission.service';
import userService from '@/services/user.service';

// Components
import { Button } from '@/components/common';
import UsersDetailModal from '../Users/components/Detail';
import PermModal from './components/PermModal';
import BulkModal from './components/BulkModal';
import UserAccessModal from './components/UserAccessModal';
import AuditModal from './components/AuditModal';
import RoleModal from './components/RoleModal';
import GuideModal from './components/GuideModal';
import MatrixTable from './components/MatrixTable';
import AuditSection from './components/AuditSection';

// Utils & Hooks
import { useAccess } from '@/hooks/useAccess';
import { formatDateTime } from '@/utils/formatters';
import './styles.less';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PermissionsPage: React.FC = () => {
  const { hasPermission } = useAccess();
  
  // Data States
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('matrix');
  
  // Audit States
  const [auditType, setAuditType] = useState<'role' | 'permission' | 'module'>('role');
  const [selectedAuditId, setSelectedAuditId] = useState<any>(null);
  const [isAuditModalVisible, setIsAuditModalVisible] = useState(false);
  const [isUserDetailVisible, setIsUserDetailVisible] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any>(null);

  // Modal Visibility States
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [isUserAccessModalVisible, setIsUserAccessModalVisible] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
  
  // Form States
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [editingUserAccess, setEditingUserAccess] = useState<any>(null);
  
  const [pForm] = Form.useForm();
  const [bForm] = Form.useForm();
  const [uaForm] = Form.useForm();
  const [rForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, groupsRes, usersRes] = await Promise.all([
        roleService.getAll(),
        permissionService.getGroupedPermissions(),
        userService.getAll({ limit: 1000 })
      ]);

      if (rolesRes.success && rolesRes.data) setRoles(rolesRes.data);
      if (groupsRes) setPermissionGroups(groupsRes);
      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const hasSeenGuide = localStorage.getItem('hasSeenPermGuide');
    if (!hasSeenGuide) {
      setIsGuideModalVisible(true);
      localStorage.setItem('hasSeenPermGuide', 'true');
    }
  }, []);

  // Filtered Groups for Search
  const filteredGroups = useMemo(() => {
    if (!searchText) return permissionGroups;
    const lowerSearch = searchText.toLowerCase();
    return permissionGroups.map(group => ({
      ...group,
      actions: group.actions.filter((a: any) => 
        a.name.toLowerCase().includes(lowerSearch) || 
        a.key.toLowerCase().includes(lowerSearch)
      )
    })).filter(group => group.actions.length > 0);
  }, [permissionGroups, searchText]);

  // Audited Users
  const auditedUsers = useMemo(() => {
    if (!selectedAuditId) return [];
    if (auditType === 'role') {
      return users.filter(u => u.roleIds?.includes(selectedAuditId));
    } else if (auditType === 'permission') {
      return users.filter(u => {
        const userRoles = roles.filter(r => u.roleIds?.includes(r.id));
        const hasFromRole = userRoles.some(r => r.permissions?.includes('*') || r.permissions?.includes(selectedAuditId));
        const isExtra = u.customPermissions?.extra?.includes(selectedAuditId);
        const isDenied = u.customPermissions?.denied?.includes(selectedAuditId);
        return (hasFromRole || isExtra) && !isDenied;
      });
    } else if (auditType === 'module') {
      const group = permissionGroups.find(g => g.category === selectedAuditId);
      if (!group) return [];
      const moduleActions = group.actions.map((a: any) => a.key) || [];
      return users.filter(u => {
        const userRoles = roles.filter(r => u.roleIds?.includes(r.id));
        const hasModuleFromRole = userRoles.some(r => r.permissions?.includes('*') || r.permissions?.some((p: string) => moduleActions.includes(p)));
        const hasModuleFromExtra = u.customPermissions?.extra?.some((p: string) => moduleActions.includes(p));
        return hasModuleFromRole || hasModuleFromExtra;
      });
    }
    return [];
  }, [users, auditType, selectedAuditId, roles, permissionGroups]);

  // Handlers
  const handleTogglePermission = async (role: Role, permissionKey: string, checked: boolean) => {
    if (role.key === 'admin' && permissionKey === '*') {
      message.warning('Không thể thay đổi quyền tối cao của Admin');
      return;
    }
    try {
      setUpdating(`${role.id}-${permissionKey}`);
      let newPermissions = [...(role.permissions || [])];
      if (checked) {
        if (!newPermissions.includes(permissionKey)) newPermissions.push(permissionKey);
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
      const res = editingPerm ? await permissionService.update(editingPerm.id, values) : await permissionService.create(values);
      if (res.success) {
        message.success(`${editingPerm ? 'Cập nhật' : 'Thêm'} quyền hạn thành công`);
        setIsPermModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Thao tác thất bại');
    }
  };

  const handleDeletePermission = async (id: string, name: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa quyền?',
      content: `Bạn có chắc chắn muốn xóa quyền "${name}"? Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await permissionService.delete(id);
          if (res.success) {
            message.success('Đã xóa quyền hạn');
            fetchData();
          }
        } catch (error) {
          message.error('Lỗi khi xóa quyền');
        }
      }
    });
  };

  const handleBulkCreate = async (values: any) => {
    try {
      const res = await permissionService.bulkCreate(values);
      if (res.success) {
        message.success(`Đã tạo nhanh bộ quyền cho ${values.moduleName}`);
        setIsBulkModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Lỗi khi tạo bộ quyền');
    }
  };

  const handleCreateRole = async (values: any) => {
    try {
      const res = await roleService.create(values);
      if (res.success) {
        message.success('Đã tạo vai trò mới');
        setIsRoleModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Lỗi khi tạo vai trò');
    }
  };

  const handleUpdateUserAccess = async (values: any) => {
    try {
      const res = await userService.patch(editingUserAccess.id, values);
      if (res.success) {
        message.success('Đã cập nhật quyền riêng lẻ cho người dùng');
        setIsUserAccessModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Cập nhật thất bại');
    }
  };

  return (
    <div className="permissions-matrix-page">
      {/* Header */}
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
            <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              {hasPermission('system:permissions:edit') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    overlay={
                      <Menu items={[
                        {
                          key: 'bulk',
                          icon: <ThunderboltOutlined />,
                          label: 'Tạo nhanh bộ CRUD',
                          onClick: () => setIsBulkModalVisible(true)
                        },
                        {
                          key: 'role',
                          icon: <UserAddOutlined />,
                          label: 'Thêm vai trò mới',
                          onClick: () => { rForm.resetFields(); setIsRoleModalVisible(true); }
                        }
                      ]} />
                    }
                  >
                    <Button variant="outline" buttonSize="small" icon={<DownOutlined />} style={{ color: '#595959', borderColor: '#d9d9d9', height: 32 }}>Thao tác khác</Button>
                  </Dropdown>
                  <Button variant="primary" buttonSize="small" icon={<PlusOutlined />} onClick={() => { setEditingPerm(null); pForm.resetFields(); setIsPermModalVisible(true); }} style={{ background: '#8b1d1d', borderColor: '#8b1d1d', height: 32 }}>Thêm hành động</Button>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      <Card bordered={false} className="main-content-card">
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Input 
                placeholder="Tìm hành động..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 220, height: 32 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              />
              <Button 
                variant="ghost" 
                buttonSize="small" 
                icon={<QuestionCircleOutlined />} 
                onClick={() => setIsGuideModalVisible(true)} 
                style={{ 
                  color: '#595959', 
                  border: '1px solid #d9d9d9',
                  height: 32 
                }}
              >
                Hướng dẫn
              </Button>
            </div>
          }
          items={[
            {
              key: 'matrix',
              label: <Space><BlockOutlined />Ma trận Quyền hạn</Space>,
              children: (
                <>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Đang đồng bộ dữ liệu..." /></div>
                  ) : filteredGroups.length > 0 ? (
                    <Collapse defaultActiveKey={filteredGroups.map(g => g.category)} ghost expandIconPosition="right" className="matrix-collapse">
                      {filteredGroups.map(group => (
                        <Panel 
                          header={
                            <div className="matrix-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space size="middle">
                                <Text strong style={{ fontSize: 16 }}>{group.category}</Text>
                                <Tag color="blue" style={{ borderRadius: 10 }}>{group.actions.length} hành động</Tag>
                              </Space>
                              <Space>
                                <Tooltip title="Xem danh sách người dùng có quyền này">
                                  <Button 
                                    variant="ghost" 
                                    buttonSize="small" 
                                    icon={<SolutionOutlined />} 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setAuditType('module'); 
                                      setSelectedAuditId(group.category); 
                                      setIsAuditModalVisible(true); 
                                    }}
                                  />
                                </Tooltip>

                                
                              
                                {hasPermission('system:permissions:edit') && (
                                  <Button variant="ghost" buttonSize="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); setEditingPerm(null); pForm.resetFields(); pForm.setFieldsValue({ module: group.category }); setIsPermModalVisible(true); }}>Thêm hành động</Button>
                                )}
                              </Space>
                            </div>
                          } 
                          key={group.category}
                          className="matrix-panel"
                        >
                          <MatrixTable 
                            actions={group.actions} 
                            roles={roles} 
                            updating={updating} 
                            onTogglePermission={handleTogglePermission}
                            onAudit={(type, id) => { setAuditType(type); setSelectedAuditId(id); setIsAuditModalVisible(true); }}
                            onEdit={(action) => { setEditingPerm(action); pForm.setFieldsValue(action); setIsPermModalVisible(true); }}
                            onDelete={handleDeletePermission}
                          />
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
                <AuditSection 
                  auditType={auditType} 
                  setAuditType={setAuditType}
                  selectedAuditId={selectedAuditId}
                  setSelectedAuditId={setSelectedAuditId}
                  roles={roles}
                  permissionGroups={permissionGroups}
                  auditedUsers={auditedUsers}
                  onEditAccess={(user) => {
                    setEditingUserAccess(user);
                    uaForm.setFieldsValue({
                      roleIds: user.roleIds,
                      customPermissions: user.customPermissions || { extra: [], denied: [] }
                    });
                    setIsUserAccessModalVisible(true);
                  }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* Modals */}
      <PermModal visible={isPermModalVisible} onCancel={() => setIsPermModalVisible(false)} onSave={handleSavePermission} editingPerm={editingPerm} permissionGroups={permissionGroups} form={pForm} />
      <BulkModal visible={isBulkModalVisible} onCancel={() => setIsBulkModalVisible(false)} onFinish={handleBulkCreate} form={bForm} />
      <UserAccessModal visible={isUserAccessModalVisible} onCancel={() => setIsUserAccessModalVisible(false)} onFinish={handleUpdateUserAccess} roles={roles} permissionGroups={permissionGroups} form={uaForm} />
      <AuditModal visible={isAuditModalVisible} onCancel={() => setIsAuditModalVisible(false)} auditType={auditType} selectedAuditId={selectedAuditId} auditedUsers={auditedUsers} roles={roles} onViewDetail={(user) => { setSelectedUserForDetail(user); setIsUserDetailVisible(true); }} />
      <RoleModal visible={isRoleModalVisible} onCancel={() => setIsRoleModalVisible(false)} onFinish={handleCreateRole} form={rForm} />
      <GuideModal visible={isGuideModalVisible} onCancel={() => setIsGuideModalVisible(false)} />

      {/* User Detail Modal */}
      <UsersDetailModal open={isUserDetailVisible} user={selectedUserForDetail} avatarFallback="https://ui-avatars.com/api/?background=random" formatDateTime={formatDateTime} onCancel={() => { setIsUserDetailVisible(false); setSelectedUserForDetail(null); }} />
    </div>
  );
};

export default PermissionsPage;
