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
        <Title level={1}>Welcome to Base Project</Title>
        <Paragraph>
          A solid foundation for your Web + Backend applications.
        </Paragraph>

        {user ? (
          <Card title={`Hello, ${user.full_name || user.username}!`} style={{ maxWidth: 500, margin: "0 auto" }}>
            <Space size="middle">
              <Button 
                type="primary" 
                icon={<DashboardOutlined />} 
                onClick={() => navigate("/admin/dashboard")}
              >
                Go to Dashboard
              </Button>
              <Button 
                icon={<UserOutlined />} 
                onClick={() => navigate("/profile")}
              >
                My Profile
              </Button>
            </Space>
          </Card>
        ) : (
          <Space size="middle">
            <Button type="primary" size="large" onClick={() => navigate("/auth/login")}>
              Login
            </Button>
            <Button size="large" onClick={() => navigate("/auth/register")}>
              Register
            </Button>
          </Space>
        )}
      </Space>
    </div>
  );
};

export default Home;
