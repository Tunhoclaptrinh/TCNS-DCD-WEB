import React from 'react';
import { Form, Input, Switch, Typography, Divider, Space } from 'antd';
import { LayoutOutlined, SettingOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import { DutyTemplate } from '@/services/duty.service';

const { Text } = Typography;

interface GroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingGroup: DutyTemplate | null;
  onSubmit: (values: any) => Promise<void>;
  loading?: boolean;
}

const GroupModal: React.FC<GroupModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingGroup,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      if (editingGroup) {
        form.setFieldsValue(editingGroup);
      } else {
        form.resetFields();
      }
    }
  }, [open, editingGroup, form]);

  const handleOk = async (values: any) => {
    await onSubmit(values);
    onSuccess();
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <LayoutOutlined style={{ color: 'var(--primary-color)' }} />
          <span>{editingGroup ? "Sửa Nhóm Bản mẫu" : "Thêm Nhóm Bản mẫu mới"}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={500}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <LayoutOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin cơ bản</span>
        </Divider>

        <Form.Item 
          name="name" 
          label="Tên nhóm bản mẫu" 
          rules={[{ required: true, message: 'VD: Mùa Đông, Mùa Hè...' }]}
        >
          <Input placeholder="VD: Mùa Đông, Mùa Hè" prefix={<LayoutOutlined style={{ color: 'var(--primary-color)' }} />} />
        </Form.Item>
 
        <Form.Item name="description" label="Mô tả chi tiết">
          <Input.TextArea rows={3} placeholder="Mô tả về quy định trực của mùa này..." />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <SettingOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Cấu hình hệ thống</span>
        </Divider>

        <Form.Item 
          name="isDefault" 
          valuePropName="checked" 
          style={{ marginBottom: 12 }}
          label={<span style={{ fontSize: 13, color: '#64748b' }}>Thiết lập mặc định</span>}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
            <Switch size="small" />
            <Text style={{ fontSize: 13 }}>Đặt làm bản mẫu mặc định cho toàn hệ thống</Text>
          </div>
        </Form.Item>
        <div style={{ paddingLeft: 16 }}>
          <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
            Lưu ý: Chỉ một nhóm bản mẫu có thể được đặt làm mặc định tại một thời điểm.
          </Text>
        </div>
      </div>
    </FormModal>
  );
};

export default GroupModal;
