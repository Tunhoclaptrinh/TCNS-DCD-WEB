import { useSelector } from 'react-redux';
import { RootState } from '@/store';

/**
 * Hook to handle permission checks in the frontend
 * @returns {Object} { hasPermission, permissions, isAdmin }
 */
export const useAccess = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const permissions = user?.permissions || [];
    const isAdmin = user?.role === 'admin' || permissions.includes('*');

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission key (e.g., 'users:create')
     * @returns {boolean}
     */
    const hasPermission = (permission: string): boolean => {
        if (isAdmin) return true;
        return permissions.includes(permission);
    };

    /**
     * Check if user has any of the provided permissions
     * @param {string[]} requiredPermissions
     * @returns {boolean}
     */
    const hasAnyPermission = (requiredPermissions: string[]): boolean => {
        if (isAdmin) return true;
        return requiredPermissions.some(p => permissions.includes(p));
    };

    /**
     * Check if user has all of the provided permissions
     * @param {string[]} requiredPermissions
     * @returns {boolean}
     */
    const hasAllPermissions = (requiredPermissions: string[]): boolean => {
        if (isAdmin) return true;
        return requiredPermissions.every(p => permissions.includes(p));
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        permissions,
        isAdmin,
        user
    };
};

export default useAccess;
