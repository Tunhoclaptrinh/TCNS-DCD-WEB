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
  Input
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  LockOutlined, 
  TeamOutlined, 
  CalendarOutlined, 
  BarChartOutlined,
  SettingOutlined,
  SearchOutlined
} from '@ant-design/icons';
import roleService, { Role } from '../../services/role.service';

const { Title, Text } = Typography;

const PermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const permissionGroups = roleService.getAvailablePermissions();

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleService.getAll();
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      message.error('Không thể tải danh sách vai trò');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = async (role: Role, permissionKey: string, checked: boolean) => {
    // Prevent editing admin wildcard
    if (role.key === 'admin' && permissionKey === '*') {
      message.warning('Không thể thay đổi quyền tối cao của Admin');
      return;
    }

    try {
      setUpdating(`${role.id}-${permissionKey}`);
      
      let newPermissions = [...role.permissions];
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

  // Flatten permissions for the table rows
  const tableData = useMemo(() => {
    const rows: any[] = [];
    permissionGroups.forEach(group => {
      group.actions.forEach((action, index) => {
        rows.push({
          key: action.key,
          category: group.category,
          actionName: action.name,
          isFirstInCategory: index === 0,
          categorySize: group.actions.length,
          searchString: `${group.category} ${action.name} ${action.key}`.toLowerCase()
        });
      });
    });
    
    if (!searchText) return rows;
    return rows.filter(row => row.searchString.includes(searchText.toLowerCase()));
  }, [permissionGroups, searchText]);

  const columns = [
    {
      title: 'Nhóm chức năng',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      onCell: (record: any) => ({
        rowSpan: searchText ? 1 : (record.isFirstInCategory ? record.categorySize : 0),
      }),
      render: (text: string) => (
        <Space>
          {text === 'Thành viên' && <TeamOutlined style={{ color: '#1890ff' }} />}
          {text === 'Lịch trực' && <CalendarOutlined style={{ color: '#52c41a' }} />}
          {text === 'Khen thưởng & Kỷ luật' && <SafetyCertificateOutlined style={{ color: '#f5222d' }} />}
          {text === 'Báo cáo' && <BarChartOutlined style={{ color: '#722ed1' }} />}
          {text === 'Hệ thống' && <SettingOutlined style={{ color: '#faad14' }} />}
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Hành động / Quyền hạn',
      dataIndex: 'actionName',
      key: 'actionName',
      render: (text: string, record: any) => (
        <div style={{ padding: '4px 0' }}>
          <Text>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.key}</Text>
        </div>
      )
    },
    // Dynamic columns for roles
    ...roles.map(role => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <Text strong>{role.name}</Text>
          <br />
          <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>{role.key.toUpperCase()}</Tag>
        </div>
      ),
      key: role.key,
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const hasPermission = role.permissions.includes('*') || role.permissions.includes(record.key);
        const isAdminWildcard = role.key === 'admin' && role.permissions.includes('*');
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
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            <SafetyCertificateOutlined style={{ marginRight: 12, color: 'var(--primary-color)' }} />
            Ma trận Phân quyền
          </Title>
          <Text type="secondary">
            Cấu hình chi tiết các quyền hạn cho từng nhóm vai trò trong hệ thống. Các thay đổi sẽ có hiệu lực ngay lập tức.
          </Text>
        </div>
        <Input 
          placeholder="Tìm kiếm quyền..." 
          prefix={<SearchOutlined />} 
          style={{ width: 300 }}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      <Alert
        message="Lưu ý về quyền Admin"
        description="Nhóm 'Quản trị viên' có quyền '*' (Wildcard), cho phép thực hiện tất cả các hành động mà không cần tích chọn từng mục."
        type="info"
        showIcon
        icon={<LockOutlined />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Card 
        bodyStyle={{ padding: 0 }} 
        style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      >
        <Table 
          columns={columns} 
          dataSource={tableData} 
          pagination={false} 
          loading={loading}
          bordered
          sticky
          scroll={{ y: 'calc(100vh - 350px)' }}
          size="middle"
        />
      </Card>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontStyle: 'italic' }}>
          * Dữ liệu được lưu tự động ngay khi thay đổi.
        </Text>
      </div>
    </div>
  );
};

export default PermissionsPage;
