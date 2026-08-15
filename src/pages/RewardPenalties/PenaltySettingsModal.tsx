import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Input, Row, Col, Tooltip, Space, message, Divider, Button, Typography, Popconfirm } from 'antd';
import { SettingOutlined, QuestionCircleOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import dutyService from '@/services/duty.service';
import { DEFAULT_VIOLATION_TYPES } from '@/pages/Duty/Admin/components/AdminDutySlotModal';

const { Text } = Typography;

interface PenaltySettingsModalProps {
  open: boolean;
  onCancel: () => void;
}

const PenaltySettingsModal: React.FC<PenaltySettingsModalProps> = ({ open, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    } else {
      form.resetFields();
    }
  }, [open, form]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await dutyService.getSettings();
      if (res.success && res.data) {
        form.setFieldsValue({
          ...res.data,
          penaltyWrongUniform: res.data.penaltyWrongUniform ?? 10000,
          violationPenaltyRate: res.data.violationPenaltyRate ?? 1,
          violationTypes: Array.isArray(res.data.violationTypes) && res.data.violationTypes.length > 0
            ? res.data.violationTypes
            : DEFAULT_VIOLATION_TYPES,
        });
      }
    } catch (err) {
      message.error('Lỗi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await dutyService.updateSettings(values);
      if (res.success) {
        message.success('Cập nhật cấu hình phạt thành công');
        onCancel();
      }
    } catch (err: any) {
      if (err.errorFields) return; // Ignore validation errors
      message.error('Lỗi cập nhật cấu hình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      form={form}
      open={open}
      title={
        <Space>
          <SettingOutlined style={{ color: '#cf1322' }} />
          <span>Cấu hình Phạt Tự động & Danh mục Lỗi</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      width={720}
      loading={loading}
      okText="Lưu cấu hình"
      okButtonProps={{ danger: true }}
    >
      <div style={{ background: '#fff1f0', padding: '16px 20px', borderRadius: 8, border: '1px solid #ffa39e', marginTop: 8 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#cf1322', fontSize: 14 }}>Định mức tiền phạt mặc định</span>
          <Tooltip title="Mức tiền phạt tự động áp dụng khi ghi nhận vi phạm ca trực hoặc quét vắng mặt.">
            <QuestionCircleOutlined style={{ color: '#cf1322', cursor: 'pointer' }} />
          </Tooltip>
        </div>
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item 
              name="penaltyAbsentNoPermission" 
              label={<span style={{ fontWeight: 500, fontSize: 12 }}>Vắng không phép</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="đ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item 
              name="penaltyAbsentWithPermissionLate" 
              label={<span style={{ fontWeight: 500, fontSize: 12 }}>Vắng báo muộn</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="đ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item 
              name="penaltyLate" 
              label={<span style={{ fontWeight: 500, fontSize: 12 }}>Đi muộn</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="đ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item 
              name="penaltyWrongUniform" 
              label={<span style={{ fontWeight: 500, fontSize: 12 }}>Sai tác phong</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="đ"
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item 
              name="violationPenaltyRate" 
              label={<span style={{ fontWeight: 500, fontSize: 12 }}>Hệ số phạt theo giá kíp (áp dụng cho lỗi khác)</span>}
              rules={[{ required: true, message: 'Nhập hệ số' }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber 
                min={0} step={0.5} max={5}
                style={{ width: '100%' }} 
                addonAfter="lần giá kíp"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <Divider style={{ margin: '20px 0 12px 0' }} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
            <Text strong style={{ fontSize: 13 }}>Danh mục loại lỗi vi phạm ca trực</Text>
          </Space>
        </div>

        <Form.List name="violationTypes">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      flexWrap: 'wrap'
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'label']}
                      rules={[{ required: true, message: 'Nhập tên lỗi' }]}
                      style={{ marginBottom: 0, flex: 2, minWidth: 130 }}
                    >
                      <Input size="small" placeholder="Tên lỗi (VD: Đi muộn)" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'key']}
                      rules={[{ required: true, message: 'Nhập mã key' }]}
                      style={{ marginBottom: 0, flex: 1.5, minWidth: 110 }}
                    >
                      <Input size="small" placeholder="Mã key (VD: late)" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'defaultPenalty']}
                      style={{ marginBottom: 0, flex: 1.5, minWidth: 100 }}
                    >
                      <InputNumber
                        size="small"
                        min={0}
                        step={5000}
                        formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        addonAfter="đ"
                        style={{ width: '100%' }}
                        placeholder="Tiền phạt"
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'defaultCoeff']}
                      style={{ marginBottom: 0, width: 75 }}
                    >
                      <InputNumber
                        size="small"
                        min={0.1}
                        max={5}
                        step={0.5}
                        addonAfter="x"
                        style={{ width: '100%' }}
                        placeholder="Hệ số"
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'description']}
                      style={{ marginBottom: 0, flex: 2, minWidth: 140 }}
                    >
                      <Input size="small" placeholder="Mô tả vi phạm..." />
                    </Form.Item>

                    <Popconfirm
                      title="Xóa loại lỗi này?"
                      onConfirm={() => remove(name)}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </div>
                ))}
              </div>

              <Button
                type="dashed"
                onClick={() => add({
                  key: `custom_${Date.now()}`,
                  label: 'Lỗi vi phạm mới',
                  defaultPenalty: 10000,
                  defaultCoeff: 1,
                  description: '',
                })}
                block
                icon={<PlusOutlined />}
                style={{ marginTop: 4 }}
              >
                Thêm Loại Lỗi Vi Phạm
              </Button>
            </div>
          )}
        </Form.List>
      </div>
    </FormModal>
  );
};

export default PenaltySettingsModal;
