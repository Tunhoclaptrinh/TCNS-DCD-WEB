import React from 'react';
import { Form, Row, Col, DatePicker, Select, Button, Typography, Divider, Space, Modal, message } from 'antd';
import { ScheduleOutlined, DeleteOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';

const { } = Typography;

interface BulkSchedulingFormProps {
  form: any;
  templateGroups: any[];
  onPreview: (values: any) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const BulkSchedulingForm: React.FC<BulkSchedulingFormProps> = ({
  form,
  templateGroups,
  onPreview,
  onRefresh,
  loading = false,
}) => {
  const handleDeleteSelection = () => {
    const range = form.getFieldValue('range');
    if (!range) {
      message.warning('Vui lòng chọn khoảng ngày muốn xóa');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa vùng chọn?',
      content: 'Toàn bộ Ca & Kíp trực trong khoảng thời gian này sẽ bị xóa sạch. Bạn có chắc chắn?',
      okText: 'Xóa ngay',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await dutyService.deleteRangeSlots(
            range[0].format('YYYY-MM-DD'),
            range[1].format('YYYY-MM-DD')
          );
          if (res.success) {
            message.success('Đã xóa vùng chọn thành công');
            onRefresh();
          }
        } catch (err) {
          message.error('Lỗi khi xóa vùng chọn');
        }
      },
    });
  };

  return (
    <div className="bulk-scheduling-form-flat">
      <Form form={form} layout="vertical" onFinish={onPreview}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Form.Item 
              name="range" 
              label="1. Khoảng ngày áp dụng" 
              rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
            >
              <DatePicker.RangePicker 
                style={{ width: '100%', borderRadius: 8 }} 
                placeholder={['Từ ngày', 'Đến ngày']} 
                format="DD/MM/YYYY" 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="templateId" 
              label="2. Sử dụng Bản mẫu"
            >
              <Select 
                allowClear 
                style={{ width: '100%' }}
                placeholder="Tự động theo Giai đoạn hệ thống" 
                options={templateGroups.map(g => ({ label: g.isDefault ? `${g.name} (Mặc định)` : g.name, value: g.id }))} 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="mode" 
              label="3. Chế độ khởi tạo" 
              initialValue="kips"
            >
              <Select 
                style={{ width: '100%' }}
                options={[
                  { label: 'Toàn bộ (Cả Ca & Kíp)', value: 'all' },
                  { label: 'Chỉ khởi tạo Kíp trực', value: 'kips' }, 
                  { label: 'Chỉ khởi tạo Ca trực', value: 'shifts' }
                ]} 
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button 
              variant="outlined"
              icon={<DeleteOutlined />} 
              onClick={handleDeleteSelection}
              style={{ color: '#ef4444', borderColor: '#fee2e2' }}
            >
              Xóa vùng chọn
            </Button>
          </Space>
          <Space size={12}>
            <Button 
              variant="outlined" 
              onClick={() => form.resetFields()}
            >
              Làm lại
            </Button>
            <Button 
              type="primary"
              htmlType="submit" 
              loading={loading}
              icon={<ScheduleOutlined />} 
              style={{ padding: '0 24px', fontWeight: 600 }}
            >
              Xem trước kết quả
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default BulkSchedulingForm;
