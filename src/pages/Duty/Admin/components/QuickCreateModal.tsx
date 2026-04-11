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
  existingSlots?: any[];
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  date,
  context,
  templates,
  existingSlots = []
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = React.useState(false);
  const [localShiftData, setLocalShiftData] = React.useState<any>(null);

  React.useEffect(() => {
    if (open) {
      // Reset internal states when opening/reopening
      setIsEditShiftOpen(false);
      setLocalShiftData(null);
    }
    
    if (open && context) {
      const { yOffset, shift, kip } = context;
      
      const getTimeFromTop = (pos: number) => {
        const START_HOUR = 5; // Sync with DutyCalendar.tsx
        const PX_PER_HOUR = 60;
        const totalMinutes = Math.floor((pos / PX_PER_HOUR) * 60);
        const h = START_HOUR + Math.floor(totalMinutes / 60);
        const m = Math.floor((totalMinutes % 60) / 15) * 15;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const calculatedTime = getTimeFromTop(yOffset);
      
      // Calculate next default order if creating a new independent kip for a shift
      let nextOrder = kip?.order || 1;
      if (!kip && shift && existingSlots.length > 0) {
        const daySlots = existingSlots.filter(s => 
          dayjs(s.shiftDate).isSame(date, 'day') && 
          String(s.shiftId) === String(shift.id)
        );
        if (daySlots.length > 0) {
          const maxOrder = Math.max(...daySlots.map(s => s.order || 0));
          nextOrder = maxOrder + 1;
        }
      }

      form.setFieldsValue({
        shiftId: kip?.shiftId || shift?.id || null,
        kipId: kip?.id || null,
        shiftLabel: shift ? `${shift.name} - Kíp ${nextOrder}` : '',
        timeRange: [dayjs(calculatedTime, 'HH:mm'), dayjs(calculatedTime, 'HH:mm').add(2, 'hour')],
        useTemplate: true,
        isLockedShift: !!shift || !!kip,
        stampMode: 'template',
        status: 'open',
        order: nextOrder,
        endPeriod: kip?.endPeriod || nextOrder,
        capacity: kip?.capacity || 10
      });
    }
  }, [open, context, form]);

  // Reactive label update when order changes (only if it matches the auto-pattern)
  const order = Form.useWatch('order', form);
  const shiftId = Form.useWatch('shiftId', form);
  const isLockedShift = Form.useWatch('isLockedShift', form);
  
  React.useEffect(() => {
    if (!open || isEditShiftOpen) return;
    const currentLabel = form.getFieldValue('shiftLabel');
    const shift = templates.find(s => s.id === shiftId) || context?.shift;
    if (!shift) return;

    // Pattern to check: "ShiftName - Kíp [AnyNumber]"
    const autoPattern = new RegExp(`^${shift.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - Kíp \\d+$`);
    
    // If empty OR matches the auto-pattern, update it
    if (!currentLabel || autoPattern.test(currentLabel) || currentLabel === shift.name) {
      form.setFieldsValue({ shiftLabel: `${shift.name} - Kíp ${order || 1}` });
    }
  }, [order, shiftId, open, templates, isEditShiftOpen, context]);

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
          const mode = localShiftData ? 'shifts' : (values.mode || 'kips');
          if (localShiftData) {
            // If localShiftData exists, it means the user edited the template details
            res = await dutyService.addShiftToDay(targetDateStr!, Number(shiftId), {
              name: localShiftData.name,
              startTime: localShiftData.startTime,
              endTime: localShiftData.endTime,
              order: localShiftData.order,
            }, 'shifts'); // Forced shifts only when edited
          } else {
            // No local edits, use original template
            res = await dutyService.addShiftToDay(targetDateStr!, values.shiftId, null, mode);
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
          startTime: localShiftData?.startTime || start?.format('HH:mm'),
          endTime: localShiftData?.endTime || end?.format('HH:mm'),
          shiftLabel: localShiftData?.name || values.shiftLabel,
          shiftId: values.shiftId,
          kipId: isEditShiftOpen ? null : values.kipId,
          status: values.status,
          order: localShiftData?.order || values.order,
          endPeriod: isEditShiftOpen ? null : values.endPeriod,
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
          {isLockedShift ? (
            <PlusCircleOutlined style={{ color: 'var(--primary-color)' }} />
          ) : (
            <PlusSquareOutlined style={{ color: '#0ea5e9' }} />
          )}
          <span>
            {isLockedShift ? 'Tạo Kíp trực MỚI (Independent)' : 'Áp dụng Ca trực (Stamp)'}
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
              — {date?.format('DD/MM/YYYY')}
            </Text>
          </span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={renderFooter()}
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

                      <Button 
                        icon={<EditOutlined />} 
                        onClick={() => {
                          const nextVal = !isEditShiftOpen;
                          setIsEditShiftOpen(nextVal);
                          if (nextVal) {
                            // When editing shift details, we are focusing on the full shift
                            form.setFieldsValue({ kipId: null, shiftLabel: sData.name });
                            setLocalShiftData({
                              name: sData.name,
                              startTime: sData.startTime,
                              endTime: sData.endTime,
                              order: sData.order
                            });
                          }
                        }}
                        type={isEditShiftOpen ? 'primary' : 'default'}
                        style={{ 
                          borderRadius: '8px',
                          color: isEditShiftOpen ? '#fff' : (isLocked ? '#ef4444' : '#0ea5e9'),
                          borderColor: isLocked ? '#fecaca' : '#bae6fd'
                        }}
                      >
                        {isEditShiftOpen ? "Lưu tạm" : "Chỉnh sửa"}
                      </Button>
                  </div>

                  {isEditShiftOpen && (
                    <div style={{ marginTop: -12, marginBottom: 24, padding: 16, background: '#fff', borderRadius: '0 0 16px 16px', border: '1.5px solid #bae6fd', borderTop: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12, fontWeight: 600 }}>
                        TÙY CHỈNH RIÊNG CHO NGÀY {date?.format('DD/MM')}:
                      </Text>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Form.Item label="Tên hiển thị" style={{ marginBottom: 0 }}>
                          <Input 
                            value={localShiftData?.name} 
                            onChange={e => setLocalShiftData({ ...localShiftData, name: e.target.value })}
                            placeholder="Tên ca..."
                          />
                        </Form.Item>
                        <Form.Item label="Khung giờ" style={{ marginBottom: 0 }}>
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
            if (isEditShiftOpen) return null; // Hide everything below the header when editing shift
            const isLocked = isLockedShift;
            
            if (!isLocked) {
              return (
                <div style={{ padding: '0 4px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <Form.Item name="stampMode" initialValue="template" noStyle>
                      <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                        <Radio.Button value="template" style={{ width: '50%', textAlign: 'center' }}><CalendarOutlined /> Dùng Bản mẫu</Radio.Button>
                        <Radio.Button value="custom" style={{ width: '50%', textAlign: 'center' }}><PlusCircleOutlined /> Tự tạo Ca mới</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </div>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.stampMode !== curr.stampMode}>
                    {({ getFieldValue }) => getFieldValue('stampMode') === 'template' ? (
                      !isEditShiftOpen && (
                        <Form.Item name="mode" label="Chế độ dập khuôn" initialValue="kips">
                          <Select style={{ width: '100%' }}>
                            <Select.Option value="shifts">Chỉ mình Ca trực (Shifts only)</Select.Option>
                            <Select.Option value="kips">Chỉ mình Kíp trực (Kips only)</Select.Option>
                            <Select.Option value="all">Cả 2 (Both)</Select.Option>
                          </Select>
                        </Form.Item>
                      )
                    ) : null}
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.stampMode !== curr.stampMode}>
                    {({ getFieldValue }) => getFieldValue('stampMode') === 'template' ? (
                      <Form.Item name="shiftId" label="Chọn khối thời gian (Ca mẫu)" rules={[{ required: true, message: 'Vui lòng chọn Ca' }]}>
                        <Select
                          placeholder="Chọn Ca từ hệ thống..."
                          options={templates
                            .filter(s => s.description !== 'INSTANCE')
                            .map(s => ({ label: `${s.name} (${s.startTime} - ${s.endTime})`, value: s.id }))}
                        />
                      </Form.Item>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <Form.Item name="customShiftName" label="Tên Ca trực mới" rules={[{ required: true, message: 'Nhập tên ca' }]}>
                          <Input placeholder="VD: Trực Lễ Hội, Trực SVTN..." prefix={<EditOutlined />} />
                        </Form.Item>
                        <Form.Item name="timeRange" label="Khung giờ (Start - End)" rules={[{ required: true, message: 'Chọn giờ' }]}>
                          <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} />
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
                  if (isEditShiftOpen) return null; // Hide kips selection if editing shift

                  const sId = getFieldValue('shiftId');
                  const shift = templates.find(s => s.id === sId);
                  const kips = shift?.kips || [];
                  if (kips.length === 0) return null;

                  return (
                    <div style={{ marginBottom: 24 }}>
                      <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
                        <ClockCircleOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Theo thiết lập của Ca trực</span>
                      </Divider>
                      <Space wrap size={[8, 8]}>
                        {kips.map(k => (
                          <Tag.CheckableTag
                            key={k.id}
                            checked={getFieldValue('kipId') === k.id}
                            onChange={() => {
                              form.setFieldsValue({
                                kipId: k.id,
                                shiftLabel: `${shift?.name || '??'} - Kíp ${k.order}`,
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
                <div style={{ padding: '0 4px' }}>
                  <Form.Item name="shiftLabel" label="Tiêu đề hiển thị (Kíp lẻ trên lịch)" rules={[{ required: true }]}>
                    <Input placeholder="VD: Ca Sáng - Kíp 1" prefix={<EditOutlined />} />
                  </Form.Item>
 
                  <Row gutter={[24, 16]}>
                    <Col span={14}>
                      <Form.Item
                        name="timeRange"
                        label="Khoảng thời gian (Thực tế)"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                      >
                        <TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item label="Trạng thái" name="status" initialValue="open">
                        <Select options={[
                          { label: '🔓 Đăng ký tự do', value: 'open' }, 
                          { label: '🔒 Khóa (Admin)', value: 'locked' }
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Form.Item label="Tiết BĐ" name="order">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Tiết KT" name="endPeriod">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Chỉ tiêu" name="capacity">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>

                <Form.Item name="note" label="Ghi chú cho kíp trực này" style={{ marginTop: 16 }}>
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
