import React from 'react';
import { Modal, Form, Input, InputNumber, Space, TimePicker, Row, Col, Select, Typography, message } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';

const { Text } = Typography;

interface ShiftTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingShift: DutyShift | null;
  groupId: number | null;
}

const ShiftTemplateModal: React.FC<ShiftTemplateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingShift,
  groupId
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editingShift) {
        form.setFieldsValue({
          ...editingShift,
          timeRange: [dayjs(editingShift.startTime, 'HH:mm'), dayjs(editingShift.endTime, 'HH:mm')]
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingShift, form]);

  const onFinish = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      templateId: groupId,
      startTime: timeRange[0].format('HH:mm'),
      endTime: timeRange[1].format('HH:mm')
    };

    setLoading(true);
    try {
      const res = editingShift
        ? await dutyService.updateShiftTemplate(editingShift.id, data)
        : await dutyService.createShiftTemplate(data);
      if (res.success) {
        message.success('Đã lưu bản mẫu ca trực');
        onSuccess();
        onCancel();
      }
    } catch (err) {
      message.error('Lỗi khi lưu bản mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      title={<Space><div style={{ width: 4, height: 18, background: '#ef4444', borderRadius: 2 }} /><span>{editingShift ? "Cấu hình Bản mẫu Ca" : "Thêm Ca trực mới"}</span></Space>} 
      open={open} 
      onCancel={onCancel} 
      onOk={() => form.submit()} 
      confirmLoading={loading}
      destroyOnClose
      width={500}
      className="premium-modal"
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="premium-form">
        <Form.Item name="name" label={<Text strong>Tên Ca trực</Text>} rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}>
          <Input placeholder="VD: Ca Sáng, Ca Chiều..." prefix={<ScheduleOutlined style={{ color: '#ef4444' }} />} />
        </Form.Item>
        
        <Form.Item name="timeRange" label={<Text strong>Khung giờ hoạt động</Text>} rules={[{ required: true, message: 'Khung đỏ bao quanh các kíp trực' }]} extra="Vùng giờ đỏ này giữ cho các kíp của Ca không bị rời rạc">
          <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} size="large" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name="order" label={<Text strong>Thứ tự</Text>} initialValue={1}>
              <InputNumber min={1} style={{ width: '100% ' }} />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item name="daysOfWeek" label={<Text strong>Ngày áp dụng</Text>} initialValue={[0, 1, 2, 3, 4, 5, 6]}>
              <Select
                mode="multiple"
                maxTagCount="responsive"
                options={[{ label: 'T2', value: 0 }, { label: 'T3', value: 1 }, { label: 'T4', value: 2 }, { label: 'T5', value: 3 }, { label: 'T6', value: 4 }, { label: 'T7', value: 5 }, { label: 'CN', value: 6 }]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label={<Text strong>Ghi chú ca</Text>}>
          <Input.TextArea placeholder="Địa điểm hoặc lưu ý cho Ca này..." rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShiftTemplateModal;
