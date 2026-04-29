import React from 'react';
import { Form, Input, DatePicker, Checkbox, Space } from 'antd';
import { CalendarOutlined, BookOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import dayjs from 'dayjs';

interface SemesterFormProps {
  open: boolean;
  editingId: number | null;
  form: any;
  onOk: () => void;
  onCancel: () => void;
}

const SemesterForm: React.FC<SemesterFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
}) => {
  return (
    <FormModal
      open={open}
      title={
        <Space>
          <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
          <span>{editingId ? 'Chỉnh sửa Học kỳ' : 'Thêm Học kỳ mới'}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={onOk}
      form={form}
      width={600}
    >
      <Form.Item
        name="name"
        label="Tên Học kỳ"
        rules={[{ required: true, message: 'Vui lòng nhập tên học kỳ' }]}
      >
        <Input placeholder="VD: Học kỳ 1, Học kỳ 2, Học kỳ Hè..." prefix={<CalendarOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <Form.Item
        name="academicYear"
        label="Năm học"
        rules={[{ required: true, message: 'Vui lòng nhập năm học' }]}
      >
        <Input placeholder="VD: 2023-2024, 2024-2025..." prefix={<BookOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <div style={{ display: 'flex', gap: '20px' }}>
        <Form.Item
          name="startDate"
          label="Thời gian bắt đầu"
          rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          style={{ flex: 1 }}
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="Thời gian kết thúc"
          rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
          style={{ flex: 1 }}
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
        </Form.Item>
      </div>

      <Form.Item name="isCurrent" valuePropName="checked">
        <Checkbox style={{ color: '#faad14', fontWeight: 600 }}>Đặt làm Học kỳ hiện tại</Checkbox>
      </Form.Item>

      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea placeholder="Nhập ghi chú thêm..." rows={2} />
      </Form.Item>

      <Form.Item name="description" label="Mô tả chi tiết">
        <Input.TextArea placeholder="Mô tả thêm về học kỳ nếu có..." rows={3} />
      </Form.Item>
    </FormModal>
  );
};

export default SemesterForm;
