import React, { useState, useEffect } from 'react';
import { Image, Tag, Modal, Badge, Space, Typography } from 'antd';
import Button from '@/components/common/Button';
import { TeamOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import DataTable from '@/components/common/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import userService from '@/services/user.service';
import { User } from '@/types';
import { DataTableColumn, FilterConfig } from '@/components/common/DataTable/types';

const { Text } = Typography;

interface DutyPersonnelTableProps {
  value?: number[];
  onChange?: (value: number[], rows?: User[]) => void;
  hideCard?: boolean;
  /** Only show users with these specific IDs */
  userIds?: number[];
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
  userIds,
}) => {
  const [showAll, setShowAll] = useState(false);

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

  // Apply userIds filter if provided and not showing all
  useEffect(() => {
    if (userIds && !showAll) {
      if (userIds.length > 0) {
        updateFilters({ id_in: userIds });
      } else {
        updateFilters({ id_in: [-1] });
      }
    } else {
      // Clear filter if showing all or no userIds provided
      updateFilters({ id_in: undefined });
    }
  }, [userIds, showAll]);

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

  const filterConfig: FilterConfig[] = [
    ...(userIds ? [{
      key: "scope",
      label: "Phạm vi nhân sự",
      type: "select" as const,
      options: [
        { label: "Chỉ người trong kíp", value: "shift" },
        { label: "Toàn bộ Đội Cờ Đỏ", value: "all" },
      ],
    }] : []),
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

  // Sync filterValues.scope with showAll state
  useEffect(() => {
    if (filterValues.scope === 'all') {
      setShowAll(true);
    } else if (filterValues.scope === 'shift') {
      setShowAll(false);
    }
  }, [filterValues.scope]);

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
      filters={filterConfig}
      filterValues={{
        ...filterValues,
        scope: showAll ? 'all' : 'shift'
      }}
      onFilterChange={(key, val) => {
        if (key === 'scope') {
          setShowAll(val === 'all');
        } else {
          updateFilters({ [key]: val });
        }
      }}
      onClearFilters={() => {
        clearFilters();
        setShowAll(false);
      }}
      onRefresh={() => fetchAll()}
      showActions={false}
      batchOperations={false}
      selectedRowKeys={value}
      onSelectChange={(keys, rows) => onChange?.(keys as number[], rows as User[])}
      size="small"
      scroll={{ y: 300 }}
      headerContent={userIds ? (
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <InfoCircleOutlined style={{ color: '#3b82f6' }} />
            <Text style={{ fontSize: 12, color: '#1e40af' }}>
              {showAll ? "Đang hiển thị toàn bộ thành viên" : `Chỉ hiển thị ${userIds.length} nhân sự thuộc kíp trực này`}
            </Text>
          </Space>
          <Button 
            buttonSize="small" 
            variant={showAll ? "outline" : "primary"}
            onClick={() => setShowAll(!showAll)}
            style={{ fontSize: 11, borderRadius: 6 }}
          >
            {showAll ? "Lọc theo kíp trực" : "Xem tất cả thành viên"}
          </Button>
        </div>
      ) : undefined}
    />
  );
};

/**
 * Picker component with a Button that opens the Table in a Modal
 */
const DutyPersonnelPicker: React.FC<DutyPersonnelTableProps & { 
  label?: string; 
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  buttonSize?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}> = (props) => {
  const [open, setOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  const [tempSelectedRows, setTempSelectedRows] = useState<User[]>([]);
  const count = props.value?.length || 0;
  const tempCount = tempSelectedIds.length;
  const { userIds, icon, variant = 'outline', buttonSize = 'medium', style } = props;

  const handleOpen = () => {
    setTempSelectedIds(props.value || []);
    setTempSelectedRows([]);
    setOpen(true);
  };

  const handleOk = () => {
    props.onChange?.(tempSelectedIds, tempSelectedRows);
    setOpen(false);
  };

  return (
    <div className="duty-personnel-picker" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      <Button 
        variant={variant}
        buttonSize={buttonSize}
        icon={icon || <TeamOutlined />} 
        onClick={handleOpen}
        style={{ 
          minWidth: 150, 
          height: 32,
          textAlign: 'left', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          borderRadius: 8,
          ...style 
        }}
        className="duty-picker-trigger"
      >
        <span style={{ flex: 1, fontWeight: variant === 'primary' ? 600 : 400 }}>{props.label || "Quản lý nhân sự kíp trực"}</span>
        <Badge 
          count={count} 
          showZero={false} 
          style={{ 
            backgroundColor: variant === 'primary' ? '#fff' : '#ff4d4f',
            color: variant === 'primary' ? 'var(--primary-color)' : '#fff',
            boxShadow: 'none'
          }} 
        />
      </Button>

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
          userIds={userIds}
          value={tempSelectedIds} 
          onChange={(keys, rows) => {
            setTempSelectedIds(keys);
            if (rows) {
              setTempSelectedRows(prev => {
                const map = new Map(prev.map(r => [r.id, r]));
                rows.forEach(r => map.set(r.id, r));
                return Array.from(map.values()).filter(r => keys.includes(r.id));
              });
            }
          }} 
          hideCard={true} 
        />
      </Modal>
    </div>
  );
};

export default DutyPersonnelPicker;
