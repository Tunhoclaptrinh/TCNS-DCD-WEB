import { useState, useEffect } from 'react';
import { Tag, Space, Typography, Modal, Row, Col } from 'antd';
import { 
  TrophyOutlined, 
  WarningOutlined, 
  WalletOutlined
} from '@ant-design/icons';
import { useCRUD } from '@/hooks/useCRUD';
import { DataTable, StatisticsCard } from '@/components/common';
import { DataTableColumn, FilterConfig } from '@/components/common/DataTable/types';
import rewardPenaltyService, { RewardPenaltyEntry, FinancialStats } from '@/services/reward-penalty.service';
import RewardPenaltyModal from './RewardPenaltyModal';
import PenaltySettingsModal from './PenaltySettingsModal';
import dayjs from 'dayjs';
import { Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const RewardPenaltiesPage = () => {
  const {
    data,
    loading,
    pagination,
    fetchAll,
    remove,
    handleTableChange,
    updateFilters,
    clearFilters,
    filters: filterValues,
    search,
    searchTerm,
  } = useCRUD(rewardPenaltyService, {
    autoFetch: true,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RewardPenaltyEntry | null>(null);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [fetchingStats, setFetchingStats] = useState(false);

  // Settings Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const fetchStats = async () => {
    setFetchingStats(true);
    try {
      const res = await rewardPenaltyService.getFinancialStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (record: RewardPenaltyEntry) => {
    setEditingItem(record);
    setModalOpen(true);
  };

  const handleDelete = (id: any) => {
    const record = data.find((item: RewardPenaltyEntry) => item.id === id);
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa bản ghi của ${record?.user?.name || 'thành viên này'}?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const success = await remove(id);
        if (success) {
          fetchStats();
        }
      },
    });
  };

  const columns: DataTableColumn[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sortable: true,
    },
    {
      title: 'Thành viên',
      key: 'user',
      width: 250,
      render: (_, record: RewardPenaltyEntry) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.user?.name || `ID: ${record.userId}`}</Text>
          {record.user?.position && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.position.toUpperCase()}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => (
        <Tag color={type === 'reward' ? 'success' : 'error'} icon={type === 'reward' ? <TrophyOutlined /> : <WarningOutlined />}>
          {type === 'reward' ? 'THƯỞNG' : 'PHẠT'}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 180,
      render: (amount: number, record: RewardPenaltyEntry) => (
        <Text type={record.type === 'reward' ? 'success' : 'danger'} strong>
          {record.type === 'reward' ? '+' : '-'}{amount.toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      minWidth: 200,
    },
    {
      title: 'Ngày ghi nhận',
      dataIndex: 'eventDate',
      key: 'eventDate',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
  ];

  const filtersConfig: FilterConfig[] = [
    {
      key: 'type',
      label: 'Loại',
      type: 'select',
      options: [
        { label: 'Thưởng', value: 'reward' },
        { label: 'Phạt', value: 'penalty' },
      ],
      operators: ['eq'],
    },
    {
      key: 'userId',
      label: 'ID Thành viên',
      type: 'input',
      operators: ['eq'],
    },
    {
      key: 'eventDate',
      label: 'Ngày ghi nhận',
      type: 'date',
      operators: ['gte', 'lte'],
    }
  ];

  const headerContent = (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <StatisticsCard
            loading={fetchingStats}
            hideCard={true}
            data={[
              {
                title: 'Tổng tiền thưởng',
                value: stats?.totalReward || 0,
                icon: <TrophyOutlined />,
                valueColor: '#52c41a',
              },
              {
                title: 'Tổng tiền phạt',
                value: stats?.totalPenalty || 0,
                icon: <WarningOutlined />,
                valueColor: '#ff4d4f',
              },
              {
                title: 'Số dư thực tế',
                value: stats?.netBalance || 0,
                icon: <WalletOutlined />,
                valueColor: stats?.netBalance && stats.netBalance < 0 ? "#ff4d4f" : "#1890ff",
              }
            ]}
          />
        </Col>
      </Row>
    </div>
  );

  return (
    <div className="admin-page-container">
      <DataTable
        title="Quản lý Thưởng & Phạt"
        data={data}
        loading={loading}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchAll}
        pagination={pagination}
        onPaginationChange={handleTableChange}
        searchPlaceholder="Tìm kiếm lý do..."
        onSearch={search}
        searchValue={searchTerm}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={(key, value) => updateFilters({ [key]: value })}
        onClearFilters={clearFilters}
        rowKey="id"
        headerContent={headerContent}
        extra={
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setSettingsModalOpen(true)}
            style={{ borderRadius: 8, fontWeight: 500, color: '#cf1322', borderColor: '#ffa39e', background: '#fff1f0', height: 32 }}
          >
            Cấu hình Phạt Tự động
          </Button>
        }
      />

      <RewardPenaltyModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSuccess={() => {
          fetchAll();
          fetchStats();
        }}
        initialValues={editingItem}
      />

      <PenaltySettingsModal 
        open={settingsModalOpen} 
        onCancel={() => setSettingsModalOpen(false)} 
      />
    </div>
  );
};

export default RewardPenaltiesPage;
