import type { User } from '../types';

export const getInitials = (name: string | null | undefined): string => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getAvatarUrl = (name: string, size: number = 100): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
    )}&size=${size}&background=random&color=fff&bold=true&format=svg`;
};

export const hasPermission = (user: User | null | undefined, permission: string): boolean => {
    if (!user) return false;
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permission) || false;
};

export const isAdmin = (user: User | null | undefined): boolean => {
    return hasPermission(user, '*');
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number = 300
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number = 300
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return function executedFunction(this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

export const downloadFile = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch {
            document.body.removeChild(textArea);
            return false;
        }
    }
};

export const getQueryParams = (search: string): Record<string, string> => {
    return Object.fromEntries(new URLSearchParams(search));
};

export const buildQueryString = (params: Record<string, any>): string => {
    const filtered = Object.entries(params).filter(
        ([_, value]) => value !== null && value !== undefined && value !== ''
    );
    return new URLSearchParams(filtered as [string, string][]).toString();
};
