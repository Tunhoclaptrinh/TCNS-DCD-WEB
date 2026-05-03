import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, Space, Typography } from 'antd';
import { UserOutlined, TeamOutlined, SolutionOutlined } from '@ant-design/icons';
import userService from '@/services/user.service';

const { Text } = Typography;

interface QuotaRuleModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (rule: any) => void;
  editingRule?: any;
}

const QuotaRuleModal: React.FC<QuotaRuleModalProps> = ({ open, onCancel, onSubmit, editingRule }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const type = Form.useWatch('type', form);

  useEffect(() => {
    if (open) {
      if (editingRule) {
        form.setFieldsValue(editingRule);
      } else {
        form.resetFields();
        form.setFieldsValue({ type: 'role_group', target: 'member_official', quota: 2.5 });
      }
      
      // Load users if needed
      loadUsers();
    }
  }, [open, editingRule]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userService.getActive();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      const { target, ...rest } = values;
      
      // If multiple targets (from multiple select), split into separate rules
      if (Array.isArray(target)) {
        const rules = target.map(t => ({ ...rest, target: t }));
        onSubmit(rules);
      } else if (typeof target === 'string' && target.includes(',')) {
        // Support comma-separated student IDs in manual input
        const ids = target.split(',').map(id => id.trim()).filter(id => id);
        const rules = ids.map(id => ({ ...rest, target: id }));
        onSubmit(rules);
      } else {
        onSubmit([values]);
      }
    });
  };

  const getTargetOptions = () => {
    switch (type) {
      case 'user':
        return users.map(u => ({ label: `${u.name} (${u.studentId})`, value: u.studentId || u.id }));
      case 'position':
        return [
          { label: 'Trưởng ban (TB)', value: 'tb' },
          { label: 'Phó ban (PB)', value: 'pb' },
          { label: 'Thành viên (TV)', value: 'tv' },
          { label: 'Thành viên ban (TVB)', value: 'tvb' },
          { label: 'Đội trưởng (DT)', value: 'dt' },
          { label: 'Cộng tác viên (CTV)', value: 'ctv' },
        ];
      case 'role_group':
        return [
          { label: 'Thành viên chính thức', value: 'member_official' },
          { label: 'Cộng tác viên', value: 'ctv' },
        ];
      default:
        return [];
    }
  };

  return (
    <Modal
      title={editingRule ? "Chỉnh sửa quy tắc định mức" : "Thêm quy tắc định mức mới"}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item 
          name="type" 
          label={<Text strong>Loại quy tắc</Text>} 
          rules={[{ required: true }]}
        >
          <Select 
            options={[
              { label: <Space><TeamOutlined /> Phân nhóm (Thành viên/CTV)</Space>, value: 'role_group' },
              { label: <Space><SolutionOutlined /> Chức danh cụ thể</Space>, value: 'position' },
              { label: <Space><UserOutlined /> Cá nhân thành viên</Space>, value: 'user' },
            ]} 
            onChange={() => form.setFieldsValue({ target: undefined })}
          />
        </Form.Item>

        <Form.Item 
          name="target" 
          label={<Text strong>Đối tượng áp dụng</Text>} 
          rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đối tượng' }]}
          extra={type === 'user' ? "Có thể chọn nhiều người hoặc nhập danh sách mã sinh viên cách nhau bởi dấu phẩy" : ""}
        >
          {type === 'user' ? (
            <Select 
              mode="tags"
              showSearch
              placeholder="Chọn hoặc nhập mã SV..."
              loading={loadingUsers}
              options={getTargetOptions()}
              tokenSeparators={[',']}
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          ) : (
            <Select 
              placeholder="Chọn đối tượng..."
              options={getTargetOptions()}
            />
          )}
        </Form.Item>

        <Form.Item 
          name="quota" 
          label={<Text strong>Định mức (kíp/tuần)</Text>} 
          rules={[{ required: true, message: 'Vui lòng nhập định mức' }]}
        >
          <InputNumber min={0} step={0.5} style={{ width: '100%' }} addonAfter="kíp" />
        </Form.Item>
        
        <Text type="secondary" style={{ fontSize: 12 }}>
          * Lưu ý: Quy tắc định mức cụ thể sẽ được ưu tiên hơn định mức chung.
        </Text>
      </Form>
    </Modal>
  );
};

export default QuotaRuleModal;
