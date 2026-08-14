import React from 'react';
import { Form, Input, DatePicker, Checkbox, Tooltip, Space } from 'antd';
import { CalendarOutlined, BookOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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
      entityName="Học kỳ"
      isEditing={!!editingId}
      icon={<CalendarOutlined style={{ color: 'var(--primary-color)' }} />}
      onCancel={onCancel}
      onOk={onOk}
      okText="Lưu lại"
      cancelText="Hủy"
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

      <div style={{ background: '#f9f9f9', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
        <Form.Item name="isCurrent" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>
            <Space size={6}>
              <span style={{ fontWeight: 500 }}>Đặt làm Học kỳ hiện tại</span>
              <Tooltip title="Nếu bật, đây sẽ là học kỳ mặc định cho toàn hệ thống. Các học kỳ khác sẽ tự động bị hủy dấu hiện tại.">
                <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
              </Tooltip>
            </Space>
          </Checkbox>
        </Form.Item>
      </div>

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
