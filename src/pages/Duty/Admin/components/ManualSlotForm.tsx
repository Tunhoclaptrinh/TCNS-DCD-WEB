import React from 'react';
import { Form, Row, Col, DatePicker, Select, Button, Typography, InputNumber, Input, message } from 'antd';
import { PlusSquareOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ManualSlotFormProps {
  form: any;
  templates: any[];
  onSuccess: () => void;
  loading?: boolean;
}

const ManualSlotForm: React.FC<ManualSlotFormProps> = ({
  form,
  templates,
  onSuccess,
  loading = false,
}) => {
  const handleAddManualSlot = async (values: any) => {
    try {
      const res = await dutyService.createSlot({
        ...values,
        shiftDate: values.shiftDate.format('YYYY-MM-DD'),
      });
      if (res.success) {
        message.success('Đã thêm ca trực đơn lẻ');
        onSuccess();
        form.resetFields(['shiftLabel', 'order']);
      }
    } catch (err) {
      message.error('Lỗi khi thêm ca trực');
    }
  };

  return (
    <div className="manual-slot-form-compact">
      <Form form={form} layout="vertical" onFinish={handleAddManualSlot}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Form.Item 
              name="shiftDate" 
              label="Ngày trực" 
              rules={[{ required: true }]} 
              initialValue={dayjs()}
            >
              <DatePicker 
                style={{ width: '100%', borderRadius: 8 }} 
                format="DD/MM/YYYY" 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item 
              name="shiftId" 
              label="Thuộc Ca trực (Mẫu)" 
              rules={[{ required: true }]}
            >
              <Select 
                placeholder="Chọn ca cha tham chiếu..." 
                style={{ width: '100%' }}
                options={templates.map(s => ({ label: `${s.name} (${s.startTime} - ${s.endTime})`, value: s.id }))} 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item 
              name="order" 
              label="Số thứ tự" 
              initialValue={1}
            >
              <InputNumber 
                min={1} 
                style={{ width: '100%', borderRadius: 8 }} 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
             <Form.Item 
              name="capacity" 
              label="Chỉ tiêu (Người)" 
              initialValue={1}
            >
              <InputNumber 
                min={1} 
                style={{ width: '100%', borderRadius: 8 }} 
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={18}>
            <Form.Item 
              name="shiftLabel" 
              label="Tên hiển thị Kíp trực" 
              rules={[{ required: true }]}
            >
              <Input 
                placeholder="VD: Ca Sáng - Kíp 1..." 
                style={{ borderRadius: 8 }} 
                prefix={<ThunderboltOutlined style={{ color: '#fbbf24' }} />}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="&nbsp;">
              <Button 
                type="primary"
                htmlType="submit" 
                loading={loading}
                icon={<PlusSquareOutlined />} 
                style={{ width: '100%', background: 'var(--primary-color)', borderColor: 'var(--primary-color)', fontWeight: 600 }}
              >
                Thêm Kíp ngay
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ManualSlotForm;
