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
    (_requiredRoles?: string[]) => {
      return true; // Deprecated
    },
    [user, isAuthenticated],
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user || !isAuthenticated) return false;
      if (user.permissions?.includes('*')) return true;
      return user.permissions?.includes(permission) || false;
    },
    [user, isAuthenticated],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!user || !isAuthenticated) return false;
      if (user.permissions?.includes('*')) return true;
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
    isAdmin: user?.permissions?.includes('*'),
  };
};

export default useAuth;
