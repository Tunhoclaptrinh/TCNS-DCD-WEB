import { Col, Form, Input, Row, Select, Switch, Divider, DatePicker, Tooltip, AutoComplete, Upload, Avatar, message } from 'antd';
import type { FormInstance } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import { UserOutlined, TeamOutlined, SettingOutlined, InfoCircleOutlined, UploadOutlined, LoadingOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import FormModal from '../../../components/common/FormModal';
import userService from '../../../services/user.service';

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
  const avatarUrl = Form.useWatch('avatar', form);
  const [uploading, setUploading] = useState(false);

  const handleUploadAvatar = async (file: RcFile): Promise<false> => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được tải lên file ảnh (JPG, PNG, GIF, WEBP...)');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB!');
      return false;
    }

    setUploading(true);
    try {
      const res = await userService.uploadAvatar(file);
      const url = res.data?.url;
      if (url) {
        form.setFieldValue('avatar', url);
        message.success('Tải ảnh đại diện thành công!');
      } else {
        message.error('Không lấy được URL ảnh sau khi upload.');
      }
    } catch (err: any) {
      message.error(err?.message || 'Tải ảnh thất bại, vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
    return false; // prevent default antd upload behavior
  };


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
            <Form.Item label="Ảnh đại diện" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Preview avatar */}
                <Avatar
                  size={64}
                  src={avatarUrl || undefined}
                  icon={!avatarUrl ? <UserOutlined /> : undefined}
                  style={{ flexShrink: 0, border: '1px solid #f0f0f0', background: !avatarUrl ? '#f0f0f0' : undefined }}
                />
                {/* URL input + Upload button */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Form.Item name="avatar" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="https://example.com/photo.jpg"
                      prefix={<PictureOutlined style={{ color: '#bfbfbf' }} />}
                      allowClear
                    />
                  </Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload
                      name="image"
                      showUploadList={false}
                      beforeUpload={handleUploadAvatar}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      disabled={uploading}
                    >
                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: 6,
                          background: '#fafafa',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          color: '#555',
                          opacity: uploading ? 0.65 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {uploading ? <LoadingOutlined /> : <UploadOutlined />}
                        {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                      </button>
                    </Upload>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {avatarUrl
                        ? <span style={{ color: '#52c41a' }}>✓ Đã có ảnh</span>
                        : 'JPG, PNG, GIF, WEBP – tối đa 5MB'}
                    </span>
                  </div>
                </div>
              </div>
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