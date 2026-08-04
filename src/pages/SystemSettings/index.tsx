import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Spin, Typography, Collapse, Select, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import axiosInstance from '@/config/axios.config';

const { Title, Text } = Typography;

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/system-settings');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const settings: Record<string, any> = {};
        res.data.data.forEach((s: any) => {
          settings[s.key] = s.value;
        });
        form.setFieldsValue(settings);
      }
    } catch (error) {
      message.error('Lỗi khi tải cài đặt hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      setSaving(true);
      const res = await axiosInstance.post('/system-settings/bulk', values);
      if (res.data?.success) {
        message.success('Cập nhật cài đặt thành công');
      }
    } catch (error) {
      message.error('Lỗi khi cập nhật cài đặt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Cài đặt chung</Title>
        </div>
      </div>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            DEFAULT_IMPORT_PASSWORD_STRATEGY: 'fixed',
            DEFAULT_IMPORT_PASSWORD: 'TCNS@2026'
          }}
        >
          <Collapse
            defaultActiveKey={['import_export']}
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
                    <div style={{ display: 'flex', justifyContent: 'center'}}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<SaveOutlined />} 
                        loading={saving}
                        style={{ minWidth: 160 }}
                      >
                        Lưu lại
                      </Button>
                    </div>
                  </div>
                )
              }
              // Sau này có thể bổ sung các item khác ở đây
            ]}
          />
        </Form>
      </Spin>
    </div>
  );
};

export default SystemSettingsPage;
