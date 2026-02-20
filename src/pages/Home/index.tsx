import React from "react";
import { Typography, Card, Space, Button } from "antd";
import { UserOutlined, DashboardOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div style={{ padding: "50px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={1}>Base Web Boilerplate</Title>
        <Paragraph>
          Một nền tảng vững chắc cho ứng dụng Web của bạn, tích hợp sẵn Ant Design, Redux Toolkit và Axios.
        </Paragraph>

        {user ? (
          <Card title={`Xin chào, ${user.name}!`} style={{ maxWidth: 500, margin: "0 auto", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Space size="middle">
              <Button
                type="primary"
                icon={<DashboardOutlined />}
                onClick={() => navigate("/admin/dashboard")}
              >
                Quản trị
              </Button>
              <Button
                icon={<UserOutlined />}
                onClick={() => navigate("/profile")}
              >
                Hồ sơ của tôi
              </Button>
            </Space>
          </Card>
        ) : (
          <Space size="middle">
            <Button type="primary" size="large" onClick={() => navigate("/login")} style={{ minWidth: 120 }}>
              Đăng nhập
            </Button>
            <Button size="large" onClick={() => navigate("/register")} style={{ minWidth: 120 }}>
              Đăng ký
            </Button>
          </Space>
        )}
      </Space>
    </div>
  );
};

export default Home;
