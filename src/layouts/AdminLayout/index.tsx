import {
  UserOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, Link, useLocation, Navigate } from "react-router-dom";
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
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { hasAnyPermission, isAdmin } = useAccess();

  // --- 1. Logic lọc Menu hiển thị (đã có sẵn) ---
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

  // --- 2. Logic Tự động bảo vệ đường dẫn (Smart Guard) ---
  const findMenuItem = (menu: IMenuItem[], path: string): IMenuItem | undefined => {
    for (const item of menu) {
      if (item.path === path) return item;
      if (item.routes) {
        const found = findMenuItem(item.routes, path);
        if (found) return found;
      }
      if (item.children) {
        const found = findMenuItem(item.children, path);
        if (found) return found;
      }
    }
    return undefined;
  };

  const currentItem = findMenuItem(adminMenu, location.pathname);
  
  // Nếu tìm thấy trang trong Menu và nó có yêu cầu quyền hạn cụ thể
  if (currentItem?.accessFilter && !isAdmin && !hasAnyPermission(currentItem.accessFilter)) {
      console.warn(`[Access Denied] Path: ${location.pathname}, Required: ${currentItem.accessFilter}`);
      return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const userMenuExtraItems = [
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
