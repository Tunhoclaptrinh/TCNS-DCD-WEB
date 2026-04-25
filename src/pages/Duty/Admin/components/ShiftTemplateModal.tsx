import React from 'react';
import { Form, Input, Row, Col, Space, Divider, Select, TimePicker, Checkbox, message } from 'antd';

import { ScheduleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';

import FormModal from '@/components/common/FormModal';

// const { Text } = Typography;

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
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi lưu bản mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <ScheduleOutlined style={{ color: '#ef4444' }} />
          <span>{editingShift ? "Cấu hình Bản mẫu Ca" : "Thêm Ca trực mới"}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={onFinish}
      form={form}
      loading={loading}
      width={900}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ScheduleOutlined style={{ color: '#ef4444' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin Ca trực</span>
        </Divider>

        <Form.Item name="name" label="Tên Ca trực" rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}>
          <Input placeholder="VD: Ca Sáng, Ca Chiều..." prefix={<ScheduleOutlined style={{ color: '#ef4444' }} />} />
        </Form.Item>

        <Form.Item name="isSpecialEvent" valuePropName="checked" noStyle>
          <Checkbox style={{ marginBottom: 16, color: '#b91c1c', fontWeight: 600 }}>
            Đây là Sự kiện lễ hội (Sẽ luôn hiển thị khi bật Chế độ Sự kiện)
          </Checkbox>
        </Form.Item>
        
        <Form.Item 
          name="timeRange" 
          label="Khung giờ hoạt động" 
          rules={[{ required: true, message: 'Vui lòng chọn khung giờ' }]} 
          extra="Vùng giờ này bao quát tất cả các kíp trực bên trong"
        >
          <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ScheduleOutlined style={{ color: '#ef4444' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Cấu hình Hiển thị & Lịch áp dụng</span>
        </Divider>

        <Row gutter={24}>
          <Col span={24}>
            <Form.Item name="daysOfWeek" label="Ngày áp dụng" initialValue={[0, 1, 2, 3, 4, 5, 6]}>
              <Select
                mode="multiple"
                maxTagCount="responsive"
                options={[
                  { label: 'Thứ 2', value: 0 }, 
                  { label: 'Thứ 3', value: 1 }, 
                  { label: 'Thứ 4', value: 2 }, 
                  { label: 'Thứ 5', value: 3 }, 
                  { label: 'Thứ 6', value: 4 }, 
                  { label: 'Thứ 7', value: 5 }, 
                  { label: 'Chủ nhật', value: 6 }
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Ghi chú ca">
          <Input.TextArea placeholder="Địa điểm hoặc lưu ý đặc biệt cho Ca này..." rows={3} />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default ShiftTemplateModal;
