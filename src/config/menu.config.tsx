import React from 'react';
import {
    DashboardOutlined,
    UserOutlined,
    CalendarOutlined,
    SwapOutlined,
    SafetyOutlined,
    SettingOutlined,
    TeamOutlined,
    LineChartOutlined,
} from '@ant-design/icons';

export interface IMenuItem {
    key?: string;
    path?: string;
    name: string;
    icon?: React.ReactNode;
    routes?: IMenuItem[];
    children?: IMenuItem[]; // Some versions of ProLayout use children
    accessFilter?: string[];
    hideInMenu?: boolean;
    disabled?: boolean;
}

// ================= ADMIN MENU =================
export const adminMenu: IMenuItem[] = [
    {
        key: 'admin-dashboard',
        path: '/admin/dashboard',
        name: 'Dashboard',
        icon: <DashboardOutlined />,
    },
    {
        key: 'users',
        path: '/admin/users',
        name: 'Thành viên',
        icon: <UserOutlined />,
        accessFilter: ['users:list:all', 'users:list:dept'],
    },
    {
        key: 'duty',
        path: '/admin/duty',
        name: 'Lịch trực',
        icon: <CalendarOutlined />,
        accessFilter: ['duty:view'],
        routes: [
            {
                key: 'duty-calendar',
                path: '/admin/duty/calendar',
                name: 'Lịch trực tuần',
            },
            {
                key: 'duty-setup',
                path: '/admin/duty/setup',
                name: 'Thiết lập',
                accessFilter: ['system:manage_config'],
            },
            {
                key: 'duty-leave',
                path: '/admin/duty/leave',
                name: 'Duyệt đơn nghỉ',
                accessFilter: ['duty:approve_leave'],
            },
            {
                key: 'duty-swaps',
                path: '/admin/duty/swaps',
                name: 'Đổi kíp',
                accessFilter: ['duty:approve_swap'],
            },
        ]
    },
    {
        key: 'reports',
        name: 'Báo cáo & Thống kê',
        icon: <LineChartOutlined />,
        accessFilter: ['duty:manage'],
        routes: [
            {
                key: 'duty-statistics',
                path: '/admin/duty/statistics',
                name: 'Thống kê Trực ca',
                icon: <LineChartOutlined />,
            },
        ]
    },
    {
        key: 'system-config',
        path: '/admin/system-config',
        name: 'Cấu hình hệ thống',
        icon: <SettingOutlined />,
        accessFilter: ['system:manage:gen', 'system:roles:view', 'system:permissions:view'],
        routes: [
            {
                key: 'system-settings',
                path: '/admin/system-config/generations',
                name: 'Khóa/Thế hệ',
                accessFilter: ['system:manage:gen'],
            },
            {
                key: 'permissions',
                path: '/admin/system-config/permissions',
                name: 'Ma trận Phân quyền',
                icon: <SafetyOutlined />,
                accessFilter: ['system:permissions:view'],
            },
            {
                key: 'roles',
                path: '/admin/system-config/roles',
                name: 'Quản lý Vai trò',
                icon: <TeamOutlined />,
                accessFilter: ['system:roles:view'],
            },
        ]
    },
];

// ================= CUSTOMER MENU =================
export const customerMenu: IMenuItem[] = [
    {
        key: 'duty-dashboard',
        path: '/duty/dashboard',
        name: 'Tổng quan',
        icon: <DashboardOutlined />,
    },
    {
        key: 'duty-calendar-member',
        path: '/duty/calendar',
        name: 'Lịch trực của tôi',
        icon: <CalendarOutlined />,
    },
    {
        key: 'duty-requests-member',
        path: '/duty/requests',
        name: 'Đơn của tôi',
        icon: <SwapOutlined />,
    },
    {
        key: 'duty-statistics-member',
        path: '/admin/duty/statistics',
        name: 'Báo cáo Đội',
        icon: <LineChartOutlined />,
        accessFilter: ['duty:manage'],
    },
    {
        key: 'admin-switch',
        path: '/admin/dashboard',
        name: 'Trang Quản trị',
        icon: <SettingOutlined />,
        accessFilter: ['dashboard:view', 'duty:manage'],
    },
];
