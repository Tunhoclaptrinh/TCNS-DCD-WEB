import { BaseEntity, TimestampEntity } from "./index";

export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CUSTOMER = "customer",
  CURATOR = "curator",
}

export enum UserPosition {
  CTC = "ctc",
  TV = "tv",
  TVB = "tvb",
  PB = "pb",
  TB = "tb",
  DT = "dt",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISMISSED = "dismissed",
}

export interface User extends BaseEntity, TimestampEntity {
  email: string;
  name: string;
  lastName?: string;
  firstName?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  studentId?: string;
  classId?: string;
  hometown?: string;
  position?: UserPosition;
  department?: string;
  status?: UserStatus;
  phone?: string;
  address?: string;
  avatar?: string;
  bio?: string;
  lastLogin?: string;
  role: UserRole;
  isActive: boolean;
  generationId?: number;
  generation?: {
    id: number;
    name: string;
    description?: string;
    status?: string;
  };
  permissions?: string[];
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
  lastName?: string;
  firstName?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  studentId?: string;
  classId?: string;
  hometown?: string;
  position?: UserPosition;
  department?: string;
  status?: UserStatus;
  email?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
  password?: string;
  newPassword?: string;
  generationId?: number;
}

export interface UserCreateDTO {
  name: string;
  lastName?: string;
  firstName?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  studentId?: string;
  classId?: string;
  hometown?: string;
  position?: UserPosition;
  department?: string;
  status?: UserStatus;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
  generationId?: number;
}

export interface UserActivity {
  user: User;
  joinedAt?: string;
  lastLogin?: string;
}

export interface UserStatItem {
  total: number;
  active: number;
  inactive: number;
  dismissed: number;
  ctv: number;
  official: number;
  management: number;
  recentSignups: number;
  byRole: Record<string, number>;
  byPosition: Record<string, number>;
}

export interface UserStats {
  global: UserStatItem;
  byDepartment: Record<string, UserStatItem>;
}
