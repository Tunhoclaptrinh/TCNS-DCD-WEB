import React from 'react';
import {
    DashboardOutlined,
    UserOutlined,
    CalendarOutlined,
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
        icon: <CalendarOutlined />,
        children: [
            {
                key: 'duty-calendar',
                path: '/admin/duty/calendar',
                name: 'Lịch trực tuần',
            },
            {
                key: 'duty-setup',
                path: '/admin/duty/setup',
                name: 'Thiết lập',
                accessFilter: ['admin'],
            },
            {
                key: 'duty-leave',
                path: '/admin/duty/leave',
                name: 'Duyệt đơn nghỉ',
                accessFilter: ['admin'],
            },
        ]
    },
];

// ================= CUSTOMER MENU =================
export const customerMenu: IMenuItem[] = [];

// ================= RESEARCHER MENU =================
export const researcherMenu: IMenuItem[] = [];
