import React from 'react';
import { Form, Select, Divider, Space, Alert } from 'antd';
import { ClockCircleOutlined, SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';

// const { Text } = Typography;

interface ShiftTransferModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (toSlotId: number) => Promise<void>;
  availableSlots: any[];
  currentSlotId?: number;
  loading?: boolean;
}

const ShiftTransferModal: React.FC<ShiftTransferModalProps> = ({
  open,
  onCancel,
  onSubmit,
  availableSlots,
  currentSlotId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async (values: any) => {
    await onSubmit(values.toSlotId);
    form.resetFields();
  };

  const filteredSlots = availableSlots
    .filter(s => s.id !== currentSlotId)
    .sort((a, b) => {
      const dateA = dayjs(a.shiftDate).valueOf();
      const dateB = dayjs(b.shiftDate).valueOf();
      if (dateA !== dateB) return dateA - dateB;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <SwapOutlined style={{ color: '#6366f1' }} />
          <span>Yêu cầu chuyển kíp/ca trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={550}
      okText="Gửi yêu cầu chuyển"
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Alert 
          message="Hướng dẫn chuyển kíp" 
          description="Bạn đang yêu cầu chuyển từ kíp hiện tại sang một kíp khác trong tuần. Yêu cầu này sẽ được gửi tới Ban quản lý (Admin) để phê duyệt." 
          type="info" 
          showIcon 
          style={{ marginBottom: 20, borderRadius: 10 }}
        />

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Chọn kíp trực muốn chuyển tới</span>
        </Divider>

        <Form.Item 
          name="toSlotId" 
          label="Kíp trực đích" 
          rules={[{ required: true, message: 'Vui lòng chọn kíp muốn chuyển đến' }]}
        >
          <Select
            showSearch
            style={{ width: '100% ' }}
            placeholder="Tìm kiếm theo ngày hoặc tên kíp..."
            optionFilterProp="children"
            options={filteredSlots.map(s => {
              const dateStr = dayjs(s.shiftDate).format('dd, DD/MM');
              const label = `${dateStr} • ${s.startTime}-${s.endTime} • ${s.shiftLabel}`;
              return { 
                label: label, 
                value: s.id,
                disabled: s.status === 'locked'
              };
            })}
          />
        </Form.Item>
        
        <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 8 }}>
          Lưu ý: Sau khi chuyển thành công, vị trí cũ của bạn sẽ được giải phóng để người khác đăng ký.
        </div>
      </div>
    </FormModal>
  );
};

export default ShiftTransferModal;
