import React, { useState, useMemo } from 'react';
import { 
  Typography, 
  Space, 
  Tag, 
  message, 
  Tooltip,
  Modal,
  Form,
  Input,
  Switch
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  SafetyOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  StopOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { DataTable, Button, StatisticsCard } from '@/components/common';
import { DataTableColumn, FilterConfig } from '@/components/common/DataTable/types';
import roleService, { Role } from '@/services/role.service';
import { useCRUD } from '@/hooks/useCRUD';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '@/hooks/useAccess';
import RolePermissionModal from './components/RolePermissionModal';

const { Text } = Typography;

const RoleManagement: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAccess();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const { 
    data: roles, 
    loading, 
    refresh, 
    create: handleCreate, 
    update: handleUpdate, 
    remove: handleDelete,
    handleTableChange,
    search,
    searchTerm,
    updateFilters,
    clearFilters,
    filters: filterValues,
    exportData
  } = useCRUD(roleService, { autoFetch: true });

  const showModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      form.setFieldsValue(role);
    } else {
      setEditingRole(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editingRole) {
        const res = await handleUpdate(editingRole.id, values);
        if (res) message.success('Cập nhật vai trò thành công');
      } else {
        const res = await handleCreate(values);
        if (res) message.success('Thêm vai trò mới thành công');
      }
      setIsModalVisible(false);
    } catch (error) {
      message.error('Thao tác thất bại');
    }
  };

  const stats = useMemo(() => {
    const total = roles.length;
    const active = roles.filter(r => r.isActive).length;
    return [
      { title: 'Tổng số vai trò', value: total, icon: <SafetyOutlined />, valueColor: 'var(--primary-color)' },
      { title: 'Đang hoạt động', value: active, icon: <CheckCircleOutlined />, valueColor: '#22c55e' },
      { title: 'Đã khóa', value: total - active, icon: <StopOutlined />, valueColor: '#ef4444' },
    ];
  }, [roles]);

  const filters: FilterConfig[] = [
    {
      key: 'isActive',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Đang hoạt động', value: true },
        { label: 'Đã khóa', value: false },
      ],
    }
  ];

  const columns: DataTableColumn<Role>[] = [
    {
      title: 'Tên vai trò',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string, record: Role) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 15 }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
        </Space>
      ),
    },
    {
      title: 'Mã định danh (Key)',
      dataIndex: 'key',
      key: 'key',
      width: 180,
      render: (key: string) => (
        <Tag icon={<KeyOutlined />} color="blue" style={{ borderRadius: 4, padding: '2px 8px' }}>
          {key}
        </Tag>
      ),
    },
    {
      title: 'Số quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions_count',
      width: 150,
      align: 'center',
      render: (perms: string[]) => (
        <Tag color="cyan" style={{ borderRadius: 12 }}>
          {perms?.length || 0} quyền
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 150,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'} bordered={false}>
          {isActive ? 'Đang hoạt động' : 'Đã khóa'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: Role) => (
        <Space size="small">
          <Tooltip title="Cài đặt quyền chi tiết (Modal)">
            <Button 
              variant="ghost" 
              icon={<SafetyOutlined />} 
              onClick={() => {
                setTargetRole(record);
                setIsPermModalVisible(true);
              }}
              style={{ color: 'var(--primary-color)' }}
            />
          </Tooltip>
          {hasPermission('system:roles:update') && (
            <Tooltip title="Sửa thông tin">
              <Button 
                variant="ghost" 
                icon={<EditOutlined />} 
                onClick={() => showModal(record)} 
              />
            </Tooltip>
          )}
          {hasPermission('system:roles:delete') && (
            <Button 
              variant="ghost" 
              icon={<DeleteOutlined />} 
              danger 
              disabled={record.key === 'admin'}
              onClick={() => {
                Modal.confirm({
                  title: 'Xác nhận xóa vai trò?',
                  content: `Bạn có chắc chắn muốn xóa vai trò "${record.name}" không?`,
                  okText: 'Xóa',
                  okType: 'danger',
                  cancelText: 'Hủy',
                  onOk: () => handleDelete(record.id)
                });
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="role-management-v2">
      <DataTable
        title="Quản lý Vai trò & Phân quyền"
        description="Định nghĩa các chức danh và phạm vi quyền hạn trong hệ thống"
        columns={columns}
        dataSource={roles}
        loading={loading}
        rowKey="id"
        headerContent={
          <StatisticsCard 
            hideCard
            data={stats}
            colSpan={{ xs: 24, sm: 8 }}
            rowGutter={16}
          />
        }
        // Search & Filter
        searchable={true}
        searchValue={searchTerm}
        onSearch={search}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={(key, value) => updateFilters({ [key]: value })}
        onClearFilters={clearFilters}
        // Actions
        onAdd={hasPermission('system:roles:create') ? () => showModal() : undefined}
        onRefresh={refresh}
        onEdit={hasPermission('system:roles:update') ? showModal : undefined}
        onDelete={hasPermission('system:roles:delete') ? handleDelete : undefined}
        // Export
        exportable={true}
        onExport={() => exportData('xlsx')}
        // Extra UI
        extra={
          <Space>
            <Button 
              variant="outline" 
              buttonSize="small"
              icon={<AppstoreOutlined />} 
              onClick={() => navigate('/admin/system-config/permissions')}
              style={{ height: 32 }}
            >
              Ma trận Phân quyền
              <ArrowRightOutlined />
            </Button>
            <Button 
              variant="ghost" 
              buttonSize="small" 
              icon={<QuestionCircleOutlined />} 
              onClick={() => {
                // Roles guide logic or shared modal
                message.info('Tính năng hướng dẫn đang được cập nhật cho trang này');
              }} 
              style={{ 
                color: '#595959', 
                border: '1px solid #d9d9d9',
                height: 32 
              }}
            >
              Hướng dẫn
            </Button>
          </Space>
        }
        pagination={{ pageSize: 10 }}
        onPaginationChange={handleTableChange}
      />

      <Modal
        title={
          <div style={{ textAlign: 'left', width: '100%' }}>
            <Space>
              <SafetyOutlined style={{ color: 'var(--primary-color)' }} />
              <Text strong style={{ fontSize: 18 }}>
                {editingRole ? "Cập nhật vai trò" : "Thêm vai trò mới"}
              </Text>
            </Space>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <Button 
              variant="outline" 
              onClick={() => setIsModalVisible(false)}
              style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={() => form.submit()}
              loading={loading}
              style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
            >
              {editingRole ? "Lưu thay đổi" : "Tạo vai trò"}
            </Button>
          </div>
        }
        destroyOnClose
        centered
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ isActive: true, permissions: [] }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên vai trò"
            rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
          >
            <Input placeholder="VD: Ban Truyền thông, Đội trưởng..." size="large" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Mã định danh (Key)"
            rules={[
              { required: true, message: 'Vui lòng nhập mã key' },
              { pattern: /^[a-z0-9_]+$/, message: 'Chữ thường, số và dấu gạch dưới' }
            ]}
            extra="Dùng để kiểm tra quyền trong code (vd: ns_specialist)"
          >
            <Input placeholder="vd: truyen_thong" disabled={!!editingRole && editingRole.key === 'admin'} size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Nhiệm vụ hoặc phạm vi của vai trò này..." />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>

      <RolePermissionModal
        open={isPermModalVisible}
        role={targetRole}
        onCancel={() => {
          setIsPermModalVisible(false);
          setTargetRole(null);
        }}
        onSuccess={() => {
          setIsPermModalVisible(false);
          setTargetRole(null);
          refresh();
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .role-management-v2 .ant-table-thead > tr > th {
          background: #fafafa;
          font-weight: 600;
        }
      `}} />
    </div>
  );
};

export default RoleManagement;
