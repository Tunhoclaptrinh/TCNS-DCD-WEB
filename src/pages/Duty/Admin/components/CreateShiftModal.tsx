import React from 'react';
import { Form, Input, Space, Typography, TimePicker, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';
import FormModal from '@/components/common/FormModal';

const { Text } = Typography;

interface CreateShiftModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (newSlotId: number) => void;
  date: dayjs.Dayjs | null;
  context: any; // { yOffset, shift }
}

const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  open,
  onCancel,
  onSuccess,
  date,
  context,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const shift = context?.shift as DutyShift | undefined;

  React.useEffect(() => {
    if (!open) return;

    const getTimeFromTop = (pos: number) => {
      const START_HOUR = 5;
      const PX_PER_HOUR = 60;
      const totalMinutes = Math.floor((pos / PX_PER_HOUR) * 60);
      const h = START_HOUR + Math.floor(totalMinutes / 60);
      const m = Math.floor((totalMinutes % 60) / 15) * 15;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const yOffset = context?.yOffset || 0;
    const startStr = shift?.startTime || getTimeFromTop(yOffset);
    const endStr = shift?.endTime || getTimeFromTop(yOffset + 120);

    form.setFieldsValue({
      shiftLabel: shift?.name || 'Ca trực mới',
      timeRange: [dayjs(startStr, 'HH:mm'), dayjs(endStr, 'HH:mm')],
      note: '',
    });
  }, [open, context, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const [start, end] = values.timeRange || [];
      const payload = {
        shiftDate: date!.format('YYYY-MM-DD'),
        startTime: start?.format('HH:mm'),
        endTime: end?.format('HH:mm'),
        shiftLabel: values.shiftLabel,
        shiftId: shift?.id || undefined,
        kipId: undefined, // null = Ca container
        status: 'open' as const,
        capacity: 0, // Ca container không có chỉ tiêu riêng
        note: values.note,
      };

      const res = await dutyService.createSlot(payload);
      if (res.success && res.data) {
        message.success('Đã tạo Ca trực');
        onSuccess(res.data.id);
        onCancel();
      }

    } catch (err: any) {
      message.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <Space>
          <CalendarOutlined />
          <span>
            Tạo Ca trực
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
              — {date?.format('dddd, DD/MM/YYYY')}
            </Text>
          </span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleFinish}
      loading={loading}
      width={460}
      destroyOnClose
      okText="Tạo Ca"
    >
      <div style={{ padding: '4px 0' }}>
        {shift && (
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#64748b',
          }}>
            Từ bản mẫu: <strong style={{ color: '#1e293b' }}>{shift.name}</strong>
            <span style={{ marginLeft: 8 }}>({shift.startTime} – {shift.endTime})</span>
          </div>
        )}

        <Form.Item
          name="shiftLabel"
          label="Tên Ca"
          rules={[{ required: true, message: 'Nhập tên ca' }]}
        >
          <Input placeholder="VD: Ca sáng, Ca chiều học đường..." />
        </Form.Item>

        <Form.Item
          name="timeRange"
          label="Khung giờ Ca"
          rules={[{ required: true, message: 'Chọn giờ bắt đầu và kết thúc' }]}
        >
          <TimePicker.RangePicker
            format="HH:mm"
            style={{ width: '100%' }}
            placeholder={['Bắt đầu', 'Kết thúc']}
            minuteStep={5}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea placeholder="Ghi chú thêm (không bắt buộc)..." rows={2} />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default CreateShiftModal;
