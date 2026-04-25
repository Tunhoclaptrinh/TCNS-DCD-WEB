import React from 'react';
import { Col, Form, Input, Row, Select, Divider, Tooltip, Collapse, Space, Tag, Alert, DatePicker, Image } from 'antd';
import type { FormInstance } from 'antd';
import { 
  UserOutlined, 
  SafetyOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  LockOutlined,
  FacebookOutlined,
  HomeOutlined
} from '@ant-design/icons';
import FormModal from '../../../components/common/FormModal';
import FileUpload from '../../../components/common/Upload/FileUpload';
import { API_BASE_URL } from '@/config/axios.config';

const { Panel } = Collapse;

interface UsersFormProps {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
  generations: { id: number; name: string }[];
  roles: { id: number; name: string }[];
  permissions: { id: number; name: string; key: string; module: string }[];
}

const DEPARTMENT_OPTIONS = ['Nhân sự', 'Tài chính', 'Truyền thông'];

const POSITION_LABELS: Record<string, string> = {
  ctv: 'Cộng tác viên',
  tv: 'Thành viên thường',
  tvb: 'Thành viên ban',
  pb: 'Phó ban',
  tb: 'Trưởng ban',
  ctc: 'Chủ tịch',
  dt: 'Đội trưởng'
};

const UsersForm: React.FC<UsersFormProps> = ({
  open,
  editingId,
  form,
  onOk,
  onCancel,
  generations,
  roles,
  permissions,
}) => {
  // Watch position to handle department visibility/requirement
  const position = Form.useWatch('position', form);

  // Mapping logic for auto-sync (Duplicate of backend logic for instant UI feedback)
  const getSuggestedRoles = (pos: string, dept?: string): number[] => {
    if (!pos) return [];
    const findRoleId = (key: string) => roles.find(r => (r as any).key === key)?.id || null;
    
    switch (pos) {
      case 'dt':
      case 'ctc':
        return [findRoleId('admin')].filter(Boolean) as number[];
      case 'tb':
        return dept === 'Nhân sự' 
          ? [findRoleId('ns_leader')].filter(Boolean) as number[]
          : [findRoleId('other_leader')].filter(Boolean) as number[];
      case 'pb':
        return dept === 'Nhân sự' 
          ? [findRoleId('ns_sub_leader')].filter(Boolean) as number[]
          : [findRoleId('other_sub_leader')].filter(Boolean) as number[];
      case 'tvb':
        return dept === 'Nhân sự' 
          ? [findRoleId('ns_specialist')].filter(Boolean) as number[]
          : [roles.find(r => (r as any).key === 'member')?.id].filter(Boolean) as number[];
      case 'tv':
        return [roles.find(r => (r as any).key === 'member')?.id].filter(Boolean) as number[];
      case 'ctv':
        return [roles.find(r => (r as any).key === 'ctv')?.id].filter(Boolean) as number[];
      default:
        return [];
    }
  };

  const handlePositionChange = (value: string) => {
    const department = form.getFieldValue('department');
    // Clear department if not applicable (CTV/TV)
    if (['ctv', 'tv'].includes(value)) {
      form.setFieldsValue({ department: undefined });
    }
    const suggested = getSuggestedRoles(value, department);
    if (suggested.length > 0) {
      form.setFieldsValue({ roleIds: suggested });
    }
  };

  const handleDepartmentChange = (value: string) => {
    const pos = form.getFieldValue('position');
    const suggested = getSuggestedRoles(pos, value);
    if (suggested.length > 0) {
      form.setFieldsValue({ roleIds: suggested });
    }
  };

  // Helper to determine if department is needed
  const isDeptApplicable = !['ctv', 'tv'].includes(position);

  return (
    <FormModal
      open={open}
      title={editingId ? 'Cập nhật thành viên' : 'Thêm mới thành viên'}
      onCancel={onCancel}
      onOk={onOk}
      form={form}
      width={1000}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ isActive: true, status: 'active', position: 'tv', gender: 'male' }}
        onValuesChange={(changedValues, allValues) => {
          // 1. Auto-generate username (name) from lastName + firstName if name is empty
          if (changedValues.lastName || changedValues.firstName) {
            const name = allValues.name;
            if (!name) {
              const generated = `${allValues.lastName || ''} ${allValues.firstName || ''}`.trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '');
              form.setFieldsValue({ name: generated });
            }
          }

          // 2. Handle role sync on position or department change
          if (changedValues.position !== undefined) {
            handlePositionChange(changedValues.position);
          }
          if (changedValues.department !== undefined) {
            handleDepartmentChange(changedValues.department);
          }
        }}
      >
        <Row gutter={24}>
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
            <Divider orientation="left">Thông tin tài khoản</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="name" 
                  label="Tên đăng nhập (Username)" 
                  rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="nguyenvana" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name={editingId ? "newPassword" : "password"} 
                  label={editingId ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"}
                  rules={[{ required: !editingId, message: 'Vui lòng nhập mật khẩu' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="******" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="lastName" label="Họ và tên đệm" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
                  <Input placeholder="Nguyễn Văn" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="firstName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                  <Input placeholder="An" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  name="studentId" 
                  label="Mã sinh viên" 
                  rules={[{ required: true, message: 'Vui lòng nhập MSV' }]}
                  getValueProps={(value) => ({ value: value === 'string' ? '' : value })}
                >
                  <Input placeholder="202160xxxx" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  name="classId" 
                  label="Mã lớp"
                  getValueProps={(value) => ({ value: value === 'string' ? '' : value })}
                >
                  <Input placeholder="KTPM01-K16" />
                </Form.Item>
              </Col>
            </Row>
          </Col>
        </Row>

        <Divider orientation="left">Thông tin cá nhân & Liên hệ</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="example@gmail.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="0987xxxxxx" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="facebook" label="Link Facebook">
              <Input prefix={<FacebookOutlined />} placeholder="fb.com/username" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Form.Item name="gender" label="Giới tính">
              <Select options={[{ label: 'Nam', value: 'male' }, { label: 'Nữ', value: 'female' }, { label: 'Khác', value: 'other' }]} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="dob" label="Ngày sinh">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="hometown" label="Quê quán">
              <Input prefix={<HomeOutlined />} placeholder="Tỉnh/Thành phố" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Tổ chức & Phân quyền</Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="position" label="Chức vụ" rules={[{ required: true }]}>
              <Select 
                placeholder="Chọn chức vụ" 
                onChange={handlePositionChange}
                options={Object.entries(POSITION_LABELS).map(([val, label]) => ({ label, value: val }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item 
              name="department" 
              label="Ban chuyên môn" 
              rules={[{ required: isDeptApplicable, message: 'Vui lòng chọn ban' }]}
            >
              <Select 
                placeholder={isDeptApplicable ? "Chọn ban" : "Không thuộc ban"} 
                disabled={!isDeptApplicable}
                allowClear 
                onChange={handleDepartmentChange}
                options={DEPARTMENT_OPTIONS.map(d => ({ label: d, value: d }))} 
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="generationId" label="Khóa/Thế hệ" rules={[{ required: true }]}>
              <Select
                placeholder="Chọn Khóa"
                options={generations.map(g => ({ label: g.name, value: g.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="joinDate" label="Ngày vào Đội">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={18}>
            <Form.Item 
              name="roleIds" 
              label={
                <Space>
                  Vai trò hệ thống
                  <Tooltip title="Mặc định sẽ tự động thay đổi theo chức vụ, bạn có thể chỉnh sửa thủ công nếu cần">
                    <InfoCircleOutlined style={{ color: 'var(--primary-color)' }} />
                  </Tooltip>
                </Space>
              }
            >
              <Select
                mode="multiple"
                placeholder="Chọn vai trò"
                style={{ width: '100%' }}
                options={roles.map(r => ({ label: r.name, value: r.id }))}
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="status" label="Trạng thái">
              <Select options={[
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Ngừng hoạt động', value: 'inactive' },
                { label: 'Đã khai trừ', value: 'dismissed' }
              ]} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 8 }}>
          <Col span={24}>
            <Form.Item name="bio" label="Tiểu sử / Ghi chú">
              <Input.TextArea rows={3} placeholder="Giới thiệu bản thân hoặc ghi chú thêm về thành viên này..." />
            </Form.Item>
          </Col>
        </Row>

        <Collapse ghost style={{ marginTop: 8 }}>
          <Panel 
            header={
              <Space>
                <SafetyOutlined style={{ color: '#faad14' }} />
                <span style={{ fontWeight: 600 }}>Cấu hình Quyền tùy chỉnh (Nâng cao)</span>
                <Tag color="orange" style={{ fontSize: 10 }}>Dành cho thành viên đặc biệt</Tag>
              </Space>
            } 
            key="custom_perms"
          >
            <Alert 
              message="Lưu ý: Quyền tùy chỉnh sẽ ghi đè lên quyền từ vai trò. Extra sẽ thêm quyền mới, Denied sẽ chặn quyền hiện có."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item 
                  name={['customPermissions', 'extra']} 
                  label={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> Cấp thêm quyền riêng</Space>}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn thêm quyền..."
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={permissions.map(p => ({ label: `${p.name} (${p.key})`, value: p.key }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name={['customPermissions', 'denied']} 
                  label={<Space><StopOutlined style={{ color: '#ff4d4f' }} /> Chặn quyền cụ thể</Space>}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn quyền cần chặn..."
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={permissions.map(p => ({ label: `${p.name} (${p.key})`, value: p.key }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </Form>
    </FormModal>
  );
};

export default UsersForm;