import React, { useEffect, useState } from 'react';
import { Form, Input, message, Spin, Typography, Collapse, Select, Row, Col, Tooltip, Button, InputNumber, Checkbox } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import axiosInstance from '@/config/axios.config';
import { Button as CustomButton } from '@/components/common';
import roleService, { Role } from '@/services/role.service';
import dutyService from '@/services/duty.service';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { DEFAULT_VIOLATION_TYPES } from '@/pages/Duty/Admin/components/AdminDutySlotModal';

// Flag khóa không cho sửa/xóa các ban mặc định hệ thống (đổi thành false khi muốn mở khóa)
const LOCK_DEFAULT_DEPARTMENTS = true;
const DEFAULT_DEPARTMENT_IDS = ['nhan-su', 'truyen-thong', 'tai-chinh', 'khac'];
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
      const [res, dutyRes] = await Promise.all([
        axiosInstance.get('/system-settings'),
        dutyService.getDutySettings().catch(() => null),
      ]);

      const settings: Record<string, any> = {};

      const dataList = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      dataList.forEach((s: any) => {
        if (s.key) {
          let val = s.value;
          if (s.key === 'DEPARTMENT_CONFIGS' || s.key === 'DEPARTMENTCONFIGS') {
            try { val = typeof s.value === 'string' ? JSON.parse(s.value) : s.value; } catch(e) {}
          }
          settings[s.key] = val;
          if (s.key === 'DEPARTMENTCONFIGS') {
            settings['DEPARTMENT_CONFIGS'] = val;
          }
          const upperKey = String(s.key).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
          settings[upperKey] = val;
        }
      });

      // Single source of truth for all duty settings: duty_settings
      if (dutyRes?.data) {
        Object.assign(settings, dutyRes.data);
        if (dutyRes.data.violationTypes) {
          settings.DUTY_VIOLATION_TYPES = dutyRes.data.violationTypes;
        }
        if (dutyRes.data.allowedIpRanges) {
          const ipStr = Array.isArray(dutyRes.data.allowedIpRanges)
            ? dutyRes.data.allowedIpRanges.join(', ')
            : dutyRes.data.allowedIpRanges;
          settings.allowedIpRanges = ipStr;
          settings.ALLOWED_IP_RANGES = ipStr;
        }
      }

      if (!settings.DUTY_VIOLATION_TYPES || !Array.isArray(settings.DUTY_VIOLATION_TYPES) || settings.DUTY_VIOLATION_TYPES.length === 0) {
        settings.DUTY_VIOLATION_TYPES = DEFAULT_VIOLATION_TYPES;
      }

      form.setFieldsValue(settings);
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
      if (allValues.DUTY_VIOLATION_TYPES && typeof allValues.DUTY_VIOLATION_TYPES === 'object') {
         allValues.DUTY_VIOLATION_TYPES = JSON.stringify(allValues.DUTY_VIOLATION_TYPES);
      }

      if (typeof allValues.allowedIpRanges === 'string') {
        allValues.allowedIpRanges = allValues.allowedIpRanges
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      if (sectionKey === 'general_duty' || sectionKey === 'security_network' || sectionKey === 'duty_violation_types') {
        if (sectionKey === 'duty_violation_types' && allValues.DUTY_VIOLATION_TYPES) {
          allValues.violationTypes = typeof allValues.DUTY_VIOLATION_TYPES === 'string'
            ? JSON.parse(allValues.DUTY_VIOLATION_TYPES)
            : allValues.DUTY_VIOLATION_TYPES;
        }
        await dutyService.updateDutySettings(allValues);
        message.success('Cập nhật cài đặt thành công');
        await fetchSettings();
        return;
      }

      const res: any = await axiosInstance.post('/system-settings/bulk', allValues);
      if (res?.success || res?.data?.success) {
        message.success(res?.message || res?.data?.message || 'Cập nhật cài đặt thành công');
        await fetchSettings();
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
                          {fields.map(({ key, name, ...restField }) => {
                            const itemData = form.getFieldValue(['DEPARTMENT_CONFIGS', name]) || {};
                            const isDefault = LOCK_DEFAULT_DEPARTMENTS && DEFAULT_DEPARTMENT_IDS.includes(itemData.id);

                            return (
                              <div key={key} style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8, backgroundColor: isDefault ? '#fafafa' : '#ffffff' }}>
                                <Row gutter={16}>
                                  <Col span={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'name']}
                                      label="Tên Phòng Ban"
                                      rules={[{ required: true, message: 'Nhập tên ban' }]}
                                    >
                                      <Input placeholder="Ví dụ: Nhân sự" disabled={isDefault} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'id']}
                                      label="Mã Ban (ID)"
                                      rules={[{ required: true, message: 'Nhập ID' }]}
                                    >
                                      <Input placeholder="Ví dụ: nhan-su" disabled={isDefault} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <Tooltip title={isDefault ? "Ban mặc định hệ thống - Không thể xóa" : "Xóa phòng ban này"}>
                                      <Button 
                                        type="text" 
                                        danger 
                                        shape="circle" 
                                        disabled={isDefault}
                                        icon={<DeleteOutlined style={{ fontSize: 16 }} />} 
                                        onClick={() => !isDefault && remove(name)} 
                                      />
                                    </Tooltip>
                                  </Col>
                                </Row>

                                <Row gutter={16}>
                                  <Col span={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'roles', 'tb']}
                                      label="Vai trò - Trưởng ban"
                                    >
                                      <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map((r: any) => ({ label: `${r.name} (${r.key})`, value: r.key }))} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'roles', 'pb']}
                                      label="Vai trò - Phó ban"
                                    >
                                      <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map((r: any) => ({ label: `${r.name} (${r.key})`, value: r.key }))} />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'roles', 'tvb']}
                                      label="Vai trò - Thành viên ban"
                                    >
                                      <Select mode="multiple" placeholder="Chọn vai trò" options={roleList.map((r: any) => ({ label: `${r.name} (${r.key})`, value: r.key }))} />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </div>
                            );
                          })}
                          <Form.Item>
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              Thêm Phòng Ban
                            </Button>
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
              },
              {
                key: 'general_duty',
                label: <Text strong>Cấu hình chung & Chính sách Kíp trực</Text>,
                children: (
                  <div>
                    <Row gutter={[16, 12]}>
                      {/* 1. Mở Tự điểm danh trước ca */}
                      <Col span={12}>
                        <Form.Item
                          name="selfCheckInBeforeMinutes"
                          label="Mở Tự điểm danh trước ca (phút)"
                          tooltip="Số phút cho phép thành viên tự bấm điểm danh trước khi kíp trực bắt đầu. Mặc định 15 phút."
                        >
                          <InputNumber 
                            min={0}
                            max={9999}
                            addonAfter="phút"
                            style={{ width: '100%' }}
                            placeholder="15" 
                          />
                        </Form.Item>
                      </Col>

                      {/* 2. Chính sách Hủy kíp khi FULL */}
                      <Col span={12}>
                        <Form.Item
                          name="allowUnregisterWhenFull"
                          valuePropName="checked"
                          label="Chính sách Hủy kíp khi FULL"
                          tooltip="Bật tùy chọn này để cho phép thành viên tự hủy đăng ký ngay cả khi kíp trực đã đủ người (FULL)."
                        >
                          <Checkbox style={{ fontSize: 13, fontWeight: 500 }}>
                            Cho phép tự hủy khi kíp đã FULL
                          </Checkbox>
                        </Form.Item>
                      </Col>

                      {/* 3. Bật giới hạn kíp trực theo tuần */}
                      <Col span={12}>
                        <Form.Item
                          name="weeklyLimitEnabled"
                          valuePropName="checked"
                          label="Giới hạn kíp trực theo tuần"
                          tooltip="Kích hoạt tính năng giới hạn số kíp trực tối đa mỗi thành viên được đăng ký trong 1 tuần."
                        >
                          <Checkbox style={{ fontSize: 13, fontWeight: 500 }}>
                            Bật giới hạn số kíp trực tối đa / tuần
                          </Checkbox>
                        </Form.Item>
                      </Col>

                      {/* 4. Số kíp tối đa mỗi tuần */}
                      <Col span={12}>
                        <Form.Item
                          name="weeklyKipLimit"
                          label="Số kíp trực tối đa / tuần"
                          tooltip="Số kíp tối đa thành viên được trực trong tuần (nhập 0 nếu không muốn giới hạn)."
                        >
                          <InputNumber 
                            min={0}
                            max={50}
                            addonAfter="kíp / tuần"
                            style={{ width: '100%' }}
                            placeholder="0 (Không giới hạn)" 
                          />
                        </Form.Item>
                      </Col>

                      {/* 5. Định mức kíp trực (Quota) */}
                      <Col span={12}>
                        <Form.Item
                          name="defaultQuota"
                          label="Định mức kíp trực tối thiểu mặc định"
                          tooltip="Định mức kíp trực tối thiểu mặc định áp dụng cho thành viên (kíp/tháng)."
                        >
                          <InputNumber 
                            min={0}
                            step={0.5}
                            addonAfter="kíp / tháng"
                            style={{ width: '100%' }}
                            placeholder="2.5" 
                          />
                        </Form.Item>
                      </Col>

                      {/* 6. Đơn giá kíp trực */}
                      <Col span={12}>
                        <Form.Item
                          name="kipPrice"
                          label="Đơn giá tiền trực mặc định (VNĐ/kíp)"
                          tooltip="Mức thù lao mặc định (VNĐ/kíp) làm giá trị nền (Fallback). Nếu đợt trực hoặc đối tượng có đơn giá riêng, hệ thống sẽ ưu tiên áp dụng đơn giá riêng đó."
                        >
                          <InputNumber 
                            min={0}
                            step={5000}
                            addonAfter="VNĐ"
                            style={{ width: '100%' }}
                            placeholder="0" 
                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                      <CustomButton 
                        variant="primary"
                        buttonSize="small"
                        icon={<SaveOutlined />} 
                        loading={savingKey === 'general_duty'}
                        onClick={() => saveSection('general_duty', [
                          'selfCheckInBeforeMinutes', 
                          'allowUnregisterWhenFull', 
                          'weeklyLimitEnabled', 
                          'weeklyKipLimit', 
                          'defaultQuota', 
                          'kipPrice'
                        ])}
                        style={{ minWidth: 100 }}
                      >
                        Lưu cài đặt kíp
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
                          name="allowedIpRanges"
                          label="Dải IP được phép điểm danh ca trực"
                          tooltip="Nhập các dải địa chỉ IP Wifi/Văn phòng được phép bấm điểm danh. Phân cách bằng dấu phẩy (,). Để trống nếu cho phép tất cả IP."
                        >
                          <Input 
                            placeholder="Ví dụ: 14.225.21.10, 192.168.1.*" 
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
                        onClick={() => saveSection('security_network', ['allowedIpRanges'])}
                        style={{ minWidth: 88 }}
                      >
                        Lưu lại
                      </CustomButton>
                    </div>
                  </div>
                )
              },
              {
                key: 'duty_violation_types',
                label: <Text strong>Danh mục Loại lỗi Vi phạm & Mức phạt Ca trực</Text>,
                children: (
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                      Danh mục này quy định các loại lỗi vi phạm trực nhật, hệ số và mức phạt mặc định được nạp động vào các modal điểm danh & ghi nhận lỗi.
                    </Text>

                    <Form.List name="DUTY_VIOLATION_TYPES">
                      {(fields, { add, remove }) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {fields.map(({ key, name, ...restField }) => {
                            const itemData = form.getFieldValue(['DUTY_VIOLATION_TYPES', name]) || {};
                            const isSystemDefault = ['absent_no_permission', 'late', 'absent_with_permission_late', 'wrong_uniform', 'other'].includes(itemData.key);

                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '12px 16px',
                                  background: isSystemDefault ? '#f8fafc' : '#ffffff',
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <div style={{ flex: 2, minWidth: 160 }}>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên lỗi hiển thị</span>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'label']}
                                    rules={[{ required: true, message: 'Nhập tên lỗi' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên loại lỗi (VD: Đi muộn)" />
                                  </Form.Item>
                                </div>

                                <div style={{ flex: 1.5, minWidth: 140 }}>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Mã key hệ thống</span>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'key']}
                                    rules={[{ required: true, message: 'Nhập mã key' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Mã key (VD: late)" disabled={isSystemDefault} />
                                  </Form.Item>
                                </div>

                                <div style={{ flex: 1.5, minWidth: 130 }}>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Mức phạt mặc định</span>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'defaultPenalty']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      step={5000}
                                      formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                      addonAfter="đ"
                                      style={{ width: '100%' }}
                                      placeholder="Tiền phạt"
                                    />
                                  </Form.Item>
                                </div>

                                <div style={{ width: 100 }}>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Hệ số</span>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'defaultCoeff']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0.1}
                                      max={5}
                                      step={0.5}
                                      addonAfter="x"
                                      style={{ width: '100%' }}
                                      placeholder="Hệ số"
                                    />
                                  </Form.Item>
                                </div>

                                <div style={{ flex: 3, minWidth: 200 }}>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Mô tả quy định vi phạm</span>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'description']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Mô tả chi tiết vi phạm..." />
                                  </Form.Item>
                                </div>

                                <div style={{ paddingTop: 20 }}>
                                  <Tooltip title={isSystemDefault ? "Lỗi mặc định hệ thống - Chỉ cho phép chỉnh sửa thông số, không thể xóa" : "Xóa loại lỗi này"}>
                                    <Button
                                      type="text"
                                      danger
                                      disabled={isSystemDefault}
                                      icon={<DeleteOutlined />}
                                      onClick={() => !isSystemDefault && remove(name)}
                                    />
                                  </Tooltip>
                                </div>
                              </div>
                            );
                          })}

                          <Button
                            type="dashed"
                            onClick={() => add({ key: `custom_${Date.now()}`, label: 'Lỗi vi phạm mới', defaultPenalty: 10000, defaultCoeff: 1, description: '' })}
                            block
                            icon={<PlusOutlined />}
                          >
                            Thêm Loại Lỗi Vi Phạm
                          </Button>
                        </div>
                      )}
                    </Form.List>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                      <CustomButton 
                        variant="primary"
                        buttonSize="small"
                        icon={<SaveOutlined />} 
                        loading={savingKey === 'duty_violation_types'}
                        onClick={() => saveSection('duty_violation_types', ['DUTY_VIOLATION_TYPES'])}
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
