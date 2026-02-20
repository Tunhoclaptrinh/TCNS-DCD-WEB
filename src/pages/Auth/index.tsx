import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Tabs,
  Typography,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useAppDispatch } from "../../store/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import { login, register } from "../../store/slices/authSlice";
import logo from "@/assets/images/logo2.png";
import "./styles.less";

const { Title, Paragraph } = Typography;

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (location.pathname === "/register") {
      setActiveTab("register");
    } else {
      setActiveTab("login");
    }
  }, [location.pathname]);

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      await dispatch(
        login({ email: values.email, password: values.password }),
      ).unwrap();
      message.success("Đăng nhập thành công!");
      navigate("/");
    } catch (error: any) {
      message.error(`❌ ${error || "Đăng nhập thất bại"}`);
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    try {
      await dispatch(
        register({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      ).unwrap();
      message.success("✅ Đăng ký thành công!");

      // Auto login after registration
      await dispatch(
        login({ email: values.email, password: values.password }),
      ).unwrap();
      navigate("/");
    } catch (error: any) {
      message.error(`❌ ${error || "Đăng ký thất bại"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="Logo" />
          <Title level={2}>Chào mừng bạn</Title>
          <Paragraph>Vui lòng đăng nhập hoặc đăng ký tài khoản</Paragraph>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: "login",
              label: "Đăng nhập",
              children: (
                <Form
                  name="login-form"
                  onFinish={onFinishLogin}
                  layout="vertical"
                  requiredMark={false}
                >
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email!" },
                      { type: "email", message: "Email không hợp lệ!" },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Mật khẩu"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      size="large"
                    >
                      Đăng Nhập
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "register",
              label: "Đăng ký",
              children: (
                <Form
                  name="register-form"
                  onFinish={onFinishRegister}
                  layout="vertical"
                  requiredMark={false}
                >
                  <Form.Item
                    name="name"
                    rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email!" },
                      { type: "email", message: "Email không hợp lệ!" },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    rules={[
                      { required: true, message: "Vui lòng nhập số điện thoại!" },
                      { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại không hợp lệ!" },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: "Vui lòng nhập mật khẩu!" },
                      { min: 6, message: "Mật khẩu phải ít nhất 6 ký tự!" },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Mật khẩu"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirm"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Vui lòng xác nhận mật khẩu!" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Mật khẩu không khớp!"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Xác nhận mật khẩu"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      size="large"
                    >
                      Đăng Ký
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default AuthPage;
