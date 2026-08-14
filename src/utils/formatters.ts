import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const formatDate = (date: string | Date | Dayjs | null | undefined, format: string = 'DD/MM/YYYY'): string => {
    if (!date) return '';
    return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date | Dayjs | null | undefined, format: string = 'DD/MM/YYYY HH:mm'): string => {
    if (!date) return '';
    return dayjs(date).format(format);
};

export const formatRelativeTime = (date: string | Date | Dayjs | null | undefined): string => {
    if (!date) return '';
    return dayjs(date).fromNow();
};

export const formatNumber = (num: number | null | undefined): string => {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatCurrency = (amount: number | null | undefined, currency: string = 'VND'): string => {
    if (!amount && amount !== 0) return '';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const formatDistance = (distance: number | null | undefined): string => {
    if (!distance && distance !== 0) return '';
    if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
};

export const truncateText = (text: string | null | undefined, maxLength: number = 100): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

export const capitalizeFirst = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getUserDisplayName = (user: any): string => {
    if (!user) return 'Thành viên';

    // 1. Prioritize Họ và tên đệm + Tên (lastName + firstName)
    if (user.lastName || user.firstName) {
        const fullName = `${user.lastName || ''} ${user.firstName || ''}`.trim();
        if (fullName) return fullName;
    }

    // 2. fullName property if non-email
    if (user.fullName && typeof user.fullName === 'string' && user.fullName.trim() && !user.fullName.includes('@')) {
        return user.fullName.trim();
    }

    // 3. displayName property if non-email
    if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim() && !user.displayName.includes('@')) {
        return user.displayName.trim();
    }

    // 4. name property if non-email
    if (user.name && typeof user.name === 'string' && user.name.trim() && !user.name.includes('@')) {
        return user.name.trim();
    }

    // 5. username property if non-email
    if (user.username && typeof user.username === 'string' && user.username.trim() && !user.username.includes('@')) {
        return user.username.trim();
    }

    // 6. Fallbacks to name, username, or email
    if (user.name && typeof user.name === 'string' && user.name.trim()) return user.name.trim();
    if (user.username && typeof user.username === 'string' && user.username.trim()) return user.username.trim();
    if (user.email && typeof user.email === 'string' && user.email.trim()) return user.email.trim();

    return 'Thành viên';
};
