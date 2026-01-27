import { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { UserOutlined, AppstoreOutlined, LogoutOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import UserPage from '../Users';
import CategoryPage from '../Categories';

const { Header, Sider, Content } = Layout;

const DashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeKey, setActiveKey] = useState('users');

  const handleLogout = () => {
    dispatch(logout());
  };

  const menuItems = [
    { key: 'users', icon: <UserOutlined />, label: 'Users' },
    { key: 'categories', icon: <AppstoreOutlined />, label: 'Categories' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
           BASE ADMIN
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={['users']}
          mode="inline"
          items={menuItems}
          onClick={(e) => setActiveKey(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Welcome, {user?.name}</h3>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>Logout</Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280 }}>
           {activeKey === 'users' && <UserPage />}
           {activeKey === 'categories' && <CategoryPage />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardPage;
