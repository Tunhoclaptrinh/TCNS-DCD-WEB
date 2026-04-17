import React, { useState, useMemo } from "react";
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
  Tooltip,
  Switch
} from "antd";
import { 
  DownloadOutlined, 
  UploadOutlined, 
  FileExcelOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import { Button } from "@/components/common";

const { Step } = Steps;
const { Dragger } = Upload;

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate: (columns?: string[]) => void;
  onValidate: (file: File) => Promise<any>;
  loading?: boolean;
  columns?: Array<{ title: any; key: string; label?: string; required?: boolean }>;
  entityName?: string;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onCancel,
  onImport,
  onDownloadTemplate,
  onValidate,
  loading = false,
  columns = [],
  entityName = "dữ liệu"
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  
  // Validation Results state
  const [validationReport, setValidationReport] = useState<any>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  // Initialize columns when modal opens
  React.useEffect(() => {
    if (visible) {
      // Filter out actions/selection but include regular columns
      const initialCols = columns
        .filter(c => c.key && c.key !== 'actions' && c.key !== 'selection' && c.key !== 'id')
        .map(c => c.key);
      setSelectedColumns(initialCols);
      setCurrentStep(0);
      setFile(null);
      setValidationReport(null);
    }
  }, [visible, columns]);

  const handleDownloadTemplate = () => {
    onDownloadTemplate(selectedColumns);
    message.info("Đang khởi tạo tệp mẫu...");
  };

  const handleFileChange = (info: any) => {
    const { status } = info.file;
    if (status !== 'uploading') {
      setFile(info.file.originFileObj);
    }
    if (status === 'done' || !status) {
       // Manual check since beforeUpload returns false
       if (info.file) {
          setFile(info.file);
       }
    }
  };

  const handleRunValidation = async () => {
    if (!file) return;
    
    try {
        const report = await onValidate(file);
        if (report) {
            setValidationReport(report);
            setCurrentStep(2); // Go to verification step
        }
    } catch (err) {
        message.error("Lỗi xác minh dữ liệu");
    }
  };

  const handleStartImport = () => {
    if (file) {
      onImport(file);
    }
  };

  // Filtered results for the verification table
  const filteredResults = useMemo(() => {
    if (!validationReport?.results) return [];
    if (!showErrorsOnly) return validationReport.results;
    return validationReport.results.filter((r: any) => r.status === 'invalid');
  }, [validationReport, showErrorsOnly]);

  const validationColumns = [
    {
        title: 'Dòng',
        dataIndex: 'row',
        key: 'row',
        width: 80,
        align: 'center' as const,
    },
    {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        align: 'center' as const,
        render: (status: string) => (
            status === 'valid' 
                ? <Tag color="success" icon={<CheckCircleOutlined />}>Hợp lệ</Tag>
                : <Tag color="error" icon={<CloseCircleOutlined />}>Lỗi</Tag>
        )
    },
    {
        title: 'Nội dung',
        dataIndex: 'data',
        key: 'data',
        render: (data: any) => {
            const preview = Object.entries(data)
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
            return (
                <Tooltip title={<pre style={{ fontSize: 11 }}>{JSON.stringify(data, null, 2)}</pre>}>
                    <Typography.Text ellipsis style={{ maxWidth: 300 }}>
                        {preview}...
                    </Typography.Text>
                </Tooltip>
            );
        }
    },
    {
        title: 'Chi tiết lỗi',
        dataIndex: 'errors',
        key: 'errors',
        render: (errors: string[]) => (
            <Space direction="vertical" size={0}>
                {errors.map((err, i) => (
                    <Typography.Text type="danger" key={i} style={{ fontSize: 12 }}>
                        • {err}
                    </Typography.Text>
                ))}
            </Space>
        )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <span>Nhập {entityName} từ File Excel</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={currentStep === 2 ? 900 : 780}
      centered
      className="import-modal"
    >
      <div style={{ padding: '8px 0' }}>
        <Steps current={currentStep} style={{ marginBottom: 32 }} size="small">
          <Step title="Chọn mẫu" />
          <Step title="Tải tệp" />
          <Step title="Xác minh" />
          <Step title="Xác nhận" />
        </Steps>

        <div style={{ minHeight: 320 }}>
          {/* STEP 0: SELECT COLUMNS */}
          {currentStep === 0 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Chọn các cột thông tin bạn muốn có trong tệp mẫu. Giữ cấu trúc header để hệ thống nhận diện đúng.
              </Typography.Text>
              <Typography.Text type="danger" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                * Các trường bắt buộc phải có dữ liệu khi nhập.
              </Typography.Text>
              
              <div style={{ 
                background: '#fafafa', 
                padding: '24px', 
                borderRadius: 12, 
                border: '1px solid #f0f0f0',
                marginBottom: 20
              }}>
                <Checkbox.Group 
                  style={{ width: '100%' }}
                  value={selectedColumns}
                  onChange={(vals) => setSelectedColumns(vals as string[])}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px' }}>
                    {/* Always include ID but it's optional and off by default */}
                    {!columns.find(c => c.key === 'id') && (
                        <Checkbox key="id" value="id">
                            ID Hệ thống
                        </Checkbox>
                    )}
                    
                    {columns
                      .filter(c => c.key && c.key !== 'actions' && c.key !== 'selection')
                      .map(col => (
                        <Checkbox key={col.key} value={col.key}>
                          <Space size={4}>
                            {typeof col.title === 'string' ? col.title : col.key}
                            {col.required && <Typography.Text type="danger" style={{ fontSize: 12 }}>*</Typography.Text>}
                          </Space>
                        </Checkbox>
                      ))
                    }
                  </div>
                </Checkbox.Group>
                <Divider style={{ margin: '20px 0' }} />
                <div style={{ textAlign: 'center' }}>
                    <Button 
                        variant="outline" 
                        buttonSize="small"
                        icon={<DownloadOutlined />} 
                        onClick={handleDownloadTemplate}
                        style={{ minWidth: 120 }}
                    >
                        Tải tệp mẫu Excel (.xlsx)
                    </Button>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <Button variant="primary" buttonSize="small" onClick={() => setCurrentStep(1)} style={{ minWidth: 160 }}>
                  Tiếp theo: Tải tệp dữ liệu
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {currentStep === 1 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <div style={{ marginBottom: 24 }}>
                <Dragger
                  name="file"
                  multiple={false}
                  maxCount={1}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                  style={{ background: '#fafafa', padding: '48px 0', borderRadius: 12 }}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ color: 'var(--primary-color)', fontSize: 48 }} />
                  </p>
                  <p className="ant-upload-text">Nhấp hoặc kéo tệp vào khu vực này</p>
                  <p className="ant-upload-hint">Hỗ trợ .xlsx, .xls, .csv (Tối đa 10MB)</p>
                </Dragger>
              </div>

              {file && (
                <div style={{ 
                    padding: '16px', 
                    background: '#f0f7ff', 
                    borderRadius: 8, 
                    border: '1px solid #bae7ff',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 24
                }}>
                    <FileExcelOutlined style={{ marginRight: 12, color: '#1890ff', fontSize: 24 }} />
                    <div style={{ flex: 1 }}>
                        <Typography.Text strong>{file.name}</Typography.Text>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng xác minh
                        </div>
                    </div>
                    <Button variant="ghost" buttonSize="small" onClick={() => setFile(null)}>Thay đổi</Button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Button variant="outline" buttonSize="small" onClick={() => setCurrentStep(0)} style={{ minWidth: 88 }}>Quay lại</Button>
                <Button 
                    variant="primary" 
                    buttonSize="small"
                    onClick={handleRunValidation} 
                    loading={loading}
                    disabled={!file}
                    style={{ minWidth: 88 }}
                >
                    Xác minh dữ liệu ngay
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFICATION RESULTS */}
          {currentStep === 2 && validationReport && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Space size="middle">
                        <Tag color="blue">Tổng: {validationReport.summary.total}</Tag>
                        <Tag color="success">Hợp lệ: {validationReport.summary.valid}</Tag>
                        <Tag color="error">Lỗi: {validationReport.summary.error}</Tag>
                    </Space>
                    <Space>
                        <Typography.Text style={{ fontSize: 13 }}>Chỉ hiện hàng lỗi:</Typography.Text>
                        <Switch size="small" checked={showErrorsOnly} onChange={setShowErrorsOnly} />
                    </Space>
                </div>

                <Table 
                    dataSource={filteredResults}
                    columns={validationColumns}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    bordered
                    rowKey="row"
                    style={{ marginBottom: 24 }}
                />

                {validationReport.summary.error > 0 && (
                    <Alert
                        message="Phát hiện dữ liệu không hợp lệ"
                        description={`Có ${validationReport.summary.error} hàng chứa lỗi. Bạn có thể chọn "Quay lại" để tải file mới hoặc "Tiếp tục" để chỉ nhập các hàng hợp lệ.`}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <Button variant="outline" buttonSize="small" onClick={() => setCurrentStep(1)} style={{ minWidth: 88 }}>Quay lại tải file</Button>
                    <Button 
                        variant="primary" 
                        buttonSize="small"
                        onClick={() => setCurrentStep(3)} 
                        disabled={validationReport.summary.valid === 0}
                        style={{ minWidth: 88 }}
                    >
                        Tiếp theo: Xác nhận nhập
                    </Button>
                </div>
            </div>
          )}

          {/* STEP 3: FINAL CONFIRMATION */}
          {currentStep === 3 && (
            <div style={{ textAlign: 'center', padding: '24px 0', animation: 'fadeIn 0.3s' }}>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
                <Typography.Title level={4} style={{ marginBottom: 12 }}>Sẵn sàng nhập dữ liệu</Typography.Title>
                
                <div style={{ maxWidth: 400, margin: '0 auto 32px' }}>
                    <Typography.Paragraph type="secondary">
                      Hệ thống sẽ thực hiện nhập <b>{validationReport.summary.valid}</b> bản ghi hợp lệ từ tệp <b>{file?.name}</b>. 
                      Các dòng dữ liệu lỗi sẽ bị bỏ qua.
                    </Typography.Paragraph>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <Button variant="outline" buttonSize="small" onClick={() => setCurrentStep(2)} style={{ minWidth: 100 }}>Quay lại</Button>
                    <Button 
                        variant="primary" 
                        buttonSize="small"
                        onClick={handleStartImport} 
                        loading={loading}
                        style={{ minWidth: 160 }}
                    >
                        Bắt đầu nhập ngay
                    </Button>
                </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .import-modal .ant-steps-item-title {
            font-size: 14px !important;
        }
        .import-modal .ant-table-thead > tr > th {
            background: #fafafa !important;
            font-weight: 600 !important;
        }
      `}</style>
    </Modal>
  );
};

export default ImportModal;
