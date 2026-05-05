import React from 'react';
import { Form, Input, Switch, Typography, Divider, Space, InputNumber, Row, Col, Select, Button, Card, Popconfirm, Collapse } from 'antd';
import { LayoutOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, UserOutlined, SolutionOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';
import { DutyTemplate } from '@/services/duty.service';

const { Text } = Typography;

interface GroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingGroup: DutyTemplate | null;
  onSubmit: (values: any) => Promise<void>;
  loading?: boolean;
  departments?: any[];
}

const GroupModal: React.FC<GroupModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingGroup,
  onSubmit,
  loading = false,
  departments = [],
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      if (editingGroup) {
        form.setFieldsValue(editingGroup);
      } else {
        form.resetFields();
      }
    }
  }, [open, editingGroup, form]);

  const handleOk = async (values: any) => {
    await onSubmit(values);
    onSuccess();
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <LayoutOutlined style={{ color: 'var(--primary-color)' }} />
          <span>{editingGroup ? "Sửa Nhóm Bản mẫu" : "Thêm Nhóm Bản mẫu mới"}</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={700}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <LayoutOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin cơ bản</span>
        </Divider>

        <Form.Item 
          name="name" 
          label="Tên nhóm bản mẫu" 
          rules={[{ required: true, message: 'VD: Mùa Đông, Mùa Hè...' }]}
        >
          <Input placeholder="VD: Mùa Đông, Mùa Hè" prefix={<LayoutOutlined style={{ color: 'var(--primary-color)' }} />} />
        </Form.Item>
 
        <Form.Item name="description" label="Mô tả chi tiết">
          <Input.TextArea rows={3} placeholder="Mô tả về quy định trực của mùa này..." />
        </Form.Item>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <SettingOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Cấu hình hệ thống</span>
        </Divider>

        <Form.Item 
          name="isDefault" 
          valuePropName="checked" 
          style={{ marginBottom: 12 }}
          label={<span style={{ fontSize: 13, color: '#64748b' }}>Thiết lập mặc định</span>}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
            <Switch size="small" />
            <Text style={{ fontSize: 13 }}>Đặt làm bản mẫu mặc định cho toàn hệ thống</Text>
          </div>
        </Form.Item>
        <div style={{ paddingLeft: 16, marginBottom: 24 }}>
          <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
            Lưu ý: Chỉ một nhóm bản mẫu có thể được đặt làm mặc định tại một thời điểm.
          </Text>
        </div>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <SolutionOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Định mức & Quy tắc Bản mẫu</span>
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Định mức mặc định</span>} name="defaultQuota">
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="Kíp" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Đơn giá kíp</span>} name="kipPrice">
              <InputNumber min={0} step={1000} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </Col>
        </Row>

        <Collapse 
          ghost 
          expandIconPosition="end"
          items={[{
            key: 'rules',
            label: <Text type="secondary" style={{ fontSize: 12 }}>Thiết lập danh sách quy tắc dập khuôn (Nâng cao)</Text>,
            children: (
              <Form.List name="quotaRules">
                {(fields, { add, remove }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ borderRadius: 12, border: '1px solid #f1f5f9', background: '#f8fafc' }} bodyStyle={{ padding: '12px 16px' }}>
                        <Row gutter={[12, 12]} align="middle">
                          <Col span={8}>
                            <Form.Item {...restField} label={<span style={{fontSize: 11}}>Đối tượng</span>} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                              <Select size="small" options={[
                                { label: 'MSV', value: 'user' },
                                { label: 'Đội trưởng', value: 'dt' },
                                { label: 'Trưởng ban', value: 'tb' },
                                { label: 'Phó ban', value: 'pb' },
                                { label: 'Thành viên', value: 'member_all' },
                                { label: 'CTV', value: 'ctv' },
                              ]} />
                            </Form.Item>
                          </Col>
                          <Col span={9}>
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue }) => {
                                const type = getFieldValue(['quotaRules', name, 'type']);
                                return (
                                  <Form.Item {...restField} label={<span style={{fontSize: 11}}>{type === 'user' ? 'Mã sinh viên' : 'Ban'}</span>} name={[name, 'target']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                    {type === 'user' ? (
                                      <Input size="small" placeholder="MSV..." prefix={<UserOutlined style={{ fontSize: 12 }} />} />
                                    ) : (
                                      <Select size="small" placeholder="Chọn Ban">
                                        <Select.Option value="all">Tất cả các ban</Select.Option>
                                        {departments.map((d: any) => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                                      </Select>
                                    )}
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col span={5}>
                            <Form.Item {...restField} label={<span style={{fontSize: 11}}>Định mức</span>} name={[name, 'quota']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                              <InputNumber size="small" step={0.5} min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={2} style={{ textAlign: 'right', paddingTop: 18 }}>
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button type="dashed" onClick={() => add({ type: 'member_all', target: 'all', quota: 2.5 })} block icon={<PlusOutlined />} style={{ borderRadius: 10 }}>
                      Thêm quy tắc bản mẫu
                    </Button>
                  </div>
                )}
              </Form.List>
            )
          }]}
        />
      </div>
    </FormModal>
  );
};

export default GroupModal;
