// Core Types
export * from "./auth.types";
// export * from "./common.types";
// export * from "./model.types"; // Comment out or remove if causing issues with User name
export type { User, UserRole } from "./auth.types"; // Explicit re-export
export * from "./api.types";
export * from "./user.types";

export * from "./notification.types";

// Common Types

export interface PaginationParams {
  page?: number;
  limit?: number;
  _page?: number;
  _limit?: number;
}

export interface SortParams {
  sort?: string;
  order?: "asc" | "desc" | "ascend" | "descend";
  _sort?: string;
  _order?: "asc" | "desc";
}

export interface SearchParams {
  q?: string;
  search?: string;
}

export interface FilterParams {
  [key: string]: any;
}

export interface QueryParams extends PaginationParams, SortParams, SearchParams, FilterParams { }

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface Metadata {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at?: string;
}

export interface TimestampEntity {
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Component Props

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface LoadingProps {
  loading?: boolean;
  error?: string | null;
}

// Form Types

export interface FormModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: any) => void | Promise<void>;
  title: string;
  loading?: boolean;
  width?: number;
  children: React.ReactNode;
}

export interface SearchBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: any) => void;
  onClearFilters?: () => void;
  size?: "small" | "middle" | "large";
  showClearButton?: boolean;
  responsive?: boolean;
}

export interface FilterConfig {
  key: string;
  placeholder: string;
  width?: number;
  colSpan?: number;
  options: Array<{ label: string; value: any }>;
  disabled?: boolean;
  loading?: boolean;
  value?: any;
}

// Redux Types

export interface RootState {
  auth: any; // Will be replaced with AuthState
  ui: any;
}

// Notification Types

export interface NotificationConfig {
  message: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  placement?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}
