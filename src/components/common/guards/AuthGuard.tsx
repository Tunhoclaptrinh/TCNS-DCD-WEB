import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/common/Loading";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  anyPermission?: string[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  anyPermission = [],
}) => {
  const { isAuthenticated, isInitialized, hasRole, hasPermission, hasAnyPermission, loading } = useAuth();
  const location = useLocation();

  // 1. Chờ Auth khởi tạo xong (check token từ local storage)
  if (!isInitialized || (loading && !isAuthenticated)) {
    return <Loading fullScreen message="Đang xác thực..." />;
  }

  // 2. Nếu yêu cầu đăng nhập mà chưa đăng nhập -> Redirect Login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Check Roles
  if (requireAuth && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return <Navigate to="/" replace />;
  }

  // 4. Check specific Permissions (All required)
  if (requireAuth && requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every(p => hasPermission(p));
    if (!hasAll) return <Navigate to="/" replace />;
  }

  // 5. Check "Any" Permission
  if (requireAuth && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
    return <Navigate to="/" replace />;
  }

  // 6. Nếu route public (ví dụ Login) mà user đã đăng nhập -> Redirect vào trong
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
