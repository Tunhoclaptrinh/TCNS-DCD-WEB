import BaseService from './base.service';

export interface Permission {
  id: number;
  key: string;
  name: string;
  module: string;
  description?: string;
}

class PermissionService extends BaseService<Permission> {
  constructor() {
    super('/permissions');
  }

  /**
   * Group permissions by module for the matrix UI
   */
  async getGroupedPermissions() {
    const res = await this.getAll({ limit: 100 });
    if (!res.success || !res.data) return [];

    const grouped: Record<string, any[]> = {};
    const moduleNames: Record<string, string> = {
      'users': 'Thành viên',
      'duty': 'Lịch trực',
      'reward': 'Thưởng phạt',
      'reward_penalty': 'Thưởng phạt',
      'meeting': 'Họp hành',
      'feedback': 'Góp ý',
      'system': 'Hệ thống',
      'file': 'Tài liệu',
      'bonus-campaigns': 'Đợt cộng điểm'
    };

    res.data.forEach((p: Permission) => {
      const moduleName = moduleNames[p.module] || p.module;
      if (!grouped[moduleName]) {
        grouped[moduleName] = [];
      }
      grouped[moduleName].push({
        id: p.id,
        key: p.key,
        name: p.name,
        module: p.module,
        description: p.description
      });
    });

    return Object.entries(grouped).map(([category, actions]) => ({
      category,
      actions
    }));
  }
}

export default new PermissionService();
