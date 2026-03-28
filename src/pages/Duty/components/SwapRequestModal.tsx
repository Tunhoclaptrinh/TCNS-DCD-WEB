import React from 'react';
import { Form, Select, Divider, Space, Alert } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';

// const { Text } = Typography;

interface SwapRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (targetUserId: number) => Promise<void>;
  allUsers: any[];
  currentUserId: number;
  loading?: boolean;
}

const SwapRequestModal: React.FC<SwapRequestModalProps> = ({
  open,
  onCancel,
  onSubmit,
  allUsers,
  currentUserId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async (values: any) => {
    await onSubmit(values.targetUserId);
    form.resetFields();
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <UserOutlined style={{ color: '#10b981' }} />
          <span>Yêu cầu đổi kíp/chuyển ca trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={500}
      okText="Gửi yêu cầu"
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Alert 
          message="Lưu ý quan trọng" 
          description="Bạn đang yêu cầu chuyển ca này cho một thành viên khác. Họ sẽ nhận được thông báo để xác nhận. Sau khi họ chấp thuận (và được Admin duyệt nếu cần), bạn sẽ được gỡ khỏi ca này." 
          type="info" 
          showIcon 
          style={{ marginBottom: 20, borderRadius: 10 }}
        />

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <UserOutlined style={{ color: '#10b981' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Chọn người nhận ca trực</span>
        </Divider>

        <Form.Item 
          name="targetUserId" 
          label="Thành viên nhận ca" 
          rules={[{ required: true, message: 'Vui lòng chọn người nhận' }]}
        >
          <Select
            showSearch
            style={{ width: '100% ' }}
            placeholder="Tìm kiếm theo tên, MSSV hoặc email..."
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={allUsers
              .filter(u => u.id !== currentUserId)
              .map(u => ({ label: `${u.name} (${u.studentId || u.email})`, value: u.id }))}
          />
        </Form.Item>
        
        <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>
          Lưu ý: Bạn chỉ có thể chuyển ca cho những người chưa có lịch trực trùng vào khung giờ này.
        </div>
      </div>
    </FormModal>
  );
};

export default SwapRequestModal;
