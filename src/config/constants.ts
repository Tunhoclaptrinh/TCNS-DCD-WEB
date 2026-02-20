export const USER_ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
  RESEARCHER: "researcher",
  CURATOR: "curator",
} as const;

// Storage keys used across the app
export const STORAGE_KEYS = {
  TOKEN: import.meta.env.VITE_STORAGE_TOKEN_KEY || "base_token",
  USER: import.meta.env.VITE_STORAGE_USER_KEY || "base_user",
  REFRESH_TOKEN: import.meta.env.VITE_STORAGE_REFRESH_TOKEN_KEY || "base_refresh_token",
  THEME: import.meta.env.VITE_STORAGE_THEME_KEY || "base_theme",
} as const;

export const PAGINATION_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

// Minimal type labels for legacy components (to be removed when components are updated)
export const ITEM_TYPE_LABELS: Record<string, string> = {};

// Type exports
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
