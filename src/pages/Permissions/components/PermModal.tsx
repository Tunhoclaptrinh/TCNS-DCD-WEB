import React from 'react';
import { Modal, Form, Input, Select, Divider, Typography } from 'antd';
import { Button } from '@/components/common';
import { Permission } from '@/services/permission.service';

const { Text } = Typography;

interface PermModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
  editingPerm: Permission | null;
  permissionGroups: any[];
  form: any;
}

const PermModal: React.FC<PermModalProps> = ({
  visible,
  onCancel,
  onSave,
  editingPerm,
  permissionGroups,
  form
}) => {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Text strong style={{ fontSize: 18 }}>
            {editingPerm ? "Cập nhật quyền hạn" : "Thêm quyền hạn mới"}
          </Text>
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
            style={{ minWidth: 120 }}
          >
            {editingPerm ? "Lưu lại" : "Tạo ngay"}
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
        onFinish={onSave}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="Tên hành động / Quyền hạn"
          rules={[{ required: true, message: 'Nhập tên hành động' }]}
        >
          <Input placeholder="VD: Duyệt đơn xin nghỉ, Gắn kíp trực..." size="large" />
        </Form.Item>

        <Form.Item
          name="key"
          label="Mã định danh (Permission Key)"
          rules={[
            { required: true, message: 'Nhập mã key' },
            { pattern: /^[a-z0-9_:]+$/, message: 'Định dạng module:action (vd: duty:approve)' }
          ]}
        >
          <Input placeholder="vd: users:promote" disabled={!!editingPerm} size="large" />
        </Form.Item>

        <Form.Item
          name="module"
          label="Nhóm chức năng (Module)"
          rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập nhóm chức năng' }]}
        >
          <Select 
            placeholder="Chọn nhóm hoặc nhập tên nhóm mới" 
            showSearch
            size="large"
            options={permissionGroups.map(g => ({ value: g.category, label: g.category }))}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ padding: '0 8px 4px' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Gõ tên nhóm mới và nhấn Enter để tạo
                  </Text>
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả tác vụ này cho phép làm gì..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PermModal;
