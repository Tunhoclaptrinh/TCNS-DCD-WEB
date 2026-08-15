import React from "react";
import { Select, Input, Checkbox, Dropdown, Tooltip, DatePicker } from "antd";
import dayjs from "dayjs";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "@/components/common";
import { FilterConfig } from "./types";

const BACKEND_OPERATOR_OPTIONS = [
  { label: "Bằng", value: "eq" },
  { label: "Khác", value: "ne" },
  { label: "Lớn hơn hoặc bằng", value: "gte" },
  { label: "Nhỏ hơn hoặc bằng", value: "lte" },
  { label: "Chứa", value: "like" },
  { label: "Không chứa", value: "not_like" },
  { label: "Trong", value: "in" },
  { label: "Không trong", value: "nin" },
];

const normalizeOperator = (operator?: string) => {
  if (!operator) return "eq";
  if (operator === "gt") return "gte";
  if (operator === "lt") return "lte";
  if (operator === "ilike") return "like";
  return operator;
};

interface FilterBuilderProps {
  filters: FilterConfig[]; // All available filters
  activeFilters: FilterConfig[]; // Currently added filter rows
  filterValues: Record<string, any>; // Values for all filters
  operators: Record<string, string>; // Operators for all filters
  enabledFilters: Record<string, boolean>; // Checked state
  onAddFilter: (key: string) => void;
  onRemoveFilter: (key: string) => void;
  onFilterChange: (key: string, value: any) => void;
  onOperatorChange: (key: string, op: string) => void;
  onToggleFilter: (key: string) => void;
  onApply?: () => void;
  onClear?: () => void;
  onCancel?: () => void;
  applyText?: string;
  hideFooter?: boolean; // New prop to hide footer in modal
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filters,
  activeFilters,
  filterValues,
  operators,
  enabledFilters,
  onAddFilter,
  onRemoveFilter,
  onFilterChange,
  onOperatorChange,
  onToggleFilter,
  onApply,
  onClear,
  onCancel,
  applyText = "Áp dụng",
  hideFooter = false
}) => {
  return (
    <div className="filter-builder-container">
      <div className="active-filters-section">
        {!hideFooter && <div className="section-title">Các điều kiện lọc đang được áp dụng:</div>}

        {activeFilters.length === 0 ? (
          <div className="empty-filter-state">
            <p style={{ color: '#8c8c8c' }}>
              Chưa có điều kiện lọc nào. Nhấn nút bên dưới để thêm.
            </p>
          </div>
        ) : (
          <div className="filter-conditions-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeFilters.map((filter) => {
              const label = filter.label || filter.placeholder;
              let currentOpRaw = operators[filter.key];
              if (!currentOpRaw) {
                  const operatorSuffixToOp: Record<string, string> = {
                      "": "eq", "_ne": "ne", "_gte": "gte", "_lte": "lte",
                      "_like": "like", "_in": "in", "_ilike": "ilike", "_nin": "nin"
                  };
                  for (const [suffix, op] of Object.entries(operatorSuffixToOp)) {
                      const val = filterValues[`${filter.key}${suffix}`];
                      if (Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null && val !== "") {
                          currentOpRaw = op;
                          break;
                      }
                  }
              }
              const currentOp = normalizeOperator(
                currentOpRaw || filter.defaultOperator || "eq",
              );
              const operatorSuffix: Record<string, string> = {
                eq: "",
                ne: "_ne",
                gte: "_gte",
                lte: "_lte",
                like: "_like",
                not_like: "_not_like",
                in: "_in",
                nin: "_nin",
              };
              const activeKey = `${filter.key}${operatorSuffix[currentOp] || ""}`;
              const isEnabled = enabledFilters[filter.key] !== false;
              const allowedOperators = (filter.operators?.length
                ? Array.from(new Set(filter.operators.map((op) => normalizeOperator(String(op)))))
                : ["eq", "like"]
              ) as string[];

              return (
                <div
                  key={filter.key}
                  className={`filter-condition-item ${
                    !isEnabled ? "disabled" : ""
                  }`}
                  style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      background: '#f9f9f9', 
                      padding: '8px 12px', 
                      borderRadius: 8,
                  }}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isEnabled}
                    disabled={filter.disabled}
                    onChange={() => !filter.disabled && onToggleFilter(filter.key)}
                  />

                  {/* Field Name (Static) */}
                  <div style={{ width: 180, fontWeight: 500 }}>
                     {label}
                  </div>

                  {filter.operators && (
                    <Select
                      value={currentOp}
                      disabled={filter.disabled}
                      onChange={(val) => onOperatorChange(filter.key, val)}
                      options={BACKEND_OPERATOR_OPTIONS.filter((op) =>
                        allowedOperators.includes(op.value)
                      )}
                      style={{ width: 140 }}
                      size="middle"
                    />
                  )}

                  {/* Value Input */}
                  <div style={{ flex: 1 }}>
                    {(!filter.type || filter.type === "select") && (
                      <Select
                        placeholder={`Chọn giá trị...`}
                        value={filterValues[activeKey]}
                        disabled={filter.disabled}
                        onChange={(value) =>
                          !filter.disabled && onFilterChange(filter.key, value)
                        }
                        options={filter.options}
                        allowClear={!filter.disabled}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        mode={currentOp === "in" || currentOp === "nin" ? "multiple" : undefined}
                        style={{ width: "100%" }}
                        size="middle"
                      />
                    )}

                    {(filter.type === "input" ||
                      filter.type === "number") && (
                      <Input
                        placeholder={`Nhập giá trị...`}
                        value={filterValues[activeKey]}
                        disabled={filter.disabled}
                        onChange={(e) =>
                          !filter.disabled && onFilterChange(filter.key, e.target.value)
                        }
                        allowClear={!filter.disabled}
                        style={{ width: "100%" }}
                        type={filter.type === "number" ? "number" : "text"}
                        size="middle"
                      />
                    )}

                    {filter.type === "date" && (
                        <DatePicker
                            placeholder="Chọn ngày"
                            disabled={filter.disabled}
                            style={{ width: "100%" }}
                            value={filterValues[activeKey] ? dayjs(filterValues[activeKey]) : null}
                            onChange={(_date, dateString) => {
                                !filter.disabled && onFilterChange(filter.key, dateString);
                            }}
                            size="middle"
                        />
                    )}
                  </div>

                  {/* Delete Button */}
                  <Tooltip title={filter.disabled ? "Điều kiện mặc định cố định - Không thể xóa" : "Xóa điều kiện này"}>
                    <Button
                        variant="ghost" 
                        danger 
                        disabled={filter.disabled}
                        onClick={() => !filter.disabled && onRemoveFilter(filter.key)}
                        icon={<DeleteOutlined />}
                        buttonSize="small"
                        className="condition-delete-btn"
                    />
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Condition Button */}
        <div className="filter-actions" style={{ marginTop: 16 }}>
          <Dropdown
            menu={{
              items: filters
                .filter((f) => !activeFilters.find((af) => af.key === f.key))
                .map((f) => ({
                  key: f.key,
                  label: f.label || f.placeholder,
                  onClick: () => onAddFilter(f.key),
                })),
              style: { maxHeight: 300, overflowY: 'auto' }
            }}
            disabled={filters.length === activeFilters.length}
            trigger={['click']}
          >
            <Button
              variant="outline"
              buttonSize="small"
              style={{ width: "100%", borderStyle: 'dashed' }}
              icon={<PlusOutlined />}
            >
              Thêm điều kiện lọc
            </Button>
          </Dropdown>
        </div>
      </div>

      {!hideFooter && (
        <div className="filter-builder-footer" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Button variant="outline" buttonSize="small" onClick={onCancel} style={{ minWidth: 96 }}>
            Hủy
            </Button>
            <Button variant="outline" buttonSize="small" onClick={onClear} style={{ minWidth: 96 }}>
            Bỏ lọc
            </Button>
            <Button variant="primary" buttonSize="small" onClick={onApply} style={{ minWidth: 96 }}>
            {applyText}
            </Button>
        </div>
      )}
    </div>
  );
};

export default FilterBuilder;
