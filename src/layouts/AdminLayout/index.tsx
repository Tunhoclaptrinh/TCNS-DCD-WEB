import {
  UserOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { AppDispatch, RootState } from "../../store";
import UnifiedLayout from "../UnifiedLayout";
import "./styles.less";

import { adminMenu, IMenuItem } from "@/config/menu.config";
import NotificationPopover from "@/components/common/NotificationPopover";
import { useAccess } from "@/hooks";

const AdminLayout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { hasAnyPermission, isAdmin } = useAccess();

  const filterMenu = (menuItems: IMenuItem[]): IMenuItem[] => {
    return menuItems
      .filter((item) => {
        if (isAdmin) return true;
        if (!item.accessFilter || item.accessFilter.length === 0) return true;
        return hasAnyPermission(item.accessFilter);
      })
      .map((item) => ({
        ...item,
        routes: item.routes ? filterMenu(item.routes) : undefined,
        children: item.children ? filterMenu(item.children) : undefined,
      }));
  };

  const filteredMenu = filterMenu(adminMenu);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const userMenuExtraItems = [
    // ... existing items
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link to="/profile">Hồ sơ</Link>,
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Cài đặt",
    },
    { type: "divider" },
    {
      key: "back-to-site",
      icon: <DashboardOutlined />,
      label: <Link to="/">Về trang chủ</Link>,
    },
    { type: "divider" },
  ];

  return (
    <UnifiedLayout
      menu={{ request: async () => filteredMenu }}
      user={user || undefined}
      onLogout={handleLogout}
      userMenuExtraItems={userMenuExtraItems}
      navTheme="light"
      actionsRender={() => <NotificationPopover />}
    >
      <Outlet />
    </UnifiedLayout>
  );
};

export default AdminLayout;
