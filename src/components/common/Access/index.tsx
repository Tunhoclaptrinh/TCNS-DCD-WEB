import React from 'react';
import useAccess from '@/hooks/useAccess';

interface AccessProps {
    /** Permission required to access the children */
    permission?: string;
    /** List of permissions, check if user has ANY of them */
    anyPermission?: string[];
    /** List of permissions, check if user has ALL of them */
    allPermissions?: string[];
    /** Custom accessible condition */
    accessible?: boolean;
    /** Element to show when not accessible */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Access component to conditionally wrap UI elements based on permissions
 */
const Access: React.FC<AccessProps> = ({
    permission,
    anyPermission,
    allPermissions,
    accessible,
    fallback = null,
    children
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = useAccess();

    let isAccessible = true;

    if (accessible !== undefined) {
        isAccessible = accessible;
    } else if (permission) {
        isAccessible = hasPermission(permission);
    } else if (anyPermission) {
        isAccessible = hasAnyPermission(anyPermission);
    } else if (allPermissions) {
        isAccessible = hasAllPermissions(allPermissions);
    }

    if (!isAccessible) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default Access;
