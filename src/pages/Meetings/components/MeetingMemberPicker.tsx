import React, { useState } from 'react';
import { Modal, Space, Typography, Tag, Avatar, List } from 'antd';
const { Text } = Typography;
import { 
  UsergroupAddOutlined, UserOutlined, CloseOutlined
} from '@ant-design/icons';
import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import userService from '@/services/user.service';
import { User } from '@/types';
import { DataTableColumn } from '@/components/common/DataTable/types';
import { useCRUD } from '@/hooks/useCRUD';
import { POSITION_LABELS, POSITION_FILTERS, DEPARTMENT_FILTERS } from '@/constants/user.constants';
import { getUserDisplayName } from '@/utils/formatters';
import systemSettingService from '@/services/system-setting.service';

interface MeetingMemberPickerProps {
  value?: number[];
  onChange?: (value: number[]) => void;
  users?: User[];
}

/**
 * Pure Table Component for user selection
 */
export const MeetingMemberTable: React.FC<{
  value?: number[];
  onChange?: (keys: number[], rows?: User[]) => void;
}> = ({ value = [], onChange }) => {
  const [positionConfigs, setPositionConfigs] = useState<any[]>([]);

  React.useEffect(() => {
    systemSettingService.getByKey('POSITION_CONFIGS').then((res) => {
      if (res && res.value) {
        const parsed = typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
        if (Array.isArray(parsed)) setPositionConfigs(parsed);
      }
    }).catch(() => {});
  }, []);

  const positionMap = React.useMemo(() => {
    const map: Record<string, string> = { ...POSITION_LABELS };
    (positionConfigs || []).forEach((p: any) => {
      if (p.id && p.name) map[p.id] = p.name;
    });
    return map;
  }, [positionConfigs]);
  const {
    data: users,
    loading,
    pagination,
    handleTableChange,
    search,
    searchTerm,
    fetchAll,
    clearFilters,
    filters: filterValues,
    updateFilters,
  } = useCRUD(userService, {
    autoFetch: true,
    pageSize: 10,
  });

  const columns: DataTableColumn<User>[] = [
    {
      title: 'Thành viên',
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      sortable: true,
      searchable: true,
      render: (_, record) => (
        <Space style={{marginLeft: 8}}>
          <Avatar src={record.avatar} icon={<UserOutlined />} size="small" />
          <Text strong style={{ fontSize: 13 }}>{getUserDisplayName(record)}</Text>
        </Space>
      ),
    },
    {
      title: 'Mã sinh viên',
      dataIndex: 'studentId',
      key: 'studentId',
      searchable: true,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.studentId || '--'}
        </Text>
      ),
    },
    {
      title: 'Ban',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      sortable: true,
      filters: DEPARTMENT_FILTERS,
      filterMultiple: false,
      render: (dept) => dept ? <Tag color="blue" style={{ fontSize: 10 }}>{dept}</Tag> : null
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: 110,
      sortable: true,
      filters: POSITION_FILTERS,
      filterMultiple: false,
      render: (val: string) => val ? <Tag color="cyan" style={{ borderRadius: 4, fontSize: 11 }}>{positionMap[val] || val}</Tag> : '--'
    }
  ];

  const tableFilters = [
    {
      key: 'department',
      label: 'Ban chuyên môn',
      type: 'select' as const,
      options: [
        { label: 'Tất cả ban', value: '' },
        ...DEPARTMENT_FILTERS.map(f => ({ label: f.text, value: f.value }))
      ],
      colSpan: 12,
    },
    {
      key: 'position',
      label: 'Chức vụ',
      type: 'select' as const,
      options: [
        { label: 'Tất cả chức vụ', value: '' },
        ...Object.entries(POSITION_LABELS).map(([value, label]) => ({ label, value })),
        ...positionConfigs
          .filter((p: any) => p.id && !Object.keys(POSITION_LABELS).includes(p.id))
          .map((p: any) => ({ label: p.name || p.id, value: p.id }))
      ],
      colSpan: 12,
    }
  ];

  return (
    <DataTable
      hideCard={true}
      loading={loading}
      columns={columns}
      dataSource={users}
      pagination={pagination}
      onPaginationChange={handleTableChange}
      searchable={true}
      searchPlaceholder="Tìm kiếm tên, mã sinh viên..."
      searchValue={searchTerm}
      onSearch={search}
      onRefresh={fetchAll}
      sortable={true}
      batchOperations={false}
      filters={tableFilters}
      filterValues={filterValues}
      onFilterChange={(key, value) => updateFilters({ [key]: value })}
      onClearFilters={() => clearFilters()}
      selectedRowKeys={value}
      onSelectChange={(keys, rows) => onChange?.(keys as number[], rows as User[])}
      size="small"
    />
  );
};

