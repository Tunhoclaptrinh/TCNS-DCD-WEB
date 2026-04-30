import React, { useState } from 'react';
import { Modal, Space, Typography, Tag, Avatar, List } from 'antd';
import { 
  UsergroupAddOutlined, UserOutlined, CloseOutlined 
} from '@ant-design/icons';
import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import userService from '@/services/user.service';
import { User } from '@/types';
import { DataTableColumn } from '@/components/common/DataTable/types';
import { useCRUD } from '@/hooks/useCRUD';

const { Text } = Typography;

export const POSITION_LABELS: Record<string, string> = {
  ctc: 'CTV',
  tv: 'Thành viên',
  tvb: 'Thành viên ban',
  pb: 'Phó ban',
  tb: 'Trưởng ban',
  dt: 'Đội trưởng'
};

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
  const {
    data: users,
    loading,
    pagination,
    handleTableChange,
    search,
    searchTerm,
    fetchAll,
  } = useCRUD(userService, {
    autoFetch: true,
    pageSize: 10,
  });

  const columns: DataTableColumn<User>[] = [
    {
      title: 'Thành viên',
      key: 'user',
      align: 'left',
      render: (_, record) => (
        <Space style={{marginLeft: 8}}>
          <Avatar src={record.avatar} icon={<UserOutlined />} size="small" />
          <Text strong style={{ fontSize: 13 }}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: 'MSSV / Email',
      key: 'identity',
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.studentId || record.email}
        </Text>
      ),
    },
    {
      title: 'Ban',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: (dept) => dept ? <Tag color="blue" style={{ fontSize: 10 }}>{dept}</Tag> : null
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: 110,
      render: (val: string) => val ? <Tag color="cyan" style={{ borderRadius: 4, fontSize: 11 }}>{POSITION_LABELS[val] || val}</Tag> : '--'
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
      searchValue={searchTerm}
      onSearch={search}
      onRefresh={() => fetchAll()}
      showActions={false}
      batchOperations={false}
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
                    <Text strong style={{ fontSize: 13 }}>{userDetail?.name || `Thành viên #${id}`}</Text>
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
