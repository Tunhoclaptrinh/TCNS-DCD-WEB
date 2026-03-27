import React from 'react';
import { Modal, Form, Input, InputNumber, Space, Typography, TimePicker, Select, Tag, Checkbox, Divider, Row, Col, Radio, message } from 'antd';
import { 
  PlusCircleOutlined, 
  PlusSquareOutlined, 
  ClockCircleOutlined, 
  EditOutlined, 
  CalendarOutlined, 
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';
import { Button } from 'antd';

const { Text } = Typography;

interface QuickCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  date: dayjs.Dayjs | null;
  context: any;
  templates: DutyShift[];
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  date,
  context,
  templates
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = React.useState(false);
  const [localShiftData, setLocalShiftData] = React.useState<any>(null);

  // Initialize form when context changes
  React.useEffect(() => {
    if (open && context) {
      const { yOffset, shift, kip } = context;
      
      const getTimeFromTop = (pos: number) => {
        const START_HOUR = 6;
        const PX_PER_HOUR = 60;
        const totalMinutes = Math.floor((pos / PX_PER_HOUR) * 60);
        const h = START_HOUR + Math.floor(totalMinutes / 60);
        const m = Math.floor((totalMinutes % 60) / 15) * 15;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const calculatedTime = getTimeFromTop(yOffset);
      
      form.setFieldsValue({
        shiftId: kip?.shiftId || shift?.id || null,
        kipId: kip?.id || null,
        shiftLabel: kip?.name || shift?.name || '',
        timeRange: [dayjs(calculatedTime, 'HH:mm'), dayjs(calculatedTime, 'HH:mm').add(2, 'hour')],
        useTemplate: true,
        isLockedShift: !!shift || !!kip,
        stampMode: 'template',
        status: 'open',
        order: kip?.order || 1,
        endPeriod: kip?.endPeriod || 1,
        capacity: kip?.capacity || 10
      });
    }
  }, [open, context, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const targetDateStr = date?.format('YYYY-MM-DD');
      const stampMode = form.getFieldValue('stampMode');
      const shiftId = form.getFieldValue('shiftId');
      
      if (!values.isLockedShift) {
        // Handle Stencil Stamping
        let res;
        if (stampMode === 'template') {
          if (localShiftData) {
            // If localShiftData exists, it means the user edited the template details
            res = await dutyService.addShiftToDay(targetDateStr!, Number(shiftId), {
              name: localShiftData.name,
              startTime: localShiftData.startTime,
              endTime: localShiftData.endTime,
              order: localShiftData.order,
            });
          } else {
            // No local edits, use original template
            res = await dutyService.addShiftToDay(targetDateStr!, values.shiftId);
          }
        } else {
          // Custom manual shift: 1. Create instance template, 2. Add to day
          const [start, end] = values.timeRange || [];
          const sRes = await dutyService.createShiftTemplate({
            name: values.customShiftName,
            startTime: start?.format('HH:mm'),
            endTime: end?.format('HH:mm'),
            order: 0,
            description: 'INSTANCE',
            daysOfWeek: [((date?.day() || 0) + 6) % 7]
          });
          if (sRes.success && sRes.data) {
            res = await dutyService.addShiftToDay(targetDateStr!, sRes.data.id);
          } else {
            throw new Error("Không thể tạo bản mẫu ca mới");
          }
        }

        if (res.success) {
          message.success("Đã áp dụng ca trực thành công");
          onSuccess();
          onCancel();
        }
      } else {
        // Create Individual Slot/Kip
        const [start, end] = values.timeRange || [];
        const payload = {
          shiftDate: targetDateStr!,
          startTime: start?.format('HH:mm'),
          endTime: end?.format('HH:mm'),
          shiftLabel: values.shiftLabel,
          shiftId: values.shiftId,
          kipId: values.kipId,
          status: values.status,
          order: values.order,
          endPeriod: values.endPeriod,
          capacity: values.capacity,
          note: values.note
        };

        const res = await dutyService.createSlot(payload);
        if (res.success) {
          message.success('Đã tạo kíp trực mới');
          onSuccess();
          onCancel();
        }
      }
    } catch (err: any) {
      message.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isLockedShift !== curr.isLockedShift}>
          {({ getFieldValue }) => (
            <Space>
              {getFieldValue('isLockedShift') ? (
                <PlusCircleOutlined style={{ color: '#ef4444' }} />
              ) : (
                <PlusSquareOutlined style={{ color: '#0ea5e9' }} />
              )}
              <span style={{ fontWeight: 800 }}>
                {getFieldValue('isLockedShift') ? 'Tạo Kíp trực MỚI (Independent)' : 'Áp dụng Ca trực (Stamp)'}
                <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                  — {date?.format('DD/MM/YYYY')}
                </Text>
              </span>
            </Space>
          )}
        </Form.Item>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={550}
      destroyOnClose
      className="premium-modal"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ useTemplate: true }}>
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isLockedShift !== curr.isLockedShift}>
          {({ getFieldValue }) => {
            const sId = getFieldValue('shiftId');
            const shift = templates.find(s => s.id === sId);
            const isLocked = getFieldValue('isLockedShift');

            if (shift || context?.shift) {
              const sData = shift || context?.shift;
              return (
                <>
                  <div style={{
                    background: isLocked ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '20px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    border: isLocked ? '1.5px solid #fecaca' : '1.5px solid #bae6fd',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        background: isLocked ? '#ef4444' : '#0ea5e9',
                        color: 'white',
                        width: 52,
                        height: 52,
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isLocked ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(14, 165, 233, 0.2)'
                      }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>{date?.format('ddd')}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>{date?.format('DD')}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: isLocked ? '#991b1b' : '#075985', fontSize: '1.15rem', marginBottom: 2 }}>
                          {sData.name} {!shift && <Tag color="default" style={{ fontSize: '10px' }}>Non-Template</Tag>}
                        </div>
                        <Space style={{ fontSize: '0.9rem', color: isLocked ? '#ef4444' : '#0ea5e9' }}>
                          <ClockCircleOutlined />
                          <Text strong style={{ color: 'inherit' }}>{sData.startTime} - {sData.endTime}</Text>
                        </Space>
                      </div>
                    </div>

                    {sData.id && shift && (
                      <Button 
                        icon={<EditOutlined />} 
                        onClick={() => setIsEditShiftOpen(!isEditShiftOpen)}
                        type={isEditShiftOpen ? 'primary' : 'default'}
                        style={{ 
                          borderRadius: '8px',
                          color: isEditShiftOpen ? '#fff' : (isLocked ? '#ef4444' : '#0ea5e9'),
                          borderColor: isLocked ? '#fecaca' : '#bae6fd'
                        }}
                      >
                        {isEditShiftOpen ? "Lưu tạm" : "Chỉnh sửa"}
                      </Button>
                    )}
                  </div>

                  {isEditShiftOpen && (
                    <div style={{ marginTop: -12, marginBottom: 24, padding: 16, background: '#fff', borderRadius: '0 0 16px 16px', border: '1.5px solid #bae6fd', borderTop: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12, fontWeight: 600 }}>
                        TÙY CHỈNH RIÊNG CHO NGÀY {date?.format('DD/MM')}:
                      </Text>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Form.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Tên hiển thị</Text>} style={{ marginBottom: 0 }}>
                          <Input 
                            value={localShiftData?.name} 
                            onChange={e => setLocalShiftData({ ...localShiftData, name: e.target.value })}
                            placeholder="Tên ca..."
                          />
                        </Form.Item>
                        <Form.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Khung giờ</Text>} style={{ marginBottom: 0 }}>
                          <TimePicker.RangePicker 
                            format="HH:mm" 
                            style={{ width: '100%' }}
                            value={localShiftData?.startTime && localShiftData?.endTime ? [dayjs(localShiftData.startTime, 'HH:mm'), dayjs(localShiftData.endTime, 'HH:mm')] : null}
                            onChange={(vals) => {
                              if (vals) {
                                setLocalShiftData({
                                  ...localShiftData,
                                  startTime: vals[0]!.format('HH:mm'),
                                  endTime: vals[1]!.format('HH:mm')
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Space>
                    </div>
                  )}
                </>
              );
            }
            return (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#cbd5e1', color: 'white', width: 44, height: 44, borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700 }}>{date?.format('ddd')}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{date?.format('DD')}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#475569' }}>Tạo ca trực mới</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Vui lòng chọn hoặc nhập chi tiết Ca</div>
                </div>
              </div>
            );
          }}
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isLockedShift !== curr.isLockedShift}>
          {({ getFieldValue }) => {
            const isLocked = getFieldValue('isLockedShift');
            
            if (!isLocked) {
              return (
                <div style={{ padding: '0 4px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <Form.Item name="stampMode" initialValue="template" noStyle>
                      <Radio.Group buttonStyle="solid" style={{ width: '100%' }} size="large">
                        <Radio.Button value="template" style={{ width: '50%', textAlign: 'center' }}><CalendarOutlined /> Dùng Bản mẫu</Radio.Button>
                        <Radio.Button value="custom" style={{ width: '50%', textAlign: 'center' }}><PlusCircleOutlined /> Tự tạo Ca mới</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </div>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.stampMode !== curr.stampMode}>
                    {({ getFieldValue }) => getFieldValue('stampMode') === 'template' ? (
                      <Form.Item name="shiftId" label={<Text strong>Chọn khối thời gian (Ca mẫu)</Text>} rules={[{ required: true, message: 'Vui lòng chọn Ca' }]}>
                        <Select
                          size="large"
                          placeholder="Chọn Ca từ hệ thống..."
                          options={templates
                            .filter(s => s.description !== 'INSTANCE')
                            .map(s => ({ label: `${s.name} (${s.startTime} - ${s.endTime})`, value: s.id }))}
                        />
                      </Form.Item>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <Form.Item name="customShiftName" label={<Text strong>Tên Ca trực mới</Text>} rules={[{ required: true, message: 'Nhập tên ca' }]}>
                          <Input placeholder="VD: Trực Lễ Hội, Trực SVTN..." prefix={<EditOutlined />} size="large" />
                        </Form.Item>
                        <Form.Item name="timeRange" label={<Text strong>Khung giờ (Start - End)</Text>} rules={[{ required: true, message: 'Chọn giờ' }]}>
                          <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} size="large" />
                        </Form.Item>
                      </div>
                    )}
                  </Form.Item>

                  <div style={{ marginTop: 24, padding: '12px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <Space align="start">
                      <InfoCircleOutlined style={{ color: '#0ea5e9', marginTop: 4 }} />
                      <Text style={{ fontSize: '0.85rem', color: '#0369a1' }}>
                        Hành động <b>Dập khuôn (Stamp)</b> sẽ khởi tạo một bản sao độc lập của Ca này vào ngày đã chọn. Mọi thay đổi về sau không làm ảnh hưởng đến dữ liệu cũ.
                      </Text>
                    </Space>
                  </div>
                </div>
              );
            }

            return (
              <>
                {(() => {
                  const sId = getFieldValue('shiftId');
                  const shift = templates.find(s => s.id === sId);
                  const kips = shift?.kips || [];
                  if (kips.length === 0) return null;

                  return (
                    <div style={{ marginBottom: 24 }}>
                      <Divider orientation="left" plain><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Theo thiết lập của Ca</Text></Divider>
                      <Space wrap size={[8, 8]}>
                        {kips.map(k => (
                          <Tag.CheckableTag
                            key={k.id}
                            checked={getFieldValue('kipId') === k.id}
                            onChange={() => {
                              form.setFieldsValue({
                                kipId: k.id,
                                shiftLabel: `${shift?.name} - ${k.name}`,
                                timeRange: [dayjs(k.startTime, 'HH:mm'), dayjs(k.endTime, 'HH:mm')],
                                order: k.order,
                                endPeriod: k.endPeriod,
                                capacity: k.capacity
                              });
                            }}
                          >
                            {k.name}
                          </Tag.CheckableTag>
                        ))}
                      </Space>
                    </div>
                  );
                })()}

                <Form.Item name="shiftId" noStyle><Input type="hidden" /></Form.Item>
                <Form.Item name="kipId" noStyle><Input type="hidden" /></Form.Item>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Form.Item name="shiftLabel" label={<Text strong>Tiêu đề hiển thị (Kíp lẻ trên lịch)</Text>} rules={[{ required: true }]}>
                    <Input placeholder="VD: Ca Sáng - Kíp 1" prefix={<EditOutlined />} />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={14}>
                      <Form.Item
                        name="timeRange"
                        label={<Text strong>Khoảng thời gian (Thực tế)</Text>}
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                      >
                        <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item label={<Text strong>Trạng thái</Text>} name="status" initialValue="open">
                        <Select options={[
                          { label: '🔓 Đăng ký tự do', value: 'open' }, 
                          { label: '🔒 Khóa (Admin)', value: 'locked' }
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label={<Text strong>Tiết BĐ</Text>} name="order">
                        <InputNumber min={1} style={{ width: '100% ' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<Text strong>Tiết KT</Text>} name="endPeriod">
                        <InputNumber min={1} style={{ width: '100% ' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label={<Text strong>Chỉ tiêu</Text>} name="capacity">
                        <InputNumber min={1} style={{ width: '100% ' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <Form.Item name="note" label={<Text strong>Ghi chú cho kíp trực này</Text>} style={{ marginTop: 16 }}>
                  <Input.TextArea placeholder="Thông tin địa điểm hoặc lưu ý đặc biệt..." rows={2} />
                </Form.Item>
              </>
            );
          }}
        </Form.Item>

        <Form.Item name="useTemplate" valuePropName="checked" hidden>
          <Checkbox />
        </Form.Item>

        <Form.Item name="isLockedShift" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default QuickCreateModal;