/**
 * Picker component with a Button and List
 */
const MeetingMemberPicker: React.FC<MeetingMemberPickerProps> = ({
  value = [],
  onChange,
  users = [],
}) => {
  const [open, setOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  const [selectedUsersCache, setSelectedUsersCache] = useState<User[]>([]);

  const updateCache = React.useCallback((rows: User[]) => {
    if (!rows || rows.length === 0) return;
    setSelectedUsersCache(prev => {
      const map = new Map(prev.filter(r => r && r.id).map(r => [r.id, r]));
      rows.filter(r => r && r.id).forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
  }, []);

  React.useEffect(() => {
    if (users && users.length > 0) updateCache(users);
  }, [users, updateCache]);

  const handleOpen = () => {
    setTempSelectedIds(value);
    setOpen(true);
  };

  const handleOk = () => {
    onChange?.(tempSelectedIds);
    setOpen(false);
  };

  const handleRemove = (id: number) => {
    const nextIds = value.filter(v => v !== id);
    onChange?.(nextIds);
  };

  return (
    <div className="meeting-member-picker-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: '14px' }}>
          Thành viên ({value.length})
        </Text>
        <Space>
          <Button 
            variant="outline" 
            buttonSize="small" 
            icon={<UsergroupAddOutlined />}
            onClick={handleOpen}
            style={{ fontSize: '12px', height: 28 }}
          >
            Chọn thành viên
          </Button>
          {value.length > 0 && (
              <Button
                variant="ghost"
                buttonSize="small"
                onClick={() => onChange?.([])}
                style={{ fontSize: 11, color: '#94a3b8' }}
              >
                Xóa hết
              </Button>
          )}
        </Space>
      </div>

      <div style={{ 
          maxHeight: 250, 
          overflowY: 'auto', 
          border: '1px solid #f0f0f0',
          borderRadius: 4
      }}>
        <List
          size="small"
          dataSource={value}
          renderItem={(id: number) => {
            const userDetail = users.find((u: any) => u && String(u.id) === String(id)) || 
                             selectedUsersCache.find((u: any) => u && String(u.id) === String(id));
            
            return (
              <List.Item
                style={{ padding: '4px 12px' }}
                actions={[
                  <Button 
                    key="remove"
                    variant="ghost" 
                    buttonSize="small" 
                    danger 
                    icon={<CloseOutlined style={{ fontSize: 10 }} />} 
                    onClick={() => handleRemove(id)}
                    style={{ width: 22, height: 22 }}
                  />
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                  <Avatar size={24} icon={<UserOutlined />} src={userDetail?.avatar} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 13 }}>{getUserDisplayName(userDetail) || `Thành viên #${id}`}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {userDetail?.studentId ? `(${userDetail.studentId})` : ''}
                    </Text>
                    {userDetail?.department && (
                        <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                            {userDetail.department}
                        </Tag>
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
          locale={{ emptyText: <div style={{ padding: '16px 0', fontSize: 12, color: '#bfbfbf' }}>Chưa chọn thành viên</div> }}
        />
      </div>

      <Modal
        title="Chọn thành viên"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        width={750}
        okText="Xác nhận"
        cancelText="Hủy"
        centered
      >
        <MeetingMemberTable 
          value={tempSelectedIds} 
          onChange={(keys, rows) => {
            setTempSelectedIds(keys);
            if (rows) updateCache(rows);
          }} 
        />
      </Modal>
    </div>
  );
};

export default MeetingMemberPicker;
