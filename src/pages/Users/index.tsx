import { useState, useEffect, useMemo } from 'react';
import { Tabs, Form, Image, Switch, Tag, Dropdown, Menu, Modal, message, Space, Tooltip, Select, AutoComplete, Input } from 'antd';
import { 
    CheckCircleOutlined, 
    RiseOutlined, 
    StopOutlined, 
    TeamOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    EyeOutlined,
    UserDeleteOutlined,
    MenuOutlined,
    SafetyOutlined
} from '@ant-design/icons';
import { useCRUD } from '../../hooks/useCRUD';
import { Button, DataTable, StatisticsCard, TabSwitcher } from '@/components/common';
import { DataTableColumn, FilterConfig } from '../../components/common/DataTable/types';
import userService from '../../services/user.service';
import { User, UserStats } from '../../types';
import { useAccess } from '../../hooks';
import UsersForm from './components/Form';
import UsersDetailModal from './components/Detail';
import generationService, { Generation } from '../../services/generation.service';

const POSITION_LEVELS = ['ctc', 'tv', 'tvb', 'pb', 'tb', 'dt'];
const POSITION_LABELS: Record<string, string> = {
    ctc: 'Cộng tác viên',
    tv: 'Thành viên',
    tvb: 'Thành viên ban',
    pb: 'Phó ban',
    tb: 'Trưởng ban',
    dt: 'Đội trưởng'
};

