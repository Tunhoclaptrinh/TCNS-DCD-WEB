import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useDispatch } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const onFinish = async (values) => {
        setLoading(true);
        try {
            const resultAction = await dispatch(login(values));
            if (login.fulfilled.match(resultAction)) {
                message.success('Login successful');
                navigate('/');
            }
            else {
                message.error(resultAction.payload || 'Login failed');
            }
        }
        catch (err) {
            message.error('An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }, children: _jsx(Card, { title: "Base Login", style: { width: 400 }, children: _jsxs(Form, { onFinish: onFinish, children: [_jsx(Form.Item, { name: "email", rules: [{ required: true, message: 'Please input your email!' }], children: _jsx(Input, { placeholder: "Email" }) }), _jsx(Form.Item, { name: "password", rules: [{ required: true, message: 'Please input your password!' }], children: _jsx(Input.Password, { placeholder: "Password" }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, block: true, children: "Log in" }) })] }) }) }));
};
export default LoginPage;
