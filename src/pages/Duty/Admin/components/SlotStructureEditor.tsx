import React from 'react';
import { Form, Input, InputNumber, Space, Select, Typography, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ClusterOutlined } from '@ant-design/icons';

import Button from '@/components/common/Button';

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
  assignedUsers?: any[];
}

const SlotStructureEditor: React.FC<SlotStructureEditorProps> = ({ 
  form, 
  name = 'slotStructure', 
  onTotalChange,
  assignedUsers = []
}) => {
  const watchStructure = Form.useWatch(name, form) || [];

  React.useEffect(() => {
    const total = watchStructure.reduce((acc: number, curr: any) => acc + (curr?.slots || 0), 0);
    onTotalChange?.(total);
  }, [watchStructure, onTotalChange]);

  const totalSlots = watchStructure.reduce((acc: number, c: any) => acc + (c?.slots || 0), 0);

  const getCountForPositions = (targetPositions: string[]) => {
    if (!targetPositions || targetPositions.length === 0) return 0;
    const lowerTargets = targetPositions.map(p => p.toLowerCase());
    return assignedUsers.filter(u => {
      const uPos = (u.position || '').toLowerCase();
      return lowerTargets.includes(uPos);
    }).length;
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <ClusterOutlined style={{ color: '#64748b' }} />
          <Text strong style={{ fontSize: 14, color: '#334155' }}>CƠ CẤU NHÂN SỰ YÊU CẦU</Text>
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
            {fields.map(({ key, name, ...restField }) => {
              const currentItem = watchStructure[name];
              const currentCount = getCountForPositions(currentItem?.positions || []);
              const requiredSlots = currentItem?.slots || 0;
              const isMet = currentCount >= requiredSlots && requiredSlots > 0;

              return (
                <div 
                  key={key} 
                  style={{ 
                    padding: '16px 0', 
                    borderBottom: '1px solid #f1f5f9',
                    position: 'relative'
                  }}
                >
                  <Row gutter={24} align="top">
                    <Col span={7}>
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: 'VD: Thành viên, CTV...' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Tên nhóm (VD: CTV, TV...)" />
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
                          style={{ width: '100%' }} 
                          placeholder="Số slot"
                        />
                      </Form.Item>
                      {requiredSlots > 0 && (
                        <div style={{ 
                          fontSize: 11, 
                          marginTop: 4, 
                          color: isMet ? '#16a34a' : '#64748b',
                          fontWeight: isMet ? 600 : 400 
                        }}>
                          Hiện có: {currentCount}/{requiredSlots}
                        </div>
                      )}
                    </Col>
                    <Col span={11}>
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
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button 
                        variant="ghost" 
                        icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} 
                        onClick={() => remove(name)}
                        style={{ marginTop: 4 }}
                      />
                    </Col>
                  </Row>
                </div>
              );
            })}
            
            <div style={{ marginTop: 16 }}>
              <Button 
                variant="outline" 
                buttonSize="small"
                onClick={() => add({ label: '', slots: 1, positions: [] })} 
                icon={<PlusOutlined />}
                style={{ borderStyle: 'dashed', color: '#64748b', borderColor: '#cbd5e1' }}
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
