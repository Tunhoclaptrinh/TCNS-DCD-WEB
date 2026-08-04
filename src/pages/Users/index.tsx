import { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { Tabs, Form, Image, Switch, Tag, Dropdown, Menu, Modal, message, Space, Tooltip, Select, AutoComplete, Input, Typography } from 'antd';
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
import { Button, DataTable, StatisticsCard, TabSwitcher, Access } from '@/components/common';
import { DataTableColumn, FilterConfig } from '../../components/common/DataTable/types';
import userService from '../../services/user.service';
import { User, UserStats } from '../../types';
import { useAccess } from '../../hooks';
import UsersForm from './components/Form';
import UsersDetailModal from './components/Detail';
import generationService, { Generation } from '../../services/generation.service';
import roleService, { Role } from '../../services/role.service';
import permissionService from '../../services/permission.service';
import { POSITION_LABELS, POSITION_LEVELS, POSITION_FILTERS } from '@/constants/user.constants';

// Dynamic department options will be derived from stats

const UserPage = () => {
    const formatDateTime = (value?: string) => {
        if (!value) return '--';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '--';
        return parsed.toLocaleString('vi-VN');
    };

    const getFullName = (u: User) => (u.name || `${u.lastName || ''} ${u.firstName || ''}`).trim();

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
        expand: 'generation,roles',
    });

    const { hasPermission, user: currentUser } = useAccess();

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
    const [potentialAlumni, setPotentialAlumni] = useState<User[]>([]);
    const [isAlumniModalVisible, setIsAlumniModalVisible] = useState(false);
    const [syncingAlumni, setSyncingAlumni] = useState(false);
    const [alumniSelectedIds, setAlumniSelectedIds] = useState<number[]>([]);


    
    const initialStatObject = {
        total: 0,
        active: 0,
        inactive: 0,
        dismissed: 0,
        ctv: 0,
        official: 0,
        management: 0,
        alumni: 0,
        recentSignups: 0,
        byRole: {},
        byPosition: {},
        byGeneration: {},
        locked: 0,
    };


    const [stats, setStats] = useState<UserStats>({
        global: initialStatObject,
        byDepartment: {},
    });
    const [currentTabStats, setCurrentTabStats] = useState<any>(initialStatObject);
    const [generationList, setGenerationList] = useState<Generation[]>([]);
    const [roleList, setRoleList] = useState<Role[]>([]);
    const [permissionList, setPermissionList] = useState<any[]>([]);
    const [selectedGenerationId, setSelectedGenerationId] = useState<number | 'active_members' | 'active_generations' | 'all' | undefined>('active_members');
    const previousGenerationId = useRef<number | 'active_members' | 'active_generations' | 'all' | undefined>('active_members');
    // Optimized: Memoized active generation IDs
    const activeGenerationIds = useMemo(() => 
        generationList.filter(g => g.isActive).map(g => g.id),
    [generationList]);

    // Optimized: Centralized filter object
    const currentGenFilter = useMemo(() => {
        if (selectedGenerationId === 'active_generations') {
            return {
                generationId: undefined,
                generationId_in: activeGenerationIds.length > 0 ? activeGenerationIds : undefined
            };
        }
        if (selectedGenerationId === 'active_members' || selectedGenerationId === 'all' || selectedGenerationId === undefined) {
            return {
                generationId: undefined,
                generationId_in: undefined
            };
        }
        return { 
            generationId: selectedGenerationId, 
            generationId_in: undefined 
        };
    }, [selectedGenerationId, activeGenerationIds]);

    const fetchRoles = async () => {
        try {
            const res = await roleService.getAll({ limit: 100 });
            if (res.success && res.data) {
                setRoleList(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const fetchGenerations = async () => {
        try {
            const res = await generationService.getAll({ limit: 100 });
            if (res.success && res.data) {
                setGenerationList(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch generations:', error);
        }
    };

    const fetchPermissions = async () => {
        try {
            const res = await permissionService.getAll({ limit: 1000 });
            if (res.success && res.data) {
                setPermissionList(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
        }
    };

    useEffect(() => {
        // generations: cần settings:view (tất cả role từ member trở lên đều có)
        if (hasPermission('settings:view')) {
            fetchGenerations();
        }
        // roles: cần system:roles:view (ns_specialist trở lên có)
        if (hasPermission('system:roles:view')) {
            fetchRoles();
        }
        // permissions: cần system:permissions:view (ns_specialist trở lên có)
        if (hasPermission('system:permissions:view')) {
            fetchPermissions();
        }
    }, []);

    // Fetch stats for building Tabs
    const fetchUserStats = async (filters: any = {}) => {
        if (!hasPermission('users:view_stats')) return;
        try {
            const response = await userService.getStats(filters);
            const statsData = response.data || (response as any);
            if (statsData) {
                setStats(statsData);
            }
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        }
    };

    // Fetch stats for the current Tab/Filters
    const fetchCurrentTabStats = async (filters: any = {}) => {
        if (!hasPermission('users:view_stats')) return;
        setFetchingStats(true);
        try {
            const response = await userService.getStats(filters);
            const statsData = response.data || (response as any);
            if (statsData) {
                setCurrentTabStats(statsData.global || initialStatObject);
            }
        } catch (error) {
            console.error('Failed to fetch current tab stats:', error);
        } finally {
            setFetchingStats(false);
        }
    };

    const getCombinedFilters = () => {
        const combinedFilters: any = { ...currentGenFilter };
        const isActiveMembersSelected = selectedGenerationId === 'active_members';
        
        // Apply Tab filters
        if (activeTab === 'alumni') {
            combinedFilters.isAlumni = true;
            combinedFilters.isAlumni_ne = undefined;
            combinedFilters.status = undefined;
            combinedFilters.status_ne = undefined;
            combinedFilters.department = undefined;
            combinedFilters.department_nin = undefined;
            combinedFilters.position = undefined;
        } else if (activeTab === 'all') {
            combinedFilters.isAlumni = false;
            combinedFilters.isAlumni_ne = undefined;
            combinedFilters.status = isActiveMembersSelected ? 'active' : undefined;
            combinedFilters.status_ne = isActiveMembersSelected ? undefined : 'dismissed';
            combinedFilters.department = undefined;
            combinedFilters.department_nin = undefined;
            combinedFilters.position = undefined;
        } else if (activeTab === 'ctv') {
            combinedFilters.isAlumni = false;
            combinedFilters.isAlumni_ne = undefined;
            combinedFilters.status = isActiveMembersSelected ? 'active' : undefined;
            combinedFilters.status_ne = isActiveMembersSelected ? undefined : 'dismissed';
            combinedFilters.department = undefined;
            combinedFilters.department_nin = undefined;
            combinedFilters.position = 'ctv';
        } else if (activeTab === 'others') {
            combinedFilters.isAlumni = false;
            combinedFilters.isAlumni_ne = undefined;
            combinedFilters.status = isActiveMembersSelected ? 'active' : undefined;
            combinedFilters.status_ne = isActiveMembersSelected ? undefined : 'dismissed';
            combinedFilters.department = undefined;
            combinedFilters.position = undefined;
            // Get current known departments to exclude
            const knownDepts = Object.keys(stats?.byDepartment || {}).filter(k => k !== '__unassigned__');
            combinedFilters.department_nin = knownDepts.length > 0 ? knownDepts : undefined;
        } else {
            combinedFilters.isAlumni = false;
            combinedFilters.isAlumni_ne = undefined;
            combinedFilters.status = isActiveMembersSelected ? 'active' : undefined;
            combinedFilters.status_ne = isActiveMembersSelected ? undefined : 'dismissed';
            combinedFilters.department = activeTab;
            combinedFilters.department_nin = undefined;
            combinedFilters.position = undefined;
        }

        return combinedFilters;
    };

    // Reactive data update when ANY filter criteria changes
    useEffect(() => {
        const filters = getCombinedFilters();
        updateFilters(filters);
        if (['alumni', 'others'].includes(activeTab)) {
            fetchCurrentTabStats(filters);
        }
    }, [activeTab, selectedGenerationId, generationList]);

    // Fetch stats separately based only on generation filter
    useEffect(() => {
        fetchUserStats(currentGenFilter);
    }, [currentGenFilter]);
    
    // Synced refresh helper
    const refreshData = async () => {
        await fetchAll();
        await fetchUserStats(currentGenFilter);
        if (['alumni', 'others'].includes(activeTab)) {
            await fetchCurrentTabStats(getCombinedFilters());
        }
    };

    const handleSyncAlumni = async () => {
        try {
            setSyncingAlumni(true);
            const res = await userService.getPotentialAlumni();
            if (res.success && res.data) {
                if (res.data.length === 0) {
                    message.info('Không có thành viên nào cần đồng bộ sang trạng thái cựu.');
                    return;
                }
                setPotentialAlumni(res.data);
                setAlumniSelectedIds(res.data.map(u => u.id));
                setIsAlumniModalVisible(true);
            }
        } catch (error) {
            console.error('Failed to fetch potential alumni:', error);
            message.error('Không thể tải danh sách ứng viên cựu thành viên');
        } finally {
            setSyncingAlumni(false);
        }
    };

    const confirmSyncAlumni = async () => {
        if (alumniSelectedIds.length === 0) {
            message.warning('Vui lòng chọn ít nhất một thành viên');
            return;
        }

        try {
            setSyncingAlumni(true);
            const res = await userService.syncAlumniStatus(alumniSelectedIds);
            if (res.success) {
                message.success(res.message);
                setIsAlumniModalVisible(false);
                await refreshData();
            }
        } catch (error) {
            console.error('Sync alumni failed:', error);
            message.error('Đồng bộ thất bại');
        } finally {
            setSyncingAlumni(false);
        }
    };

    const handleToggleStatus = async (record: User) => {
        try {
            setEditingId(record.id);
            await userService.toggleStatus(record.id);
            await fetchAll();
            await refreshData();
        } finally {
            setEditingId(null);
        }
    };

    const handlePromote = (record: User) => {
        setPromotingUser(record);
        setTargetPosition(record.position || 'tv');
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

            // Đồng bộ roleIds tương ứng với chức vụ
            const findRoleId = (key: string) => roleList.find((r: any) => r.key === key)?.id || null;
            let suggestedRoles: number[] = [];
            
            switch (targetPosition) {
                case 'dt':
                    suggestedRoles = [findRoleId('admin')].filter(Boolean) as number[];
                    break;
                case 'tb':
                    suggestedRoles = targetDepartment === 'Nhân sự' 
                        ? [findRoleId('ns_leader')].filter(Boolean) as number[]
                        : [findRoleId('other_leader')].filter(Boolean) as number[];
                    break;
                case 'pb':
                    suggestedRoles = targetDepartment === 'Nhân sự' 
                        ? [findRoleId('ns_sub_leader')].filter(Boolean) as number[]
                        : [findRoleId('other_sub_leader')].filter(Boolean) as number[];
                    break;
                case 'tvb':
                    suggestedRoles = targetDepartment === 'Nhân sự' 
                        ? [findRoleId('ns_specialist')].filter(Boolean) as number[]
                        : [findRoleId('member')].filter(Boolean) as number[];
                    break;
                case 'tv':
                    suggestedRoles = [findRoleId('member')].filter(Boolean) as number[];
                    break;
                case 'ctv':
                    suggestedRoles = [findRoleId('ctv')].filter(Boolean) as number[];
                    break;
            }

            if (suggestedRoles.length > 0) {
                updateData.roleIds = suggestedRoles;
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
                await refreshData();
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
            minWidth: 140,
            width: 200,
            resizable: true,
            searchable: true,
            ellipsis: true,
            align: 'left',
            render: (_: any, record: User) => {
                const name = record.lastName || record.firstName ? `${record.lastName || ''} ${record.firstName || ''}`.trim() : record.name;
                return (
                    <Typography.Link 
                        onClick={() => openView(record)} 
                        style={{ fontWeight: 500, color: '#262626' }}
                    >
                        {name}
                    </Typography.Link>
                );
            }
        },
        {
            title: "Mã SV",
            dataIndex: "studentId",
            key: "studentId",
            width: 120,
            resizable: true,
            searchable: true,
            render: (val: string) => (val === 'string' || !val) ? '--' : val
        },
        {
                title: <div style={{ whiteSpace: 'nowrap !important', width: 'max-content', display: 'block' }}>Khóa/Thế hệ</div>,
                key: "generation",
                dataIndex: "generation",
                width: 160,
                resizable: true,
                align: 'left',
                filters: generationList.map(g => ({ text: g.name, value: g.id })),
                render: (_: any, record: any) => {
                    const gen = record.generation?.name;
                    return gen ? <Tag color="geekblue">{gen}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>;
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
            render: (email: string) => email ? (
                <Typography.Text copyable={{ text: email }}>
                    <Typography.Link href={`mailto:${email}`} style={{ fontSize: '13px', color: 'inherit' }}>
                        {email}
                    </Typography.Link>
                </Typography.Text>
            ) : '--'
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
            filters: POSITION_FILTERS,
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
            render: (dept: string) => dept ? <Tag color="blue">{dept}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>
        },
        {
            title: "Trạng thái",
            key: "status",
            dataIndex: "status",
            width: 160,
            resizable: true,
            sortable: false,
            filters: [
                { text: 'Đang hoạt động', value: 'active' },
                { text: 'Đã nghỉ', value: 'inactive' },
                { text: 'Khai trừ', value: 'dismissed' }
            ],
            render: (_: any, record: User) => {
                return (
                    <Space direction="vertical" size={4}>
                        {record.status === 'dismissed' ? (
                            <Tag color="magenta">KHAI TRỪ</Tag>
                        ) : record.status === 'inactive' ? (
                            <Tag color="default">ĐÃ NGHỈ</Tag>
                        ) : (
                            <Tag color="green">ĐANG HĐ</Tag>
                        )}
                        {record.isAlumni && (
                            <Tag color="orange" style={{ margin: 0 }}>CỰU TV</Tag>
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Tài khoản",
            key: "isActive",
            dataIndex: "isActive",
            width: 120,
            resizable: true,
            sortable: false,
            filters: [
                { text: 'Đang Bật', value: true },
                { text: 'Đã Tắt', value: false }
            ],
            render: (_: any, record: User) => {
                return (
                    <Switch
                        size="small"
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
                                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => openEdit(record)} disabled={!hasPermission('users:update:profile') && !hasPermission('users:update:org')}>
                                    Chỉnh sửa
                                </Menu.Item>
                                <Menu.Item 
                                    key="promote" 
                                    icon={<RiseOutlined />} 
                                    onClick={() => handlePromote(record)}
                                    disabled={record.position === 'dt' || !hasPermission('users:promote')}
                                    style={{ color: record.position === 'dt' || !hasPermission('users:promote') ? undefined : '#52c41a' }}
                                >
                                    Nâng hạng
                                </Menu.Item>
                                <Menu.Item 
                                    key="dismiss" 
                                    icon={<UserDeleteOutlined />} 
                                    onClick={() => handleDismiss(record)}
                                    disabled={record.status === 'dismissed' || !hasPermission('users:expel')}
                                    danger
                                >
                                    Khai trừ
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item 
                                    key="delete" 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => handleDelete(record.id)}
                                    disabled={!hasPermission('users:delete')}
                                    danger
                                >
                                    Xóa vĩnh viễn
                                </Menu.Item>
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
            operators: ['eq', 'like', 'in', 'nin'] as any,
            options: Object.keys(stats?.byDepartment || {})
                .filter(d => d !== '__unassigned__')
                .map(d => ({ label: d, value: d })),
        },

        {
            key: "isAlumni",
            label: "Cựu thành viên",
            type: "select" as const,
            operators: ['eq', 'ne'],
            options: [
                { label: "Có", value: true },
                { label: "Không", value: false },
            ],
        },
        {
            key: "isActive",
            label: "Trạng thái tài khoản",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Đang Bật", value: true },
                { label: "Đã Tắt", value: false },
            ],
        },
        {
            key: "status",
            label: "Trạng thái thành viên",
            type: "select" as const,
            operators: ['eq', 'ne'],
            options: [
                { label: "Hoạt động", value: "active" },
                { label: "Đã nghỉ", value: "inactive" },
                { label: "Khai trừ", value: "dismissed" },
            ],
        },
        {
            key: "generationId",
            label: "Khóa/Thế hệ",
            type: "select" as const,
            operators: ['eq', 'in'],
            options: generationList.map(g => ({ label: g.name, value: g.id })),
        },
        {
            key: "role",
            label: "Vai trò hệ thống",
            type: "select" as const,
            operators: ['eq', 'in'],
            options: roleList.map(r => ({ label: r.name, value: (r as any).key || r.name })),
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
            operators: ['like', 'not_like', 'eq', 'ne'],
        },
        {
            key: "lastName",
            label: "Họ",
            type: "input" as const,
            operators: ['like', 'not_like', 'eq', 'ne'],
        },
        {
            key: "firstName",
            label: "Tên",
            type: "input" as const,
            operators: ['like', 'not_like', 'eq', 'ne'],
        },
        {
            key: "email",
            label: "Email",
            type: "input" as const,
            operators: ['like', 'not_like', 'eq', 'ne'],
        },
        {
            key: "phone",
            label: "Số điện thoại",
            type: "input" as const,
            operators: ['like', 'not_like', 'eq', 'ne'],
        },
        {
            key: "address",
            label: "Địa chỉ",
            type: "input" as const,
            operators: ['like', 'not_like', 'eq', 'ne'],
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
            await refreshData();
        }
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ 
            isActive: true
        });
        setIsModalVisible(true);
    };

    const openEdit = (record: User) => {
        setEditingId(record.id);
        const formData = { 
            ...record, 
            roleIds: record.roleIds || (record as any).roles?.map((r: any) => r.id) || [],
            dob: record.dob ? dayjs(record.dob) : undefined,
            joinDate: record.joinDate ? dayjs(record.joinDate) : undefined,
            customPermissions: record.customPermissions || { extra: [], denied: [] }
        };
        form.setFieldsValue(formData);
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
                await refreshData();
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    const currentStats = ['alumni', 'others'].includes(activeTab) 
        ? (currentTabStats || initialStatObject) 
        : (stats?.global || initialStatObject);

    const onTabChange = (key: string) => {
        const isSpecialTab = ['alumni', 'others'].includes(key);
        const wasSpecialTab = ['alumni', 'others'].includes(activeTab);

        if (isSpecialTab && !wasSpecialTab) {
            // Save the current generation selection before clearing
            previousGenerationId.current = selectedGenerationId;
            setSelectedGenerationId(undefined);
        } else if (!isSpecialTab && wasSpecialTab) {
            // Restore the previous generation selection when returning to normal tabs
            setSelectedGenerationId(previousGenerationId.current || 'active_members');
        }

        setActiveTab(key);
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
                                title: 'Cựu thành viên',
                                value: currentStats.alumni || 0,
                                icon: <TeamOutlined />,
                                valueColor: '#8c8c8c', // Gray
                            },
                            {
                                title: activeTab === 'others' ? 'Quản lý (Khác)' : 'Ban quản lý',
                                value: currentStats.management || 0,
                                icon: <SafetyOutlined />,
                                valueColor: '#eb2f96', // Pink/Magenta
                            },
                            {
                                title: activeTab === 'others' ? 'Hoạt động (Khác)' : 'Đang hoạt động',
                                value: currentStats.active || 0,
                                icon: <RiseOutlined />,
                                valueColor: '#52c41a', // Green
                            },
                            {
                                title: 'Đang khóa',
                                value: currentStats.locked || 0,
                                icon: <StopOutlined />,
                                valueColor: '#da2a2aff', // Red
                            },
                            {
                                title: 'Đã nghỉ',
                                value: currentStats.inactive || 0,
                                icon: <UserDeleteOutlined />,
                                valueColor: '#8c8c8c', // Gray
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
                                ...Object.keys(stats?.byDepartment || {})
                                    .filter(d => d !== '__unassigned__')
                                    .map(dept => ({ 
                                        label: `Ban ${dept}`, 
                                        key: dept 
                                    })),
                                { label: 'Cộng tác viên', key: 'ctv' },
                                { label: 'Khác', key: 'others' },
                                { label: 'Cựu thành viên', key: 'alumni' }
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
                    <Tooltip title="Lọc hiển thị theo khóa. Mặc định là Thành viên đang hoạt động.">
                        <Select
                            placeholder="Lọc theo Khóa"
                            style={{ width: 220 }}
                            value={selectedGenerationId}
                            allowClear
                            onChange={(val) => {
                                setSelectedGenerationId(val);
                                if (val === 'active_members' && ['alumni', 'others'].includes(activeTab)) {
                                    setActiveTab('all');
                                }
                            }}
                            options={[
                                { label: 'Thành viên đang hoạt động', value: 'active_members' },
                                { label: 'Các khóa đang hoạt động', value: 'active_generations' },
                                { label: 'Tất cả các khóa', value: 'all' },
                                ...generationList.map(g => ({ label: g.name, value: g.id }))
                            ]}
                        />
                    </Tooltip>
                </Space>
            }
            key={activeTab}
            loading={loading}
            columns={columns}
            dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                tableLayout="fixed"
                scroll={{ x: 1800 }}
                saveColumnWidths
                columnResizeKey="users-table-v11"
                onAdd={openCreate}
                onRefresh={refreshData}
                onEdit={(hasPermission('users:update:profile') || hasPermission('users:update:org')) ? openEdit : undefined}
                onView={hasPermission('users:list:all') || hasPermission('users:list:dept') ? openView : undefined}
                onDelete={hasPermission('users:delete') ? handleDelete : undefined}
                // Search & Filter
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={(key, value) => {
                    if (key === 'generationId' || key === 'generationId_in') {
                        if (selectedGenerationId !== undefined) {
                            setSelectedGenerationId(undefined);
                        }
                    }
                    updateFilters({ [key]: value });
                }}
                onClearFilters={() => {
                    setSelectedGenerationId(['alumni', 'others'].includes(activeTab) ? undefined : 'active_members');
                    clearFilters();
                }}
                creatable={{ accessible: hasPermission('users:create'), behavior: 'disable' }}
                // Batch Operations
                batchOperations={{ accessible: hasPermission('users:delete'), behavior: 'disable' }}
                selectedRowKeys={selectedIds}
                onSelectChange={setSelectedIds}
                onBatchDelete={async (ids) => {
                    const success = await batchDelete(ids);
                    if (success) {
                        await fetchUserStats();
                    }
                }}
                // Import/Export
                importable={{ accessible: hasPermission('users:import'), behavior: 'disable' }}
                exportable={{ accessible: hasPermission('users:export'), behavior: 'disable' }}
                onImport={async (file) => {
                    const result = await importData(file);
                    if (result) {
                        await fetchUserStats();
                    }
                }}
                onExport={exportData}
                onValidateImport={validateImport}
                onDownloadTemplate={downloadTemplate}
                extra={
                  <Space>
                    <Access permission="users:update:org" behavior="disable">
                        <Button 
                            variant="outline" 
                            buttonSize="small" 
                            icon={<SafetyOutlined />} 
                            onClick={handleSyncAlumni}
                            style={{ height: 32 }}
                        >
                            Chốt danh sách Cựu
                        </Button>
                    </Access>
                  </Space>
                }
            />

            <UsersForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
                generations={generationList}
                roles={roleList}
                permissions={permissionList}
                departments={Object.keys(stats?.byDepartment || {}).filter(d => d !== '__unassigned__')}
            />

            <UsersDetailModal
                open={isDetailModalVisible}
                user={viewingUser}
                avatarFallback={avatarFallback}
                formatDateTime={formatDateTime}
                onPromote={handlePromote}
                onDismiss={handleDismiss}
                currentUser={currentUser}
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
                                placeholder="Chọn hoặc nhập ban mới..."
                                value={targetDepartment}
                                onChange={setTargetDepartment}
                                options={Object.keys(stats?.byDepartment || {})
                                    .filter(d => d !== '__unassigned__')
                                    .map(d => ({ value: d }))}
                                filterOption={(inputValue, option) =>
                                    String(option?.value || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                }
                            />
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                title="Chốt danh sách Cựu thành viên"
                open={isAlumniModalVisible}
                onOk={confirmSyncAlumni}
                onCancel={() => setIsAlumniModalVisible(false)}
                width={800}
                confirmLoading={syncingAlumni}
                okText="Xác nhận chuyển thành Cựu"
                cancelText="Hủy"
            >
                <div style={{ marginBottom: 16 }}>
                    Dưới đây là danh sách các thành viên thuộc những Khóa đã ngưng hoạt động. 
                    Mặc định tất cả sẽ được chuyển sang trạng thái <strong>"Không hoạt động"</strong>. 
                    Bạn hãy bỏ tích những người vẫn còn đang hoạt động.
                </div>
                <DataTable
                    hideCard
                    dataSource={potentialAlumni}
                    columns={[
                        {
                            title: 'Tên thành viên',
                            key: 'fullName',
                            dataIndex: 'name',
                            searchable: true,
                            render: (_, record) => getFullName(record),
                            sorter: (a, b) => getFullName(a).localeCompare(getFullName(b)),
                            onFilter: (value, record) => getFullName(record).toLowerCase().includes(String(value).toLowerCase()),
                        },
                        {
                            title: 'Mã SV',
                            dataIndex: 'studentId',
                            searchable: true,
                            sorter: true,
                        },
                        {
                            title: 'Khóa',
                            key: 'generation',
                            render: (_, record) => {
                                const genName = generationList.find(g => g.id === record.generationId)?.name;
                                return genName ? <Tag color="geekblue">{genName}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>;
                            },
                            sorter: (a, b) => (a.generationId ?? 0) - (b.generationId ?? 0),
                            filters: generationList.map(g => ({ text: g.name, value: g.id })),
                            onFilter: (value, record) => record.generationId === value,
                        }
                    ]}
                    selectedRowKeys={alumniSelectedIds}
                    onSelectChange={(keys) => setAlumniSelectedIds(keys as number[])}
                    batchOperations={true}
                    batchActions={[
                        {
                            key: 'confirm-alumni',
                            label: 'Xác nhận chuyển thành Cựu',
                            icon: <CheckCircleOutlined />,
                            onClick: () => {
                                confirmSyncAlumni();
                            }
                        },
                        {
                            key: 'deselect-all',
                            label: 'Bỏ chọn tất cả',
                            icon: <StopOutlined />,
                            onClick: () => setAlumniSelectedIds([])
                        }
                    ]}
                    searchable={true}
                    searchPlaceholder="Tìm kiếm thành viên..."
                    pagination={false}
                    scroll={{ y: 400 }}
                />
            </Modal>
        </>
    );
};

export default UserPage;
