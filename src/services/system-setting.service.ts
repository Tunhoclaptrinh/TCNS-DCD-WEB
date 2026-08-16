import BaseService from './base.service';
import apiClient from '@/config/axios.config';
import { POSITION_LABELS } from '@/constants/user.constants';

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
}

class SystemSettingService extends BaseService<SystemSetting> {
  private cache: Map<string, any> = new Map();
  private pendingPromises: Map<string, Promise<any>> = new Map();
  private positionMapCache: Record<string, string> | null = null;
  private departmentMapCache: Record<string, string> | null = null;

  constructor() {
    super('/system-settings');
  }

  async getByKey(key: string): Promise<SystemSetting | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    if (this.pendingPromises.has(key)) {
      return this.pendingPromises.get(key);
    }

    const promise = (async () => {
      try {
        const response = await apiClient.get(`${this.endpoint}/key/${key}`);
        const result = response.data ?? response;
        this.cache.set(key, result);
        return result;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      } finally {
        this.pendingPromises.delete(key);
      }
    })();

    this.pendingPromises.set(key, promise);
    return promise;
  }

  /** Clear cache when settings are saved */
  clearCache() {
    this.cache.clear();
    this.positionMapCache = null;
    this.departmentMapCache = null;
  }

  /** Pre-load & get merged position map for O(1) instant lookups */
  async getPositionMap(): Promise<Record<string, string>> {
    if (this.positionMapCache) return this.positionMapCache;

    const map: Record<string, string> = { ...POSITION_LABELS };
    try {
      const res = await this.getByKey('POSITION_CONFIGS');
      if (res && res.value) {
        const parsed = typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (p.id && p.name) map[p.id] = p.name;
          });
        }
      }
    } catch {}

    this.positionMapCache = map;
    return map;
  }

  /** Instant O(1) Sync Position Name lookup */
  getPositionLabelSync(pos: string): string {
    if (!pos) return '--';
    if (this.positionMapCache && this.positionMapCache[pos]) {
      return this.positionMapCache[pos];
    }
    return POSITION_LABELS[pos] || pos;
  }

  /** Pre-load & get merged department map for O(1) instant lookups */
  async getDepartmentMap(): Promise<Record<string, string>> {
    if (this.departmentMapCache) return this.departmentMapCache;

    const map: Record<string, string> = {};
    try {
      const res = await this.getByKey('DEPARTMENT_CONFIGS');
      if (res && res.value) {
        const parsed = typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => {
            if (d.id && d.name) map[d.id] = d.name;
          });
        }
      }
    } catch {}

    this.departmentMapCache = map;
    return map;
  }
}

export default new SystemSettingService();
