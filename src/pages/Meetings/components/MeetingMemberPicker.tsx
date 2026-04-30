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

const { Text, Title } = Typography;

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
}

/**
 * Pure Table Component for user selection - Mirroring DutyPersonnelTable pattern
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
 * Picker component with a Button and List - Mirroring AdminDutySlotModal members section
 */
const MeetingMemberPicker: React.FC<MeetingMemberPickerProps> = ({
  value = [],
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  const [selectedUsersCache, setSelectedUsersCache] = useState<User[]>([]);

  // Update local cache when new users are seen in the table selection
  const updateCache = (rows: User[]) => {
    if (!rows) return;
    setSelectedUsersCache(prev => {
      const map = new Map(prev.filter(r => r && r.id).map(r => [r.id, r]));
      rows.filter(r => r && r.id).forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Thành viên tham gia
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>Xác nhận những nhân sự tham gia cuộc họp.</Text>
        </div>
        <Space size={12}>
          <Button 
            variant="outline" 
            buttonSize="small" 
            icon={<UsergroupAddOutlined />}
            onClick={handleOpen}
            style={{ 
              borderRadius: 8, 
              fontWeight: 600, 
              fontSize: '13px',
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)',
              background: '#fff'
            }}
          >
            Chọn thành viên
            {value.length > 0 && (
              <div style={{ 
                backgroundColor: 'var(--primary-color)',
                color: '#fff',
                borderRadius: 6,
                padding: '0 6px',
                height: 18,
                minWidth: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                marginLeft: 4,
              }}>
                {value.length}
              </div>
            )}
          </Button>
          {value.length > 0 && (
              <Button
                variant="outline"
                buttonSize="small"
                onClick={() => onChange?.([])}
                icon={<CloseOutlined />}
                style={{ fontSize: 11 }}
              >
                Xóa hết
              </Button>
          )}
        </Space>
      </div>

      <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
        <List
          dataSource={value}
          renderItem={(id: number) => {
            const userDetail = selectedUsersCache.find((u: any) => u && String(u.id) === String(id));
            
            return (
              <List.Item
                style={{
                  padding: '10px 16px',
                  background: '#fff',
                  borderRadius: 10,
                  marginBottom: 8,
                  border: '1px solid #f1f5f9',
                  transition: 'all 0.2s',
                }}
                actions={[
                  <Button 
                    key="remove"
                    variant="ghost" 
                    buttonSize="small" 
                    danger 
                    icon={<CloseOutlined style={{ fontSize: 12 }} />} 
                    onClick={() => handleRemove(id)}
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} src={userDetail?.avatar} />}
                  title={<Text strong>{userDetail?.name || `Thành viên #${id}`}</Text>}
                  description={
                    <Space split={<Divider style={{ margin: 0 }} type="vertical" />} style={{ fontSize: 11 }}>
                      <Text type="secondary">{userDetail?.studentId || 'Chưa rõ MSV'}</Text>
                      {userDetail?.department && <Tag color="blue" style={{ fontSize: '0.6rem' }}>{userDetail.department}</Tag>}
                      {userDetail?.position && <Tag color="cyan" style={{ fontSize: '0.6rem' }}>{POSITION_LABELS[userDetail.position] || userDetail.position}</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
          locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>Chưa có thành viên nào được chọn</div> }}
        />
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
            <Space>
              <UserOutlined />
              <span>Chọn thành viên tham gia họp</span>
            </Space>
            <Tag color="processing" style={{ borderRadius: 6, margin: 0 }}>
              Đang chọn: {tempSelectedIds.length} nhân sự
            </Tag>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        width={850}
        destroyOnClose
        okText="Hoàn tất"
        cancelText="Hủy bỏ"
        centered
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Sử dụng bảng dưới đây để tìm kiếm và chọn nhân sự. Thay đổi chỉ được áp dụng sau khi nhấn <b>Hoàn tất</b>.
          </Text>
        </div>
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

// Help with divider in case it was used
const Divider = ({ type = 'horizontal', style = {} }: { type?: 'horizontal' | 'vertical', style?: any }) => (
    <span style={{ 
        display: type === 'vertical' ? 'inline-block' : 'block',
        width: type === 'vertical' ? 1 : '100%',
        height: type === 'vertical' ? '0.9em' : 1,
        backgroundColor: '#e2e8f0',
        margin: type === 'vertical' ? '0 8px' : '16px 0',
        verticalAlign: 'middle',
        ...style 
    }} />
);

export default MeetingMemberPicker;
