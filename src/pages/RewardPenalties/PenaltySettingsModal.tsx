import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Row, Col, Tooltip, Space, message } from 'antd';
import { SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import dutyService from '@/services/duty.service';

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
        form.setFieldsValue(res.data);
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
          <span>Cấu hình Phạt Tự động</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      width={600}
      loading={loading}
      okText="Lưu cấu hình"
      okButtonProps={{ danger: true }}
    >
      <div style={{ background: '#fff1f0', padding: '16px 20px', borderRadius: 8, border: '1px solid #ffa39e', marginTop: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#cf1322', fontSize: 14 }}>Quy định mức phạt vi phạm</span>
          <Tooltip title="Mức tiền phạt mặc định khi hệ thống hoặc quản lý ghi nhận vi phạm Lịch trực.">
            <QuestionCircleOutlined style={{ color: '#cf1322', cursor: 'pointer' }} />
          </Tooltip>
        </div>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item 
              name="penaltyAbsentNoPermission" 
              label={<span style={{ fontWeight: 500 }}>Vắng không phép</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="penaltyAbsentWithPermissionLate" 
              label={<span style={{ fontWeight: 500 }}>Vắng báo muộn</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="penaltyLate" 
              label={<span style={{ fontWeight: 500 }}>Đi muộn</span>}
              rules={[{ required: true, message: 'Nhập số tiền' }]}
            >
              <InputNumber 
                min={0} step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }} addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </FormModal>
  );
};

export default PenaltySettingsModal;
