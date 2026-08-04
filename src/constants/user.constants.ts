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
