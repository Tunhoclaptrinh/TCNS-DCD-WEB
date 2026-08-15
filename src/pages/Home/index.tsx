import React from "react";
import { Typography, Card, Space, Button } from "antd";
import { UserOutlined, CalendarOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    if (isInitialized && user) {
      if (user.permissions?.includes('*') || (user as any).role === 'admin' || (user as any).role === 'staff') {
        navigate("/admin/duty/calendar", { replace: true });
      } else {
        navigate("/duty/calendar", { replace: true });
      }
    }
  }, [isInitialized, user, navigate]);

  return (
    <div style={{ padding: "100px 50px", maxWidth: "1200px", margin: "0 auto", textAlign: "center", minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={1} style={{ fontSize: '48px', fontWeight: 800, color: 'var(--primary-color)' }}>TCNS - Đội Cờ Đỏ PTIT</Title>
        <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
          Hệ thống Quản lý Tổ chức và Điều phối Lịch trực dành riêng cho thành viên Đội Cờ Đỏ.
        </Paragraph>

        {user ? (
          <Card title={`Xin chào, ${user.name}!`} style={{ maxWidth: 500, margin: "0 auto", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Space size="middle">
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => navigate(user.permissions?.includes('*') || (user as any).role === 'admin' || (user as any).role === 'staff' ? "/admin/duty/calendar" : "/duty/calendar")}
              >
                Lịch trực
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
