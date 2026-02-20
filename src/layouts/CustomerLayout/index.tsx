import React from 'react';
import { Button } from 'antd';
import {
    UserOutlined,

} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import UnifiedLayout from '../UnifiedLayout';
import './styles.less';
import { customerMenu } from '@/config/menu.config';
import NotificationPopover from '@/components/common/NotificationPopover';

const CustomerLayout: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

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
                menu={{ request: async () => customerMenu }}
                user={user || undefined}
                onLogout={handleLogout}
                userMenuExtraItems={userMenuExtraItems}
                navTheme="light"
                actionsRender={() => [
                    <NotificationPopover key="notifications" />
                ]}
            >
                <Outlet />
            </UnifiedLayout>
        </>
    );
};

export default CustomerLayout;
