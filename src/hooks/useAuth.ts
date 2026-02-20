import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks"; // Import hook mới
import {
  login,
  register,
  logout,
  updateUserInfo,
  clearError,
} from "../store/slices/authSlice";
import type { LoginCredentials, RegisterData } from "../types";

export const useAuth = () => {
  const dispatch = useAppDispatch(); // Dùng hook có type sẵn

  // KHÔNG cần khai báo (state: RootState) nữa, TypeScript tự hiểu
  const { user, isAuthenticated, loading, error, isInitialized } =
    useAppSelector((state) => state.auth);

  const loginUser = useCallback(
    (credentials: LoginCredentials) => {
      return dispatch(login(credentials));
    },
    [dispatch],
  );

  const registerUser = useCallback(
    (data: RegisterData) => {
      return dispatch(register(data));
    },
    [dispatch],
  );

  const logoutUser = useCallback(() => {
    return dispatch(logout());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const hasRole = useCallback(
    (requiredRoles: string[]) => {
      if (!user || !isAuthenticated) return false;
      if (requiredRoles.length === 0) return true;
      return requiredRoles.includes(user.role);
    },
    [user, isAuthenticated],
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user || !isAuthenticated) return false;
      if (user.role === 'admin' || user.permissions?.includes('*')) return true;
      return user.permissions?.includes(permission) || false;
    },
    [user, isAuthenticated],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!user || !isAuthenticated) return false;
      if (user.role === 'admin' || user.permissions?.includes('*')) return true;
      return permissions.some(p => user.permissions?.includes(p)) || false;
    },
    [user, isAuthenticated],
  );

  return {
    user,
    isAuthenticated,
    loading,
    error,
    isInitialized,
    login: loginUser,
    register: registerUser,
    logout: logoutUser,
    updateUserInfo: (info: any) => dispatch(updateUserInfo(info)),
    clearError: clearAuthError,
    hasRole,
    hasPermission,
    hasAnyPermission,
    isAdmin: user?.role === "admin" || user?.permissions?.includes('*'),
  };
};

export default useAuth;
