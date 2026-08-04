import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Modal,
  Steps,
  Space,
  Typography,
  Checkbox,
  Divider,
  Upload,
  Alert,
  message,
  Table,
  Tag,
  Switch,
  Tooltip,
  Popover,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { Button } from "@/components/common";

const { Dragger } = Upload;

const PRIMARY = "#8b1d1d";

import { formatColumnTitle, formatColumnValue } from "@/constants/import-export.constants";

export interface GenericColumnType {
  title: any;
  key?: string;
  dataIndex?: any;
  label?: string;
  required?: boolean;
  hidden?: boolean;
  importHidden?: boolean;
  exportHidden?: boolean;
  valueMap?: Record<string, string>;
  render?: (value: any, record: any) => React.ReactNode;
}

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate: (columns?: string[], withMockData?: boolean) => void;
  onValidate: (file: File) => Promise<any>;
  loading?: boolean;
  columns?: GenericColumnType[];
  entityName?: string;
  fieldLabelMap?: Record<string, string>; // Custom label dictionary override for specific entities
  customValueMap?: Record<string, string>; // Custom value dictionary for reverse mapping
  extraInfoNotice?: React.ReactNode; // Optional custom notice banner for specific entities
  allowRowReorder?: boolean; // Enable/disable drag & drop row reordering in preview table (default: true)
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onCancel,
  onImport,
  onDownloadTemplate,
  onValidate,
  loading = false,
  columns = [],
  entityName = "dữ liệu",
  fieldLabelMap = {},
  customValueMap = {},
  extraInfoNotice,
  allowRowReorder = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [withMockData, setWithMockData] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [tablePageSize, setTablePageSize] = useState<number>(10);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  const handleRowDrop = (dropIndex: number) => {
    if (draggedRowIndex === null || draggedRowIndex === dropIndex || !validationReport?.results) return;
    const updated = [...validationReport.results];
    const [movedRow] = updated.splice(draggedRowIndex, 1);
    updated.splice(dropIndex, 0, movedRow);
    setValidationReport({
      ...validationReport,
      results: updated,
    });
    setDraggedRowIndex(null);
  };

  // Download error report CSV file containing all invalid rows and exact error details
  const handleDownloadErrorReport = () => {
    if (!validationReport?.results) return;
    const invalidRows = validationReport.results.filter((r: any) => r.status === "invalid");
    if (!invalidRows.length) return;

    const headers = ["Dòng", ...dataKeys.map((k) => getColumnTitle(k)), "Chi tiết lỗi"];
    const rows = invalidRows.map((r: any) => {
      const dataCells = dataKeys.map((k) => {
        const val = r.data?.[k];
        return val !== undefined && val !== null ? `"${String(val).replace(/"/g, '""')}"` : '""';
      });
      const errorMsg = `"${(r.errors || []).join("; ").replace(/"/g, '""')}"`;
      return [r.row, ...dataCells, errorMsg].join(",");
    });

    const csvContent = "\uFEFF" + [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_cao_loi_import_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract technical key from column object
  const getColKey = (c: any): string => {
    if (c.key) return c.key;
    if (typeof c.dataIndex === "string") return c.dataIndex;
    if (Array.isArray(c.dataIndex) && typeof c.dataIndex[0] === "string") return c.dataIndex[0];
    return "";
  };

  // Delegate column title resolution to shared formatColumnTitle helper
  const getColumnTitle = (key: string): string => {
    return formatColumnTitle(key, columns, fieldLabelMap);
  };

  // Reset modal state when visible turns true
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (visible && !wasVisible) {
      const initialCols = columns
        .filter((c) => {
          const k = getColKey(c);
          return k && k !== "actions" && k !== "selection" && k !== "id" && !c.hidden && !c.importHidden;
        })
        .map((c) => getColKey(c));
      setSelectedColumns(initialCols);
      setCurrentStep(0);
      setFile(null);
      setValidationReport(null);
      setShowErrorsOnly(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadTemplate = () => {
    onDownloadTemplate(selectedColumns, withMockData);
    message.info("Đang khởi tạo tệp mẫu...");
  };

  const handleFileChange = (info: any) => {
    if (info.file.originFileObj) {
      setFile(info.file.originFileObj);
    } else if (info.file) {
      setFile(info.file);
    }
  };

  const handleRunValidation = async () => {
    if (!file) return;
    try {
      const result = await onValidate(file);
      const report = result?.data?.data ?? result?.data ?? result;
      if (report) {
        setValidationReport(report);
        setCurrentStep(2);
      }
    } catch {
      message.error("Lỗi xác minh dữ liệu");
    }
  };

  const handleStartImport = () => {
    if (file) onImport(file);
  };

  // Filtered results for the verification table
  const filteredResults = useMemo(() => {
    if (!validationReport?.results) return [];
    return showErrorsOnly
      ? validationReport.results.filter((r: any) => r.status === "invalid")
      : validationReport.results;
  }, [validationReport, showErrorsOnly]);

  // Derive dynamic data keys from validation results (filtering out internal metadata keys)
  const dataKeys: string[] = useMemo(() => {
    const results = validationReport?.results;
    if (!results?.length) return [];
    return Object.keys(results[0].data || {}).filter(
      (k) => !k.startsWith("_") && !k.endsWith("_name") && !k.endsWith("_names")
    );
  }, [validationReport]);

  // Build generic verification table columns
  const tableColumns = useMemo(() => {
    const fixed = [
      {
        title: "Dòng",
        dataIndex: "row",
        key: "row",
        width: allowRowReorder ? 75 : 60,
        align: "center" as const,
        fixed: "left" as const,
        render: (row: number, record: any) => {
          const rawContent = (
            <div style={{ minWidth: 200, maxWidth: 320, maxHeight: 280, overflowY: "auto" }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, color: PRIMARY }}>
                Dữ liệu gốc (Raw) — Dòng {row}
              </div>
              {Object.entries(record.data || {})
                .filter(([k]) => !k.startsWith("_") && !k.endsWith("_name") && !k.endsWith("_names"))
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8, lineHeight: 1.7, fontSize: 12 }}>
                    <span style={{ color: "#8c8c8c", minWidth: 100, flexShrink: 0 }}>
                      {getColumnTitle(k)}:
                    </span>
                    <span style={{ color: "#262626", wordBreak: "break-all" }}>
                      {v === null || v === undefined || v === "" ? (
                        <i style={{ color: "#bfbfbf" }}>trống</i>
                      ) : (
                        String(v)
                      )}
                    </span>
                  </div>
                ))}
            </div>
          );
          return (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {allowRowReorder && (
                <HolderOutlined
                  style={{ cursor: "grab", color: "#bfbfbf", fontSize: 13 }}
                  title="Kéo thả để sắp xếp vị trí dòng"
                />
              )}
              <Tooltip
                title={rawContent}
                placement="rightTop"
                overlayInnerStyle={{
                  background: "#fff",
                  color: "#262626",
                  border: "1px solid #e8e8e8",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
                overlayStyle={{ maxWidth: 360 }}
                color="#fff"
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: record.status === "valid" ? "#f6ffed" : "#fff1f0",
                    border: `1px solid ${record.status === "valid" ? "#b7eb8f" : "#ffa39e"}`,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {row}
                </span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center" as const,
        fixed: "left" as const,
        render: (status: string, record: any) => {
          if (status === "valid") {
            return (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Hợp lệ
              </Tag>
            );
          }
          const errors: string[] = record.errors || [];
          const popContent = (
            <div style={{ maxWidth: 300 }}>
              {errors.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: "#ff4d4f", flexShrink: 0 }}>•</span>
                  <span style={{ color: "#262626" }}>{e}</span>
                </div>
              ))}
            </div>
          );
          return (
            <Popover
              content={errors.length ? popContent : null}
              title={
                errors.length ? (
                  <span style={{ color: "#ff4d4f", fontSize: 12 }}>
                    {errors.length} lỗi phát hiện
                  </span>
                ) : null
              }
              placement="right"
              trigger="hover"
              overlayStyle={{ maxWidth: 320 }}
            >
              <Tag
                color="error"
                icon={<CloseCircleOutlined />}
                style={{ cursor: errors.length ? "pointer" : "default" }}
              >
                Lỗi
              </Tag>
            </Popover>
          );
        },
      },
    ];

    const dataCols = dataKeys
      .filter((k) => {
        const colDef = columns.find((c: any) => getColKey(c) === k);
        return !(colDef?.hidden || colDef?.importHidden);
      })
      .map((k) => {
      const colDef = columns.find((c: any) => getColKey(c) === k);
      return {
        title: getColumnTitle(k),
        dataIndex: ["data", k],
        key: k,
        ellipsis: true,
        width: 140,
        render: (val: any, record: any) => {
          if (colDef && colDef.render) {
            return colDef.render(val, record);
          }

          if (val === undefined || val === null || val === "") {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Typography.Text>
            );
          }

          const baseKey = k.replace(/(Ids|Id)$/, "");
          const mappingInfo = record?.data?._mappings?.[k] || record?.data?._mappings?.[baseKey];
          const withMapping = (node: React.ReactNode) => {
            if (!mappingInfo) return node;
            return (
              <Space size={4} align="center" style={{ display: "inline-flex" }}>
                {node}
                <Tooltip
                  title={
                    <span style={{ fontSize: 11 }}>
                      <b>Tự động nhận diện:</b> Giá trị nhập <code>"{String(mappingInfo.raw)}"</code> ➔ <b>{String(mappingInfo.mapped)}</b>
                    </span>
                  }
                  placement="top"
                >
                  <InfoCircleOutlined style={{ color: "#1890ff", fontSize: 12, cursor: "pointer" }} />
                </Tooltip>
              </Space>
            );
          };

          if (colDef && colDef.valueMap && colDef.valueMap[String(val)]) {
            return withMapping(<Typography.Text style={{ fontSize: 12 }}>{colDef.valueMap[String(val)]}</Typography.Text>);
          }

          const strVal = String(val).trim();
          const lowerVal = strVal.toLowerCase();

          const displayLabel = formatColumnValue(val, customValueMap, colDef?.valueMap);

          // Generic Booleans
          if (lowerVal === "true" || lowerVal === "1" || lowerVal === "có") {
            return withMapping(<Tag color="blue" style={{ margin: 0, fontSize: 11 }}>Có</Tag>);
          }
          if (lowerVal === "false" || lowerVal === "0" || lowerVal === "không") {
            return withMapping(<Tag color="default" style={{ margin: 0, fontSize: 11 }}>Không</Tag>);
          }

          // Generic Status badges with human-readable label
          if (["active", "đang hoạt động", "hoạt động", "success", "completed", "đã hoàn thành"].includes(lowerVal)) {
            return withMapping(<Tag color="success" style={{ margin: 0, fontSize: 11 }}>{displayLabel}</Tag>);
          }
          if (["inactive", "đã nghỉ", "nghỉ", "disabled", "tắt", "chờ"].includes(lowerVal)) {
            return withMapping(<Tag color="warning" style={{ margin: 0, fontSize: 11 }}>{displayLabel}</Tag>);
          }
          if (["dismissed", "khai trừ", "error", "failed", "cancelled", "đã hủy"].includes(lowerVal)) {
            return withMapping(<Tag color="error" style={{ margin: 0, fontSize: 11 }}>{displayLabel}</Tag>);
          }
          if (["pending", "chờ xử lý", "processing", "đang xử lý"].includes(lowerVal)) {
            return withMapping(<Tag color="processing" style={{ margin: 0, fontSize: 11 }}>{displayLabel}</Tag>);
          }

          // Generic Dates (ISO string -> DD/MM/YYYY)
          if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(strVal)) {
            const d = new Date(strVal);
            if (!isNaN(d.getTime())) {
              const day = String(d.getDate()).padStart(2, "0");
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const year = d.getFullYear();
              return withMapping(<Typography.Text style={{ fontSize: 12 }}>{`${day}/${month}/${year}`}</Typography.Text>);
            }
          }

          // Generation fields formatting
          if (k.toLowerCase().includes("generation")) {
            const genText = record?.data?.generation_name || record?.data?.generationId || strVal;
            return withMapping(<Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{String(genText)}</Tag>);
          }

          return withMapping(<Typography.Text style={{ fontSize: 12 }}>{displayLabel}</Typography.Text>);
        },
      };
    });

    return [...fixed, ...dataCols];
  }, [dataKeys, columns, fieldLabelMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const modalWidth = currentStep === 2 ? Math.min(220 + dataKeys.length * 140, 1120) : 760;

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: "#52c41a" }} />
          <span>Nhập {entityName} từ File Excel</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={modalWidth}
      className="import-modal"
      destroyOnClose={false}
    >
      <div style={{ padding: "4px 0" }}>
        {/* ─── Steps Bar ────────────────────────────────────────── */}
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: "Chọn mẫu" },
            { title: "Tải tệp" },
            { title: "Xác minh" },
            { title: "Xác nhận" },
          ]}
        />

        {/* ═══ STEP 0: COLUMN SELECTION & TEMPLATE DOWNLOAD ══════════════ */}
        {currentStep === 0 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            {extraInfoNotice && <div style={{ marginBottom: 16 }}>{extraInfoNotice}</div>}

            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                Chọn các cột cần đưa vào file mẫu. <Typography.Text strong>Dấu * đánh dấu cột bắt buộc.</Typography.Text>
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                Bạn có thể nhập dữ liệu tường minh hoặc mã gốc hệ thống — hệ thống sẽ tự động nhận diện và chuyển đổi.
              </Typography.Text>
            </div>

            {/* Checkbox Group Box */}
            <div
              style={{
                background: "#fafafa",
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid #f0f0f0",
                marginBottom: 20,
              }}
            >
              <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 8 }}>
                <Checkbox.Group
                  style={{ width: "100%" }}
                  value={selectedColumns}
                  onChange={(vals) => setSelectedColumns(vals as string[])}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px 20px",
                    }}
                  >
                    {columns
                      .filter((c) => {
                        const k = getColKey(c);
                        return k && k !== "actions" && k !== "selection" && k !== "id" && !c.hidden && !c.importHidden;
                      })
                      .map((col) => {
                        const key = getColKey(col);
                        const titleText = getColumnTitle(key);
                        return (
                          <Checkbox key={key} value={key}>
                            <Space size={4}>
                              <span>{titleText}</span>
                              {col.required && (
                                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                                  *
                                </Typography.Text>
                              )}
                            </Space>
                          </Checkbox>
                        );
                      })}
                  </div>
                </Checkbox.Group>
              </div>

              <Divider style={{ margin: "16px 0 12px" }} />

              <div>
                <Checkbox checked={withMockData} onChange={(e) => setWithMockData(e.target.checked)}>
                  <Space size={6}>
                    <span>Kèm dữ liệu mẫu</span>
                    <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                      Khuyên dùng
                    </Tag>
                  </Space>
                </Checkbox>
              </div>
            </div>

            {/* Footer Buttons centered */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Button
                variant="outline"
                buttonSize="small"
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                disabled={selectedColumns.length === 0}
              >
                Tải file mẫu Excel (.xlsx)
              </Button>
              <Button
                variant="primary"
                buttonSize="small"
                onClick={() => setCurrentStep(1)}
                icon={<ArrowRightOutlined />}
              >
                Tiếp theo: Tải tệp dữ liệu
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 1: UPLOAD FILE ════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <Dragger
              name="file"
              multiple={false}
              maxCount={1}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              beforeUpload={() => false}
              showUploadList={false}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: PRIMARY, fontSize: 40 }} />
              </p>
              <p className="ant-upload-text">Nhấp hoặc kéo thả tệp vào đây</p>
              <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 200 dòng/tệp, 10 MB)</p>
            </Dragger>

            {file && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#f0f7ff",
                  borderRadius: 8,
                  border: "1px solid #bae7ff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <FileExcelOutlined style={{ color: "#1890ff", fontSize: 24 }} />
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{file.name}</Typography.Text>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Button variant="ghost" buttonSize="small" onClick={() => setFile(null)}>
                  Đổi tệp khác
                </Button>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Button variant="outline" buttonSize="small" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
                Quay lại
              </Button>
              <Button
                variant="primary"
                buttonSize="small"
                onClick={handleRunValidation}
                loading={loading}
                disabled={!file}
                icon={<ArrowRightOutlined />}
              >
                Xác minh dữ liệu
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: VERIFICATION RESULTS ══════════════════════════════ */}
        {currentStep === 2 && validationReport && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            {/* Summary statistics bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Space size={8}>
                <Tag color="blue">
                  Tổng: <b>{validationReport.summary.total}</b>
                </Tag>
                <Tag color="success">
                  Hợp lệ: <b>{validationReport.summary.valid}</b>
                </Tag>
                <Tag color="error">
                  Lỗi: <b>{validationReport.summary.error}</b>
                </Tag>
              </Space>
              <Space>
                <Typography.Text style={{ fontSize: 13 }}>Chỉ hiện hàng lỗi:</Typography.Text>
                <Switch
                  size="small"
                  checked={showErrorsOnly}
                  onChange={setShowErrorsOnly}
                  disabled={validationReport.summary.error === 0}
                />
              </Space>
            </div>

            {/* Results Table */}
            <Table
              dataSource={filteredResults}
              columns={tableColumns}
              pagination={{
                pageSize: tablePageSize,
                size: "small",
                showSizeChanger: true,
                pageSizeOptions: ["5", "10", "20", "50"],
                showTotal: (total: number) => `Tổng ${total} hàng`,
                onShowSizeChange: (_current, size) => setTablePageSize(size),
                onChange: (_page, size) => setTablePageSize(size),
              }}
              size="small"
              bordered
              rowKey="row"
              scroll={{ x: "max-content" }}
              rowClassName={(r: any) =>
                r.status === "invalid" ? "import-row-error" : "import-row-valid"
              }
              onRow={(_, index) => {
                if (index === undefined || !allowRowReorder) return {};
                return {
                  draggable: true,
                  onDragStart: () => setDraggedRowIndex(index),
                  onDragOver: (e: React.DragEvent) => e.preventDefault(),
                  onDrop: () => handleRowDrop(index),
                };
              }}
              style={{ marginBottom: 16 }}
            />

            {validationReport.summary.error > 0 && (
              <Alert
                message={
                  <span style={{ fontSize: 13 }}>
                    Có <b>{validationReport.summary.error}</b> hàng không hợp lệ.{" "}
                    {validationReport.summary.valid > 0
                      ? `Bấm "Tiếp theo" để nhập ${validationReport.summary.valid} hàng hợp lệ, bỏ qua hàng lỗi.`
                      : "Toàn bộ dữ liệu đều có lỗi. Vui lòng kiểm tra và thử lại."}
                  </span>
                }
                type={validationReport.summary.valid > 0 ? "warning" : "error"}
                showIcon
                style={{ padding: "6px 12px", marginBottom: 16 }}
              />
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Button variant="outline" buttonSize="small" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(1)}>
                Tải lại tệp
              </Button>
              {validationReport?.summary?.error > 0 && (
                <Button
                  variant="outline"
                  buttonSize="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadErrorReport}
                  style={{ color: "#ff4d4f", borderColor: "#ffa39e" }}
                >
                  Tải báo cáo lỗi Excel (.csv)
                </Button>
              )}
              <Button
                variant="primary"
                buttonSize="small"
                onClick={() => setCurrentStep(3)}
                disabled={validationReport?.summary?.valid === 0}
                icon={<ArrowRightOutlined />}
              >
                Tiếp theo: Xác nhận nhập
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: FINAL CONFIRMATION ════════════════════════════════ */}
        {currentStep === 3 && (
          <div style={{ textAlign: "center", padding: "24px 0 8px", animation: "fadeIn 0.3s" }}>
            <CheckCircleOutlined style={{ fontSize: 56, color: "#52c41a", marginBottom: 16 }} />
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Xác nhận nhập dữ liệu
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ maxWidth: 440, margin: "0 auto 28px" }}>
              Hệ thống sẽ thực hiện nhập <b>{validationReport?.summary?.valid}</b> bản ghi hợp lệ từ tệp{" "}
              <b>{file?.name}</b> vào cơ sở dữ liệu.
              {validationReport?.summary?.error > 0 && (
                <> {validationReport.summary.error} bản ghi lỗi sẽ bị bỏ qua.</>
              )}
            </Typography.Paragraph>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <Button variant="outline" buttonSize="small" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(2)}>
                Quay lại
              </Button>
              <Button
                variant="primary"
                buttonSize="small"
                onClick={handleStartImport}
                loading={loading}
                icon={<CheckCircleOutlined />}
              >
                Bắt đầu nhập ngay
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* Steps primary color override */
        .import-modal .ant-steps-item-finish .ant-steps-item-icon,
        .import-modal .ant-steps-item-process .ant-steps-item-icon {
          background-color: ${PRIMARY} !important;
          border-color:     ${PRIMARY} !important;
        }
        .import-modal .ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon,
        .import-modal .ant-steps-item-process .ant-steps-item-icon .ant-steps-icon {
          color: #fff !important;
        }
        .import-modal .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after {
          background-color: ${PRIMARY} !important;
        }
        .import-modal .ant-steps-item-finish .ant-steps-item-title,
        .import-modal .ant-steps-item-process .ant-steps-item-title {
          color: ${PRIMARY} !important;
        }

        /* Table row highlight */
        .import-modal .import-row-error td {
          background: #fff1f0 !important;
        }
        .import-modal .import-row-valid td {
          background: #f6ffed !important;
        }

        /* Table header styling */
        .import-modal .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
      `}</style>
    </Modal>
  );
};

export default ImportModal;
