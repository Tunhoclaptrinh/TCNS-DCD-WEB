import React from 'react';
import { Form, Input, InputNumber, Row, Col, Space, Divider, Select, DatePicker, TimePicker, Badge } from 'antd';
import { EditOutlined, ClockCircleOutlined, TeamOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import { DutySlot } from '@/services/duty.service';

// const { Text } = Typography;

interface SlotEditModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingSlot: DutySlot | null;
  onSubmit: (values: any) => Promise<void>;
  allUsers: any[];
  loading?: boolean;
}

const SlotEditModal: React.FC<SlotEditModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingSlot,
  onSubmit,
  allUsers,
  loading = false,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && editingSlot) {
      form.setFieldsValue({
        ...editingSlot,
        shiftDate: dayjs(editingSlot.shiftDate),
        timeRange: editingSlot.startTime && editingSlot.endTime 
          ? [dayjs(editingSlot.startTime, 'HH:mm'), dayjs(editingSlot.endTime, 'HH:mm')] 
          : undefined
      });
    }
  }, [open, editingSlot, form]);

  const handleOk = async (values: any) => {
    const data = {
      ...values,
      shiftDate: values.shiftDate?.format('YYYY-MM-DD'),
      startTime: values.timeRange?.[0]?.format('HH:mm'),
      endTime: values.timeRange?.[1]?.format('HH:mm')
    };
    await onSubmit(data);
    onSuccess();
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <EditOutlined style={{ color: '#6366f1' }} />
          <span>Hiệu chỉnh Kíp trực trên lịch</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={750}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <EditOutlined style={{ color: '#6366f1' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin hiển thị & Trạng thái</span>
        </Divider>

        <Row gutter={[24, 16]}>
          <Col span={16}>
            <Form.Item label="Tiêu đề hiển thị (Trên lịch)" name="shiftLabel" rules={[{ required: true }]}>
              <Input prefix={<EditOutlined style={{ color: '#6366f1' }} />} placeholder="VD: Kíp 1 - Tòa A" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Trạng thái" name="status">
              <Select options={[
                { label: <Badge status="success" text="Đang mở (Đăng ký được)" />, value: 'open' },
                { label: <Badge status="error" text="Đã khóa (Chỉ xem)" />, value: 'locked' }
              ]} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#6366f1' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thời gian & Chỉ tiêu</span>
        </Divider>

        <Row gutter={[24, 16]}>
          <Col span={10}>
            <Form.Item label="Ngày diễn ra" name="shiftDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="Khung giờ thực tế" name="timeRange" rules={[{ required: true }]}>
              <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Tiết BĐ" name="order">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Tiết bắt đầu" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tiết KT" name="endPeriod">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Tiết kết thúc" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Chỉ tiêu (Tối đa)" name="capacity">
              <InputNumber min={1} placeholder="Số người trực" style={{ width: '100%' }} prefix={<TeamOutlined style={{ color: '#6366f1' }} />} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ScheduleOutlined style={{ color: '#6366f1' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Quản lý nhân sự</span>
        </Divider>

        <Form.Item label="Nhân sự trực (Đã đăng ký)" name="assignedUserIds">
          <Select
            mode="multiple"
            placeholder="Thêm nhân sự trực tiếp..."
            style={{ width: '100%' }}
            filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
            options={allUsers.map(u => ({ label: `${u.name} (${u.studentId || u.email})`, value: u.id }))}
          />
        </Form.Item>
 
        <Form.Item label="Xác nhận điểm danh" name="attendedUserIds">
          <Select
            mode="multiple"
            placeholder="Chọn thành viên đã trực thực tế..."
            style={{ width: '100%' }}
            filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
            options={allUsers.map(u => ({ label: `${u.name} (${u.studentId || u.email})`, value: u.id }))}
          />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <SettingOutlined style={{ color: '#6366f1' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin bổ sung</span>
        </Divider>

        <Form.Item label="Ghi chú / Địa điểm trực" name="note">
          <Input.TextArea placeholder="Thông tin thêm cho kíp trực này (VD: Trực sảnh A, mang theo thẻ...)" rows={3} />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default SlotEditModal;
