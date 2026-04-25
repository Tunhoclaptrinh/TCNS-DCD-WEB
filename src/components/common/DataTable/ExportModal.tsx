import React, { useState, useEffect } from "react";
import { Modal, Radio, InputNumber, Space, Typography, Divider, Checkbox, Tooltip } from "antd";
import { DownloadOutlined, FilterOutlined, OrderedListOutlined } from "@ant-design/icons";
import { Button } from "@/components/common";
import { FilterConfig } from "./types";
import FilterBuilder from "./FilterBuilder";

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (options: ExportOptions) => void;
  loading?: boolean;
  totalRecords?: number;
  currentPageSize?: number;
  filters?: FilterConfig[];
  currentFilters?: Record<string, any>; // Initial filter values from table
  columns?: Array<{ title: any; key: string; hidden?: boolean }>;
}

export interface ExportOptions {
  scope: "page" | "all" | "custom";
  limit?: number;
  format: "xlsx" | "csv";
  filters?: Record<string, any>; // Ad-hoc filters
  columns?: string[];
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  onOk,
  loading = false,
  totalRecords = 0,
  currentPageSize = 10,
  filters = [],
  currentFilters = {},
  columns = []
}) => {
  const [scope, setScope] = useState<"page" | "all" | "custom">("page");
  const [limit, setLimit] = useState<number>(100);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Local Filter State
  const [localFilterValues, setLocalFilterValues] = useState<Record<string, any>>({});
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [enabledFilters, setEnabledFilters] = useState<Record<string, boolean>>({});

  // Initialize local filters with current table filters when modal opens
  useEffect(() => {
    if (visible) {
        setLocalFilterValues({ ...currentFilters });
        // Infer active filters from values
        const active: FilterConfig[] = [];
        filters.forEach(f => {
             if (Object.keys(currentFilters).some(k => k.startsWith(f.key))) {
                active.push(f);
                setEnabledFilters(prev => ({ ...prev, [f.key]: true }));
             }
        });
        setActiveFilters(active);

        // Initialize columns (filter out internal columns like 'actions')
        const initialCols = columns
          .filter(c => c.key && c.key !== 'actions' && c.key !== 'selection')
          .map(c => c.key);
        setSelectedColumns(initialCols);
    }
  }, [visible, currentFilters, filters, columns]);


  const handleOk = () => {
    onOk({
      scope,
      limit: scope === "custom" ? limit : undefined,
      format,
      filters: localFilterValues,
      columns: selectedColumns
    });
  };

  const getActiveFilterKey = (filterKey: string, op?: string) => {
    const filterConfig = filters.find(f => f.key === filterKey);
    const defaultOp = filterConfig?.defaultOperator || 'eq';
    const currentOp = op || operators[filterKey] || defaultOp;
    return currentOp === "eq" ? filterKey : `${filterKey}_${currentOp}`;
  };

  const handleOperatorChange = (filterKey: string, newOp: string) => {
      const filterConfig = filters.find(f => f.key === filterKey);
      const defaultOp = filterConfig?.defaultOperator || 'eq';
      const oldOp = operators[filterKey] || defaultOp;
      
      if (oldOp === newOp) return;
  
      setOperators((prev) => ({ ...prev, [filterKey]: newOp }));
  
      const oldKey = getActiveFilterKey(filterKey, oldOp);
      const newKey = getActiveFilterKey(filterKey, newOp);
      const currentValue = localFilterValues[oldKey];
  
      if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
         setLocalFilterValues(prev => {
             const next = { ...prev };
             next[newKey] = currentValue;
             delete next[oldKey];
             return next;
         })
      }
    };

    const handleFilterValueChange = (filterKey: string, value: any) => {
      const activeKey = getActiveFilterKey(filterKey);
      setLocalFilterValues(prev => ({ ...prev, [activeKey]: value }))
    };

    const addFilterCondition = (filterKey: string) => {
      const filterToAdd = filters.find((f) => f.key === filterKey);
      if (filterToAdd && !activeFilters.find((f) => f.key === filterKey)) {
        setActiveFilters((prev) => [...prev, filterToAdd]);
        setEnabledFilters((prev) => ({ ...prev, [filterKey]: true }));
      }
    };
  
    const removeFilterCondition = (filterKey: string) => {
      setActiveFilters((prev) => prev.filter((f) => f.key !== filterKey));
       
       const activeKey = getActiveFilterKey(filterKey);

       setLocalFilterValues((prev) => {
          const next = { ...prev };
          delete next[activeKey];
          return next;
       });
      setEnabledFilters((prev) => {
        const newEnabled = { ...prev };
        delete newEnabled[filterKey];
        return newEnabled;
      });
    };

    const toggleFilterEnabled = (key: string) => {
        setEnabledFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined style={{ color: 'var(--primary-color)' }} />
          <span>Tùy chọn xuất dữ liệu</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={720}
      className="export-modal"
      centered
    >
      <div style={{ padding: '8px 0' }}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
              {/* Left Column: Scope & Format */}
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <section>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                        1. Phạm vi dữ liệu
                    </Typography.Text>
                    <Radio.Group
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                        <Radio value="page">Trang hiện tại <span style={{ color: '#8c8c8c', fontSize: 12 }}>({currentPageSize} dòng)</span></Radio>
                        <Radio value="all">Tất cả kết quả <span style={{ color: '#8c8c8c', fontSize: 12 }}>({totalRecords} dòng)</span></Radio>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Radio value="custom">Tùy chỉnh số dòng:</Radio>
                          {scope === "custom" && (
                              <InputNumber
                                min={1}
                                max={10000}
                                value={limit}
                                onChange={(val) => setLimit(val || 100)}
                                size="small"
                                style={{ width: 80, marginLeft: 4 }}
                              />
                          )}
                        </div>
                    </Radio.Group>
                  </section>

                  <Divider style={{ margin: '12px 0' }} />

                  <section>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                        2. Định dạng tập tin
                    </Typography.Text>
                    <Radio.Group 
                          value={format} 
                          onChange={(e) => setFormat(e.target.value)}
                          style={{ display: 'flex', flexDirection: 'row', gap: 24 }}
                    >
                         <Radio value="xlsx">Excel (.xlsx)</Radio>
                         <Radio value="csv">CSV (.csv)</Radio>
                    </Radio.Group>
                  </section>
              </Space>

              {/* Right Column: Column Selection */}
              <section style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Typography.Text strong>3. Chọn cột hiển thị</Typography.Text>
                    <OrderedListOutlined style={{ color: '#bfbfbf' }} />
                  </div>
                  <div style={{ 
                      maxHeight: 220, 
                      overflowY: 'auto', 
                      background: '#fafafa', 
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                  }}>
                    <Checkbox.Group 
                      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
                      value={selectedColumns}
                      onChange={(vals) => setSelectedColumns(vals as string[])}
                    >
                      {columns
                        .filter(c => c.key && c.key !== 'actions' && c.key !== 'selection')
                        .map(col => (
                          <Checkbox key={col.key} value={col.key}>
                            {typeof col.title === 'string' ? col.title : col.key}
                          </Checkbox>
                        ))
                      }
                    </Checkbox.Group>
                  </div>
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Typography.Link onClick={() => setSelectedColumns(columns.map(c => c.key))}>Chọn tất cả</Typography.Link>
                  </div>
              </section>
          </div>

          {/* Advanced Filter Section */}
          {filters.length > 0 && (
            <div style={{ marginTop: 8 }}>
                <div 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        marginBottom: showFilters ? 16 : 0,
                        padding: '8px 12px',
                        background: '#f5f5f5',
                        borderRadius: 6,
                        transition: 'all 0.3s'
                    }}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FilterOutlined style={{ marginRight: 8, color: showFilters ? 'var(--primary-color)' : 'inherit' }} />
                    <span style={{ fontWeight: 500, color: showFilters ? 'var(--primary-color)' : 'inherit' }}>
                        Lọc dữ liệu xuất (Tự chọn)
                    </span>
                    <Tooltip title="Cho phép lọc dữ liệu độc lập với bảng hiện tại">
                        <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            [Advanced]
                        </Typography.Text>
                    </Tooltip>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
                        {showFilters ? 'Ẩn bộ lọc' : 'Mở rộng'}
                    </span>
                </div>
                
                {showFilters && (
                     <div style={{ 
                         background: '#fafafa', 
                         borderRadius: 8, 
                         border: '1px solid #f0f0f0',
                         marginTop: 12,
                         padding: 8
                     }}>
                        <FilterBuilder 
                            filters={filters}
                            activeFilters={activeFilters}
                            filterValues={localFilterValues}
                            operators={operators}
                            enabledFilters={enabledFilters}
                            onAddFilter={addFilterCondition}
                            onRemoveFilter={removeFilterCondition}
                            onFilterChange={handleFilterValueChange}
                            onOperatorChange={handleOperatorChange}
                            onToggleFilter={toggleFilterEnabled}
                            onCancel={() => setShowFilters(false)}
                            hideFooter={true} 
                        />
                     </div>
                )}
            </div>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="outline" onClick={onCancel}>
              Hủy bỏ
          </Button>
          <Button 
            variant="primary" 
            onClick={handleOk} 
            loading={loading}
            icon={<DownloadOutlined />}
            disabled={selectedColumns.length === 0}
          >
            Bắt đầu xuất file
          </Button>
      </div>
    </Modal>
  );
};

export default ExportModal;
