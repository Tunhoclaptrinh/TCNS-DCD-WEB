import { BaseEntity, TimestampEntity } from "./index";

export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CUSTOMER = "customer",
  RESEARCHER = "researcher",
  CURATOR = "curator",
}

export interface User extends BaseEntity, TimestampEntity {
  email: string;
  name: string;
  phone: string;
  address?: string;
  avatar?: string;
  bio?: string;
  lastLogin?: string;
  role: UserRole;
  isActive: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role: UserRole;
}

export interface UserUpdateDTO {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
  password?: string;
  newPassword?: string;
}

export interface UserCreateDTO {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: UserRole;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
}

export interface UserActivity {
  user: User;
  joinedAt?: string;
  lastLogin?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  withReviews: number;
  recentSignups: number;
}
