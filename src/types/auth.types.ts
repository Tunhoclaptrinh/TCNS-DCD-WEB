export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  address?: string;
  bio?: string;
  permissions?: string[];
}

export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CUSTOMER = "customer",
  RESEARCHER = "researcher",
  CURATOR = "curator",
}

export interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}

export interface ChangePasswordData {
  id?: number | string;
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthenticatedUser;
    permissions?: string[];
    token: string;
  };
  message?: string;
}
