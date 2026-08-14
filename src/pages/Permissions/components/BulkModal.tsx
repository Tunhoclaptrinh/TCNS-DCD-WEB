import React from 'react';
import { Form, Input, Checkbox, Space, Typography } from 'antd';
import FormModal from '@/components/common/FormModal';
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
    <FormModal
      open={visible}
      title={
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Space>
            <ThunderboltOutlined style={{ color: '#722ed1' }} />
            <Text strong style={{ fontSize: 18 }}>Tạo nhanh bộ quyền CRUD</Text>
          </Space>
        </div>
      }
      form={form}
      onCancel={onCancel}
      onOk={onFinish}
      okText="Lưu lại"
      cancelText="Hủy"
      width={550}
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
    </FormModal>
  );
};

export default BulkModal;
