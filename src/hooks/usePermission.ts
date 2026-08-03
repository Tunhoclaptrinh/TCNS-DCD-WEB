import { useAppSelector } from '@/store/hooks';

export const usePermission = () => {
    const { user } = useAppSelector((state) => state.auth);

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.permissions?.includes('*')) return true;
        return user.permissions?.includes(permission) || false;
    };

    const isAdmin = (): boolean => hasPermission('*');
    const isCustomer = (): boolean => !isAdmin();

    return {
        hasPermission,
        isAdmin,
        isCustomer
    };
};

export default usePermission;
