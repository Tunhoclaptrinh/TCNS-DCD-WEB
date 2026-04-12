import React from 'react';
import { Col, Form, Input, Row, Select, Switch, Divider, DatePicker, AutoComplete, Tooltip, Image } from 'antd';
import type { FormInstance } from 'antd';
import { UserOutlined, TeamOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE_URL } from '@/config/axios.config';
import FormModal from '../../../components/common/FormModal';
import FileUpload from '../../../components/common/Upload/FileUpload';

interface UsersFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
  generations: { id: number; name: string }[];
}

const DEPARTMENT_OPTIONS = ['Tài chính', 'Truyền thông', 'Nhân sự'];

const UsersForm: React.FC<UsersFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
  generations,
}) => {

  // No manual fetch needed anymore as it comes via props

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
        <Row gutter={[24, 16]}>
          <Col xs={24} md={6}>
            <Form.Item label="Ảnh đại diện" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.avatar !== curr.avatar}>
                  {({ getFieldValue }) => {
                    const avatar = getFieldValue('avatar');
                    const apiHost = API_BASE_URL.replace(/\/api$/, '');
                    const fullUrl = avatar ? (avatar.startsWith('http') ? avatar : `${apiHost}${avatar}`) : '';
                    const fileName = avatar ? avatar.split('/').pop() : '';
                    
                    return (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          position: 'relative', 
                          width: 100, 
                          height: 100, 
                          borderRadius: '50%', 
                          overflow: 'hidden', 
                          border: '2px solid #f0f0f0', 
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          margin: '0 auto 12px'
                        }}>
                          {fullUrl ? (
                            <Image 
                              src={fullUrl} 
                              alt="Avatar" 
                              width={100} 
                              height={100} 
                              style={{ objectFit: 'cover' }} 
                              fallback="https://via.placeholder.com/100?text=Error"
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', background: '#fafafa' }}>
                              <UserOutlined style={{ fontSize: 40 }} />
                            </div>
                          )}
                        </div>
                        {fileName && (
                          <Tooltip title={fileName}>
                            <div style={{ 
                              fontSize: 11, 
                              color: '#8c8c8c', 
                              maxWidth: 120, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              margin: '0 auto'
                            }}>
                              {fileName}
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    );
                  }}
                </Form.Item>
                <Form.Item name="avatar" noStyle>
                  <FileUpload type='general' mode='file' showList={false} accept="image/*" maxCount={1} maxSize={2}/>
                </Form.Item>
              </div>
            </Form.Item>
          </Col>

          <Col xs={24} md={18}>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="lastName" label="Họ và tên đệm" rules={[{ required: true, message: 'Vui lòng nhập họ và tên đệm' }]}>
                  <Input placeholder="Nhập họ và tên đệm" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="firstName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                  <Input placeholder="Nhập tên" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
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
                  rules={[{ required: true, message: 'Vui lòng nhập username' }]}
                >
                  <Input placeholder="Nhập username" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
                  <Input placeholder="example@gmail.com" disabled={!!editingId} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="gender" label="Giới tính">
                  <Select placeholder="Chọn giới tính" options={[
                    { label: 'Nam', value: 'male' },
                    { label: 'Nữ', value: 'female' },
                    { label: 'Khác', value: 'other' },
                  ]} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item 
                  name="dob" 
                  label="Ngày sinh"
                  getValueProps={(value) => ({
                    value: value ? dayjs(value) : undefined,
                  })}
                  getValueFromEvent={(value) => (value ? value.format('YYYY-MM-DD') : '')}
                >
                  <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày sinh" format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' }]}>
                  <Input placeholder="Nhập số điện thoại" />
                </Form.Item>
              </Col>
              
              
            </Row>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <TeamOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin tổ chức & Công việc</span>
        </Divider>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <Form.Item name="studentId" label="Mã số sinh viên">
              <Input placeholder="Nhập MSSV" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="classId" label="Lớp">
              <Input placeholder="Nhập mã lớp" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="generationId" label="Khóa/Thế hệ">
              <Select
                placeholder="Chọn Khóa/Thế hệ"
                options={generations.map(g => ({ label: g.name, value: g.id }))}
                showSearch
                filterOption={(inputValue, option) =>
                  String(option?.label || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="position" label="Chức vụ">
              <Select placeholder="Chọn chức vụ" options={[
                { label: 'Chủ tịch/Trưởng ban', value: 'ctc' },
                { label: 'Thành viên chính thức', value: 'tv' },
                { label: 'Thành viên tập sự', value: 'tvb' },
                { label: 'Phó ban', value: 'pb' },
                { label: 'Trưởng ban', value: 'tb' },
                { label: 'Đội trưởng', value: 'dt' },
              ]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="department" label="Ban/Bộ phận">
              <Select placeholder="Chọn ban" options={DEPARTMENT_OPTIONS.map(d => ({ label: d, value: d }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="hometown" label="Quê quán">
              <Input placeholder="Nhập quê quán" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="address" label="Địa chỉ hiện tại">
              <Input placeholder="Nhập địa chỉ" />
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