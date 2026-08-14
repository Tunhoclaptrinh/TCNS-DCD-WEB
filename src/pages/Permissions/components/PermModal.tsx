import React from 'react';
import { Form, Input, Select, Divider, Typography } from 'antd';
import FormModal from '@/components/common/FormModal';
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
    <FormModal
      open={visible}
      entityName="Quyền hạn"
      isEditing={!!editingPerm}
      form={form}
      onCancel={onCancel}
      onOk={onSave}
      okText="Lưu lại"
      cancelText="Hủy"
      width={500}
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
    </FormModal>
  );
};

export default PermModal;
