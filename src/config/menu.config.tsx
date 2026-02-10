import React from 'react';
import {
    DashboardOutlined,
    UserOutlined,
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
];

// ================= CUSTOMER MENU =================
export const customerMenu: IMenuItem[] = [];

// ================= RESEARCHER MENU =================
export const researcherMenu: IMenuItem[] = [];
