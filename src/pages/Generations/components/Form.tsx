import React from 'react';
import { Form, Input, Checkbox, Tooltip, Divider, Space } from 'antd';
import type { FormInstance } from 'antd';
import { TeamOutlined, ScheduleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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
      entityName="Khóa/Thế hệ"
      isEditing={!!editingId}
      icon={<TeamOutlined style={{ color: 'var(--primary-color)' }} />}
      form={form}
      okText="Lưu lại"
      cancelText="Hủy"
      onOk={onOk}
      onCancel={onCancel}
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

        <div style={{ background: '#f9f9f9', padding: '16px 20px', borderRadius: 8, marginBottom: 16 }}>
          <Form.Item 
            name="isCurrent" 
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Checkbox>
              <Space size={6}>
                <span style={{ fontWeight: 500 }}>Đặt làm Khóa hiện tại</span>
                <Tooltip title="Nếu bật, đây sẽ là khóa mặc định khi thêm thành viên mới. Các khóa khác sẽ tự động bị hủy dấu hiện tại.">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
                </Tooltip>
              </Space>
            </Checkbox>
          </Form.Item>

          <Form.Item 
            name="isActive" 
            valuePropName="checked"
            initialValue={true}
            style={{ marginBottom: 0 }}
          >
            <Checkbox>
              <Space size={6}>
                <span style={{ fontWeight: 500 }}>Trạng thái hoạt động (Đang hoạt động)</span>
                <Tooltip title="Kích hoạt để cho phép gán thành viên vào Khóa/Thế hệ này trong phần quản lý Nhân sự.">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
                </Tooltip>
              </Space>
            </Checkbox>
          </Form.Item>
        </div>
      </div>
    </FormModal>
  );
};

export default GenerationForm;
