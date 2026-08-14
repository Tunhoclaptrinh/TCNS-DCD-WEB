import React from 'react';
import { Form, Input, Typography, Space } from 'antd';
import FormModal from '@/components/common/FormModal';
import { TeamOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface RoleModalProps {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  form: any;
}

const RoleModal: React.FC<RoleModalProps> = ({
  visible,
  onCancel,
  onFinish,
  form
}) => {
  return (
    <FormModal
      open={visible}
      entityName="Vai trò"
      icon={<TeamOutlined style={{ color: 'var(--primary-color)' }} />}
      form={form}
      onCancel={onCancel}
      onOk={onFinish}
      okText="Tạo vai trò"
      cancelText="Hủy"
      width={500}
      centered
    >
      <Form.Item
        name="name"
        label="Tên vai trò"
        rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
      >
        <Input placeholder="VD: Ban Kỹ thuật, Trưởng nhóm..." size="large" />
      </Form.Item>

      <Form.Item
        name="key"
        label="Mã định danh (Key)"
        rules={[
          { required: true, message: 'Vui lòng nhập mã key' },
          { pattern: /^[a-z0-9_]+$/, message: 'Chữ thường, số và dấu gạch dưới' }
        ]}
      >
        <Input placeholder="vd: ban_ky_thuat" size="large" />
      </Form.Item>

      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} placeholder="Mô tả phạm vi quyền hạn của vai trò này..." />
      </Form.Item>
    </FormModal>
  );
};

export default RoleModal;
