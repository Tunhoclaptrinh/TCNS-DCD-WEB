import React from "react";
import { Layout, Button, Avatar, Dropdown, Space, theme } from "antd";
import { UserOutlined, LogoutOutlined, CalendarOutlined, DashboardOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "@/store/slices/authSlice";
import { RootState } from "@/store";
import logo from "@/assets/images/logo.png";
import NotificationPopover from "@/components/common/NotificationPopover";

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = theme.useToken();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout() as any);
    navigate("/login");
  };

  const menuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider",
    },
    {
      key: "duty",
      icon: <CalendarOutlined />,
      label: user?.role === 'admin' || user?.role === 'staff' ? "Quản lý lịch trực" : "Lịch trực của tôi",
      onClick: () => navigate(user?.role === 'admin' || user?.role === 'staff' ? "/admin/duty" : "/duty"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <AntHeader
      style={{
        padding: "0 24px",
        background: token.colorBgContainer,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
        zIndex: 1,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <img src={logo} alt="Tổ chức nhân sự Đội Cờ Đỏ PTIT" style={{ width: 28, height: 28, objectFit: "contain" }} />
        <span className="unified-layout-logo-name">Tổ chức nhân sự Đội Cờ Đỏ PTIT</span>
      </div>

      <div className="right-section">
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button 
              type="text" 
              icon={user.role === 'admin' || user.role === 'staff' ? <DashboardOutlined /> : <CalendarOutlined />}
              onClick={() => navigate(user.role === 'admin' || user.role === 'staff' ? "/admin/dashboard" : "/duty")}
              style={{ fontWeight: 500 }}
            >
              {user.role === 'admin' || user.role === 'staff' ? "Quản trị" : "Lịch trực"}
            </Button>
            <NotificationPopover />
            <Dropdown menu={{ items: menuItems as any }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar src={user.avatar} icon={<UserOutlined />} />
                <span className="username" style={{ color: token.colorText }}>
                  {user.name || "User"}
                </span>
              </Space>
            </Dropdown>
          </div>
        ) : (
          <Space>
            <Button type="primary" onClick={() => navigate("/login")}>
              Đăng nhập
            </Button>
          </Space>
        )}
      </div>
    </AntHeader>
  );
};

export default Header;
