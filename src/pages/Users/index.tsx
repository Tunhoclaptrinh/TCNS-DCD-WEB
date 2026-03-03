import { useEffect, useState } from 'react';
import { Form, Image, Switch, Tag } from 'antd';
import { CheckCircleOutlined, RiseOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import StatisticsCard from '../../components/common/StatisticsCard';
import { DataTableColumn, FilterConfig } from '../../components/common/DataTable/types';
import userService from '../../services/user.service';
import { User, UserStats } from '../../types';
import { useAccess } from '../../hooks';
import UsersForm from './components/Form';
import UsersDetailModal from './components/Detail';

const UserPage = () => {
    const formatDateTime = (value?: string) => {
        if (!value) return '--';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '--';
        return parsed.toLocaleString('vi-VN');
    };

    const avatarFallback = `data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>'
    )}`;

    const {
        data,
        loading,
        pagination,
        fetchAll,
        remove,
        create,
        update,
        handleTableChange,
        updateFilters,
        clearFilters,
        search,
        searchTerm,
        filters: filterValues,
        selectedIds,
        setSelectedIds,
        batchDelete,
        importData,
        exportData,
        downloadTemplate,
    } = useCRUD(userService, {
        autoFetch: true,
    });

    const { hasPermission } = useAccess();

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [stats, setStats] = useState<UserStats>({
        total: 0,
        active: 0,
        inactive: 0,
        recentSignups: 0,
        byRole: {} as any,
        withReviews: 0,
    });

    const fetchUserStats = async () => {
        if (!hasPermission('users:view_stats')) return;

        try {
            setStatsLoading(true);
            const response = await userService.getStats();
            const statsData = response.data || (response as any);

            setStats((prev) => ({
                ...prev,
                ...statsData,
                byRole: statsData?.byRole || {},
            }));
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserStats();
    }, []);

    const handleToggleStatus = async (record: User) => {
        try {
            setEditingId(record.id);
            await userService.toggleStatus(record.id);
            await fetchAll();
            await fetchUserStats();
        } finally {
            setEditingId(null);
        }
    };

    const columns: DataTableColumn<User>[] = [
        {
            title: "Avatar",
            dataIndex: "avatar",
            key: "avatar",
            width: 80,
            render: (avatar: string) => (
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#f0f0f0',
                        display: 'inline-block',
                    }}
                >
                    <Image
                        src={avatar || avatarFallback}
                        alt="avatar"
                        width={40}
                        height={40}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(event) => {
                            const target = event.currentTarget;
                            if (target.src !== avatarFallback) {
                                target.src = avatarFallback;
                            }
                        }}
                    />
                </div>
            ),
        },
        {
            title: "Tên người dùng",
            maxWidth: 300,
            dataIndex: "name",
            key: "name",
            minWidth: 210,
            width: 220,
            resizable: true,
            searchable: true,
            ellipsis: true,
            align:'left'
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            width: 260,
            resizable: true,
            searchable: true,
            ellipsis: true,
            align:'left'
        },
        {
            title: "Số điện thoại",
            dataIndex: "phone",
            key: "phone",
            width: 150,
            resizable: true,
            searchable: true,
        },
        // {
        //     title: "Địa chỉ",
        //     dataIndex: "address",
        //     key: "address",
        //     width: 220,
        //     resizable: true,
        //     searchable: true,
        //     ellipsis: true,
        //     render: (address?: string) => address || '--',
        // },

        // {
        //     title: "Tiểu sử",
        //     dataIndex: "bio",
        //     key: "bio",
        //     width: 240,
        //     resizable: true,
        //     searchable: true,
        //     ellipsis: true,
        //     render: (bio?: string) => bio || '--',
        // },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            width: 100,
            resizable: true,
            sortable: false,
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'Staff', value: 'staff' },
                { text: 'Customer', value: 'customer' },
            ],
            render: (role: string) => {
                const color = role === 'admin' ? 'volcano' : role === 'staff' ? 'blue' : 'gold';
                return <Tag color={color}>{role.toUpperCase()}</Tag>;
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 110,
            resizable: true,
            sortable: false,
            filters: [
                { text: 'Hoạt động', value: true },
                { text: 'Khóa', value: false },
            ],
            filterMultiple: false,
            render: (isActive: boolean, record: User) => (
                <Switch
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    checked={isActive}
                    onChange={() => handleToggleStatus(record)}
                    disabled={!hasPermission('users:manage_status')}
                    loading={loading && editingId === record.id}
                />
            ),
        },
        {
            title: "Đăng nhập gần nhất",
            dataIndex: "lastLogin",
            key: "lastLogin",
            width: 180,
            resizable: true,
            render: (value?: string) => formatDateTime(value),
        },
        {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            resizable: true,
            render: (value?: string) => formatDateTime(value),
        },
        {
            title: "Cập nhật",
            dataIndex: "updatedAt",
            key: "updatedAt",
            width: 180,
            resizable: true,
            render: (value?: string) => formatDateTime(value),
        },
    ];

    const filters: FilterConfig[] = [
        {
            key: "role",
            label: "Vai trò",
            type: "select" as const,
            operators: ['eq', 'in'],
            options: [
                { label: "Admin", value: "admin" },
                { label: "Staff", value: "staff" },
                { label: "Customer", value: "customer" },
            ],
        },
        {
            key: "isActive",
            label: "Trạng thái",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Hoạt động", value: true },
                { label: "Khóa", value: false },
            ],
        },
        {
            key: "name",
            label: "Tên người dùng",
            type: "input" as const,
            operators: ['like', 'eq'],
        },
        {
            key: "email",
            label: "Email",
            type: "input" as const,
            operators: ['like', 'eq'],
        },
        {
            key: "phone",
            label: "Số điện thoại",
            type: "input" as const,
            operators: ['like', 'eq'],
        },
        {
            key: "address",
            label: "Địa chỉ",
            type: "input" as const,
            operators: ['like', 'eq'],
        },
        {
            key: "bio",
            label: "Tiểu sử",
            type: "input" as const,
            operators: ['like'],
        },
        {
            key: "createdAt",
            label: "Ngày tạo",
            type: "date" as const,
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
        },
        {
            key: "updatedAt",
            label: "Ngày cập nhật",
            type: "date" as const,
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
        },
        {
            key: "lastLogin",
            label: "Đăng nhập gần nhất",
            type: "date" as const,
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
        },
    ];

    const handleDelete = async (id: number) => {
        const success = await remove(id);
        if (success) {
            await fetchUserStats();
        }
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, role: 'customer' });
        setIsModalVisible(true);
    };

    const openEdit = (record: User) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const openView = (record: User) => {
        setViewingUser(record);
        setIsDetailModalVisible(true);
    };

    const onOk = async () => {
        try {
            const values = await form.validateFields();
            let success;
            if (editingId) {
                success = await update(editingId, values);
            } else {
                success = await create(values);
            }

            if (success) {
                setIsModalVisible(false);
                form.resetFields();
                await fetchUserStats();
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    return (
        <>
            
            <DataTable
            headerContent={
                <>
                {hasPermission('users:view_stats') && (
                <div style={{ margin: 16 }}>
                    <StatisticsCard
                        loading={statsLoading}
                        hideCard
                        data={[
                            {
                                title: 'Tổng người dùng',
                                value: stats.total || 0,
                                icon: <TeamOutlined />,
                                valueColor: 'var(--primary-color)',
                            },
                            {
                                title: 'Đang hoạt động',
                                value: stats.active || 0,
                                icon: <CheckCircleOutlined />,
                                valueColor: '#22c55e',
                            },
                            {
                                title: 'Đang khóa',
                                value: stats.inactive || 0,
                                icon: <StopOutlined />,
                                valueColor: '#ef4444',
                            },
                            {
                                title: 'Mới 7 ngày',
                                value: stats.recentSignups || 0,
                                icon: <RiseOutlined />,
                                valueColor: '#1890ff',
                            },
                        ]}
                        colSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
                        rowGutter={12}
                        statShadow={false}
                    />
                </div>
                )}
                </>
            }
                title="Quản lý người dùng"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                tableLayout="fixed"
                saveColumnWidths
                columnResizeKey="users-table"
                onAdd={hasPermission('users:create') ? openCreate : undefined}
                onRefresh={async () => {
                    await fetchAll();
                    await fetchUserStats();
                }}
                onEdit={hasPermission('users:update') ? openEdit : undefined}
                onView={hasPermission('users:list') ? openView : undefined}
                onDelete={hasPermission('users:delete') ? handleDelete : undefined}
                // Search & Filter
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={(key, value) => updateFilters({ [key]: value })}
                onClearFilters={clearFilters}
                // Batch Operations
                batchOperations={hasPermission('users:delete')}
                selectedRowKeys={selectedIds}
                onSelectChange={setSelectedIds}
                onBatchDelete={async (ids) => {
                    const success = await batchDelete(ids);
                    if (success) {
                        await fetchUserStats();
                    }
                }}
                // Import/Export
                importable={hasPermission('users:import_export')}
                exportable={hasPermission('users:import_export')}
                onImport={async (file) => {
                    const result = await importData(file);
                    if (result) {
                        await fetchUserStats();
                    }
                }}
                onExport={exportData}
                onDownloadTemplate={downloadTemplate}
            />

            <UsersForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
            />

            <UsersDetailModal
                open={isDetailModalVisible}
                user={viewingUser}
                avatarFallback={avatarFallback}
                formatDateTime={formatDateTime}
                onCancel={() => {
                    setIsDetailModalVisible(false);
                    setViewingUser(null);
                }}
            />
        </>
    );
};

export default UserPage;
