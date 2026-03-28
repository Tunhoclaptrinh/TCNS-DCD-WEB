import React from 'react';
import { Form, Input, Divider, Space } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';

// const { Text } = Typography;

interface LeaveRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { reason: string }) => Promise<void>;
  loading?: boolean;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async (values: any) => {
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <StopOutlined style={{ color: '#ef4444' }} />
          <span>Yêu cầu xin nghỉ trực</span>
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
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <StopOutlined style={{ color: '#ef4444' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin vắng mặt</span>
        </Divider>

        <Form.Item 
          name="reason" 
          label="Lý do xin nghỉ" 
          rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Vui lòng giải thích ngắn gọn lý do bạn không thể trực kíp này để Admin xem xét..." 
          />
        </Form.Item>
        
        <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>
          Lưu ý: Sau khi gửi, yêu cầu sẽ chờ Admin hoặc Staff phê duyệt. Bạn vẫn có trách nhiệm trực nếu yêu cầu chưa được chấp thuận.
        </div>
      </div>
    </FormModal>
  );
};

export default LeaveRequestModal;
