import React from 'react';
import {
    UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import UnifiedLayout from '../UnifiedLayout';
import './styles.less';
import { useAccess } from '@/hooks';
import { customerMenu, IMenuItem } from '@/config/menu.config';
import NotificationPopover from '@/components/common/NotificationPopover';

const CustomerLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { hasAnyPermission, isAdmin } = useAccess();

    // --- 1. Logic lọc Menu hiển thị ---
    const filterMenu = (menuItems: IMenuItem[]): IMenuItem[] => {
        return menuItems
            .filter((item) => {
                if (isAdmin) return true;
                if (!item.accessFilter || item.accessFilter.length === 0) return true;
                return hasAnyPermission(item.accessFilter);
            })
            .map((item) => ({
                ...item,
                routes: item.routes ? filterMenu(item.routes) : undefined,
                children: item.children ? filterMenu(item.children) : undefined,
            }));
    };

    const filteredMenu = filterMenu(customerMenu);

    // --- 2. Logic Tự động bảo vệ đường dẫn (Smart Guard) ---
    const findMenuItem = (menu: IMenuItem[], path: string): IMenuItem | undefined => {
        for (const item of menu) {
            if (item.path === path) return item;
            if (item.routes) {
                const found = findMenuItem(item.routes, path);
                if (found) return found;
            }
            if (item.children) {
                const found = findMenuItem(item.children, path);
                if (found) return found;
            }
        }
        return undefined;
    };

    const currentItem = findMenuItem(customerMenu, location.pathname);
    
    if (currentItem?.accessFilter && !isAdmin && !hasAnyPermission(currentItem.accessFilter)) {
        console.warn(`[Access Denied] Path: ${location.pathname}, Required: ${currentItem.accessFilter}`);
        return <Navigate to="/" replace />;
    }

    const handleLogout = () => {
        dispatch(logout() as any);
        navigate('/login');
    };

    const userMenuExtraItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Hồ sơ',
            onClick: () => navigate('/profile'),
        },
    ];

    return (
        <>
            <UnifiedLayout
                menu={{ request: async () => filteredMenu }}
                user={user || undefined}
                onLogout={handleLogout}
                userMenuExtraItems={userMenuExtraItems}
                navTheme="light"
                actionsRender={() => <NotificationPopover />}
            >
                <Outlet />
            </UnifiedLayout>
        </>
    );
};

export default CustomerLayout;
