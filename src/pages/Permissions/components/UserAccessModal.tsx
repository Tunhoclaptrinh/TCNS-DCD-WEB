import React from 'react';
import { Modal, Form, Select, Divider, Alert, Row, Col, Typography, Space } from 'antd';
import { Button } from '@/components/common';
import { SafetyCertificateOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { Role } from '@/services/role.service';

const { Text } = Typography;

interface UserAccessModalProps {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  roles: Role[];
  permissionGroups: any[];
  form: any;
}

const UserAccessModal: React.FC<UserAccessModalProps> = ({
  visible,
  onCancel,
  onFinish,
  roles,
  permissionGroups,
  form
}) => {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Space>
            <SafetyCertificateOutlined style={{ color: '#faad14' }} />
            <Text strong style={{ fontSize: 18 }}>Thiết lập quyền đặc biệt</Text>
          </Space>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
          <Button 
            variant="outline" 
            onClick={onCancel}
            style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={() => form.submit()}
            style={{ minWidth: 150, background: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Lưu thiết lập
          </Button>
        </div>
      }
      width={650}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="roleIds" label={<Text strong>Vai trò hệ thống (Groups)</Text>}>
          <Select
            mode="multiple"
            placeholder="Chọn vai trò..."
            style={{ width: '100%' }}
            options={roles.map(r => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />
        <Alert 
          message="Quyền tùy chỉnh sẽ ghi đè lên quyền từ vai trò. Extra sẽ thêm quyền mới, Denied sẽ chặn quyền hiện có."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name={['customPermissions', 'extra']} 
              label={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> Cấp thêm quyền riêng</Space>}
            >
              <Select
                mode="multiple"
                placeholder="Chọn thêm quyền..."
                options={permissionGroups.flatMap(g => g.actions).map(a => ({ label: a.name, value: a.key }))}
                showSearch
                optionFilterProp="label"
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
                options={permissionGroups.flatMap(g => g.actions).map(a => ({ label: a.name, value: a.key }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default UserAccessModal;
