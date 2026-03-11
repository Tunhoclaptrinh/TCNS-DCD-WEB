import { useEffect, useState } from 'react';
import { Form, Tag, message, Tabs, Table, Typography } from 'antd';
import {
    GiftOutlined,
    MinusCircleOutlined,
    DollarOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import StatisticsCard from '../../components/common/StatisticsCard';
import { DataTableColumn, FilterConfig } from '../../components/common/DataTable/types';
import rewardPenaltyService from '../../services/reward-penalty.service';
import { useAccess } from '../../hooks';
import RewardPenaltyForm from './components/Form';
import type { RewardPenaltyEntry, FinancialStats } from '../../types/reward-penalty.types';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const TYPE_COLORS: Record<string, string> = { reward: 'success', penalty: 'error' };
const TYPE_LABELS: Record<string, string> = { reward: 'Thưởng', penalty: 'Phạt' };
const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

const isFormValidationError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'errorFields' in error;

const RewardPenaltyPage = () => {
    const { hasPermission } = useAccess();
    const [form] = Form.useForm();
    const [formOpen, setFormOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('history');

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
        selectedIds,
        setSelectedIds,
        batchDelete,
    } = useCRUD(rewardPenaltyService, { autoFetch: true });

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await rewardPenaltyService.getFinancialStats();
            setFinancialStats(res.data as FinancialStats);
        } catch {
            // silent
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleAdd = async () => {
        try {
            setFormLoading(true);
            const values = await form.validateFields();
            await rewardPenaltyService.createEntry({
                ...values,
                user_id: Number(values.user_id),
                amount: Number(values.amount),
            });
            message.success('Đã thêm thưởng/phạt thành công');
            setFormOpen(false);
            form.resetFields();
            await fetchAll();
            await fetchStats();
        } catch (error: unknown) {
            if (isFormValidationError(error)) return;
            message.error(getErrorMessage(error, 'Thao tác thất bại'));
        } finally {
            setFormLoading(false);
        }
    };

    const columns: DataTableColumn<RewardPenaltyEntry>[] = [
        {
            title: 'Thành viên',
            key: 'userName',
            width: 180,
            resizable: true,
            render: (_: unknown, record: RewardPenaltyEntry) =>
                record.user?.name || `ID: ${record.user_id}`,
        },
        {
            title: 'Mã SV',
            key: 'studentId',
            width: 120,
            render: (_: unknown, record: RewardPenaltyEntry) =>
                record.user?.studentId || <span style={{ color: '#bfbfbf' }}>—</span>,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => (
                <Tag color={TYPE_COLORS[type] || 'default'}>{TYPE_LABELS[type] || type}</Tag>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 140,
            sorter: true,
            render: (val: number, record: RewardPenaltyEntry) => (
                <span
                    style={{
                        color: record.type === 'reward' ? '#52c41a' : '#ff4d4f',
                        fontWeight: 600,
                    }}
                >
                    {record.type === 'penalty' ? '−' : '+'}
                    {formatCurrency(val)}
                </span>
            ),
        },
        {
            title: 'Lý do',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            resizable: true,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            sorter: true,
            render: (val: string) =>
                val ? new Date(val).toLocaleString('vi-VN') : '—',
        },
    ];

    const filters: FilterConfig[] = [
        {
            key: 'type',
            label: 'Loại',
            type: 'select',
            operators: ['eq'],
            options: [
                { label: 'Thưởng', value: 'reward' },
                { label: 'Phạt', value: 'penalty' },
            ],
        },
        {
            key: 'createdAt',
            label: 'Ngày tạo',
            type: 'date',
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
        },
    ];

    // Monthly stats table columns
    const monthlyColumns = [
        {
            title: 'Tháng',
            dataIndex: 'month',
            key: 'month',
            render: (val: string) => <b>{val}</b>,
        },
        {
            title: 'Thưởng',
            dataIndex: 'reward',
            key: 'reward',
            render: (val: number) => (
                <span style={{ color: '#52c41a' }}>{formatCurrency(val)}</span>
            ),
        },
        {
            title: 'Phạt',
            dataIndex: 'penalty',
            key: 'penalty',
            render: (val: number) => (
                <span style={{ color: '#ff4d4f' }}>{formatCurrency(val)}</span>
            ),
        },
        {
            title: 'Số dư',
            dataIndex: 'net',
            key: 'net',
            render: (val: number) => (
                <span
                    style={{ color: val >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}
                >
                    {formatCurrency(val)}
                </span>
            ),
        },
    ];

    const statsData = [
        {
            title: 'Tổng thưởng',
            value: formatCurrency(financialStats?.totalReward ?? 0),
            icon: <GiftOutlined />,
            valueColor: '#52c41a',
        },
        {
            title: 'Tổng phạt',
            value: formatCurrency(financialStats?.totalPenalty ?? 0),
            icon: <MinusCircleOutlined />,
            valueColor: '#ff4d4f',
        },
        {
            title: 'Số dư ròng',
            value: formatCurrency(financialStats?.netBalance ?? 0),
            icon: <DollarOutlined />,
            valueColor: (financialStats?.netBalance ?? 0) >= 0 ? '#1890ff' : '#ff4d4f',
        },
    ];

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <Typography.Title level={3} style={{ margin: 0 }}>
                    <GiftOutlined style={{ marginRight: 8 }} />
                    Thưởng phạt
                </Typography.Title>
            </div>

            <StatisticsCard
                loading={statsLoading}
                hideCard
                data={statsData}
                colSpan={{ xs: 24, sm: 8 }}
                rowGutter={12}
                statShadow={false}
                containerStyle={{ marginBottom: 24 }}
            />

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'history',
                        label: 'Lịch sử thưởng/phạt',
                        children: (
                            <DataTable
                                title="Lịch sử thưởng/phạt"
                                loading={loading}
                                columns={columns}
                                dataSource={data as RewardPenaltyEntry[]}
                                pagination={pagination}
                                onPaginationChange={handleTableChange}
                                onAdd={
                                    hasPermission('reward_penalty:manage')
                                        ? () => setFormOpen(true)
                                        : undefined
                                }
                                onRefresh={() => {
                                    fetchAll();
                                    fetchStats();
                                }}
                                searchable
                                searchValue={searchTerm}
                                onSearch={search}
                                filters={filters}
                                filterValues={filterValues}
                                onFilterChange={(key, value) => updateFilters({ [key]: value })}
                                onClearFilters={clearFilters}
                                batchOperations={hasPermission('reward_penalty:manage')}
                                selectedRowKeys={selectedIds}
                                onSelectChange={setSelectedIds}
                                onBatchDelete={batchDelete}
                                rowKey="id"
                                saveColumnWidths
                                columnResizeKey="reward-penalty-table"
                            />
                        ),
                    },
                    {
                        key: 'stats',
                        label: (
                            <span>
                                <BarChartOutlined /> Thống kê tài chính
                            </span>
                        ),
                        children: (
                            <Table
                                loading={statsLoading}
                                dataSource={financialStats?.byMonth ?? []}
                                columns={monthlyColumns}
                                rowKey="month"
                                pagination={false}
                                bordered
                                summary={(pageData) => {
                                    const totals = pageData.reduce(
                                        (acc, row) => ({
                                            reward: acc.reward + (row.reward || 0),
                                            penalty: acc.penalty + (row.penalty || 0),
                                            net: acc.net + (row.net || 0),
                                        }),
                                        { reward: 0, penalty: 0, net: 0 }
                                    );
                                    return (
                                        <Table.Summary.Row style={{ fontWeight: 700, background: '#fafafa' }}>
                                            <Table.Summary.Cell index={0}>Tổng cộng</Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <span style={{ color: '#52c41a' }}>
                                                    {formatCurrency(totals.reward)}
                                                </span>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2}>
                                                <span style={{ color: '#ff4d4f' }}>
                                                    {formatCurrency(totals.penalty)}
                                                </span>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={3}>
                                                <span
                                                    style={{
                                                        color: totals.net >= 0 ? '#52c41a' : '#ff4d4f',
                                                    }}
                                                >
                                                    {formatCurrency(totals.net)}
                                                </span>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    );
                                }}
                            />
                        ),
                    },
                ]}
            />

            <RewardPenaltyForm
                open={formOpen}
                form={form}
                onOk={handleAdd}
                onCancel={() => {
                    setFormOpen(false);
                    form.resetFields();
                }}
                loading={formLoading}
            />
        </>
    );
};

export default RewardPenaltyPage;
