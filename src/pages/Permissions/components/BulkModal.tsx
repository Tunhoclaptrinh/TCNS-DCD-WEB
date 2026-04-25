import React from 'react';
import { Modal, Form, Input, Checkbox, Space, Typography } from 'antd';
import { Button } from '@/components/common';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BulkModalProps {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  form: any;
}

const BulkModal: React.FC<BulkModalProps> = ({
  visible,
  onCancel,
  onFinish,
  form
}) => {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Space>
            <ThunderboltOutlined style={{ color: '#722ed1' }} />
            <Text strong style={{ fontSize: 18 }}>Tạo nhanh bộ quyền CRUD</Text>
          </Space>
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
            Tạo ngay
          </Button>
        </div>
      }
      width={550}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ actions: ['list', 'read', 'create', 'update', 'delete'] }}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="moduleName" label="Tên chức năng (VD: Thiết bị)" rules={[{ required: true }]}>
          <Input placeholder="VD: Quản lý Kho" size="large" />
        </Form.Item>
        <Form.Item name="moduleKey" label="Mã Module (VD: devices)" rules={[{ required: true }]}>
          <Input placeholder="vd: files" size="large" />
        </Form.Item>
        <Form.Item name="actions" label="Các hành động cần tạo">
          <Checkbox.Group options={[
            { label: 'Xem danh sách', value: 'list' },
            { label: 'Xem chi tiết', value: 'read' },
            { label: 'Thêm mới', value: 'create' },
            { label: 'Cập nhật', value: 'update' },
            { label: 'Xóa', value: 'delete' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BulkModal;
