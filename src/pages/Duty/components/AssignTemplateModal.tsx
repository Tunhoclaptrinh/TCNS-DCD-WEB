import React from 'react';
import { Modal, Form, Space, Row, Col, Select, DatePicker, Input, List, Button, Divider, Typography, Card, Tag, message } from 'antd';
import { CalendarOutlined, RocketOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';
import dayjs from 'dayjs';

const { Text } = Typography;

interface AssignTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  templateGroups: any[];
  assignments: any[];
}

const AssignTemplateModal: React.FC<AssignTemplateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  templateGroups,
  assignments
}) => {
  const [form] = Form.useForm();
  const [previewShifts, setPreviewShifts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        templateId: values.templateId,
        startDate: values.startDate.startOf('day').toISOString(),
        endDate: values.endDate.endOf('day').toISOString(),
        note: values.note
      };

      const res = await dutyService.createTemplateAssignment(payload);
      if (res.success) {
        message.success("Đã gắn bản mẫu cho giai đoạn");
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      message.error("Lỗi khi gắn bản mẫu: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa thiết lập?',
      content: 'Dữ liệu lịch đã dập khuôn sẽ KHÔNG bị mất, chỉ xóa quy tắc áp dụng này.',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await dutyService.deleteTemplateAssignment(id);
          if (res.success) {
            message.success("Đã xóa gắn bản mẫu");
            onSuccess();
          }
        } catch (err: any) {
          message.error("Lỗi khi xóa: " + (err.response?.data?.message || err.message));
        }
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined style={{ color: '#1890ff' }} />
          <span>Thiết lập lịch trình nâng cao (Stamping)</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
      destroyOnClose
      className="premium-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name="templateId" label={<Text strong>Chọn Nhóm Bản mẫu</Text>} rules={[{ required: true }]}>
              <Select
                size="large"
                placeholder="Mùa Đông, Mùa Hè..."
                onChange={async (val) => {
                  try {
                    const res = await dutyService.getShiftTemplates(val);
                    if (res.success && res.data) setPreviewShifts(res.data);
                  } catch (e) { console.error(e); }
                }}
              >
                {templateGroups.map(g => (
                  <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label={<Text strong>Giai đoạn áp dụng</Text>} required>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Form.Item name="startDate" noStyle rules={[{ required: true }]}>
                  <DatePicker placeholder="Từ ngày" style={{ flex: 1 }} format="DD/MM/YYYY" size="large" />
                </Form.Item>
                <span>~</span>
                <Form.Item name="endDate" noStyle rules={[{ required: true }]}>
                  <DatePicker placeholder="Đến ngày" style={{ flex: 1 }} format="DD/MM/YYYY" size="large" />
                </Form.Item>
              </div>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="note" label={<Text strong>Ghi chú cho đợt lập lịch này</Text>}>
          <Input.TextArea placeholder="VD: Lịch trực HKII - 2024..." rows={2} />
        </Form.Item>

        {previewShifts.length > 0 && (
          <Card 
            size="small" 
            title={<Space><RocketOutlined /> <span style={{ fontSize: 13, fontWeight: 700 }}>Xem trước các Ca sẽ được dập khuôn:</span></Space>} 
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.02)', borderColor: 'rgba(239, 68, 68, 0.1)', marginBottom: 20, borderRadius: 12 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {previewShifts.map((s, idx) => (
                <Tag key={idx} color="red-outline" style={{ margin: 0, borderRadius: 6, padding: '4px 10px', background: 'white', border: '1px solid #fecaca' }}>
                  <Text strong style={{ color: '#ef4444' }}>{s.name}</Text>: <Text type="secondary" style={{ fontSize: 11 }}>{s.startTime} - {s.endTime}</Text>
                </Tag>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#991b1b', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
              <ExclamationCircleOutlined /> Toàn bộ khung giờ trên sẽ được nhân bản thành các bản ghi vật lý độc lập (Deep Copy).
            </div>
          </Card>
        )}
      </Form>

      <Divider style={{ margin: '16px 0' }}><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Cấu hình đã dập trước đó</Text></Divider>

      <div style={{ maxHeight: 250, overflowY: 'auto', padding: '0 4px' }}>
        <List
          size="small"
          dataSource={assignments}
          renderItem={(item: any) => {
            const group = templateGroups.find(g => g.id === item.templateId);
            return (
              <div style={{ 
                background: '#f8fafc', 
                borderRadius: 10, 
                padding: '12px 16px', 
                marginBottom: 8, 
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Space direction="vertical" size={2}>
                  <Space>
                    <Tag color="blue" style={{ borderRadius: 4, fontWeight: 700 }}>{group?.name || 'Bản mẫu'}</Tag>
                    <Text strong style={{ fontSize: 13 }}>{dayjs(item.startDate).format('DD/MM/YYYY')} - {dayjs(item.endDate).format('DD/MM/YYYY')}</Text>
                  </Space>
                  {item.note && <Text type="secondary" style={{ fontSize: 12 }}><EditOutlined /> {item.note}</Text>}
                </Space>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAssignment(item.id)} />
              </div>
            );
          }}
        />
      </div>
    </Modal>
  );
};

export default AssignTemplateModal;
