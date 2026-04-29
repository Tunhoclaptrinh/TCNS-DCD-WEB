import React, { useEffect, useState } from 'react';
import { Form, Input, DatePicker, Select, Space, Typography } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, ProfileOutlined, FileTextOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import userService from '@/services/user.service';

const { Text } = Typography;

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
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userService.getAll({ limit: 1000, sort: 'name', order: 'asc' });
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch users for selection:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

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
        <Input placeholder="VD: Họp giao ban tuần, Sinh hoạt Đội tháng 4..." prefix={<ProfileOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <Form.Item
        name="location"
        label="Địa điểm"
        rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}
      >
        <Input placeholder="VD: Phòng P302, Google Meet, Zoom..." prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} />
      </Form.Item>

      <div style={{ display: 'flex', gap: '20px' }}>
        <Form.Item
          name="meetingAt"
          label="Thời gian bắt đầu"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu' }]}
          style={{ flex: 1 }}
        >
          <DatePicker 
            showTime 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY HH:mm" 
            placeholder="Chọn ngày giờ" 
          />
        </Form.Item>

        <Form.Item
          name="endAt"
          label="Thời gian kết thúc (Dự kiến)"
          style={{ flex: 1 }}
        >
          <DatePicker 
            showTime 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY HH:mm" 
            placeholder="Chọn ngày giờ" 
          />
        </Form.Item>
      </div>

      <Form.Item
        name="participantIds"
        label="Thành viên tham gia"
        rules={[{ required: true, message: 'Vui lòng chọn ít nhất một thành viên' }]}
      >
        <Select
          mode="multiple"
          placeholder="Tìm và chọn thành viên..."
          loading={loadingUsers}
          style={{ width: '100%' }}
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={users.map(u => ({
            label: `${u.name} (${u.studentId || u.email})`,
            value: u.id,
          }))}
        />
      </Form.Item>

      <Form.Item name="agenda" label="Nội dung / Chương trình họp">
        <Input.TextArea 
            placeholder="Nhập các đầu mục nội dung cuộc họp..." 
            rows={4} 
        />
      </Form.Item>

      <Form.Item name="note" label="Ghi chú thêm">
        <Input.TextArea placeholder="Ghi chú cho các thành viên (nếu có)..." rows={2} />
      </Form.Item>
      
      <Form.Item name="status" label="Trạng thái" initialValue="scheduled">
        <Select options={[
            { label: 'Đã lên lịch', value: 'scheduled' },
            { label: 'Đã hoàn thành', value: 'completed' },
            { label: 'Đã hủy', value: 'cancelled' },
        ]} />
      </Form.Item>
    </FormModal>
  );
};

export default MeetingForm;
