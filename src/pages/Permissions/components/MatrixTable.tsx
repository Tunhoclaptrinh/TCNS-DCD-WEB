import React from 'react';
import { Table, Checkbox, Tag, Tooltip, Spin, Typography, Dropdown, Menu } from 'antd';
import { MoreOutlined, UserOutlined, EditOutlined, DeleteOutlined, DownOutlined, RightOutlined, SolutionOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from '@/components/common';
import { Role } from '@/services/role.service';
import { Permission } from '@/services/permission.service';

const { Text } = Typography;

interface MatrixTableProps {
  dataSource: any[]; // Combined categories and actions
  roles: Role[];
  updating: string | null;
  onTogglePermission: (role: Role, permissionKey: string, checked: boolean) => void;
  onAudit: (type: 'permission' | 'module', id: string) => void;
  onAddAction: (category: string) => void;
  onEdit: (action: Permission) => void;
  onDelete: (id: string, name: string) => void;
  loading?: boolean;
  canEdit?: boolean;
}

const MatrixTable: React.FC<MatrixTableProps> = ({
  dataSource,
  roles,
  updating,
  onTogglePermission,
  onAudit,
  onAddAction,
  onEdit,
  onDelete,
  loading,
  canEdit
}) => {
  const [expandedKeys, setExpandedKeys] = React.useState<React.Key[]>([]);

  // Update expanded keys when dataSource changes to keep everything open
  React.useEffect(() => {
    if (dataSource && dataSource.length > 0) {
      const keys = dataSource
        .filter(item => item.isCategory)
        .map(item => `cat-${item.name}`);
      setExpandedKeys(keys);
    }
  }, [dataSource]);

  const sortedRoles = [...roles].sort((a, b) => {
    const aKey = a.key.trim().toLowerCase();
    const bKey = b.key.trim().toLowerCase();
    if (aKey === 'admin') return 1;
    if (bKey === 'admin') return -1;
    return a.id - b.id;
  });

  const columns = [
    {
      title: 'Hành động / Quyền hạn',
      key: 'name',
      fixed: 'left' as const,
      width: 320,
      render: (_: any, record: any) => {
        if (record.isCategory) {
          const isExpanded = expandedKeys.includes(`cat-${record.name}`);
          return (
            <div className="matrix-category-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isExpanded ? (
                <DownOutlined style={{ color: '#8b1d1d', fontSize: 12 }} />
              ) : (
                <RightOutlined style={{ color: '#8b1d1d', fontSize: 12 }} />
              )}
              <Text strong style={{ fontSize: 15, color: '#8b1d1d', lineHeight: '24px' }}>{record.name}</Text>
              <Tag color="red" style={{ borderRadius: 10, margin: 0, height: 20, display: 'flex', alignItems: 'center' }}>{record.children?.length || 0}</Tag>
              <div className="category-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {canEdit && (
                  <Tooltip title="Thêm hành động vào nhóm này">
                    <Button 
                      variant="ghost" 
                      buttonSize="small" 
                      icon={<PlusOutlined />} 
                      onClick={(e) => { e.stopPropagation(); onAddAction(record.name); }} 
                    />
                  </Tooltip>
                )}
                <Tooltip title="Xem danh sách người dùng trong module này">
                  <Button 
                    variant="ghost" 
                    buttonSize="small" 
                    icon={<SolutionOutlined />} 
                    onClick={(e) => { e.stopPropagation(); onAudit('module', record.name); }} 
                  />
                </Tooltip>
              </div>
            </div>
          );
        }
        return (
          <div className="permission-row-info">
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block' }}>{record.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.key}</Text>
            </div>
            <div className="permission-row-actions">
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                overlay={
                  <Menu items={[
                    {
                      key: 'audit',
                      icon: <UserOutlined />,
                      label: 'Danh sách người',
                      onClick: () => onAudit('permission', record.key)
                    },
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Sửa thông tin',
                      onClick: () => onEdit(record)
                    },
                    {
                      type: 'divider'
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
        );
      }
    },
    ...sortedRoles.map(role => ({
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
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => {
        if (record.isCategory) return null; // Don't show checkboxes for category rows
        
        const hasPermission = role.permissions?.includes('*') || role.permissions?.includes(record.key);
        const isAdminWildcard = role.key.trim().toLowerCase() === 'admin' && role.permissions?.includes('*');
        const isPending = updating === `${role.id}-${record.key}`;

        if (isAdminWildcard) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Tooltip title="Toàn quyền hệ thống">
                <Checkbox 
                  checked 
                  disabled
                  className="admin-checkbox-full-access"
                />
              </Tooltip>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {isPending ? (
              <Spin size="small" />
            ) : (
              <Checkbox 
                checked={hasPermission}
                disabled={!role.isActive}
                onChange={(e) => onTogglePermission(role, record.key, e.target.checked)}
              />
            )}
          </div>
        );
      }
    }))
  ];

  return (
    <div className="matrix-table-container">
      <Table 
        columns={columns} 
        dataSource={dataSource} 
        pagination={false} 
        size="small" 
        bordered
        rowKey={(record) => record.isCategory ? `cat-${record.name}` : record.key}
        className={dataSource.some(d => d.isCategory) ? "matrix-unified-table" : "matrix-inner-table"}
        scroll={{ x: 'max-content', y: dataSource.some(d => d.isCategory) ? 'calc(100vh - 350px)' : undefined }}
        loading={loading}
        expandedRowKeys={expandedKeys}
        onExpandedRowsChange={(keys) => setExpandedKeys(keys as React.Key[])}
        expandable={{
          showExpandColumn: false, // Hide default expand column to use our custom alignment
        }}
        onRow={(record) => ({
          onClick: () => {
            if (record.isCategory) {
              const key = `cat-${record.name}`;
              const newKeys = expandedKeys.includes(key)
                ? expandedKeys.filter(k => k !== key)
                : [...expandedKeys, key];
              setExpandedKeys(newKeys);
            }
          }
        })}
      />
    </div>
  );
};

export default MatrixTable;
