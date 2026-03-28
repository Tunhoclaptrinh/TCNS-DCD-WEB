import React from 'react';
import { Modal, Form, Space, Row, Col, Select, DatePicker, Input, message, Card, Tag, Button } from 'antd';
import { CalendarOutlined, RocketOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';

// No Typography needed

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

  const renderFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
      <Button onClick={onCancel} style={{ minWidth: 100 }}>Hủy</Button>
      <Button 
        type="primary" 
        loading={loading} 
        onClick={() => form.submit()} 
        style={{ minWidth: 100, background: '#7f1d1d', borderColor: '#7f1d1d' }}
      >
        Đồng ý
      </Button>
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
          <span>Thiết lập lịch trình nâng cao (Stamping)</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={renderFooter()}
      width={700}
      destroyOnClose
      className="premium-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={[24, 16]}>
          <Col span={10}>
            <Form.Item name="templateId" label="Chọn Nhóm Bản mẫu" rules={[{ required: true }]}>
              <Select
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
            <Form.Item label="Giai đoạn áp dụng" required>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Form.Item name="startDate" noStyle rules={[{ required: true }]}>
                  <DatePicker placeholder="Từ ngày" style={{ flex: 1 }} format="DD/MM/YYYY" />
                </Form.Item>
                <span>~</span>
                <Form.Item name="endDate" noStyle rules={[{ required: true }]}>
                  <DatePicker placeholder="Đến ngày" style={{ flex: 1 }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[24, 16]}>
          <Col span={10}>
            <Form.Item name="mode" label="Chế độ dập khuôn" initialValue="kips">
              <Select>
                <Select.Option value="shifts">Chỉ mình Ca trực (Shifts only)</Select.Option>
                <Select.Option value="kips">Chỉ mình Kíp trực (Kips only)</Select.Option>
                <Select.Option value="all">Cả 2 (Both)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item name="note" label="Ghi chú cho đợt lập lịch này">
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
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>{s.name}</span>: <span style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>{s.startTime} - {s.endTime}</span>
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
