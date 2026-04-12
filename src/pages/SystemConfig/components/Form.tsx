import React from 'react';
import { Form, Input, Switch, Divider } from 'antd';
import type { FormInstance } from 'antd';
import { TeamOutlined, ScheduleOutlined } from '@ant-design/icons';
import FormModal from '../../../components/common/FormModal';

interface GenerationFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

const GenerationForm: React.FC<GenerationFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
}) => {
  return (
    <FormModal
      open={open}
      title={editingId ? 'Cập nhật Khóa/Thế hệ' : 'Thêm mới Khóa/Thế hệ'}
      onCancel={onCancel}
      onOk={onOk}
      form={form}
      width={600}
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <TeamOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin định danh</span>
        </Divider>
        
        <Form.Item 
          name="name" 
          label="Tên Khóa/Thế hệ" 
          rules={[{ required: true, message: 'Vui lòng nhập tên Khóa/Thế hệ' }]}
        >
          <Input placeholder="Ví dụ: Gen 1, Niên khóa 2024, ..." />
        </Form.Item>

        <Form.Item name="description" label="Mô tả / Ghi chú">
          <Input.TextArea rows={3} placeholder="Mô tả thêm về khóa này nếu cần" />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ScheduleOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Trạng thái hệ thống</span>
        </Divider>

        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
           <Form.Item 
            name="isCurrent" 
            label="Đặt làm Khóa hiện tại" 
            valuePropName="checked"
            extra="Nếu bật, đây sẽ là khóa mặc định khi thêm thành viên mới. Các khóa khác sẽ tự động bị hủy dấu hiện tại."
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
        </div>

        <Form.Item 
          name="isActive" 
          label="Trạng thái kích hoạt" 
          valuePropName="checked"
          initialValue={true}
        >
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default GenerationForm;
