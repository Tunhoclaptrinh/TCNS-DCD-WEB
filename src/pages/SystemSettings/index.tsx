import React, { useEffect, useState } from 'react';
import { Form, Input, message, Spin, Typography, Collapse, Select, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import axiosInstance from '@/config/axios.config';
import { Button as CustomButton } from '@/components/common';
import roleService, { Role } from '@/services/role.service';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [roleList, setRoleList] = useState<Role[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await roleService.getAll({ limit: 100 });
      if (res.success && res.data) {
        setRoleList(res.data);
      }
    } catch (error) {
      console.error('Fetch roles error:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/system-settings');
      const dataList = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      if (dataList.length > 0) {
        const settings: Record<string, any> = {};
        dataList.forEach((s: any) => {
          if (s.key) {
            let val = s.value;
            if (s.key === 'DEPARTMENT_CONFIGS') {
              try { val = JSON.parse(s.value); } catch(e) {}
            }
            settings[s.key] = val;
            // Map case variations
            const upperKey = String(s.key).toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '');
            settings[upperKey] = val;
          }
        });
        form.setFieldsValue(settings);
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
      message.error('Lỗi khi tải cài đặt hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (sectionKey: string, fieldNames: string[]) => {
    try {
      await form.validateFields(fieldNames);
      setSavingKey(sectionKey);
      const allValues = form.getFieldsValue(fieldNames);
      
      // Serialize arrays/objects to JSON strings for specific keys
      if (allValues.DEPARTMENT_CONFIGS && typeof allValues.DEPARTMENT_CONFIGS === 'object') {
         allValues.DEPARTMENT_CONFIGS = JSON.stringify(allValues.DEPARTMENT_CONFIGS);
      }

      const res = await axiosInstance.post('/system-settings/bulk', allValues);
      if (res.success || res.data?.success) {
        message.success(res.message || res.data?.message || 'Cập nhật cài đặt thành công');
      }
    } catch (error: any) {
      if (error?.errorFields) return; // Validation error
      console.error('Save section error:', error);
      message.error('Lỗi khi cập nhật cài đặt');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Cài đặt chung</Title>
        </div>
      </div>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            DEFAULT_IMPORT_PASSWORD_STRATEGY: 'fixed',
            DEFAULT_IMPORT_PASSWORD: 'TCNS@2026'
          }}
        >
          <Collapse
            defaultActiveKey={[]}
            items={[
              {
                key: 'import_export',
                label: <Text strong>Cấu hình Import / Export</Text>,
                children: (
                  <div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="DEFAULT_IMPORT_PASSWORD_STRATEGY"
                          label="Cơ chế cấp mật khẩu mặc định"
                          tooltip="Chọn cách hệ thống tự động tạo mật khẩu cho thành viên mới khi cột Mật khẩu bị bỏ trống trong file Import."
                        >
                          <Select size="large">
                            <Select.Option value="fixed">Dùng một mật khẩu cố định chung</Select.Option>
                            <Select.Option value="dob">Dùng Ngày sinh (Định dạng: DDMMYYYY)</Select.Option>
                            <Select.Option value="studentId">Dùng Mã sinh viên</Select.Option>
                            <Select.Option value="cccd">Dùng Số CCCD</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, current) => prev.DEFAULT_IMPORT_PASSWORD_STRATEGY !== current.DEFAULT_IMPORT_PASSWORD_STRATEGY}
                        >
                          {({ getFieldValue }) => {
                            const strategy = getFieldValue('DEFAULT_IMPORT_PASSWORD_STRATEGY');
                            return (
                              <Form.Item
                                name="DEFAULT_IMPORT_PASSWORD"
                                label={strategy === 'fixed' ? 'Mật khẩu cố định' : 'Mật khẩu dự phòng'}
                                tooltip={strategy === 'fixed' ? 'Mật khẩu chung cho tất cả thành viên mới' : 'Mật khẩu dự phòng trong trường hợp thành viên không có thông tin trên (hoặc thông tin sai định dạng).'}
                                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                              >
                                <Input.Password size="large" disabled={strategy !== 'fixed'} placeholder="Ví dụ: TCNS@2026" />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <CustomButton 
                        variant="primary"
                        buttonSize="small"
                        icon={<SaveOutlined />} 
                        loading={savingKey === 'import_export'}
                        onClick={() => saveSection('import_export', ['DEFAULT_IMPORT_PASSWORD_STRATEGY', 'DEFAULT_IMPORT_PASSWORD'])}
                        style={{ minWidth: 88 }}
                      >
                        Lưu lại
                      </CustomButton>
                    </div>
                  </div>
                )
              },
              {
                key: 'security_network',
                label: <Text strong>Bảo mật & Mạng (Địa chỉ IP Điểm danh)</Text>,
                children: (
                  <div>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="ALLOWED_IP_RANGES"
                          label="Dải IP được phép điểm danh ca trực"
                          tooltip="Nhập các dải địa chỉ IP Wifi/Văn phòng được phép bấm điểm danh. Phân cách nhiều IP bằng dấu phẩy (,). Để trống nếu cho phép tất cả các IP."
                        >
                          <Input.TextArea 
                            rows={3} 
                            placeholder="Ví dụ: 14.225.21.10, 118.69.18.0/24" 
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <CustomButton 
                        variant="primary"
                        buttonSize="small"
                        icon={<SaveOutlined />} 
                        loading={savingKey === 'security_network'}
                        onClick={() => saveSection('security_network', ['ALLOWED_IP_RANGES'])}
                        style={{ minWidth: 88 }}
                      >
                        Lưu lại
                      </CustomButton>
                    </div>
                  </div>
                )
              },
              {
                key: 'department_configs',
                label: <Text strong>Phòng Ban & Phân Quyền (RBAC)</Text>,
                children: (
                  <div>
                    {/* Fixed Executive Block */}
                    <div style={{ marginBottom: 24, padding: 16, border: '1px solid #1677ff', backgroundColor: '#e6f4ff', borderRadius: 8 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item label="Đơn vị (Hệ thống)" style={{ marginBottom: 0 }}>
                            <Input value="Ban Điều Hành / Đội trưởng" disabled />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Mã Ban (ID)" style={{ marginBottom: 0 }}>
                            <Input value="executive" disabled />
                          </Form.Item>
                        </Col>
                        <Col span={8} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Text type="secondary" italic>(Cố định - Không thể xóa)</Text>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: 16 }}>
                        <Col span={24}>
                          <Form.Item label="Vai trò - Đội trưởng" style={{ marginBottom: 0 }}>
                            <Select mode="multiple" disabled value={['admin']} options={[{ label: 'ADMIN (Đội trưởng) (admin)', value: 'admin' }]} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>

                    <Form.List name="DEPARTMENT_CONFIGS">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <div key={key} style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
                              <Row gutter={16}>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'name']}
                                    label="Tên Phòng Ban"
                                    rules={[{ required: true, message: 'Nhập tên ban' }]}
                                  >
                                    <Input placeholder="Ví dụ: Nhân sự" />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'id']}
                                    label="Mã Ban (ID)"
                                    rules={[{ required: true, message: 'Nhập ID' }]}
                                  >
                                    <Input placeholder="Ví dụ: nhan-su" />
                                  </Form.Item>
                                </Col>
                                <Col span={8} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <CustomButton variant="danger" onClick={() => remove(name)} icon={<DeleteOutlined />}>Xóa Ban</CustomButton>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'roles', 'tb']}
                                    label="Vai trò - Trưởng ban"
                                  >
                                    <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map(r => ({ label: `${r.name} (${(r as any).key})`, value: (r as any).key }))} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'roles', 'pb']}
                                    label="Vai trò - Phó ban"
                                  >
                                    <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map(r => ({ label: `${r.name} (${(r as any).key})`, value: (r as any).key }))} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'roles', 'tvb']}
                                    label="Vai trò - Thành viên ban"
                                  >
                                    <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map(r => ({ label: `${r.name} (${(r as any).key})`, value: (r as any).key }))} />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
                          ))}
                          <Form.Item>
                            <CustomButton onClick={() => add()} block icon={<PlusOutlined />}>
                              Thêm Phòng Ban
                            </CustomButton>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <CustomButton 
                        variant="primary"
                        buttonSize="small"
                        icon={<SaveOutlined />} 
                        loading={savingKey === 'department_configs'}
                        onClick={() => saveSection('department_configs', ['DEPARTMENT_CONFIGS'])}
                        style={{ minWidth: 88 }}
                      >
                        Lưu cấu hình
                      </CustomButton>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Form>
      </Spin>
    </div>
  );
};

export default SystemSettingsPage;
