import React from 'react';
import type { ColumnType } from 'antd/es/table';

export interface FilterOption {
    label: string;
    value: any;
}

export interface FilterConfig {
    key: string;
    label?: string; // Display label
    placeholder?: string;
    type?: 'select' | 'input' | 'date' | 'date-range' | 'number'; // Supported types
    options?: FilterOption[]; // For select type
    operators?: ('eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'not_like' | 'in' | 'ilike')[]; // Allowed operators
    defaultOperator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'not_like' | 'in' | 'ilike'; // Default operator
    colSpan?: number; // Grid span (default 12 or 24)
}

/**
 * DataTable Column with custom resizable & searchable properties
 */
export interface DataTableColumn<T = any> extends ColumnType<T> {
    sortable?: boolean;
    resizable?: boolean; // Enable column resizing (default: false)
    searchable?: boolean; // Enable search filter (default: false)
    minWidth?: number; // Min width for resizable column
    maxWidth?: number; // Max width for resizable column
}

export interface DataTableProps {
    data?: any[];
    loading?: boolean;
    columns?: DataTableColumn[];
    onAdd?: () => void;
    onView?: (record: any) => void;
    onEdit?: (record: any) => void;
    onDelete?: (id: any) => void;
    onRefresh?: () => void;
    pagination?: {
        current?: number;
        pageSize?: number;
        total?: number;
        [key: string]: any;
    } | false;
    onPaginationChange?: (pagination: any, filters: any, sorter: any) => void;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearch?: (value: string) => void;
    hideGlobalSearch?: boolean;
    headerContent?: React.ReactNode;
    filters?: FilterConfig[]; // Updated type
    filterValues?: any;
    onFilterChange?: (key: string, value: any) => void;
    onClearFilters?: () => void;
    sortable?: boolean;
    defaultSort?: any;
    showActions?: boolean;
    actionsWidth?: number;
    customActions?: (record: any) => React.ReactNode;
    actionColumnProps?: any; // Allow overriding action column config
    actionPosition?: "left" | "right";
    batchOperations?: boolean;
    onBatchDelete?: (keys: any[]) => void;
    selectedRowKeys?: any[];
    onSelectChange?: (keys: any[]) => void;
    batchActions?: any[];
    importable?: boolean;
    importLoading?: boolean;
    exportable?: boolean;
    exportLoading?: boolean;
    onImport?: (file: File) => void;
    onDownloadTemplate?: () => void;
    onExport?: (options?: any) => void;
    title?: React.ReactNode;
    extra?: React.ReactNode;
    rowKey?: string;
    size?: "small" | "middle" | "large";
    bordered?: boolean;
    scroll?: any;
    emptyText?: string;
    rowSelection?: any;
    showAlert?: boolean;
    alertMessage?: string;
    alertType?: "success" | "info" | "warning" | "error";
    saveColumnWidths?: boolean;
    columnResizeKey?: string;
    onColumnResize?: (key: string, width: number) => void;
    [key: string]: any;
}
