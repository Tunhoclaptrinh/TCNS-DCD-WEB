import React from 'react';
import {
    UserOutlined,

} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
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
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { hasAnyPermission, isAdmin } = useAccess();

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
