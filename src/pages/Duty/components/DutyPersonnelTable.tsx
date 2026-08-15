import React, { useState, useEffect } from 'react';
import { Image, Tag, Modal, Space, Typography } from 'antd';
import Button from '@/components/common/Button';
import { UserOutlined, InfoCircleOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import DataTable from '@/components/common/DataTable';
import { useCRUD } from '@/hooks/useCRUD';
import userService from '@/services/user.service';
import { User } from '@/types';
import { DataTableColumn, FilterConfig } from '@/components/common/DataTable/types';
import { getUserDisplayName } from '@/utils/formatters';
import generationService, { Generation } from '@/services/generation.service';
import systemSettingService from '@/services/system-setting.service';
import { DEPARTMENTS } from '@/constants/user.constants';

const { Text } = Typography;

interface DutyPersonnelTableProps {
  value?: number[];
  onChange?: (value: number[], rows?: User[]) => void;
  hideCard?: boolean;
  /** Only show users with these specific IDs */
  userIds?: number[];
}

export const POSITION_LABELS: Record<string, string> = {
  ctv: 'CTV',
  tv: 'Thành viên',
  tvb: 'Thành viên ban',
  pb: 'Phó ban',
  tb: 'Trưởng ban',
  dt: 'Đội trưởng'
};

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
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);

  useEffect(() => {
    generationService.getAll().then((res) => {
      if (res?.data) {
        setGenerations(Array.isArray(res.data) ? res.data : []);
      }
    }).catch(() => {});

    systemSettingService.getByKey('DEPARTMENT_CONFIGS').then((res) => {
      if (res && res.value) {
        const parsed = typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((d: any) => d.name).filter(Boolean);
          if (names.length > 0) setDepartments(names);
        }
      }
    }).catch(() => {});
  }, []);

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
    initialFilters: { status: 'active' },
  });

  // Apply userIds filter if provided and not showing all; ALWAYS enforce active status
  useEffect(() => {
    const newFilters: Record<string, any> = { status: 'active' };
    if (userIds && !showAll) {
      if (userIds.length > 0) {
        newFilters.id_in = userIds;
      } else {
        newFilters.id_in = [-1];
      }
    } else {
      newFilters.id_in = undefined;
    }
    updateFilters(newFilters);
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
          {getUserDisplayName(record)}
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
      key: "status",
      label: "Trạng thái thành viên",
      type: "select" as const,
      options: [
        { label: "Đang hoạt động (Mặc định cố định)", value: "active" },
      ],
      disabled: true,
    },
    {
      key: "department",
      label: "Ban / Phòng ban",
      type: "select" as const,
      options: departments.map(d => ({ label: d, value: d })),
    },
    {
      key: "position",
      label: "Chức vụ",
      type: "select" as const,
      options: Object.entries(POSITION_LABELS).map(([value, label]) => ({ label, value })),
    },
    {
      key: "generationId",
      label: "Khóa Đội / Thế hệ",
      type: "select" as const,
      options: generations.map(g => ({ label: g.name, value: g.id })),
    },
    {
      key: "studentId",
      label: "Mã Sinh Viên (MSV)",
      type: "input" as const,
      placeholder: "Nhập mã SV (VD: B21...)",
    },
    {
      key: "course",
      label: "Khóa học / Niên khóa",
      type: "input" as const,
      placeholder: "Nhập khóa (VD: D21, D22...)",
    },
    {
      key: "className",
      label: "Lớp học",
      type: "input" as const,
      placeholder: "Nhập tên lớp...",
    },
    {
      key: "email",
      label: "Địa chỉ Email",
      type: "input" as const,
      placeholder: "Nhập email...",
    },
    {
      key: "phone",
      label: "Số điện thoại",
      type: "input" as const,
      placeholder: "Nhập SĐT...",
    },
    {
      key: "cccd",
      label: "Số CCCD / CMND",
      type: "input" as const,
      placeholder: "Nhập số CCCD...",
    },
    {
      key: "hometown",
      label: "Quê quán",
      type: "input" as const,
      placeholder: "Nhập tỉnh / thành phố...",
    },
    {
      key: "gender",
      label: "Giới tính",
      type: "select" as const,
      options: [
        { label: "Nam", value: "male" },
        { label: "Nữ", value: "female" },
        { label: "Khác", value: "other" },
      ],
    },
    {
      key: "isActive",
      label: "Trạng thái tài khoản",
      type: "select" as const,
      options: [
        { label: "Đang Bật", value: true },
        { label: "Đã Tắt", value: false },
      ],
    },
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
        status: 'active',
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
        updateFilters({ status: 'active' });
      }}
      onRefresh={() => fetchAll()}
      showActions={false}
      batchOperations={false}
      selectedRowKeys={value}
      onSelectChange={(keys, rows) => onChange?.(keys as number[], rows as User[])}
      size="small"
      scroll={{ y: 300 }}
      headerContent={
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space wrap size={8}>
            <InfoCircleOutlined style={{ color: '#3b82f6' }} />
            <Text style={{ fontSize: 12, color: '#1e40af' }}>
              {userIds ? (showAll ? "Đang hiển thị toàn bộ thành viên đang hoạt động" : `Chỉ hiển thị ${userIds.length} nhân sự thuộc kíp trực này`) : "Đang lọc danh sách thành viên đang hoạt động"}
            </Text>
            <Tag color="success" bordered={false} style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Đang hoạt động (Mặc định)</Tag>
          </Space>
          {userIds && (
            <Button 
              buttonSize="small" 
              variant={showAll ? "outline" : "primary"}
              onClick={() => setShowAll(!showAll)}
              style={{ fontSize: 11, borderRadius: 6 }}
            >
              {showAll ? "Lọc theo kíp trực" : "Xem tất cả thành viên"}
            </Button>
          )}
        </div>
      }
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
  hideBadge?: boolean;
}> = (props) => {
  const [open, setOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);
  const [tempSelectedRows, setTempSelectedRows] = useState<User[]>([]);
  const count = props.value?.length || 0;
  const tempCount = tempSelectedIds.length;
  const { userIds, icon, variant = 'outline', buttonSize = 'medium', style, hideBadge = false } = props;

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
        icon={icon || <UsergroupAddOutlined style={{ fontSize: 16 }} />} 
        onClick={handleOpen}
        style={{ 
          height: buttonSize === 'small' ? 30 : 36,
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 6,
          borderRadius: 6,
          fontWeight: 600,
          fontSize: buttonSize === 'small' ? '12px' : '13px',
          padding: buttonSize === 'small' ? '0 10px' : '0 12px',
          ...(variant === 'primary' ? {
            backgroundColor: '#fff',
            borderColor: '#2563eb',
            color: '#2563eb',
          } : {}),
          ...style 
        }}
        className="duty-picker-trigger"
      >
        <span style={{ whiteSpace: 'nowrap' }}>{props.label || "Phân công nhân sự"}</span>
        {(count > 0 && !hideBadge) && (
          <div style={{ 
          backgroundColor: variant === 'primary' ? '#2563eb' : (style?.color || style?.borderColor || '#ef4444'),
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
          lineHeight: 1,
          marginLeft: 4,
        }}>
          {count}
        </div>
        )}
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
                const map = new Map((prev || []).filter(r => r && r.id).map(r => [r.id, r]));
                (rows || []).filter(r => r && r.id).forEach(r => map.set(r.id, r));
                return Array.from(map.values()).filter(r => r && r.id && keys.includes(r.id));
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
