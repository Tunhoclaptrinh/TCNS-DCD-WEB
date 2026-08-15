import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Input, Tooltip, Space, message, Button, Typography, Popconfirm } from 'antd';
import { SettingOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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
          <span>Cấu hình Danh mục Loại lỗi Vi phạm & Mức phạt</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      width={780}
      loading={loading}
      okText="Lưu cấu hình"
      okButtonProps={{ danger: true }}
    >
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
            <Text strong style={{ fontSize: 13 }}>Danh mục loại lỗi vi phạm ca trực và mức phạt mặc định</Text>
          </Space>
        </div>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Các loại lỗi dưới đây sẽ được nạp động vào các ô chọn khi ghi nhận vi phạm tại kíp trực của Quản trị viên và Quản lý kíp. Các lỗi hệ thống mặc định không thể xóa hoặc đổi mã key.
        </Text>

        <Form.List name="violationTypes">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                {fields.map(({ key, name, ...restField }) => {
                  const itemData = form.getFieldValue(['violationTypes', name]) || {};
                  const isSystemDefault = ['absent_no_permission', 'late', 'absent_with_permission_late', 'wrong_uniform', 'other'].includes(itemData.key);

                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        background: isSystemDefault ? '#f8fafc' : '#ffffff',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        flexWrap: 'wrap'
                      }}
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: 'Nhập tên lỗi' }]}
                        style={{ marginBottom: 0, flex: 2, minWidth: 140 }}
                      >
                        <Input size="small" placeholder="Tên lỗi (VD: Đi muộn)" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: 'Nhập mã key' }]}
                        style={{ marginBottom: 0, flex: 1.5, minWidth: 120 }}
                      >
                        <Input size="small" placeholder="Mã key (VD: late)" disabled={isSystemDefault} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'defaultPenalty']}
                        style={{ marginBottom: 0, flex: 1.5, minWidth: 110 }}
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
                        style={{ marginBottom: 0, width: 85 }}
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
                        style={{ marginBottom: 0, flex: 2.5, minWidth: 160 }}
                      >
                        <Input size="small" placeholder="Mô tả vi phạm..." />
                      </Form.Item>

                      <Tooltip title={isSystemDefault ? "Lỗi mặc định hệ thống - Chỉ cho phép chỉnh sửa thông số, không thể xóa" : "Xóa loại lỗi này"}>
                        <span>
                          <Popconfirm
                            title="Xóa loại lỗi này?"
                            onConfirm={() => !isSystemDefault && remove(name)}
                            okText="Xóa"
                            cancelText="Hủy"
                            disabled={isSystemDefault}
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              disabled={isSystemDefault}
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </span>
                      </Tooltip>
                    </div>
                  );
                })}
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
                style={{ marginTop: 8 }}
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