const DEPARTMENT_OPTIONS = ['Tài chính', 'Truyền thông', 'Nhân sự'];

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
        validateImport,
        exportData,
        downloadTemplate,
    } = useCRUD(userService, {
        autoFetch: true,
        expand: 'generation',
    });

    const { hasPermission } = useAccess();

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isPromoteModalVisible, setIsPromoteModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [fetchingStats, setFetchingStats] = useState(false);
    const [promotingUser, setPromotingUser] = useState<User | null>(null);
    const [targetPosition, setTargetPosition] = useState<string>('');
    const [targetDepartment, setTargetDepartment] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');
    
    const initialStatObject = {
        total: 0,
        active: 0,
        inactive: 0,
        dismissed: 0,
        ctv: 0,
        official: 0,
        management: 0,
        recentSignups: 0,
        byRole: {},
        byPosition: {},
    };

    const ACTIVE_ONLY = 'active_only';
    const [stats, setStats] = useState<UserStats>({
        global: initialStatObject,
        byDepartment: {},
    });
    const [generationList, setGenerationList] = useState<Generation[]>([]);
    const [selectedGenerationId, setSelectedGenerationId] = useState<number | typeof ACTIVE_ONLY | undefined>(ACTIVE_ONLY);

    // Optimized: Memoized active generation IDs
    const activeGenerationIds = useMemo(() => 
        generationList.filter(g => g.isActive).map(g => g.id),
    [generationList]);

    // Optimized: Centralized filter object
    const currentGenFilter = useMemo(() => {
        if (selectedGenerationId === ACTIVE_ONLY) {
            return { 
                generationId: undefined, 
                generationId_in: activeGenerationIds.length > 0 ? activeGenerationIds : undefined 
            };
        }
        return { 
            generationId: selectedGenerationId, 
            generationId_in: undefined 
        };
    }, [selectedGenerationId, activeGenerationIds]);

    const fetchGenerations = async () => {
        try {
            const res = await generationService.getAll();
            if (res.success && res.data) {
                setGenerationList(res.data);
                
                setGenerationList(res.data);
                
                // On first load, initial filter is handled by the reactive effect and memo
            }
        } catch (error) {
            console.error('Failed to fetch generations:', error);
        }
    };

    const fetchUserStats = async (filters: any = {}) => {
        if (!hasPermission('users:view_stats')) return;

        setFetchingStats(true);
        try {
            const response = await userService.getStats(filters);
            const statsData = response.data || (response as any);

            if (statsData) {
                setStats(statsData);
            }
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        } finally {
            setFetchingStats(false);
        }
    };

    // Fetch initial data
    useEffect(() => {
        fetchGenerations();
    }, []);

    // Reactive stats update when filter changes
    useEffect(() => {
        fetchUserStats(currentGenFilter);
        // Also ensure useCRUD filters are synced on value change
        updateFilters(currentGenFilter);
    }, [selectedGenerationId, activeGenerationIds]);
    
    // Synced refresh helper
    const refreshData = async () => {
        await fetchAll();
        await fetchUserStats(currentGenFilter);
    };

    const handleToggleStatus = async (record: User) => {
        try {
            setEditingId(record.id);
            await userService.toggleStatus(record.id);
            await fetchAll();
            await fetchUserStats({ generationId: selectedGenerationId });
        } finally {
            setEditingId(null);
        }
    };

    const handlePromote = (record: User) => {
        setPromotingUser(record);
        setTargetPosition(record.position || 'ctc');
        setTargetDepartment(record.department || '');
        setIsPromoteModalVisible(true);
    };

    const onPromoteOk = async () => {
        if (!promotingUser) return;
        
        try {
            const updateData: any = { position: targetPosition };
            const isBanRole = ['tvb', 'pb', 'tb'].includes(targetPosition);
            
            if (isBanRole) {
                if (!targetDepartment) {
                    message.error('Vui lòng nhập tên ban');
                    return;
                }
                updateData.department = targetDepartment;
            } else {
                updateData.department = null; // Clear department if not a ban role
            }

            await update(promotingUser.id, updateData);
            message.success(`Đã cập nhật chức vụ cho ${promotingUser.name}`);
            setIsPromoteModalVisible(false);
            setPromotingUser(null);
            setTargetDepartment('');
            await fetchAll();
            
            // Update viewing user if open
            if (viewingUser?.id === promotingUser.id) {
                setViewingUser({ ...viewingUser, ...updateData } as User);
            }
        } catch (error) {
            console.error('Promotion failed:', error);
        }
    };

    const handleDismiss = async (record: User) => {
        let reason = '';
        Modal.confirm({
            title: 'Xác nhận khai trừ',
            icon: <StopOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <div style={{ marginTop: 16 }}>
                    <p>Cảnh báo: Bạn đang thực hiện khai trừ <strong>{record.name}</strong>. Thành viên này sẽ bị chuyển trạng thái vĩnh viễn sang KHAI TRỪ.</p>
                    <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Lý do khai trừ (bắt buộc):</label>
                        <Input.TextArea 
                            placeholder="Nhập lý do khai trừ..."
                            rows={3}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { reason = e.target.value; }}
                        />
                    </div>
                </div>
            ),
            okText: 'Xác nhận Khai trừ',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            width: 480,
            onOk: async () => {
                if (!reason.trim()) {
                    message.error('Vui lòng nhập lý do khai trừ');
                    throw new Error('Reason is required');
                }
                const updatedBio = record.bio 
                    ? `${record.bio}\n[KHAI TRỪ - ${new Date().toLocaleDateString('vi-VN')}]: ${reason}`
                    : `[KHAI TRỪ - ${new Date().toLocaleDateString('vi-VN')}]: ${reason}`;
                
                await update(record.id, { 
                    status: 'dismissed' as any, 
                    isActive: false,
                    bio: updatedBio
                });
                
                message.warning('Đã khai trừ thành viên');
                await fetchAll();
                await fetchUserStats({ generationId: selectedGenerationId });
                if (viewingUser?.id === record.id) {
                    setViewingUser({ ...record, status: 'dismissed', isActive: false, bio: updatedBio } as User);
                }
            }
        });
    };

    const columns: DataTableColumn<User>[] = [
        {
            title: "Avatar",
            dataIndex: "avatar",
            key: "avatar",
            width: 80,
            searchable: false,
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
            title: "Tên thành viên",
            maxWidth: 300,
            key: "fullName",
            minWidth: 210,
            width: 220,
            resizable: true,
            searchable: true,
            ellipsis: true,
            align: 'left',
            render: (_: any, record: User) => {
                if (record.lastName || record.firstName) {
                    return `${record.lastName || ''} ${record.firstName || ''}`.trim();
                }
                return record.name;
            }
        },
        {
            title: "Mã SV",
            dataIndex: "studentId",
            key: "studentId",
            width: 120,
            resizable: true,
            searchable: true,
        },
        {
            title: "Khóa/Thế hệ",
            key: "generation",
            width: 300,
            resizable: true,
            filters: generationList.map(g => ({ text: g.name, value: g.id })),
            render: (_: any, record: any) => {
                const gen = record.generation?.name;
                return gen ? <Tag color="geekblue">{gen}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>
            }
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            width: 260,
            resizable: true,
            searchable: true,
            ellipsis: true,
            align: 'left',
            required: true,
        },
        {
            title: "Số điện thoại",
            dataIndex: "phone",
            key: "phone",
            width: 150,
            resizable: true,
            searchable: true,
        },
        {
            title: "Hạng/Chức vụ",
            key: "position",
            dataIndex: "position",
            width: 180,
            resizable: true,
            filters: Object.entries(POSITION_LABELS).map(([value, label]) => ({ text: label, value })),
            render: (value: string) => {
                if (!value) return '--';
                return <Tag color="cyan">{POSITION_LABELS[value] || value.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Tên Ban",
            dataIndex: "department",
            key: "department",
            width: 150,
            resizable: true,
            filters: DEPARTMENT_OPTIONS.map(d => ({ text: d, value: d })),
            render: (dept: string) => dept ? <Tag color="blue">{dept}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>
        },
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
            key: "statusDisplay",
            width: 130,
            resizable: true,
            sortable: false,
            render: (_: any, record: User) => {
                if (record.status === 'dismissed') {
                    return <Tag color="magenta">KHAI TRỪ</Tag>;
                }
                return (
                    <Switch
                        checkedChildren="Bật"
                        unCheckedChildren="Tắt"
                        checked={record.isActive}
                        onChange={() => handleToggleStatus(record)}
                        disabled={!hasPermission('users:manage_status')}
                        loading={loading && editingId === record.id}
                    />
                );
            },
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
            title: "Mật khẩu",
            key: "password",
            dataIndex: "password",
            required: true,
            hidden: true, // Only for import/export
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 120,
            fixed: 'right',
            align: 'center',
            render: (_: any, record: User) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            style={{ color: 'var(--primary-color)', padding: '4px' }} 
                            onClick={() => openView(record)}
                        >
                            <EyeOutlined style={{ fontSize: 16 }} />
                        </Button>
                    </Tooltip>
                    <Dropdown 
                        trigger={['click']}
                        placement="bottomRight"
                        overlay={
                            <Menu>
                                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                                    Chỉnh sửa
                                </Menu.Item>
                                <Menu.Item 
                                    key="promote" 
                                    icon={<RiseOutlined />} 
                                    onClick={() => handlePromote(record)}
                                    disabled={record.position === 'dt'}
                                    style={{ color: '#52c41a' }}
                                >
                                    Nâng hạng
                                </Menu.Item>
                                <Menu.Item 
                                    key="dismiss" 
                                    icon={<UserDeleteOutlined />} 
                                    onClick={() => handleDismiss(record)}
                                    disabled={record.status === 'dismissed'}
                                    danger
                                >
                                    Khai trừ
                                </Menu.Item>
                                {hasPermission('users:delete') && (
                                    <>
                                        <Menu.Divider />
                                        <Menu.Item 
                                            key="delete" 
                                            icon={<DeleteOutlined />} 
                                            onClick={() => handleDelete(record.id)}
                                            danger
                                        >
                                            Xóa vĩnh viễn
                                        </Menu.Item>
                                    </>
                                )}
                            </Menu>
                        }
                    >
                        <Button variant="ghost" buttonSize="small" style={{ padding: '4px' }}>
                            <MenuOutlined style={{ fontSize: 16 }} />
                        </Button>
                    </Dropdown>
                </Space>
            ),
        },
    ];

    const filters: FilterConfig[] = [
        {
            key: "position",
            label: "Hạng/Chức vụ",
            type: "select" as const,
            operators: ['eq', 'in'],
            options: Object.entries(POSITION_LABELS).map(([value, label]) => ({ label, value })),
        },
        {
            key: "department",
            label: "Tên Ban",
            type: "select" as const,
            operators: ['eq', 'like', 'in'],
            options: DEPARTMENT_OPTIONS.map(d => ({ label: d, value: d })),
        },
        {
            key: "status",
            label: "Trạng thái thành viên",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Hoạt động", value: "active" },
                { label: "Không hoạt động", value: "inactive" },
                { label: "Khai trừ", value: "dismissed" },
            ],
        },
        {
            key: "role",
            label: "Vai trò hệ thống",
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
            label: "Tài khoản (Bật/Tắt)",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Bật", value: true },
                { label: "Tắt", value: false },
            ],
        },
        {
            key: "studentId",
            label: "Mã SV",
            type: "input" as const,
            operators: ['like', 'eq'],
        },
        {
            key: "lastName",
            label: "Họ",
            type: "input" as const,
            operators: ['like'],
        },
        {
            key: "firstName",
            label: "Tên",
            type: "input" as const,
            operators: ['like'],
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
        {
            key: "generationId",
            label: "Khóa/Thế hệ",
            type: "select" as const,
            operators: ['eq', 'in'],
            options: generationList.map(g => ({ label: g.name, value: g.id })),
        },
    ];

    const handleDelete = async (id: number) => {
        const success = await remove(id);
        if (success) {
            await fetchUserStats({ generationId: selectedGenerationId });
        }
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ 
            isActive: true, 
            role: 'customer',
            generationId: selectedGenerationId // Default to the currently filtered generation ID
        });
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
                await fetchUserStats({ generationId: selectedGenerationId });
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    const currentStats = activeTab === 'all'
        ? (stats?.global || initialStatObject)
        : activeTab === 'others'
        ? Object.keys(stats?.byDepartment || {}).reduce((acc, key) => {
            // Aggregate all departments NOT in DEPARTMENT_OPTIONS, including __unassigned__
            if (!DEPARTMENT_OPTIONS.includes(key) || key === '__unassigned__') {
                const deptStats = stats.byDepartment[key];
                acc.total += deptStats.total || 0;
                acc.active += deptStats.active || 0;
                acc.inactive += deptStats.inactive || 0;
                acc.dismissed += deptStats.dismissed || 0;
                acc.ctv += deptStats.ctv || 0;
                acc.official += deptStats.official || 0;
                acc.management += deptStats.management || 0;
                acc.recentSignups += deptStats.recentSignups || 0;
            }
            return acc;
          }, { ...initialStatObject })
        : (stats?.byDepartment?.[activeTab] || initialStatObject);

    const onTabChange = (key: string) => {
        setActiveTab(key);
        if (key === 'all') {
            updateFilters({ department: undefined, department_nin: undefined });
        } else if (key === 'others') {
            updateFilters({ department: undefined, department_nin: DEPARTMENT_OPTIONS });
        } else {
            updateFilters({ department: key, department_nin: undefined });
        }
    };

    return (
        <>
            <DataTable
                headerContent={
                <>
                {hasPermission('users:view_stats') && (
                <div>
                    <StatisticsCard
                        title={selectedGenerationId ? "Thống kê theo Khóa" : "Thống kê Đội Cờ Đỏ"}
                        loading={fetchingStats}
                        hideCard
                        data={[
                            {
                                title: 'Tổng nhân sự',
                                value: currentStats.total || 0,
                                icon: <TeamOutlined />,
                                valueColor: 'var(--primary-color)',
                            },
                            {
                                title: 'Thành viên chính thức',
                                value: currentStats.official || 0,
                                icon: <CheckCircleOutlined />,
                                valueColor: '#1890ff', // Blue
                            },
                            {
                                title: 'Cộng tác viên',
                                value: currentStats.ctv || 0,
                                icon: <TeamOutlined />,
                                valueColor: '#fa8c16', // Orange
                            },
                            {
                                title: activeTab === 'all' ? 'Ban quản lý' : `Quản lý (${activeTab === 'others' ? 'Khác' : activeTab})`,
                                value: currentStats.management || 0,
                                icon: <SafetyOutlined />,
                                valueColor: '#eb2f96', // Pink/Magenta
                            },
                            {
                                title: activeTab === 'all' ? 'Đang hoạt động' : `Hoạt động (${activeTab === 'others' ? 'Khác' : activeTab})`,
                                value: currentStats.active || 0,
                                icon: <RiseOutlined />,
                                valueColor: '#52c41a', // Green
                            },
                            {
                                title: 'Đang khóa',
                                value: currentStats.inactive || 0,
                                icon: <StopOutlined />,
                                valueColor: '#da2a2aff', // Gray
                            },
                            {
                                title: 'Đã khai trừ',
                                value: currentStats.dismissed || 0,
                                icon: <UserDeleteOutlined />,
                                valueColor: '#ff4d4f', // Red
                            },
                            {
                                title: 'Mới 7 ngày',
                                value: currentStats.recentSignups || 0,
                                icon: <RiseOutlined />,
                                valueColor: '#722ed1', // Purple
                            },
                        ]}
                        colSpan={{ xs: 24, sm: 12, md: 8, lg: 6 }}
                        rowGutter={12}
                        statShadow={false}
                    />
                    <TabSwitcher>
                        <Tabs
                            style={{ marginTop: 8 }}
                            activeKey={activeTab} 
                            onChange={onTabChange}
                            items={[
                                { label: 'Toàn bộ Đội', key: 'all' },
                                ...DEPARTMENT_OPTIONS.map(dept => ({ 
                                    label: `Ban ${dept}`, 
                                    key: dept 
                                })),
                                { label: 'Khác', key: 'others' }
                            ]}
                        />
                    </TabSwitcher>
                </div>
                )}
                </>
            }
            title={
                <Space size={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0 }}>Quản lý thành viên</h2>
                    <Select
                        placeholder="Lọc theo Khóa"
                        style={{ width: 240, textAlign: 'right' }}
                        value={selectedGenerationId}
                        allowClear
                        onChange={(val) => {
                            setSelectedGenerationId(val);
                            // The actual filter update is handled by the reactive useEffect
                        }}
                        options={[
                            { label: 'Các khóa đang hoạt động', value: ACTIVE_ONLY },
                            ...generationList.map(g => ({ label: g.name, value: g.id }))
                        ]}
                    />
                </Space>
            }
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                tableLayout="fixed"
                saveColumnWidths
                columnResizeKey="users-table-v2"
                onAdd={hasPermission('users:create') ? openCreate : undefined}
                onRefresh={refreshData}
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
                onValidateImport={validateImport}
                onDownloadTemplate={downloadTemplate}
            />

            <UsersForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
                generations={generationList}
            />

            <UsersDetailModal
                open={isDetailModalVisible}
                user={viewingUser}
                avatarFallback={avatarFallback}
                formatDateTime={formatDateTime}
                onPromote={handlePromote}
                onDismiss={handleDismiss}
                onCancel={() => {
                    setIsDetailModalVisible(false);
                    setViewingUser(null);
                }}
            />

            <Modal
                title="Cập nhật chức vụ"
                open={isPromoteModalVisible}
                onOk={onPromoteOk}
                onCancel={() => setIsPromoteModalVisible(false)}
                width={360}
                centered
                destroyOnClose
            >
                <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 12 }}>
                        Chọn chức vụ mới cho <strong>{promotingUser?.lastName || promotingUser?.firstName ? `${promotingUser?.lastName || ''} ${promotingUser?.firstName || ''}`.trim() : promotingUser?.name}</strong>:
                    </div>
                    <Select
                        style={{ width: '100%', marginBottom: 12 }}
                        value={targetPosition}
                        onChange={setTargetPosition}
                        options={POSITION_LEVELS.map(val => ({
                            label: POSITION_LABELS[val],
                            value: val
                        }))}
                    />
                    {['tvb', 'pb', 'tb'].includes(targetPosition) && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ marginBottom: 4 }}>Chọn hoặc nhập tên ban:</div>
                            <AutoComplete
                                style={{ width: '100%' }}
                                placeholder="Tài chính, Truyền thông, Nhân sự..."
                                value={targetDepartment}
                                onChange={setTargetDepartment}
                                options={DEPARTMENT_OPTIONS.map(d => ({ value: d }))}
                                filterOption={(inputValue, option) =>
                                    String(option?.value || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                }
                            />
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default UserPage;
