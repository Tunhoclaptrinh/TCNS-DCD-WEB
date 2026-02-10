// ============================================
// src/pages/Dashboard/DashboardPage.tsx
// ============================================
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Typography, Space } from "antd";
import {
  UserOutlined,
  HeartOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const { Title, Paragraph, Text } = Typography;

const DashboardPage = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    favoriteCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Mock stats for now
      setStats({
        userCount: 0,
        favoriteCount: 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
        title: "Hồ sơ của tôi",
        value: 1,
        icon: <UserOutlined />,
        color: "#1890ff",
        path: "/profile",
    },
    {
      title: "Yêu Thích",
      value: stats.favoriteCount,
      icon: <HeartOutlined />,
      color: "#f5222d",
      path: "/favorites",
    },
     {
      title: "Thông báo",
      value: 0,
      icon: <CalendarOutlined />,
      color: "#52c41a",
      path: "/notifications",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Welcome Section */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="small">
          <Title level={2} style={{ margin: 0 }}>
            Xin chào, {user?.name}!
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 16 }}>
            Chào mừng bạn đến với Base Web Application
          </Paragraph>
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              hoverable
              loading={loading}
              onClick={() => navigate(card.path)}
              style={{ cursor: "pointer" }}
            >
              <Statistic
                title={card.title}
                value={card.value}
                prefix={
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: `${card.color}20`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {React.cloneElement(card.icon, {
                      style: { fontSize: 24, color: card.color },
                    })}
                  </div>
                }
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* System Info */}
      <Card style={{ marginTop: 24 }} title="Thông Tin Hệ Thống">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text strong>Phiên Bản:</Text>
            <br />
            <Text>v1.0.0</Text>
          </Col>
          <Col span={8}>
            <Text strong>API Status:</Text>
            <br />
            <Text type="success">● Connected</Text>
          </Col>
          <Col span={8}>
            <Text strong>Người Dùng:</Text>
            <br />
            <Text>{user?.email}</Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DashboardPage;
