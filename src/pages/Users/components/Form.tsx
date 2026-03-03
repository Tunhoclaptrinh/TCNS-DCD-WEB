import { Form, Input, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import FormModal from '../../../components/common/FormModal';

interface UsersFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

const UsersForm: React.FC<UsersFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
}) => {
  return (
    <FormModal
      open={open}
      title={editingId ? 'Cập nhật người dùng' : 'Thêm mới người dùng'}
      onCancel={onCancel}
      onOk={onOk}
      form={form}
    >
      <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
        <Input placeholder="Nhập tên người dùng" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ!' }]}>
        <Input placeholder="example@domain.com" />
      </Form.Item>
      <Form.Item
        name="phone"
        label="Số điện thoại"
        rules={[
          {
            required: true,
            message: 'Vui lòng nhập số điện thoại!',
          },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              if (value.length < 10 || value.length > 11) {
                return Promise.reject(new Error('Số điện thoại phải từ 10-11 ký tự'));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input placeholder="Số điện thoại" />
      </Form.Item>
      {!editingId && (
        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu!' },
            { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
              message: 'Mật khẩu phải gồm chữ hoa, chữ thường và số',
            },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu" />
        </Form.Item>
      )}
      <Form.Item name="role" label="Vai trò">
        <Select
          placeholder="Chọn vai trò"
          options={[
            { label: 'Admin', value: 'admin' },
            { label: 'Staff', value: 'staff' },
            { label: 'Customer', value: 'customer' },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="bio"
        label="Tiểu sử"
        rules={[{ max: 500, message: 'Tiểu sử tối đa 500 ký tự' }]}
      >
        <Input.TextArea rows={3} placeholder="Nhập tiểu sử (không bắt buộc)" />
      </Form.Item>
      <Form.Item name="avatar" label="Avatar URL">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item name="isActive" label="Trạng thái tài khoản" valuePropName="checked">
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
      </Form.Item>
    </FormModal>
  );
};

export default UsersForm;