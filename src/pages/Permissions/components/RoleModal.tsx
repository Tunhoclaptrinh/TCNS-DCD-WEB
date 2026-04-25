import React from 'react';
import { Modal, Form, Input, Typography } from 'antd';
import { Button } from '@/components/common';
import { TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
    <Modal
      title={
        <div style={{ textAlign: 'center', width: '100%', paddingRight: 32 }}>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 12, color: '#1890ff' }} />
            Thêm Vai trò mới
          </Title>
          <Text type="secondary">Định nghĩa nhóm vai trò mới cho hệ thống</Text>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
          <Button 
            variant="outline" 
            onClick={onCancel}
            style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={() => form.submit()}
            style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Tạo vai trò
          </Button>
        </div>
      }
      width={500}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 16 }}
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
      </Form>
    </Modal>
  );
};

export default RoleModal;
