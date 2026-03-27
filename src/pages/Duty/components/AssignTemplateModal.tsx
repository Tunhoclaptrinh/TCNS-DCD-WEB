import React from 'react';
import { Modal, Form, Space, Row, Col, Select, DatePicker, Input, message, Card, Tag, Typography } from 'antd';
import { CalendarOutlined, RocketOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';

const { Text } = Typography;

interface AssignTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  templateGroups: any[];
}

const AssignTemplateModal: React.FC<AssignTemplateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  templateGroups,
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
        mode: values.mode,
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
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name="mode" label={<Text strong>Chế độ dập khuôn</Text>} initialValue="kips">
              <Select size="large">
                <Select.Option value="shifts">Chỉ mình Ca trực (Shifts only)</Select.Option>
                <Select.Option value="kips">Chỉ mình Kíp trực (Kips only)</Select.Option>
                <Select.Option value="all">Cả 2 (Both)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item name="note" label={<Text strong>Ghi chú cho đợt lập lịch này</Text>}>
              <Input placeholder="VD: Lịch trực HKII - 2024..." />
            </Form.Item>
          </Col>
        </Row>

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
    </Modal>
  );
};

export default AssignTemplateModal;
