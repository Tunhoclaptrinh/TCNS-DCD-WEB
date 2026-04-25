import React from 'react';
import { Table, Checkbox, Tag, Tooltip, Spin, Typography, Dropdown, Menu } from 'antd';
import { MoreOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button } from '@/components/common';
import { Role } from '@/services/role.service';
import { Permission } from '@/services/permission.service';

const { Text } = Typography;

interface MatrixTableProps {
  actions: Permission[];
  roles: Role[];
  updating: string | null;
  onTogglePermission: (role: Role, permissionKey: string, checked: boolean) => void;
  onAudit: (type: 'permission', id: string) => void;
  onEdit: (action: Permission) => void;
  onDelete: (id: string, name: string) => void;
}

const MatrixTable: React.FC<MatrixTableProps> = ({
  actions,
  roles,
  updating,
  onTogglePermission,
  onAudit,
  onEdit,
  onDelete
}) => {
  const columns = [
    {
      title: 'Hành động / Quyền hạn',
      key: 'action',
      fixed: 'left' as const,
      width: 280,
      render: (_: any, record: Permission) => (
        <div className="permission-row-info">
          <div style={{ flex: 1 }}>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.key}</Text>
          </div>
          <div className="permission-row-actions">
            <Tooltip title="Xem ai có quyền này">
              <Button 
                variant="ghost" 
                buttonSize="small"
                icon={<UserOutlined />}
                onClick={() => onAudit('permission', record.key)}
              />
            </Tooltip>
            <Dropdown
              trigger={['click']}
              overlay={
                <Menu items={[
                  {
                    key: 'edit',
                    icon: <EditOutlined />,
                    label: 'Sửa thông tin',
                    onClick: () => onEdit(record)
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: 'Xóa quyền',
                    danger: true,
                    onClick: () => onDelete(String(record.id), record.name)
                  }
                ]} />
              }
            >
              <Button variant="ghost" buttonSize="small" icon={<MoreOutlined />} />
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
      render: (_: any, record: Permission) => {
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
                onChange={(e) => onTogglePermission(role, record.key, e.target.checked)}
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

export default MatrixTable;
