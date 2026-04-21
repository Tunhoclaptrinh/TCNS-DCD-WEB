import React from 'react';
import { Form, Input, InputNumber, Button, Space, Select, Typography, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ClusterOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const POSITION_OPTIONS = [
  { label: 'Cộng tác viên (CTV)', value: 'ctc' },
  { label: 'Thành viên chính thức', value: 'tv' },
  { label: 'Thành viên ban', value: 'tvb' },
  { label: 'Phó ban', value: 'pb' },
  { label: 'Trưởng ban', value: 'tb' },
  { label: 'Đội trưởng', value: 'dt' },
];

interface SlotStructureEditorProps {
  form: any;
  name?: string;
  onTotalChange?: (total: number) => void;
}

const SlotStructureEditor: React.FC<SlotStructureEditorProps> = ({ form, name = 'slotStructure', onTotalChange }) => {
  const watchStructure = Form.useWatch(name, form) || [];

  React.useEffect(() => {
    const total = watchStructure.reduce((acc: number, curr: any) => acc + (curr?.slots || 0), 0);
    onTotalChange?.(total);
  }, [watchStructure, onTotalChange]);

  const totalSlots = watchStructure.reduce((acc: number, c: any) => acc + (c?.slots || 0), 0);

  return (
    <div style={{ marginTop: 8, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <ClusterOutlined style={{ color: '#64748b' }} />
          <Text strong style={{ fontSize: 13, color: '#334155' }}>CƠ CẤU NHÂN SỰ</Text>
        </Space>
        {totalSlots > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tổng slot cơ cấu: <Text strong>{totalSlots}</Text>
          </Text>
        )}
      </div>

      <Form.List name={name} initialValue={[]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            {fields.map(({ key, name, ...restField }) => (
              <div 
                key={key} 
                style={{ 
                  padding: '16px 0', 
                  borderBottom: '1px solid #f1f5f9',
                  position: 'relative'
                }}
              >
                <Row gutter={24} align="top">
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'label']}
                      rules={[{ required: true, message: 'VD: Thành viên, CTV...' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Tên nhóm (VD: CTV, TV...)" style={{ borderRadius: 6 }} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'slots']}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber 
                        min={1} 
                        style={{ width: '100%', borderRadius: 6 }} 
                        placeholder="Số slot"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item
                      {...restField}
                      name={[name, 'positions']}
                      rules={[{ required: true, message: 'Chọn ít nhất 1 chức vụ' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Chức vụ áp dụng..."
                        options={POSITION_OPTIONS}
                        maxTagCount="responsive"
                        style={{ borderRadius: 6 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => remove(name)}
                      style={{ marginTop: 4 }}
                    />
                  </Col>
                </Row>
              </div>
            ))}
            
            <div style={{ marginTop: 16 }}>
              <Button 
                type="dashed" 
                onClick={() => add({ label: '', slots: 1, positions: [] })} 
                icon={<PlusOutlined />}
                style={{ borderRadius: 8, height: 40, borderStyle: 'dashed', color: '#64748b' }}
              >
                Thêm nhóm phân bổ nhân sự
              </Button>
            </div>
          </Space>
        )}
      </Form.List>
    </div>
  );
};

export default SlotStructureEditor;
