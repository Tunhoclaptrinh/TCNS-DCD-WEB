import React from 'react';
import { Modal, Form, Space, Row, Col, Select, DatePicker, Input, message, Card, Tag, Alert, Progress, InputNumber, Collapse, Typography } from 'antd';
import { Button } from '@/components/common';
import { CalendarOutlined, RocketOutlined, InteractionOutlined, SolutionOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
const { Text } = Typography;
import dutyService from '@/services/duty.service';
import { useSocket } from '@/contexts/SocketContext';

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
  const [percent, setPercent] = React.useState(0);
  const [statusText, setStatusText] = React.useState('');
  const { socket } = useSocket();

  const handleFinish = async (values: any) => {
    setLoading(true);
    setPercent(0);
    setStatusText('Đang khởi tạo kết nối Tiến trình thực (Real-time Socket)...');
    
    // Generate unique jobId for this task
    const jobId = Math.random().toString(36).substring(2, 15);
    
    // Listen to real-time events from Backend
    if (socket) {
      socket.emit('joinRoom', jobId);
      socket.on('job_progress', (data: { percent: number, text: string }) => {
        setPercent(data.percent);
        setStatusText(data.text);
      });
    }

    try {
      const payload = {
        templateId: values.templateId,
        startDate: values.startDate.startOf('day').toISOString(),
        endDate: values.endDate.endOf('day').toISOString(),
        mode: values.mode,
        note: values.note,
        jobId, // send to backend
      };

      // Removed automatic PeriodConfig update to maintain clean state for the week

      const res = await dutyService.createTemplateAssignment(payload);
      
      // Delay explicitly slightly after total finish to let user see 100%
      await new Promise(r => setTimeout(r, 600));

      if (res.success) {
        setPercent(100);
        setStatusText('Hoàn tất toàn bộ chiến dịch lập lịch!');
        message.success("Đã hoàn tất dập khuôn cấu trúc lịch tuần!");
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      setStatusText('Có lỗi hệ thống trong quá trình thao tác.');
      message.error("Lỗi khi gắn bản mẫu: " + (err.response?.data?.message || err.message));
    } finally {
      if (socket) {
        socket.off('job_progress');
        socket.emit('leaveRoom', jobId);
      }
      setLoading(false);
    }
  };


  const renderFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
      <Button disabled={loading} onClick={onCancel} style={{ minWidth: 100, borderRadius: 8 }}>Hủy</Button>
      <Button 
        variant="primary" 
        loading={loading} 
        buttonSize="small"
        icon={loading ? <InteractionOutlined spin /> : <RocketOutlined />}
        onClick={() => form.submit()} 
        style={{ 
          minWidth: 140, 
          borderRadius: 8
        }}
      >
        {loading ? 'Đang chạy tiến trình...' : 'Bắt đầu Dập khuôn'}
      </Button>
    </div>
  );

  return (
    <Modal
      title={
        <Space size="middle" align="center">
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <CalendarOutlined style={{ color: '#b91c1c', fontSize: 16 }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>Thiết lập lịch trình hệ thống</span>
        </Space>
      }
      open={open}
      onCancel={!loading ? onCancel : undefined}
      footer={renderFooter()}
      width={720}
      destroyOnClose
      maskClosable={!loading}
      closable={!loading}
      className="premium-modal"
    >
      <div style={{ paddingTop: 12 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={[24, 16]}>
            <Col span={11}>
              <Form.Item name="templateId" label={<span style={{ fontWeight: 500 }}>Chọn Nhóm Bản mẫu</span>} rules={[{ required: true, message: 'Vui lòng chọn bản mẫu' }]}>
                <Select
                  size="small"
                  placeholder="Mùa Đông, Mùa Hè..."
                  onChange={async (val) => {
                    form.setFieldsValue({ templateId: val });
                    const selected = templateGroups.find(g => g.id === val);
                    if (selected) {
                      form.setFieldsValue({
                        defaultQuota: selected.defaultQuota,
                        kipPrice: selected.kipPrice,
                        quotaRules: selected.quotaRules
                      });
                    }
                    try {
                      const res = await dutyService.getShiftTemplates(val);
                      if (res.success && res.data) setPreviewShifts(res.data);
                    } catch (e) { console.error(e); }
                  }}
                  getPopupContainer={trigger => (trigger.parentNode as HTMLElement) || document.body}
                >
                  {templateGroups.map(g => (
                    <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={13}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>Giai đoạn áp dụng</span>} required>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Form.Item name="startDate" noStyle rules={[{ required: true, message: 'Thiếu' }]}>
                    <DatePicker size="small" placeholder="Từ ngày" style={{ flex: 1 }} format="DD/MM/YYYY" getPopupContainer={trigger => (trigger.parentNode as HTMLElement) || document.body} />
                  </Form.Item>
                  <span style={{ color: '#9ca3af' }}>~</span>
                  <Form.Item name="endDate" noStyle rules={[{ required: true, message: 'Thiếu' }]}>
                    <DatePicker size="small" placeholder="Đến ngày" style={{ flex: 1 }} format="DD/MM/YYYY" getPopupContainer={trigger => (trigger.parentNode as HTMLElement) || document.body} />
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Collapse 
            ghost 
            expandIconPosition="end"
            style={{ marginBottom: 16 }}
            items={[{
              key: 'quota',
              label: <Space><SolutionOutlined /> <Text strong style={{ fontSize: 13 }}>Thiết lập Định mức & Đơn giá áp dụng cho Giai đoạn này</Text></Space>,
              children: (
                <div style={{ padding: '0 8px' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 12 }}>Định mức kíp</span>} name="defaultQuota">
                        <InputNumber size="small" min={0} step={0.5} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 12 }}>Đơn giá kíp (VNĐ)</span>} name="kipPrice">
                        <InputNumber size="small" min={0} step={1000} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.List name="quotaRules">
                    {(fields, { add, remove }) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {fields.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small" style={{ borderRadius: 8, background: '#f8fafc' }} bodyStyle={{ padding: '12px' }}>
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
                                          <Input size="small" placeholder="MSV..." />
                                        ) : (
                                          <Select size="small" placeholder="Chọn Ban">
                                            <Select.Option value="all">Tất cả các ban</Select.Option>
                                            <Select.Option value="Nhân sự">Ban Nhân sự</Select.Option>
                                            <Select.Option value="Truyền thông">Ban Truyền thông</Select.Option>
                                            <Select.Option value="Kỹ thuật">Ban Kỹ thuật</Select.Option>
                                            <Select.Option value="Hậu cần">Ban Hậu cần</Select.Option>
                                            <Select.Option value="Đào tạo">Ban Đào tạo</Select.Option>
                                            <Select.Option value="Sự kiện">Ban Sự kiện</Select.Option>
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
                                <Button variant="danger" ghost icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ border: 'none' }} />
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Button variant="outline" buttonSize="small" onClick={() => add({ type: 'member_all', target: 'all', quota: 2.5 })} block icon={<PlusOutlined />}>Thêm quy tắc định mức</Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              )
            }]}
          />
          <Row gutter={[24, 16]}>
            <Col span={11}>
              <Form.Item name="mode" label={<span style={{ fontWeight: 500 }}>Chế độ dập khuôn</span>} initialValue="kips">
                <Select size="small" getPopupContainer={trigger => (trigger.parentNode as HTMLElement) || document.body}>
                  <Select.Option value="shifts">Chỉ mình Ca trực (Shifts only)</Select.Option>
                  <Select.Option value="kips">Chỉ mình Kíp trực (Kips only)</Select.Option>
                  <Select.Option value="all">Cả 2 cấp độ (Khuyên dùng)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={13}>
              <Form.Item name="note" label={<span style={{ fontWeight: 500 }}>Ghi chú cho đợt lập lịch này</span>}>
                <Input size="small" placeholder="VD: Áp dụng Lịch trực HKII - 2024..." />
              </Form.Item>
            </Col>
          </Row>

          {previewShifts.length > 0 && (
            <Card 
              size="small" 
              title={<Space><RocketOutlined style={{ color: '#dc2626' }} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Cơ cấu tham chiếu</span></Space>} 
              style={{ 
                backgroundColor: '#fef2f2', 
                borderColor: '#fecaca', 
                marginTop: 8, 
                borderRadius: 12,
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
              }}
              styles={{ header: { borderBottom: '1px solid #fecaca', background: 'transparent' } }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {previewShifts.map((s, idx) => (
                  <Tag key={idx} style={{ 
                    margin: 0, borderRadius: 8, padding: '6px 12px', 
                    background: '#ffffff', border: '1px solid #fca5a5',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{ fontWeight: 600, color: '#dc2626', marginRight: 6 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>({s.startTime} - {s.endTime})</span>
                  </Tag>
                ))}
              </div>
              
              <Alert 
                type="warning" 
                showIcon 
                message="Toàn bộ khung giờ trên sẽ được nhân bản thành các bản ghi vật lý độc lập (Deep Copy) xuyên suốt Giai đoạn áp dụng. Việc này có thể mất thao tác vài giây trên máy chủ."
                style={{ borderRadius: 8, backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
              />
            </Card>
          )}
          
          {loading && (
            <div style={{ marginTop: 20, textAlign: 'center', background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px dashed #fca5a5' }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: '#b91c1c' }}>{statusText}</div>
              <Progress percent={percent} strokeColor={{ '0%': '#fca5a5', '100%': '#991b1b' }} status="active" />
            </div>
          )}
        </Form>
      </div>
    </Modal>
  );
};

export default AssignTemplateModal;
