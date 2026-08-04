export const POSITION_LABELS: Record<string, string> = {
    ctv: 'Cộng tác viên',
    tv: 'Thành viên thường',
    tvb: 'Thành viên ban',
    pb: 'Phó ban',
    tb: 'Trưởng ban',
    dt: 'Đội trưởng'
};

export const POSITION_LEVELS = ['ctv', 'tv', 'tvb', 'pb', 'tb', 'dt'];

export const POSITION_FILTERS = Object.entries(POSITION_LABELS).map(([value, label]) => ({ 
    text: label, 
    value 
}));

export const DEPARTMENTS = [
    'Truyền thông',
    'Nhân sự',
    'Tài chính',
    'Khác'
];

export const DEPARTMENT_FILTERS = DEPARTMENTS.map(dept => ({ 
    text: dept, 
    value: dept 
}));

/**
 * Domain-specific Field Labels for Users
 */
export const USER_FIELD_LABELS: Record<string, string> = {
  studentId: "Mã SV",
  cccd: "Số CCCD",
  generationId: "Khóa/Thế hệ",
  classId: "Lớp",
  className: "Lớp",
  bio: "Tiểu sử",
  email: "Email",
  phone: "Số điện thoại",
  position: "Chức vụ",
  department: "Phòng ban/Ban",
  gender: "Giới tính",
  dob: "Ngày sinh",
  hometown: "Quê quán",
  isAlumni: "Cựu thành viên",
  avatar: "Ảnh đại diện",
  password: "Mật khẩu",
  address: "Địa chỉ",
  roleIds: "Danh sách Vai trò",
  expelled: "Đã bị khai trừ",
  expelledAt: "Ngày khai trừ",
  expelReason: "Lý do khai trừ",
};

/**
 * Domain-specific Reverse Value Map for Users
 */
export const USER_VALUE_MAP: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
  ctv: "Cộng tác viên",
  tv: "Thành viên",
  tvb: "Thành viên ban",
  pb: "Phó ban",
  tb: "Trưởng ban",
  dt: "Đội trưởng",
  active: "Đang hoạt động",
  inactive: "Đã nghỉ",
  dismissed: "Khai trừ",
};
