import React, { useState } from 'react';
import { Image, Tag, Button, Modal, Badge, Space, Typography } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import DataTable from '@/components/common/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import userService from '@/services/user.service';
import { User } from '@/types';
import { DataTableColumn, FilterConfig } from '@/components/common/DataTable/types';

const { Text } = Typography;

interface DutyPersonnelTableProps {
  value?: number[];
  onChange?: (value: number[]) => void;
  hideCard?: boolean;
}

export const POSITION_LABELS: Record<string, string> = {
  ctc: 'CTV',
  tv: 'Thành viên',
  tvb: 'Thành viên ban',
  pb: 'Phó ban',
  tb: 'Trưởng ban',
  dt: 'Đội trưởng'
};

const DEPARTMENT_OPTIONS = ['Tài chính', 'Truyền thông', 'Nhân sự'];

/**
 * Pure Table Component for user selection
 */
export const DutyPersonnelTable: React.FC<DutyPersonnelTableProps> = ({
  value = [],
  onChange,
  hideCard = true,
}) => {
  const {
    data,
    loading,
    pagination,
    fetchAll,
    handleTableChange,
    updateFilters,
    clearFilters,
    search,
    searchTerm,
    filters: filterValues,
  } = useCRUD(userService, {
    autoFetch: true,
    pageSize: 5,
  });

  const avatarFallback = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>'
  )}`;

  const columns: DataTableColumn<User>[] = [
    {
      title: "Avatar",
      dataIndex: "avatar",
      key: "avatar",
      width: 60,
      render: (avatar: string) => (
        <Image
          src={avatar || avatarFallback}
          width={32}
          height={32}
          preview={false}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      ),
    },
    {
      title: "Họ tên",
      key: "fullName",
      width: 160,
      searchable: true,
      align: 'left',
      render: (_, record) => (
        <Text strong>
          {record.lastName || record.firstName 
            ? `${record.lastName || ''} ${record.firstName || ''}`.trim()
            : record.name}
        </Text>
      )
    },
    {
      title: "Mã SV",
      dataIndex: "studentId",
      key: "studentId",
      width: 90,
      searchable: true,
    },
    {
      title: "Ban",
      dataIndex: "department",
      key: "department",
      width: 100,
      render: (dept: string) => dept ? <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>{dept}</Tag> : '--'
    },
    {
      title: "Chức vụ",
      dataIndex: "position",
      key: "position",
      width: 110,
      render: (val: string) => val ? <Tag color="cyan" style={{ borderRadius: 4, fontSize: 11 }}>{POSITION_LABELS[val] || val}</Tag> : '--'
    }
  ];

  const filters: FilterConfig[] = [
    {
      key: "department",
      label: "Ban",
      type: "select",
      options: DEPARTMENT_OPTIONS.map(d => ({ label: d, value: d })),
    },
    {
      key: "position",
      label: "Chức vụ",
      type: "select",
      options: Object.entries(POSITION_LABELS).map(([value, label]) => ({ label, value })),
    }
  ];

  return (
    <DataTable
      hideCard={hideCard}
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={pagination}
      onPaginationChange={handleTableChange}
      searchable={true}
      searchValue={searchTerm}
      onSearch={search}
      filters={filters}
      filterValues={filterValues}
      onFilterChange={(key, val) => updateFilters({ [key]: val })}
      onClearFilters={clearFilters}
      onRefresh={fetchAll}
      showActions={false}
      batchOperations={false}
      selectedRowKeys={value}
      onSelectChange={(keys) => onChange?.(keys as number[])}
      size="small"
      scroll={{ y: 300 }}
    />
  );
};

/**
 * Picker component with a Button that opens the Table in a Modal
 */
const DutyPersonnelPicker: React.FC<DutyPersonnelTableProps & { label?: string }> = (props) => {
  const [open, setOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  const count = props.value?.length || 0;
  const tempCount = tempSelectedIds.length;

  const handleOpen = () => {
    setTempSelectedIds(props.value || []);
    setOpen(true);
  };

  const handleOk = () => {
    props.onChange?.(tempSelectedIds);
    setOpen(false);
  };

  return (
    <div className="duty-personnel-picker">
      <Space direction="horizontal" wrap>
        <Button 
          icon={<TeamOutlined />} 
          onClick={handleOpen}
          style={{ width: '100%', minWidth: 160, textAlign: 'left', display: 'flex', alignItems: 'center' }}
          className="duty-picker-trigger"
        >
          {props.label || "Quản lý nhân sự kíp trực"}
          <Badge 
            count={count} 
            showZero={false} 
            offset={[10, 0]} 
            style={{ backgroundColor: 'var(--primary-color)' }} 
          />
        </Button>
        {count > 0 && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            (Đã chọn {count})
          </Text>
        )}
      </Space>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
            <Space>
              <UserOutlined />
              <span>{props.label || "Chọn nhân sự kíp trực"}</span>
            </Space>
            <Tag color="processing" style={{ borderRadius: 6, margin: 0 }}>
              Đang chọn: {tempCount} nhân sự
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
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Sử dụng bảng dưới đây để tìm kiếm và chọn nhân sự tham gia kíp trực. 
            Thay đổi chỉ được áp dụng sau khi bạn nhấn nút <b>Hoàn tất</b>.
          </Text>
        </div>
        <DutyPersonnelTable 
          value={tempSelectedIds} 
          onChange={setTempSelectedIds} 
          hideCard={true} 
        />
      </Modal>
    </div>
  );
};

export default DutyPersonnelPicker;
