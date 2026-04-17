import React, { useState } from "react";
import {
  Table,
  Space,
  Popconfirm,
  Tooltip,
  Badge,
  Menu,
  Dropdown,
  Alert,
  Modal,
  Input,
  Card,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, toast } from "@/components/common";
import { DataTableProps, FilterConfig } from "./types";
import { useDebounce } from "@/hooks";
import "./styles.less";
import ExportModal from "./ExportModal";
import ImportModal from "./ImportModal"; // New Import
import FilterBuilder from "./FilterBuilder";
import ResizableTitle from "./ResizableTitle";

const OPERATOR_TO_SUFFIX: Record<string, string> = {
  eq: "",
  ne: "_ne",
  gte: "_gte",
  lte: "_lte",
  like: "_like",
  in: "_in",
  ilike: "_like",
  gt: "_gte",
  lt: "_lte",
};

const FILTER_SUFFIXES = ["", "_ne", "_gte", "_lte", "_like", "_in"];

/**
 * DataTable Component
 * Enhanced table with lotus pink theme, centered headers, and filter modal
 */
const DataTable: React.FC<DataTableProps> = ({
  data = [],
  loading = false,
  columns = [],
  onAdd,
  onView,
  onEdit,
  onDelete,
  onRefresh,
  pagination = {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  onPaginationChange,
  searchable = true,
  searchPlaceholder = "Tìm kiếm...",
  searchValue = "",
  onSearch,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  sortable = true,
  showActions = true,
  actionsWidth, // Removed default here to calculate dynamically
  customActions,
  actionPosition = "right",
  batchOperations = false,
  onBatchDelete,
  selectedRowKeys: propSelectedRowKeys,
  onSelectChange,
  batchActions,
  importable = false,
  exportable = false,
  onImport,
  onValidateImport,
  onExport,
  title,
  extra,
  rowKey = "id",
  size = "middle",
  bordered = false,
  scroll,
  emptyText = "Không có dữ liệu",
  rowSelection: customRowSelection,
  showAlert = false,
  alertMessage,
  alertType = "info",
  actionColumnProps, // New Prop
  saveColumnWidths = false,
  columnResizeKey,
  onColumnResize,
  hideCard = false,
  ...tableProps
}) => {
  const [internalSearchText, setInternalSearchText] = useState(searchValue);
  const debouncedSearchTerm = useDebounce(internalSearchText, 500);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false); // New State
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const storageKey = columnResizeKey
    ? `datatable-widths:${columnResizeKey}`
    : undefined;
  const hasResizableColumn = columns.some((col: any) => col?.resizable === true);

  // Dynamic filters state - start EMPTY, user adds as needed
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [availableFilters] = useState(filters); // Keep all available filters

  const searchableColumnKeys = React.useMemo(() => {
    return new Set(
      columns
        .filter((col: any) => col?.searchable)
        .map((col: any) => String(col.key ?? col.dataIndex))
        .filter(Boolean),
    );
  }, [columns]);

  const [enabledFilters, setEnabledFilters] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      filters.forEach((f) => (initial[f.key] = true));
      return initial;
    },
  );

  React.useEffect(() => {
    if (!filterModalOpen) return;

    const hasFilterValue = (key: string) => {
      return FILTER_SUFFIXES.some((suffix) => {
        const value = filterValues?.[`${key}${suffix}`];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== "";
      });
    };

    const appliedFilters = availableFilters.filter((filter) => hasFilterValue(filter.key));
    if (appliedFilters.length > 0) {
      setActiveFilters((prev) => {
        const map = new Map(prev.map((item) => [item.key, item]));
        appliedFilters.forEach((item) => map.set(item.key, item));
        return Array.from(map.values());
      });
    }
  }, [filterModalOpen, availableFilters, filterValues]);

  React.useEffect(() => {
    if (!saveColumnWidths || !storageKey || !hasResizableColumn) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setColumnWidths(parsed);
      }
    } catch {
      // Ignore storage errors
    }
  }, [saveColumnWidths, storageKey]);

  React.useEffect(() => {
    if (!saveColumnWidths || !storageKey || !hasResizableColumn) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch {
      // Ignore storage errors
    }
  }, [columnWidths, saveColumnWidths, storageKey]);

  const getActiveFilterKey = (filterKey: string, op?: string) => {
    const filterConfig = filters.find((f) => f.key === filterKey);
    const defaultOp = filterConfig?.defaultOperator || "eq";
    const currentOp = op || operators[filterKey] || defaultOp;
    const suffix = OPERATOR_TO_SUFFIX[currentOp] ?? "";
    return `${filterKey}${suffix}`;
  };

  const handleOperatorChange = (filterKey: string, newOp: string) => {
    const filterConfig = filters.find((f) => f.key === filterKey);
    const defaultOp = filterConfig?.defaultOperator || "eq";
    const oldOp = operators[filterKey] || defaultOp;

    if (oldOp === newOp) return;

    setOperators((prev) => ({ ...prev, [filterKey]: newOp }));

    const oldKey = getActiveFilterKey(filterKey, oldOp);
    const newKey = getActiveFilterKey(filterKey, newOp);
    const currentValue = filterValues[oldKey];

    if (
      currentValue !== undefined &&
      currentValue !== null &&
      currentValue !== ""
    ) {
      handleFilterChange(newKey, currentValue);
      handleFilterChange(oldKey, undefined);
    }
  };

  const handleFilterValueChange = (filterKey: string, value: any) => {
    const activeKey = getActiveFilterKey(filterKey);
    handleFilterChange(activeKey, value);
  };

  const toggleFilterEnabled = (key: string) => {
    setEnabledFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addFilterCondition = (filterKey: string) => {
    const filterToAdd = availableFilters.find((f) => f.key === filterKey);
    if (filterToAdd && !activeFilters.find((f) => f.key === filterKey)) {
      setActiveFilters((prev) => [...prev, filterToAdd]);
      setEnabledFilters((prev) => ({ ...prev, [filterKey]: true }));
    }
  };

  const removeFilterCondition = (filterKey: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.key !== filterKey));
    FILTER_SUFFIXES.forEach((suffix) => {
      handleFilterChange(`${filterKey}${suffix}`, undefined);
    });

    // Remove from enabled filters
    setEnabledFilters((prev) => {
      const newEnabled = { ...prev };
      delete newEnabled[filterKey];
      return newEnabled;
    });
  };

  // Effect to trigger search when debounced value changes
  React.useEffect(() => {
    if (onSearch && debouncedSearchTerm !== searchValue) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const handleSearch = (value: string) => {
    setInternalSearchText(value);
  };

  const handleFilterChange = (key: string, value: any) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    }
  };

  const handleResize = (key: string) => (_: React.SyntheticEvent, data: any) => {
    const nextWidth = data?.size?.width;
    if (typeof nextWidth !== "number") return;

    setColumnWidths((prev) => ({ ...prev, [key]: nextWidth }));
    if (onColumnResize) onColumnResize(key, nextWidth);
  };

  // NEW: Handle double-click to reset column width
  const handleResetColumnWidth = (e: React.MouseEvent, key: string, defaultWidth?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (defaultWidth) {
      setColumnWidths((prev) => ({ ...prev, [key]: defaultWidth }));
      if (onColumnResize) onColumnResize(key, defaultWidth);
    }
  };

  const ColumnSearch = ({
    setSelectedKeys,
    selectedKeys,
    confirm,
    label: _label,
  }: any) => {
    const [value, setValue] = useState(selectedKeys[0] || "");

    // Sync value if props change
    React.useEffect(() => {
        setValue(selectedKeys[0] || "");
    }, [selectedKeys]);

    // Handle input change: update local value only
    const onChange = (e: any) => {
      const val = e.target.value;
      setValue(val);
    };

    const onSearch = (val: string) => {
        setValue(val); 
        // Ensure we search with the current value
        const keys = val ? [val] : [];
        setSelectedKeys(keys);
        confirm();
    };

    return (
      <div
        className="filter-dropdown-container"
        style={{
          padding: 8,
          width: 250, 
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input.Search
          placeholder={`Tìm ${(_label || "").toLowerCase()}...`}
          value={value}
          onChange={onChange}
          onSearch={onSearch}
          enterButton /* Standard Ant Design Button */
          allowClear
          className="filter-search-input-compact"
        />
        <div style={{ marginTop: 8, fontSize: 13, color: "#595959", textAlign: 'right' }}>
           <a
            onClick={() => {
              confirm(); 
              setFilterModalOpen(true);
            }}
            style={{ fontWeight: 500 }}
          >
            Xem thêm bộ lọc khác
          </a>
        </div>
      </div>
    );
  };

  const getColumnSearchProps = (_dataIndex: string, label: string) => ({
    filterDropdown: (props: any) => <ColumnSearch {...props} label={label} />,
    filterIcon: (filtered: boolean) => (
      <SearchOutlined 
        className={filtered ? "active-filter-icon" : ""}
        style={{ color: filtered ? "var(--primary-color)" : undefined }} 
      />
    ),
    onFilter: (_value: any, _record: any) => {
      // Return true to disable client-side filtering and rely on server-side
      return true;
    },
  });

  const normalizeTableFilters = (tableFilters: Record<string, any> = {}) => {
    const normalized: Record<string, any> = {};

    Object.entries(tableFilters).forEach(([key, value]) => {
      if (searchableColumnKeys.has(key)) {
        const keyword = Array.isArray(value) ? value[0] : value;
        normalized[`${key}_like`] = keyword;
        return;
      }

      normalized[key] = value;
    });

    return normalized;
  };

  const handleServerTableChange = (
    newPagination: any,
    newFilters: Record<string, any>,
    newSorter: any,
  ) => {
    if (!onPaginationChange) return;
    onPaginationChange(newPagination, normalizeTableFilters(newFilters), newSorter);
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
    // Re-enable all filters when clearing
    const allEnabled: Record<string, boolean> = {};
    filters.forEach((f) => (allEnabled[f.key] = true));
    setEnabledFilters(allEnabled);
    setFilterModalOpen(false);
  };

  const handleApplyCustomFilters = () => {
    activeFilters.forEach((filter) => {
      if (enabledFilters[filter.key] !== false) return;
      FILTER_SUFFIXES.forEach((suffix) => {
        handleFilterChange(`${filter.key}${suffix}`, undefined);
      });
    });

    setFilterModalOpen(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Resolve selectedRowKeys from direct prop or rowSelection object
  const activeSelectedRowKeys =
    propSelectedRowKeys || customRowSelection?.selectedRowKeys || [];

  const rowSelection = (batchOperations || propSelectedRowKeys || onSelectChange)
    ? customRowSelection || {
        selectedRowKeys: activeSelectedRowKeys,
        onChange: onSelectChange,
        selections: batchOperations ? [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
          Table.SELECTION_NONE,
        ] : undefined,
        getCheckboxProps: (record: any) => ({
          disabled: record.disabled,
        }),
      }
    : undefined;

  // Handle columns: check if "actions" column is defined in props.columns
  const userActionColumnIndex = columns.findIndex(
    (col) => col.key === "actions",
  );
  const userActionColumn =
    userActionColumnIndex !== -1 ? columns[userActionColumnIndex] : null;

  // Dynamic Action Column Logic
  const standardActionCount =
    (onView ? 1 : 0) + (onEdit ? 1 : 0) + (onDelete ? 1 : 0);
  // Base width per button (32px + 8px gap) + padding (16px)
  // If customActions exists, we add extra space or default to a safe width if not specified
  const calculatedWidth =
    actionsWidth || standardActionCount * 40 + (customActions ? 40 : 16);

  const mergedActionsColumn =
    showActions || userActionColumn
      ? {
          title: "Thao tác",
          key: "actions",
          className: "data-table-actions-column", 
          width: calculatedWidth,
          fixed: actionPosition,
          align: "center" as const,
          // Merge user properties if defined
          ...userActionColumn,
          ...actionColumnProps, // Keep this for backward compat or explicit override
          render: (_: any, record: any, index: number) => {
            if (userActionColumn && userActionColumn.render) {
              return userActionColumn.render(_, record, index);
            }

            return (
              <Space size={4} className="action-buttons-container">
                {onView && (
                  <Tooltip title="Xem chi tiết">
                    <Button
                      variant="ghost"
                      buttonSize="small"
                      onClick={() => onView(record)}
                      className="action-btn-standard"
                      style={{ color: "var(--primary-color)" }}
                    >
                      <EyeOutlined />
                    </Button>
                  </Tooltip>
                )}

                {onEdit && (
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      variant="ghost"
                      buttonSize="small"
                      onClick={() => onEdit(record)}
                      className="action-btn-standard action-btn-edit"
                      style={{ color: "var(--primary-color)" }}
                    >
                      <EditOutlined />
                    </Button>
                  </Tooltip>
                )}

                {onDelete && (
                  <Popconfirm
                    title="Xác nhận xóa?"
                    description="Bạn có chắc chắn muốn xóa mục này?"
                    onConfirm={() => onDelete(record[rowKey])}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    icon={
                      <ExclamationCircleOutlined style={{ color: "#EF4444" }} />
                    }
                  >
                    <Tooltip title="Xóa">
                      <Button
                        variant="ghost"
                        buttonSize="small"
                        className="action-btn-standard action-btn-delete"
                        style={{ color: "#ff4d4f" }}
                      >
                        <DeleteOutlined />
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                )}

                {customActions && customActions(record)}
              </Space>
            );
          },
        }
      : null;

  const finalColumns = [
    // If action position is left and no user defined action column (or user position was not specified, handled by splicing?)
    // Actually, if user defined it in columns, let's keep its position!
    ...(actionPosition === "left" && !userActionColumn
      ? [mergedActionsColumn]
      : []),

    ...columns.map((col) => {
      // If this is the action column, return the merged one
      if (col.key === "actions") return mergedActionsColumn;
      
      const colKey = String(col.key || col.dataIndex);
      const isSearchable = col.searchable;
      const searchFilterKey = `${colKey}_like`;
      const controlledVal = isSearchable
        ? filterValues?.[searchFilterKey] ?? filterValues?.[colKey]
        : filterValues?.[colKey];
      return {
        ...col,
        align: col.align || ("center" as const),
        sorter: sortable && col.sortable !== false,
        // Make column controlled if filterValues are provided
        ...(controlledVal !== undefined
          ? {
              filteredValue: Array.isArray(controlledVal)
                ? controlledVal
                : [controlledVal],
            }
          : { filteredValue: null }),
          
        ...(isSearchable && col.dataIndex
          ? getColumnSearchProps(String(col.dataIndex), col.title as string)
          : {}),
      };
    }),

    // Append at end if right and not defined in columns
    ...(actionPosition === "right" && !userActionColumn && mergedActionsColumn
      ? [mergedActionsColumn]
      : []),
  ];

  const tableColumns = finalColumns
    .filter(Boolean)
    .map((col: any, index: number) => {
      if (!hasResizableColumn) return col;

      const colKey = String(col.key ?? col.dataIndex ?? index);
      const savedWidth = columnWidths[colKey];
      const width =
        typeof savedWidth === "number"
          ? savedWidth
          : typeof col.width === "number"
          ? col.width
          : undefined;
      
      // NEW: Calculate default min/max if not provided
      const defaultMinWidth = col.minWidth || (width ? Math.round(width * 0.8) : 80);
      const defaultMaxWidth = col.maxWidth || (width ? Math.round(width * 1.2) : 160);
      
      const isResizable =
        col.key !== "actions" && col.resizable === true && typeof width === "number";

      if (!isResizable) {
        return width ? { ...col, width } : col;
      }

      const onHeaderCell = (column: any) => ({
        ...(typeof col.onHeaderCell === "function" ? col.onHeaderCell(column) : {}),
        width,
        minWidth: defaultMinWidth,
        maxWidth: defaultMaxWidth,
        onResize: handleResize(colKey),
        onDoubleClick: (e: React.MouseEvent) => handleResetColumnWidth(e, colKey, col.width), // FIX: Pass event
      });

      return {
        ...col,
        width,
        onHeaderCell,
      };
    });

  const batchActionsMenu = (
    <Menu>
      {onBatchDelete && (
        <Menu.Item
          key="delete"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            if (activeSelectedRowKeys.length === 0) {
              toast.warning("Vui lòng chọn ít nhất 1 mục");
              return;
            }
            Modal.confirm({
              title: "Xác nhận xóa hàng loạt?",
              content: `Bạn có chắc chắn muốn xóa ${activeSelectedRowKeys.length} mục đã chọn ? `,
              okText: "Xóa",
              cancelText: "Hủy",
              okButtonProps: { danger: true },
              onOk: () => onBatchDelete(activeSelectedRowKeys),
            });
          }}
        >
          Xóa đã chọn ({activeSelectedRowKeys.length})
        </Menu.Item>
      )}
      {batchActions &&
        batchActions.map((action) => (
          <Menu.Item
            key={action.key}
            icon={action.icon}
            onClick={() => action.onClick(activeSelectedRowKeys)}
            danger={action.danger}
          >
            {action.label}
          </Menu.Item>
        ))}
    </Menu>
  );


  const hasActiveFilters =
    filters &&
    filters.length > 0 &&
    Object.keys(filterValues).some((key) => filterValues[key]);

  const renderContent = () => (
    <>
      {tableProps.headerContent && <div className="data-table-header-content" style={{ margin: hideCard ? 0 : undefined }} >{tableProps.headerContent}</div>}
      <div className="data-table-toolbar" style={{ marginTop: tableProps.headerContent ? 0 : undefined }}>
        <Space wrap>
          {onAdd && (
            <Button variant="primary" onClick={onAdd} buttonSize="small">
              <PlusOutlined /> Thêm Mới
            </Button>
          )}
          {importable && onImport && (
            <Tooltip title="Nhập dữ liệu từ Excel">
              <Button 
                variant="outline" 
                onClick={() => setImportModalOpen(true)} 
                loading={tableProps.importLoading} 
                buttonSize="small"
                icon={<UploadOutlined />}
              >
                Import
              </Button>
            </Tooltip>
          )}
          {exportable && onExport && (
            <Tooltip title="Export dữ liệu">
              <Button 
                variant="outline" 
                onClick={() => setExportModalOpen(true)} 
                loading={tableProps.exportLoading} 
                buttonSize="small"
                icon={<DownloadOutlined />}
              >
                Export
              </Button>
            </Tooltip>
          )}
          {batchOperations && activeSelectedRowKeys.length > 0 && (
            <Badge count={activeSelectedRowKeys.length} className="batch-op-badge">
              <Dropdown overlay={batchActionsMenu} trigger={["click"]}>
                <Button variant="outline" buttonSize="small">
                  Thao tác hàng loạt <span style={{ fontSize: 10, marginLeft: 4 }}>▼</span>
                </Button>
              </Dropdown>
            </Badge>
          )}
          {extra}
        </Space>
        <Space wrap align="center" className="right-tools">
          {searchable && !tableProps.hideGlobalSearch && (
            <Input
              placeholder={searchPlaceholder}
              value={internalSearchText}
              onChange={(e) => {
                const val = e.target.value;
                handleSearch(val);
                if (!val && onSearch) onSearch("");
              }}
              style={{ width: 220, height: 32 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            />
          )}
          {filters && filters.length > 0 && (
            <Badge dot={hasActiveFilters}>
              <Button variant="outline" onClick={() => setFilterModalOpen(true)} icon={<FilterOutlined />} buttonSize="small">Bộ lọc</Button>
            </Badge>
          )}
          {onRefresh && (
            <Tooltip title="Làm mới">
              <Button variant="outline" onClick={onRefresh} loading={loading} icon={<ReloadOutlined />} buttonSize="small">Làm mới</Button>
            </Tooltip>
          )}
          <div className="total-count-badge">Tổng số: <span>{(pagination && typeof pagination !== 'boolean' && pagination.total) || 0}</span></div>
        </Space>
      </div>
      {showAlert && alertMessage && <Alert message={alertMessage} type={alertType} showIcon closable className="data-table-alert" />}
      <Table
        className="main-table"
        rowKey={rowKey}
        columns={tableColumns}
        components={hasResizableColumn ? { header: { cell: ResizableTitle } } : undefined}
        dataSource={data}
        loading={loading}
        size={size}
        bordered={bordered}
        rowSelection={rowSelection}
        pagination={pagination ? { ...pagination, showSizeChanger: true, showQuickJumper: true, showTotal: (total: number) => `Tổng ${total} mục`, pageSizeOptions: ["10", "20", "50", "100"] } as any : false}
        onChange={handleServerTableChange}
        scroll={scroll || { x: "max-content" }}
        locale={{ emptyText }}
        {...tableProps}
      />
      <Modal open={filterModalOpen} onCancel={() => setFilterModalOpen(false)} title="Bộ lọc tùy chỉnh" width={700} footer={null} styles={{ body: { padding: 0 } }}>
        <FilterBuilder filters={availableFilters} activeFilters={activeFilters} filterValues={filterValues} operators={operators} enabledFilters={enabledFilters} onAddFilter={addFilterCondition} onRemoveFilter={removeFilterCondition} onFilterChange={handleFilterValueChange} onOperatorChange={handleOperatorChange} onToggleFilter={toggleFilterEnabled} onApply={handleApplyCustomFilters} onClear={handleClearFilters} onCancel={() => setFilterModalOpen(false)} />
      </Modal>
    </>
  );

  return (
    <div className="data-table-wrapper">
      {/* Separate Title */}
      {title && (
        <div className="data-table-title">
          {typeof title === "string" ? <h2>{title}</h2> : title}
        </div>
      )}

      {hideCard ? (
        <div className="data-table-no-card">{renderContent()}</div>
      ) : (
        <Card bodyStyle={{ borderRadius: 12, padding: 0 }} hoverable={false}>
          {renderContent()}
        </Card>
      )}

      {/* Advanced Export Modal */}
      <ExportModal 
          visible={exportModalOpen}
          onCancel={() => setExportModalOpen(false)}
          onOk={(options) => {
              if (onExport) {
                  onExport(options);
                  setExportModalOpen(false);
              }
          }}
          loading={tableProps.exportLoading}
          totalRecords={pagination && typeof pagination !== 'boolean' ? pagination.total : 0}
          currentPageSize={pagination && typeof pagination !== 'boolean' ? pagination.pageSize : 10}
          filters={filters}
          currentFilters={filterValues}
          columns={columns as any}
      />

      {/* Advanced Import Modal */}
      <ImportModal
          visible={importModalOpen}
          onCancel={() => setImportModalOpen(false)}
          onImport={(file) => {
              if (onImport) {
                  onImport(file);
                  setImportModalOpen(false);
              }
          }}
          onDownloadTemplate={(selectedCols) => {
              if (tableProps.onDownloadTemplate) {
                  // Explicitly cast or handle columns if needed
                  (tableProps as any).onDownloadTemplate({ columns: selectedCols?.join(',') });
              }
          }}
          onValidate={onValidateImport as any}
          loading={tableProps.importLoading}
          columns={columns as any}
          entityName={typeof title === 'string' ? title : "dữ liệu"}
      />
    </div>
  );
};

export default DataTable;
