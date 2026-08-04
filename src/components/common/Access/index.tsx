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
    /** How to handle inaccessible state: hide the element or disable it */
    behavior?: 'hide' | 'disable';
    /** Element to show when not accessible (only applies when behavior = 'hide') */
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
    behavior = 'hide',
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
        if (behavior === 'disable') {
            // Check if children is a valid React element before cloning
            if (React.isValidElement(children)) {
                return React.cloneElement(children, {
                    disabled: true,
                    title: (children.props as any).title || "Bạn không có quyền thực hiện thao tác này",
                    style: { ...(children.props as any).style, opacity: 0.6, cursor: 'not-allowed' }
                } as any);
            }
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default Access;
