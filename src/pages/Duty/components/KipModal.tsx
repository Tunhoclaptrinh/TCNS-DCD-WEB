import React from 'react';
import { Form, Input, InputNumber, Row, Col, Space, Typography, Divider, Select, TimePicker } from 'antd';
import { PlusSquareOutlined, ClockCircleOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import { DutyKip, DutyShift } from '@/services/duty.service';

interface KipModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingKip: Partial<DutyKip> | null;
  onSubmit: (values: any) => Promise<void>;
  templates: DutyShift[];
  loading?: boolean;
}

const KipModal: React.FC<KipModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingKip,
  onSubmit,
  templates,
  loading = false,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      if (editingKip) {
        form.setFieldsValue({
          ...editingKip,
          timeRange: editingKip.startTime && editingKip.endTime 
            ? [dayjs(editingKip.startTime, 'HH:mm'), dayjs(editingKip.endTime, 'HH:mm')] 
            : undefined
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingKip, form]);

  const handleOk = async (values: any) => {
    await onSubmit(values);
    onSuccess();
  };

  const currentShiftId = Form.useWatch('shiftId', form);
  const currentShift = templates.find(t => t.id === currentShiftId);

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <PlusSquareOutlined style={{ color: '#0ea5e9' }} />
          <span>{editingKip?.id ? "Cấu hình Kíp trực" : "Thêm Kíp trực mới"}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={550}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Form.Item name="shiftId" hidden><Input /></Form.Item>

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <PlusSquareOutlined style={{ color: '#0ea5e9' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin định danh</span>
        </Divider>

        <Form.Item 
          name="name" 
          label="Tên Kíp (Chi tiết)" 
          rules={[{ required: true, message: 'VD: Kíp 1, Kíp 2...' }]}
        >
          <Input placeholder="VD: Kíp 1, Trực sảnh, Trực kho..." prefix={<PlusSquareOutlined style={{ color: '#0ea5e9' }} />} />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#0ea5e9' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thời gian & Chỉ tiêu</span>
        </Divider>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item name="capacity" label="Chỉ tiêu (Người)" initialValue={1}>
              <InputNumber min={1} style={{ width: '100%' }} prefix={<TeamOutlined />} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="order" label="Tiết BĐ" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Bắt đầu" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="endPeriod" label="Tiết KT">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Kết thúc" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="timeRange"
          label={
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Giờ trực riêng của kíp</span>
              {currentShift && (
                <Typography.Link
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    form.setFieldsValue({
                      timeRange: [dayjs(currentShift.startTime, 'HH:mm'), dayjs(currentShift.endTime, 'HH:mm')]
                    });
                  }}
                >
                  Dùng giờ của Ca ({currentShift.startTime} - {currentShift.endTime})
                </Typography.Link>
              )}
            </Space>
          }
          extra="Để trống sẽ tự tính theo giờ của Ca"
        >
          <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <CalendarOutlined style={{ color: '#0ea5e9' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Ngày áp dụng riêng</span>
        </Divider>

        <Form.Item 
          name="daysOfWeek" 
          label="Thứ trong tuần" 
          extra="Để trống nếu áp dụng cho TẤT CẢ các ngày của Ca"
        >
          <Select
            mode="multiple"
            placeholder="Sử dụng cấu hình của Ca"
            style={{ width: '100%' }}
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
      </div>
    </FormModal>
  );
};

export default KipModal;
