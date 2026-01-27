import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Layout, Table } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { userService } from '../../services/user.service';
const { Header, Content } = Layout;
const DashboardPage = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [users, setUsers] = useState([]);
    useEffect(() => {
        loadUsers();
    }, []);
    const loadUsers = async () => {
        try {
            const res = await userService.getAll();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        catch (err) {
            console.error(err);
        }
    };
    const handleLogout = () => {
        dispatch(logout());
    };
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Role', dataIndex: 'role', key: 'role' },
    ];
    return (_jsxs(Layout, { children: [_jsxs(Header, { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { style: { color: 'white' }, children: "Base Dashboard" }), _jsxs("div", { style: { color: 'white' }, children: ["Welcome, ", user?.name, _jsx(Button, { onClick: handleLogout, style: { marginLeft: 16 }, children: "Logout" })] })] }), _jsxs(Content, { style: { padding: '50px' }, children: [_jsx("h1", { children: "User List" }), _jsx(Table, { dataSource: users, columns: columns, rowKey: "id" })] })] }));
};
export default DashboardPage;
