import React from 'react';
import { Form, Input, DatePicker, Select, Space } from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, ProfileOutlined 
} from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import MeetingMemberPicker from './MeetingMemberPicker';

interface MeetingFormProps {
  open: boolean;
  editingId: number | null;
  form: any;
  onOk: () => void;
  onCancel: () => void;
}

const MeetingForm: React.FC<MeetingFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
}) => {
  // Logic fetching users was moved inside MeetingMemberPicker to be more encapsulated and use useCRUD standard

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
          <span>{editingId ? 'Chỉnh sửa Lịch họp' : 'Lên lịch họp mới'}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={onOk}
      form={form}
      width={700}
    >
      <Form.Item
        name="title"
        label="Tiêu đề cuộc họp"
        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề cuộc họp' }]}
      >
        <Input placeholder="VD: Họp giao ban tuần..." prefix={<ProfileOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <Form.Item
        name="location"
        label="Địa điểm"
        rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}
      >
        <Input placeholder="VD: Phòng P302, Zoom..." prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <div style={{ display: 'flex', gap: '16px' }}>
        <Form.Item
          name="meetingAt"
          label="Thời gian bắt đầu"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu' }]}
          style={{ flex: 1 }}
        >
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>

        <Form.Item
          name="endAt"
          label="Kết thúc (Dự kiến)"
          style={{ flex: 1 }}
        >
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
      </div>

      {/* Member Selection Section - Encapsulated with useCRUD internally */}
      <div style={{ 
          background: '#f8fafc', 
          padding: '16px', 
          borderRadius: 12, 
          border: '1px solid #e2e8f0', 
          marginTop: 8,
          marginBottom: 24 
      }}>
        <Form.Item 
            name="participantIds" 
            noStyle 
            rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
        >
            <MeetingMemberPicker />
        </Form.Item>
      </div>

      <Form.Item name="agenda" label="Nội dung cuộc họp">
        <Input.TextArea placeholder="Các đầu mục nội dung chính..." rows={3} />
      </Form.Item>

      <div style={{ display: 'flex', gap: '16px' }}>
        <Form.Item name="status" label="Trạng thái" initialValue="scheduled" style={{ flex: 1 }}>
          <Select options={[
            { label: 'Đã lên lịch', value: 'scheduled' },
            { label: 'Đã hoàn thành', value: 'completed' },
            { label: 'Đã hủy', value: 'cancelled' },
          ]} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" style={{ flex: 1 }}>
          <Input placeholder="Ghi chú thêm (nếu có)..." />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default MeetingForm;
