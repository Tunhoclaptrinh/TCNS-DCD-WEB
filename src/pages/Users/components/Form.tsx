import { Col, Form, Input, Row, Select, Switch, Divider, DatePicker, AutoComplete, Tooltip } from 'antd';
import type { FormInstance } from 'antd';
import { UserOutlined, TeamOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '../../../components/common/FormModal';
import AvatarUploadGroup from './AvatarUploadGroup';

interface UsersFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

const DEPARTMENT_OPTIONS = ['Tài chính', 'Truyền thông', 'Nhân sự'];

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
      title={editingId ? 'Cập nhật thành viên' : 'Thêm mới thành viên'}
      onCancel={onCancel}
      onOk={onOk}
      form={form}
      width={900}
      onValuesChange={(changedValues, allValues) => {
        if (changedValues.lastName !== undefined || changedValues.firstName !== undefined) {
          const lName = allValues.lastName || '';
          const fName = allValues.firstName || '';
          const fullName = `${lName} ${fName}`.trim();
          form.setFieldsValue({ name: fullName });
        }
      }}
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <UserOutlined /> <span style={{ fontSize: 13 }}>Thông tin cá nhân & Định danh</span>
        </Divider>
        <Row gutter={[24, 0]}>
          <Col xs={24} md={8}>
            <Form.Item name="lastName" label="Họ và tên đệm" style={{ marginBottom: 12 }}>
              <Input placeholder="Nhập họ và tên đệm" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="firstName" label="Tên" style={{ marginBottom: 12 }}>
              <Input placeholder="Nhập tên" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="name" 
              label={
                <span>
                  Username &nbsp;
                  <Tooltip title="Tự động tạo từ Họ và Tên nếu không điền">
                    <InfoCircleOutlined style={{ color: '#ccc' }} />
                  </Tooltip>
                </span>
              } 
              style={{ marginBottom: 12 }} 
              rules={[{ required: true, message: 'Vui lòng nhập username' }]}
            >
              <Input placeholder="Nhập username" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={8}>
            <Form.Item name="email" label="Email hệ thống" style={{ marginBottom: 12 }} rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="email@domain.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item 
              name="dob" 
              label="Ngày sinh"
              style={{ marginBottom: 12 }}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : undefined,
              })}
              getValueFromEvent={(value) => (value ? value.format('YYYY-MM-DD') : '')}
            >
              <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày sinh" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="phone" label="Số điện thoại" style={{ marginBottom: 12 }} rules={[{ required: true, message: 'Số điện thoại là bắt buộc' }]}>
              <Input placeholder="09xxxxxxxx" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="hometown" label="Quê quán" style={{ marginBottom: 12 }}>
              <Input placeholder="Nhập quê quán" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="avatar" label="Ảnh đại diện" style={{ marginBottom: 12 }}>
              <AvatarUploadGroup />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item name="bio" label="Ghi chú" style={{ marginBottom: 4 }}>
              <Input.TextArea rows={2} placeholder="Mô tả nội bộ hoặc ghi chú..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
          <TeamOutlined /> <span style={{ fontSize: 13 }}>Thông tin tổ chức</span>
        </Divider>
        <Row gutter={[24, 0]}>
          <Col xs={24} md={8}>
            <Form.Item name="studentId" label="Mã SV" style={{ marginBottom: 12 }}>
              <Input placeholder="Nhập mã sinh viên" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="classId" label="Mã lớp" style={{ marginBottom: 12 }}>
              <Input placeholder="Nhập mã lớp" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="position" label="Hạng/Chức vụ" style={{ marginBottom: 12 }}>
              <Select
                placeholder="Chọn hạng/chức vụ"
                options={[
                  { label: 'Cộng tác viên', value: 'ctc' },
                  { label: 'Thành viên', value: 'tv' },
                  { label: 'Thành viên ban', value: 'tvb' },
                  { label: 'Phó ban', value: 'pb' },
                  { label: 'Trưởng ban', value: 'tb' },
                  { label: 'Đội trưởng', value: 'dt' },
                ]}
              />
            </Form.Item>
          </Col>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.position !== curr.position}>
            {({ getFieldValue }) => {
              const pos = getFieldValue('position');
              const isBanRole = ['pb', 'tb', 'tvb'].includes(pos);
              return (
                <Col xs={24} md={8}>
                  <Form.Item 
                    name="department" 
                    label="Tên Ban" 
                    style={{ marginBottom: 12 }} 
                    rules={[{ required: isBanRole, message: 'Vui lòng nhập tên ban' }]}
                  >
                    <AutoComplete
                      placeholder={isBanRole ? "Chọn hoặc nhập tên ban" : "Không khả dụng"}
                      disabled={!isBanRole}
                      options={DEPARTMENT_OPTIONS.map(d => ({ value: d }))}
                      filterOption={(inputValue, option) =>
                        String(option?.value || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                    />
                  </Form.Item>
                </Col>
              );
            }}
          </Form.Item>
          <Col xs={24} md={8}>
            <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 12 }}>
              <Select
                placeholder="Chọn trạng thái"
                options={[
                  { label: 'Hoạt động', value: 'active' },
                  { label: 'Không hoạt động', value: 'inactive' },
                  { label: 'Khai trừ', value: 'dismissed' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
          <SettingOutlined /> <span style={{ fontSize: 13 }}>Cài đặt trong hệ thống</span>
        </Divider>
        <Row gutter={[24, 0]}>
          <Col xs={24} md={8}>
            <Form.Item name="role" label="Vai trò hệ thống" style={{ marginBottom: 12 }}>
              <Select
                options={[
                  { label: 'Admin', value: 'admin' },
                  { label: 'Staff', value: 'staff' },
                  { label: 'Customer', value: 'customer' },
                ]}
              />
            </Form.Item>
          </Col>
          {!editingId && (
            <Col xs={24} md={8}>
              <Form.Item name="password" label="Mật khẩu" style={{ marginBottom: 12 }} rules={[{ required: true }, { min: 8 }]}>
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} md={8}>
             <Form.Item name="isActive" label="Trạng thái kích hoạt" style={{ marginBottom: 12 }} valuePropName="checked">
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </FormModal>
  );
};

export default UsersForm;