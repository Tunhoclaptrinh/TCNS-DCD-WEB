import React from 'react';
import {
    DashboardOutlined,
    UserOutlined,
    ScheduleOutlined,
    TrophyOutlined,
    BarChartOutlined,
    BellOutlined,
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
        name: 'Người dùng',
        icon: <UserOutlined />,
    },
    {
        key: 'duty',
        path: '/admin/duty',
        name: 'Lịch trực',
        icon: <ScheduleOutlined />,
    },
    {
        key: 'reward-penalty',
        path: '/admin/reward-penalty',
        name: 'Thưởng phạt',
        icon: <TrophyOutlined />,
    },
    {
        key: 'reports',
        path: '/admin/reports',
        name: 'Báo cáo',
        icon: <BarChartOutlined />,
    },
    {
        key: 'notifications-mgmt',
        path: '/admin/notifications',
        name: 'Thông báo',
        icon: <BellOutlined />,
    },
];

// ================= CUSTOMER MENU =================
export const customerMenu: IMenuItem[] = [];

// ================= RESEARCHER MENU =================
export const researcherMenu: IMenuItem[] = [];
