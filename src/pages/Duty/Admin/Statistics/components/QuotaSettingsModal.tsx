import React, { useState, useEffect } from 'react';
import { 
  Form, Row, Col, Card, Input, InputNumber, 
  Select, DatePicker, Space, Divider, Alert, Typography, Tooltip,
  Button
} from 'antd';
import { 
  SettingOutlined, DeleteOutlined, PlusOutlined, 
  InfoCircleOutlined, GroupOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Role Group Mapping (Synced with DutyStatsService)
const ROLE_GROUPS = [
  { label: 'Cụ thể theo MSV', value: 'user' },
  { label: 'Đội trưởng', value: 'dt' },
  { label: 'Trưởng ban', value: 'tb' },
  { label: 'Phó ban', value: 'pb' },
  { label: 'Thành viên (Nói chung)', value: 'member_all' },
  { label: 'Cộng tác viên', value: 'ctv' },
];

const CYCLE_OPTIONS = [
  { label: 'Theo Tuần', value: 'week' },
  { label: 'Theo Tháng', value: 'month' },
];

interface QuotaSettingsModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (values: any) => Promise<void>;
  initialData?: any;
  departments: any[];
  initialDateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}


const QuotaSettingsModal: React.FC<QuotaSettingsModalProps> = ({
  open,
  onCancel,
  onSave,
  initialData,
  departments,
  initialDateRange
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        const quotaRules = (initialData.quotaRules || []).map((r: any) => ({
          ...r,
          cycle: r.cycle || 'week',
          dateRange: r.startDate && r.endDate ? [dayjs(r.startDate), dayjs(r.endDate)] : undefined
        }));
        form.setFieldsValue({
          defaultQuota: initialData.defaultQuota,
          kipPrice: initialData.kipPrice,
          violationPenaltyRate: initialData.violationPenaltyRate,
          quotaRules,
        });
      } else if (initialDateRange) {
        // If opening from a specific week in Matrix View
        form.setFieldsValue({
          quotaRules: [{
            type: 'member_all',
            target: 'all',
            quota: 2.5,
            cycle: 'week',
            dateRange: initialDateRange
          }]
        });
      }
    }
  }, [open, initialData, initialDateRange, form]);


  const handleOk = async (values: any) => {
    try {
      setSaving(true);
      // Process date ranges
      const processedValues = { ...values };
      if (processedValues.quotaRules) {
        processedValues.quotaRules = processedValues.quotaRules.map((r: any) => {
          const rule = { ...r };
          if (r.dateRange && r.dateRange.length === 2) {
            rule.startDate = r.dateRange[0].startOf('day').toISOString();
            rule.endDate = r.dateRange[1].endOf('day').toISOString();
          } else {
            rule.startDate = null;
            rule.endDate = null;
          }
          delete rule.dateRange;
          return rule;
        });
      }

      await onSave(processedValues);
      form.resetFields();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      title={
        <Space size={8}>
          <SettingOutlined />
          <span>Cấu hình Định mức Chuyên sâu</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={saving}
      width={1000}
      okText="Lưu thay đổi"
    >
      <div style={{ padding: '0 4px' }}>
        <Alert
          message="Thứ tự ưu tiên áp dụng (Từ cao đến thấp)"
          description={
            <div style={{ fontSize: 12, marginTop: 4 }}>
              1. <b>Cá nhân (MSV)</b> &nbsp;→&nbsp; 
              2. <b>Chức vụ cụ thể</b> (Trưởng/Phó ban, Đội trưởng) &nbsp;→&nbsp; 
              3. <b>Nhóm vai trò</b> (Thành viên/CTV) &nbsp;→&nbsp; 
              4. <b>Mặc định toàn đội</b>.
              <br />
              <Text type="secondary" italic>* Trong mỗi cấp độ, quy tắc có chọn "Ban cụ thể" sẽ ưu tiên hơn quy tắc "Tất cả các ban".</Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <Space size={4}><InfoCircleOutlined /><span style={{ fontSize: 13, fontWeight: 600 }}>Thông số cơ bản</span></Space>
        </Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Định mức mặc định toàn đội" name="defaultQuota" tooltip="Số kíp cơ bản áp dụng hàng tuần khi không có quy tắc riêng">
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đơn giá kíp (VNĐ)" name="kipPrice">
              <InputNumber 
                min={0} 
                step={1000} 
                style={{ width: '100%' }} 
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hệ số phạt lỗi" name="violationPenaltyRate" tooltip="Tỉ lệ trừ tiền trên đơn giá kíp khi có lỗi">
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 12, marginBottom: 16 }}>
          <Space size={4}><GroupOutlined /><span style={{ fontSize: 13, fontWeight: 600 }}>Quy tắc ưu tiên chi tiết</span></Space>
        </Divider>
        
        <Form.List name="quotaRules">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fields.map(({ key, name, ...restField }) => (
                <Card 
                  key={key} 
                  size="small" 
                  style={{ 
                    borderRadius: 8, 
                    border: '1px solid #f0f0f0',
                    background: '#fafafa'
                  }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <Row gutter={[12, 0]} align="middle">
                    <Col span={5}>
                      <Form.Item {...restField} label="Đối tượng" name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <Select options={ROLE_GROUPS} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const type = getFieldValue(['quotaRules', name, 'type']);
                          return (
                            <Form.Item {...restField} label={type === 'user' ? 'Mã sinh viên' : 'Ban / Đơn vị'} name={[name, 'target']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                              {type === 'user' ? (
                                <Input placeholder="MSV..." prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} />
                              ) : (
                                <Select placeholder="Chọn Ban">
                                  <Select.Option value="all">Tất cả các ban</Select.Option>
                                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                                </Select>
                              )}
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item {...restField} label="Thời gian" name={[name, 'dateRange']} style={{ marginBottom: 0 }}>
                        <RangePicker style={{ width: '100%' }} placeholder={['Từ', 'Đến']} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item {...restField} label="Chu kỳ" name={[name, 'cycle']} initialValue="week" style={{ marginBottom: 0 }}>
                        <Select options={CYCLE_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...restField} label="Định mức" name={[name, 'quota']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <InputNumber step={0.5} min={0} style={{ width: '100%' }} placeholder="Số kíp" />
                      </Form.Item>
                    </Col>
                    <Col span={2} style={{ textAlign: 'right', paddingTop: 28 }}>
                      <Tooltip title="Xóa">
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />} 
                          onClick={() => remove(name)}
                        />
                      </Tooltip>
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button 
                type="dashed" 
                onClick={() => add({ type: 'member_all', target: 'all', quota: 2.5, cycle: 'week' })} 
                block 
                icon={<PlusOutlined />}
                style={{ height: 42, borderRadius: 8 }}
              >
                Thêm quy tắc mới
              </Button>
            </div>
          )}
        </Form.List>
      </div>
    </FormModal>
  );
};

export default QuotaSettingsModal;


