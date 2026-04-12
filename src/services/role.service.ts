import BaseService from './base.service';

export interface Role {
  id: number;
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class RoleService extends BaseService<Role> {
  constructor() {
    super('/roles');
  }

  // Get all unique permission keys currently used in the system
  // This is a helper for the matrix UI
  getAvailablePermissions() {
    return [
      {
        category: 'Thành viên',
        actions: [
          { key: 'users:list', name: 'Xem danh sách' },
          { key: 'users:read', name: 'Xem chi tiết' },
          { key: 'users:create', name: 'Thêm mới' },
          { key: 'users:update', name: 'Chỉnh sửa' },
          { key: 'users:delete', name: 'Xóa' },
          { key: 'users:manage_status', name: 'Duyệt/Khóa tài khoản' },
          { key: 'users:view_stats', name: 'Xem thống kê' },
          { key: 'users:expel', name: 'Khai trừ' },
        ]
      },
      {
        category: 'Lịch trực',
        actions: [
          { key: 'duty:view', name: 'Xem lịch trực' },
          { key: 'duty:register', name: 'Đăng ký ca trực' },
          { key: 'duty:update', name: 'Cập nhật ca trực' },
          { key: 'duty:manage', name: 'Quản lý/Xếp lịch' },
          { key: 'duty:approve_swap', name: 'Duyệt đổi ca' },
          { key: 'duty:approve_leave', name: 'Duyệt nghỉ trực' },
        ]
      },
      {
        category: 'Khen thưởng & Kỷ luật',
        actions: [
          { key: 'reward_penalty:view', name: 'Xem danh sách' },
          { key: 'reward_penalty:manage', name: 'Quản lý (Thêm/Sửa/Xóa)' },
        ]
      },
      {
        category: 'Báo cáo',
        actions: [
          { key: 'reports:view', name: 'Xem báo cáo' },
          { key: 'reports:export', name: 'Xuất dữ liệu (Excel/PDF)' },
        ]
      },
      {
        category: 'Hệ thống',
        actions: [
          { key: 'system:manage_config', name: 'Quản trị cấu hình' },
          { key: 'system:manage_roles', name: 'Quản trị phân quyền' },
          { key: 'generations:manage', name: 'Quản lý Khóa/Thế hệ' },
        ]
      }
    ];
  }
}

export default new RoleService();
