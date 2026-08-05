/**
 * System-wide Field Label Dictionary for Import/Export
 * Decoupled from UI components for clean base architecture.
 */
export const SYSTEM_FIELD_LABELS: Record<string, string> = {
  // Common Base Fields
  id: "ID",
  name: "Tên đầy đủ",
  code: "Mã",
  title: "Tiêu đề",
  description: "Mô tả",
  note: "Ghi chú",
  status: "Trạng thái",
  type: "Phân loại",
  category: "Danh mục",
  priority: "Độ ưu tiên",
  order: "Thứ tự",
  isActive: "Đang hoạt động",
  createdAt: "Ngày tạo",
  updatedAt: "Cập nhật cuối",
  createdBy: "Người tạo",
  updatedBy: "Người cập nhật",
};

/**
 * Format any column key to a human-readable title.
 * Priority: Column Title/Label -> Custom Map -> System Dictionary -> CamelCase Formatting.
 */
export function formatColumnTitle(
  key: string,
  columns?: any[],
  customMap?: Record<string, string>
): string {
  if (!key) return "";

  if (columns?.length) {
    const found = columns.find(
      (c) =>
        c.key === key ||
        c.dataIndex === key ||
        (Array.isArray(c.dataIndex) && c.dataIndex[0] === key)
    );
    if (found) {
      if (typeof found.title === "string" && found.title) return found.title;
      if (found.label) return found.label;
    }
  }

  if (customMap && customMap[key]) return customMap[key];
  if (SYSTEM_FIELD_LABELS[key]) return SYSTEM_FIELD_LABELS[key];

  // Fallback: format camelCase keys cleanly (e.g. customField -> Custom Field)
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}

/**
 * System-wide Reverse Mapping Dictionary for System Codes -> Human-Readable Text.
 * Used across components for consistent Vietnamese labels.
 */
export const SYSTEM_READABLE_TEXT_MAP: Record<string, string> = {
  // Statuses
  active: "Đang hoạt động",
  inactive: "Đã nghỉ",
  dismissed: "Khai trừ",
  completed: "Đã hoàn thành",
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  cancelled: "Đã hủy",
  success: "Thành công",
  failed: "Thất bại",
  error: "Lỗi",

  // Gender
  male: "Nam",
  female: "Nữ",
  other: "Khác",

  // Positions / Roles
  ctv: "Cộng tác viên",
  tv: "Thành viên",
  tvb: "Thành viên ban",
  pb: "Phó ban",
  tb: "Trưởng ban",
  dt: "Đội trưởng",
  admin: "Quản trị viên",
  user: "Người dùng",

  // Booleans
  true: "Có",
  false: "Không",
  "1": "Có",
  "0": "Không",
};

/**
 * Resolve any cell code/value to a human-readable string.
 * Priority: Column valueMap -> Custom Page Map -> System Dictionary -> Raw String.
 */
export function formatColumnValue(
  value: any,
  customMap?: Record<string, string>,
  columnValueMap?: Record<string, string>
): string {
  if (value === undefined || value === null) return "";
  const strVal = String(value).trim();
  const lowerVal = strVal.toLowerCase();

  if (columnValueMap && columnValueMap[strVal] !== undefined) {
    return columnValueMap[strVal];
  }
  if (columnValueMap && columnValueMap[lowerVal] !== undefined) {
    return columnValueMap[lowerVal];
  }
  if (customMap && customMap[strVal] !== undefined) {
    return customMap[strVal];
  }
  if (customMap && customMap[lowerVal] !== undefined) {
    return customMap[lowerVal];
  }
  if (SYSTEM_READABLE_TEXT_MAP[lowerVal] !== undefined) {
    return SYSTEM_READABLE_TEXT_MAP[lowerVal];
  }

  return strVal;
}
