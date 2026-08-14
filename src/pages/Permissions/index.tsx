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
  Tooltip,
  Dropdown,
  Select
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  PlusOutlined, 
  BlockOutlined, 
  ThunderboltOutlined,
  SolutionOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
  DownOutlined,
  AppstoreOutlined,
  FolderOutlined
} from '@ant-design/icons';

// Services
import roleService, { Role } from '@/services/role.service';
import permissionService, { Permission } from '@/services/permission.service';
import userService from '@/services/user.service';

// Components
import { Button, Access } from '@/components/common';
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

const { Text } = Typography;
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
        roleService.getAll({ limit: 1000 }),
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

  // Filtered Groups for Search (by Action or Module)
  const filteredGroups = useMemo(() => {
    if (!searchText) return permissionGroups;

    // Direct Module filter
    if (searchText.startsWith('module:')) {
      const targetCat = searchText.replace('module:', '');
      return permissionGroups.filter(g => g.category === targetCat || g.moduleName === targetCat);
    }

    const lowerSearch = searchText.toLowerCase();
    return permissionGroups.map(group => {
      const moduleMatch = (group.moduleName || group.category || '').toLowerCase().includes(lowerSearch);
      if (moduleMatch) return group;

      return {
        ...group,
        actions: group.actions.filter((a: any) => 
          a.name.toLowerCase().includes(lowerSearch) || 
          a.key.toLowerCase().includes(lowerSearch)
        )
      };
    }).filter(group => group.actions.length > 0);
  }, [permissionGroups, searchText]);

  // Options for Search Select dropdown (Grouped by Module & Actions)
  const permissionSelectOptions = useMemo(() => {
    const result: any[] = [];

    // Group 1: Module Level Quick Selection
    const moduleOptions: any[] = [];
    permissionGroups.forEach(group => {
      const moduleName = group.moduleName || group.category || 'Khác';
      moduleOptions.push({
        value: `module:${group.category}`,
        searchValue: `module ${moduleName} ${group.category}`.toLowerCase(),
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
            <span><FolderOutlined style={{ marginRight: 6, color: 'var(--primary-color)' }} />Tất cả trong Module: {moduleName}</span>
            <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{group.actions.length} hành động</Tag>
          </div>
        )
      });
    });

    if (moduleOptions.length > 0) {
      result.push({
        label: <span style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: 11 }}>DANH MỤC MODULES</span>,
        options: moduleOptions
      });
    }

    // Group 2: Actions grouped by Module
    permissionGroups.forEach(group => {
      const moduleName = group.moduleName || group.category || 'Khác';
      const actionOptions = group.actions.map((a: any) => ({
        value: a.key,
        searchValue: `${a.name} ${a.key} ${moduleName}`.toLowerCase(),
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 6 }}>
            <span>{a.name} <span style={{ color: '#8c8c8c', fontSize: 11 }}>({a.key})</span></span>
            <Tag style={{ margin: 0, fontSize: 10 }}>{moduleName}</Tag>
          </div>
        )
      }));

      if (actionOptions.length > 0) {
        result.push({
          label: <span style={{ fontWeight: 600, color: '#595959', fontSize: 11 }}>HÀNH ĐỘNG: {moduleName.toUpperCase()}</span>,
          options: actionOptions
        });
      }
    });

    return result;
  }, [permissionGroups]);

  // Audited Users
  const auditedUsers = useMemo(() => {
    if (!selectedAuditId) return [];

    if (auditType === 'role') {
      const targetRole = roles.find(r => r.id === selectedAuditId || r.key === selectedAuditId);
      const roleId = targetRole ? targetRole.id : selectedAuditId;
      const roleKey = targetRole ? targetRole.key : selectedAuditId;

      return users.filter(u => 
        u.roleIds?.includes(roleId) || 
        u.roleId === roleId || 
        u.role?.id === roleId ||
        (roleKey && u.role?.key === roleKey)
      );
    } 

    if (auditType === 'permission') {
      return users.filter(u => {
        const userRoles = roles.filter(r => 
          u.roleIds?.includes(r.id) || u.roleId === r.id || u.role?.id === r.id
        );
        const hasFromRole = userRoles.some(r => r.permissions?.includes('*') || r.permissions?.includes(selectedAuditId));
        const isExtra = u.customPermissions?.extra?.includes(selectedAuditId);
        const isDenied = u.customPermissions?.denied?.includes(selectedAuditId);
        return (hasFromRole || isExtra) && !isDenied;
      });
    } 

    if (auditType === 'module') {
      const group = permissionGroups.find(g => g.category === selectedAuditId || g.moduleName === selectedAuditId || g.name === selectedAuditId);
      if (!group) return [];
      const moduleActions = group.actions.map((a: any) => a.key) || [];

      return users.filter(u => {
        const userRoles = roles.filter(r => 
          u.roleIds?.includes(r.id) || u.roleId === r.id || u.role?.id === r.id
        );
        const hasModuleFromRole = userRoles.some(r => 
          r.permissions?.includes('*') || 
          r.permissions?.some((p: string) => moduleActions.includes(p))
        );
        const hasModuleFromExtra = u.customPermissions?.extra?.some((p: string) => moduleActions.includes(p));
        const isDeniedModule = u.customPermissions?.denied?.some((p: string) => moduleActions.includes(p));

        return (hasModuleFromRole || hasModuleFromExtra) && !isDeniedModule;
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

  // Unified Tree Data for Matrix
  const unifiedData = useMemo(() => {
    return filteredGroups.map(group => ({
      name: group.category,
      isCategory: true,
      children: group.actions.map((action: any) => ({
        ...action,
        isCategory: false
      }))
    }));
  }, [filteredGroups]);

  const [viewMode, setViewMode] = useState<'unified' | 'collapse'>('unified');

  return (
    <div className="permissions-matrix-page">
      {/* Header */}
      <div className="page-header-wrapper" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <span style={{ fontSize: 20, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
              <SafetyCertificateOutlined style={{ marginRight: 10, color: 'var(--primary-color)' }} />
              Phân quyền hệ thống
            </span>
          </Col>
          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'add-perm',
                      icon: <PlusOutlined style={{ color: 'var(--primary-color)' }} />,
                      label: 'Thêm hành động mới',
                      onClick: () => { setEditingPerm(null); pForm.resetFields(); setIsPermModalVisible(true); },
                    },
                    {
                      key: 'add-role',
                      icon: <UserAddOutlined />,
                      label: 'Thêm vai trò mới',
                      onClick: () => { rForm.resetFields(); setIsRoleModalVisible(true); },
                    },
                    {
                      key: 'bulk-crud',
                      icon: <ThunderboltOutlined style={{ color: '#722ed1' }} />,
                      label: 'Tạo nhanh CRUD (Module)',
                      onClick: () => setIsBulkModalVisible(true),
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'toggle-view',
                      icon: viewMode === 'unified' ? <BlockOutlined /> : <ThunderboltOutlined />,
                      label: viewMode === 'unified' ? 'Chuyển sang Giao diện Cũ' : 'Chuyển sang Giao diện Mới',
                      onClick: () => setViewMode(viewMode === 'unified' ? 'collapse' : 'unified'),
                    },
                  ],
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button 
                  variant="outline" 
                  buttonSize="small" 
                  icon={<AppstoreOutlined style={{ color: 'var(--primary-color)' }} />}
                  style={{ height: 32, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Chức năng <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>

              <Button 
                variant="ghost" 
                buttonSize="small" 
                icon={<QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />} 
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
          </Col>
        </Row>
      </div>

      <Card bordered={false} className="main-content-card">
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Select
              showSearch
              allowClear
              placeholder="Tìm kiếm hoặc chọn nhanh hành động..."
              value={searchText || undefined}
              onChange={(val) => setSearchText(val || '')}
              onSearch={(val) => setSearchText(val || '')}
              filterOption={(input, option) =>
                (option?.searchValue ?? '').includes(input.toLowerCase())
              }
              options={permissionSelectOptions}
              style={{ width: 360, height: 32 }}
              size="small"
            />
          }
          items={[
            {
              key: 'matrix',
              label: <Space><BlockOutlined />Ma trận Quyền hạn</Space>,
              children: (
                <>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Đang đồng bộ dữ liệu..." /></div>
                  ) : viewMode === 'unified' ? (
                    <MatrixTable 
                      dataSource={unifiedData}
                      roles={roles} 
                      updating={updating} 
                      loading={loading}
                      canEdit={hasPermission('system:permissions:edit')}
                      onTogglePermission={handleTogglePermission}
                      onAudit={(type, id) => { setAuditType(type); setSelectedAuditId(id); setIsAuditModalVisible(true); }}
                      onAddAction={(category) => {
                        setEditingPerm(null);
                        pForm.resetFields();
                        pForm.setFieldsValue({ module: category });
                        setIsPermModalVisible(true);
                      }}
                      onEdit={(action) => { setEditingPerm(action); pForm.setFieldsValue(action); setIsPermModalVisible(true); }}
                      onDelete={handleDeletePermission}
                    />
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
                                <Tooltip title="Xem danh sách người dùng trong module này">
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
                                 <Access permission="system:permissions:edit" behavior="disable">
                                   <Button 
                                     variant="ghost" 
                                     buttonSize="small" 
                                     icon={<PlusOutlined />} 
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setEditingPerm(null); 
                                       pForm.resetFields(); 
                                       pForm.setFieldsValue({ module: group.category }); 
                                       setIsPermModalVisible(true); 
                                     }}
                                   >
                                     Thêm hành động
                                   </Button>
                                 </Access>
                              </Space>
                            </div>
                          } 
                          key={group.category}
                          className="matrix-panel"
                        >
                          <MatrixTable 
                            dataSource={group.actions.map((a: any) => ({ ...a, isCategory: false }))} 
                            roles={roles} 
                            updating={updating} 
                            canEdit={hasPermission('system:permissions:edit')}
                            onTogglePermission={handleTogglePermission}
                            onAudit={(type, id) => { setAuditType(type); setSelectedAuditId(id); setIsAuditModalVisible(true); }}
                            onAddAction={(category) => {
                              setEditingPerm(null);
                              pForm.resetFields();
                              pForm.setFieldsValue({ module: category });
                              setIsPermModalVisible(true);
                            }}
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
