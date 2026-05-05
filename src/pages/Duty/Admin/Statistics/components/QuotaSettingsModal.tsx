import React, { useState, useEffect } from 'react';
import { 
  Form, Row, Col, Input, InputNumber, 
  Select, DatePicker, Space, Typography, Tooltip,
  Button, message, Modal
} from 'antd';
import { 
  SettingOutlined, DeleteOutlined, PlusOutlined, 
  InfoCircleOutlined, GroupOutlined,
  UserOutlined,
  ClearOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService } from '@/services/user.service';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Role Group Mapping (Synced with DutyStatsService)
const ROLE_GROUPS = [
  { label: 'Cụ thể theo MSV', value: 'user' },
  { label: 'Đội trưởng', value: 'dt' },
  { label: 'Trưởng ban', value: 'tb' },
  { label: 'Phó ban', value: 'pb' },
  { label: 'Thành viên (Nói chung)', value: 'member_all' },
  { label: 'Cộng tác viên', value: 'ctv' },
];

interface QuotaSettingsModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (values: any) => Promise<void>;
  initialData?: any;
  departments: any[];
  initialDateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  loading?: boolean;
  templateGroups?: any[];
}


const QuotaSettingsModal: React.FC<QuotaSettingsModalProps> = ({ 
  open, 
  onCancel, 
  onSave, 
  initialData, 
  departments,
  initialDateRange,
  templateGroups = []
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [sysDepartments, setSysDepartments] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await userService.getStats();
        const statsData = res.data || (res as any);
        if (statsData?.byDepartment) {
          const depts = Object.keys(statsData.byDepartment)
            .filter(name => name !== '__unassigned__' && name !== 'undefined' && name !== 'null')
            .sort()
            .map(name => ({ id: name, name: name }));
          setSysDepartments(depts);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách ban', err);
      }
    };
    fetchMetadata();
  }, []);

  const displayDepartments = departments?.length > 0 ? departments : sysDepartments;

  const handleImportTemplate = (groupId: number) => {
    const group = templateGroups.find(g => g.id === groupId);
    if (group) {
      form.setFieldsValue({
        defaultQuota: group.defaultQuota,
        kipPrice: group.kipPrice,
        violationPenaltyRate: group.violationPenaltyRate,
        quotaRules: group.quotaRules?.map((r: any) => ({
          ...r,
          cycle: 'week',
          dateRange: initialDateRange
        }))
      });
      message.success(`Đã kế thừa cấu hình từ: ${group.name}`);
    }
  };

  const handleClearAll = () => {
    form.setFieldsValue({
      defaultQuota: 0,
      kipPrice: 0,
      violationPenaltyRate: 0,
      quotaRules: []
    });
    message.info('Đã xóa trắng các thiết lập');
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        const quotaRules = (initialData.quotaRules || []).map((r: any) => ({
          ...r,
          cycle: 'week', // Force week cycle
          dateRange: initialDateRange // Always use period range
        }));
        form.setFieldsValue({
          defaultQuota: initialData.defaultQuota,
          kipPrice: initialData.kipPrice,
          violationPenaltyRate: initialData.violationPenaltyRate,
          quotaRules,
        });
      } else {
        // Reset to empty for new weeks
        form.resetFields();
      }
    }
  }, [open, initialData, initialDateRange, form]);

  const handleFinish = async (values: any) => {
    setSaving(true);
    try {
      const processedRules = values.quotaRules?.map((r: any) => {
        const rule = { ...r };
        if (r.dateRange && r.dateRange.length === 2) {
          rule.startDate = r.dateRange[0].startOf('day').toISOString();
          rule.endDate = r.dateRange[1].endOf('day').toISOString();
        }
        delete rule.dateRange;
        return rule;
      });

      await onSave({
        ...values,
        quotaRules: processedRules,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined style={{ color: 'var(--primary-color)' }} />
          <Text strong>Cấu hình Định mức & Quy tắc</Text>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={saving} 
          onClick={() => form.submit()}
        >
          Lưu thay đổi
        </Button>
      ]}
      className="base-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Compact Instruction */}
        <div style={{ 
          background: '#f0f9ff', 
          padding: '12px 16px', 
          borderRadius: 4, 
          border: '1px solid #bae6fd',
          marginBottom: 20,
          display: 'flex',
          gap: 12
        }}>
          <SafetyCertificateOutlined style={{ color: '#0284c7', fontSize: 16, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
              Chế độ Quản lý theo Giai đoạn: {initialDateRange ? `${initialDateRange[0].format('DD/MM')} - ${initialDateRange[1].format('DD/MM/YYYY')}` : 'Chưa chọn'}
            </div>
            <div style={{ fontSize: 12, color: '#0c4a6e' }}>
              Thứ tự áp dụng: Cá nhân (MSV) → Ban/Đơn vị → Nhóm vai trò → Mặc định.
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 4, padding: '16px', border: '1px solid #f1f5f9', marginBottom: 20 }}>
          <Space style={{ marginBottom: 16 }}>
            <InfoCircleOutlined style={{ color: '#3b82f6' }} />
            <Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Thông số cơ bản</Text>
          </Space>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item 
                name="defaultQuota" 
                label={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Định mức mặc định (kíp/tuần)</span>}
              >
                <InputNumber min={0} step={0.5} style={{ width: '100%', borderRadius: 8 }} placeholder="2.5" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="kipPrice" 
                label={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Đơn giá kíp (VNĐ)</span>}
              >
                <InputNumber 
                  min={0} step={5000} 
                  style={{ width: '100%', borderRadius: 8 }} 
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="violationPenaltyRate" 
                label={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Hệ số phạt vi phạm</span>}
              >
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%', borderRadius: 8 }} placeholder="0.0" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Advanced Rules Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <GroupOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
            <Text strong style={{ fontSize: 14, color: '#334155' }}>QUY TẮC ƯU TIÊN CHI TIẾT</Text>
          </Space>
          <Space>
            <Select 
              placeholder="Kế thừa từ Bản mẫu..." 
              size="middle" 
              style={{ width: 220 }}
              suffixIcon={<DownloadOutlined />}
              onChange={handleImportTemplate}
              options={templateGroups.map(g => ({ label: g.name, value: g.id }))}
              dropdownStyle={{ borderRadius: 10 }}
            />
            <Button 
              size="middle" 
              danger 
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              style={{ borderRadius: 8 }}
            >
              Xóa trắng
            </Button>
          </Space>
        </div>
        
        <Form.List name="quotaRules">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {fields.map(({ key, name, ...restField }) => (
                <div 
                  key={key} 
                  style={{ 
                    background: '#ffffff', 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    position: 'relative'
                  }}
                >
                  <Row gutter={12} align="middle">
                    <Col span={5}>
                      <Form.Item {...restField} label={<span style={{fontSize: 11, color: '#94a3b8', fontWeight: 600}}>ĐỐI TƯỢNG</span>} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <Select options={ROLE_GROUPS} style={{ borderRadius: 6 }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const type = getFieldValue(['quotaRules', name, 'type']);
                          const isUser = type === 'user';
                          return (
                            <Form.Item {...restField} label={<span style={{fontSize: 11, color: '#94a3b8', fontWeight: 600}}>{isUser ? 'MÃ SINH VIÊN' : 'BAN / ĐƠN VỊ'}</span>} name={[name, 'target']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                              {isUser ? (
                                <Input placeholder="MSV..." prefix={<UserOutlined style={{ fontSize: 12, color: '#94a3b8' }} />} />
                              ) : (
                                <Select placeholder="Chọn Ban">
                                  <Select.Option value="all">Tất cả các ban</Select.Option>
                                  {displayDepartments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                                </Select>
                              )}
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item {...restField} label={<span style={{fontSize: 11, color: '#94a3b8', fontWeight: 600}}>THỜI GIAN ÁP DỤNG</span>} name={[name, 'dateRange']} style={{ marginBottom: 0 }}>
                        <RangePicker 
                          style={{ width: '100%', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1' }} 
                          placeholder={['Từ', 'Đến']} 
                          disabled 
                          format="DD/MM"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...restField} label={<span style={{fontSize: 11, color: '#94a3b8', fontWeight: 600}}>ĐỊNH MỨC</span>} name={[name, 'quota']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <InputNumber step={0.5} min={0} style={{ width: '100%', borderRadius: 6 }} placeholder="0.0" />
                      </Form.Item>
                    </Col>
                    <Col span={2} style={{ textAlign: 'right', paddingTop: 14 }}>
                      <Tooltip title="Xóa quy tắc">
                        <Button 
                          type="text" 
                          danger 
                          shape="circle" 
                          icon={<DeleteOutlined />} 
                          onClick={() => remove(name)} 
                          style={{ marginTop: 4 }}
                        />
                      </Tooltip>
                    </Col>
                  </Row>
                </div>
              ))}
              
              <Button 
                type="dashed" 
                onClick={() => add({ 
                  type: 'member_all', 
                  target: 'all', 
                  quota: 2.5, 
                  cycle: 'week',
                  dateRange: initialDateRange
                })} 
                block 
                icon={<PlusOutlined />}
                style={{ 
                  height: 48, 
                  borderRadius: 12, 
                  borderStyle: 'dashed', 
                  borderWidth: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  background: '#f8fafc'
                }}
              >
                Thêm quy tắc định mức mới
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
      
      <style>{`
        .base-modal .ant-modal-content {
          border-radius: 8px;
        }
        .base-modal .ant-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
        }
      `}</style>
    </Modal>
  );
};

export default QuotaSettingsModal;


