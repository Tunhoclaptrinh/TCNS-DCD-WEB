import { useSelector } from 'react-redux';
import { RootState } from '@/store';

/**
 * Hook to handle permission checks in the frontend
 * @returns {Object} { hasPermission, permissions, isAdmin }
 */
export const useAccess = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const permissions = user?.permissions || [];
    const isAdmin = permissions.includes('*');
    const isStaff = isAdmin;

    // ── Alias map: permission check -> accepted actual user permissions ──────────────
    const aliases: Record<string, string[]> = {
        // Users
        'users:list':          ['users:list:all', 'users:list:dept'],
        'users:update':        ['users:update:profile', 'users:update:org', 'users:promote', 'users:expel'],
        'users:import_export': ['users:import', 'users:export'],
        'users:manage_status': ['users:update:org', 'users:expel'],
        'dashboard:view': ['users:list:all', 'users:list:dept', 'duty:view', 'meeting:view'],
        
        // Duty (alias để tương thích)
        'duty:view': ['duty:view', 'duty:view:all'],
        'duty:export': ['duty:export', 'duty:view', 'duty:manage'],

        // Meetings
        'meeting:view':   ['meeting:view'],
        'meeting:create': ['meeting:create:all', 'meeting:create:dept'],

        // Reward penalties
        'reward_penalty:view':   ['reward:history:all', 'reward:stats:all', 'reward:stats:dept'],
        'reward_penalty:manage': ['reward:create', 'reward:approve'],

        // Semesters / Settings
        'settings:manage': ['system:manage'],

        // Reports
        'reports:view':   ['duty:manage', 'reward:stats:all'],
        'reports:export': ['duty:manage', 'reward:stats:all'],
    };

    /**
     * Check single permission with alias fallback
     */
    const checkSinglePermission = (perm: string): boolean => {
        if (permissions.includes(perm)) return true;
        const accepted = aliases[perm];
        if (accepted) {
            return accepted.some(p => permissions.includes(p));
        }
        return false;
    };

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission key (e.g., 'users:create')
     * @returns {boolean}
     */
    const hasPermission = (permission: string): boolean => {
        if (isAdmin) return true;
        return checkSinglePermission(permission);
    };

    /**
     * Check if user has any of the provided permissions
     * @param {string[]} requiredPermissions
     * @returns {boolean}
     */
    const hasAnyPermission = (requiredPermissions: string[]): boolean => {
        if (isAdmin) return true;
        return requiredPermissions.some(p => checkSinglePermission(p));
    };

    /**
     * Check if user has all of the provided permissions
     * @param {string[]} requiredPermissions
     * @returns {boolean}
     */
    const hasAllPermissions = (requiredPermissions: string[]): boolean => {
        if (isAdmin) return true;
        return requiredPermissions.every(p => checkSinglePermission(p));
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        permissions,
        isAdmin,
        isStaff,
        user
    };
};

export default useAccess;
