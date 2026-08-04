/**
 * Domain-specific Constants for Duty / Schedule Module
 */

export const SHIFT_LABELS: Record<string, string> = {
  shift_1: "Ca 1 (Sáng)",
  shift_2: "Ca 2 (Chiều)",
  shift_3: "Ca 3 (Tối)",
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  evening: "Ca tối",
};

export const DUTY_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  rejected: "Đã từ chối",
  cancelled: "Đã hủy",
  completed: "Đã hoàn thành",
  processing: "Đang xử lý",
};

/**
 * Domain-specific Field Labels for Duty Module
 */
export const DUTY_FIELD_LABELS: Record<string, string> = {
  date: "Ngày trực",
  shift: "Ca trực",
  location: "Địa điểm trực",
  room: "Phòng trực",
  slotId: "Vị trí ca trực",
  reason: "Lý do",
  replacementId: "Người trực thay",
  requesterId: "Người tạo yêu cầu",
  note: "Ghi chú ca trực",
};

/**
 * Domain-specific Reverse Value Map for Duty Module
 */
export const DUTY_VALUE_MAP: Record<string, string> = {
  ...SHIFT_LABELS,
  ...DUTY_STATUS_LABELS,
};
