import React from 'react';
import { Form, Input, DatePicker, Select, Space, Checkbox, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, ProfileOutlined, UsergroupAddOutlined 
} from '@ant-design/icons';

const { Text } = Typography;
import FormModal from '@/components/common/FormModal';
import MeetingMemberPicker from './MeetingMemberPicker';
import { User } from '@/types';

interface MeetingFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
  users?: User[];
  initialParticipants?: User[];
}

const MeetingForm: React.FC<MeetingFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
  users = [],
  initialParticipants = [],
}) => {
  // Combine global users with specific meeting participants to ensure all names are resolved
  const combinedUsers = React.useMemo(() => {
    const map = new Map<number, User>();
    users.forEach(u => map.set(Number(u.id), u));
    initialParticipants.forEach(u => map.set(Number(u.id), u));
    return Array.from(map.values());
  }, [users, initialParticipants]);

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

      <div style={{ display: 'flex', gap: '16px' }}>
        <Form.Item
          name="location"
          label="Địa điểm"
          rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}
          style={{ flex: 1 }}
        >
          <Input placeholder="VD: Phòng P302, Zoom..." prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} />
        </Form.Item>

        <Form.Item name="status" label="Trạng thái" initialValue="scheduled" style={{ width: 180 }}>
          <Select options={[
            { label: 'Đã lên lịch', value: 'scheduled' },
            { label: 'Đã hoàn thành', value: 'completed' },
            { label: 'Đã hủy', value: 'cancelled' },
          ]} />
        </Form.Item>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
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
            onChange={(val) => {
              if (val && !form.getFieldValue('endAt')) {
                form.setFieldsValue({ endAt: val.add(1, 'hour') });
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="endAt"
          label="Kết thúc (Dự kiến)"
          style={{ flex: 1 }}
        >
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
      </div>

      <Form.Item name="agenda" label="Nội dung cuộc họp">
        <Input.TextArea placeholder="Các đầu mục nội dung chính..." rows={3} />
      </Form.Item>

      <Form.Item name="note" label="Ghi chú thêm">
        <Input placeholder="Ghi chú thêm (nếu có)..." />
      </Form.Item>

      {/* Member Selection Section */}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isAllParticipants !== curr.isAllParticipants}>
          {({ getFieldValue }) => {
            const isAll = getFieldValue('isAllParticipants');
            
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Form.Item name="isAllParticipants" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: 13 }}>
                      Mời toàn bộ đội tham gia
                    </Checkbox>
                  </Form.Item>
                </div>

                {isAll ? (
                  <div style={{ 
                    padding: '8px 0', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <UsergroupAddOutlined style={{ color: 'var(--primary-color)' }} />
                    <Text strong style={{ fontSize: 13 }}>Đang chọn: Toàn bộ thành viên trong đội</Text>
                  </div>
                ) : (
                  <Form.Item 
                    name="participantIds" 
                    noStyle 
                    rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
                  >
                    <MeetingMemberPicker users={combinedUsers} />
                  </Form.Item>
                )}
              </>
            );
          }}
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default MeetingForm;
