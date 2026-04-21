import React from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Space, 
  Typography, 
  TimePicker, 
  Select, 
  Tag, 
  Checkbox, 
  Divider, 
  Row, 
  Col, 
  message, 
  Button,
} from 'antd';
import { 
  PlusSquareOutlined, 
  ClockCircleOutlined, 
  EditOutlined, 
  SettingOutlined,
  ThunderboltOutlined,
  BlockOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';
import FormModal from '@/components/common/FormModal';

const { Text, Title } = Typography;

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
  templates,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = React.useState(false);
  const [localShiftData, setLocalShiftData] = React.useState<any>(null);

  React.useEffect(() => {
    if (open) {
      setIsEditShiftOpen(false);
      setLocalShiftData(null);
    }
    
    if (open && context) {
      const { yOffset, shift, kip } = context;
      
      const getTimeFromTop = (pos: number) => {
        const START_HOUR = 5;
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
        shiftLabel: shift ? `${shift.name} - Kíp` : '',
        timeRange: [dayjs(calculatedTime, 'HH:mm'), dayjs(calculatedTime, 'HH:mm').add(2, 'hour')],
        useTemplate: true,
        actionKey: 'stamp_all',
        status: 'open',
        capacity: kip?.capacity || 10
      });
    }
  }, [open, context, form]);

  const shiftId = Form.useWatch('shiftId', form);
  
  React.useEffect(() => {
    if (!open || isEditShiftOpen) return;
    const currentLabel = form.getFieldValue('shiftLabel');
    const shift = templates.find(s => s.id === shiftId) || context?.shift;
    if (!shift) return;

    if (!currentLabel || currentLabel.startsWith(shift.name) || currentLabel === '') {
       if (currentLabel === '') {
         form.setFieldsValue({ shiftLabel: `${shift.name} - Kíp` });
       }
    }
  }, [shiftId, open, templates, isEditShiftOpen, context]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const targetDateStr = date?.format('YYYY-MM-DD');
      const action = values.actionKey;
      const sId = form.getFieldValue('shiftId');
      
      if (action === 'stamp_all') {
        let res;
        const mode = localShiftData ? 'shifts' : 'kips';
        if (localShiftData) {
          res = await dutyService.addShiftToDay(targetDateStr!, Number(sId), {
            name: localShiftData.name,
            startTime: localShiftData.startTime,
            endTime: localShiftData.endTime,
          }, 'shifts');
        } else {
          res = await dutyService.addShiftToDay(targetDateStr!, sId, null, mode);
        }
        
        if (res.success) {
          message.success("Đã áp dụng ca trực thành công");
          onSuccess();
          onCancel();
        }
      } else {
        const [start, end] = values.timeRange || [];
        const kipId = action.startsWith('kip_') ? Number(action.replace('kip_', '')) : undefined;

        const payload = {
          shiftDate: targetDateStr!,
          startTime: localShiftData?.startTime || start?.format('HH:mm'),
          endTime: localShiftData?.endTime || end?.format('HH:mm'),
          shiftLabel: localShiftData?.name || values.shiftLabel,
          shiftId: sId,
          kipId: kipId,
          status: values.status,
          capacity: values.capacity,
          note: values.note,
          isSpecialEvent: values.isSpecialEvent
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
    <FormModal
      open={open}
      form={form}
      title={
        <Space>
          <PlusSquareOutlined />
          <span>
            Khởi tạo phiên trực 
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>— {date?.format('DD/MM/YYYY')}</Text>
          </span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleFinish}
      loading={loading}
      width={900}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const currentShiftId = getFieldValue('shiftId');
            const shift = templates.find(s => s.id === currentShiftId) || context?.shift;

            if (shift) {
              const isSpecial = !!shift.isSpecialEvent;
              return (
                <div style={{ 
                  background: isSpecial ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px',
                  border: `1px solid ${isSpecial ? '#bfdbfe' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                      background: isSpecial ? '#3b82f6' : '#64748b',
                      color: 'white',
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{date?.format('ddd')}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{date?.format('DD')}</div>
                    </div>
                    <div>
                      <Space align="center">
                        <Title level={4} style={{ margin: 0, color: isSpecial ? '#1e40af' : '#1e293b' }}>{shift.name}</Title>
                        {isSpecial && <Tag color="blue">SỰ KIỆN</Tag>}
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Space style={{ color: isSpecial ? '#3b82f6' : '#64748b' }}>
                          <ClockCircleOutlined />
                          <Text strong style={{ color: 'inherit' }}>{shift.startTime} - {shift.endTime}</Text>
                        </Space>
                      </div>
                    </div>
                  </div>

                  <Button 
                    icon={<SettingOutlined />} 
                    onClick={() => {
                      const nextVal = !isEditShiftOpen;
                      setIsEditShiftOpen(nextVal);
                      if (nextVal) {
                        form.setFieldsValue({ kipId: null, actionKey: 'custom' });
                        setLocalShiftData({
                          name: shift.name,
                          startTime: shift.startTime,
                          endTime: shift.endTime,
                        });
                      }
                    }}
                    type={isEditShiftOpen ? 'primary' : 'default'}
                    className={isEditShiftOpen ? 'hifi-button' : ''}
                  >
                    {isEditShiftOpen ? "Lưu tạm thông số" : "Sửa thông số Ca"}
                  </Button>
                </div>
              );
            }
            return null;
          }}
        </Form.Item>

        {isEditShiftOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 24, padding: '20px', background: '#fff', borderRadius: '12px', border: '1.5px dashed #bfdbfe' }}
          >
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <EditOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Chỉnh sửa thông số Ca riêng cho ngày này</span>
            </Divider>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Tên Ca hiển thị">
                  <Input 
                    value={localShiftData?.name} 
                    onChange={e => setLocalShiftData({ ...localShiftData, name: e.target.value })}
                    placeholder="Tên ca..."
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Thời gian hoạt động">
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
              </Col>
            </Row>
          </motion.div>
        )}

        <Row gutter={32}>
          <Col span={10}>
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <ThunderboltOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Hành động lập lịch</span>
            </Divider>
            
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const currentShiftId = getFieldValue('shiftId');
                const shift = templates.find(s => s.id === currentShiftId) || context?.shift;

                return (
                  <Form.Item 
                    name="actionKey" 
                    label="Bạn muốn thực hiện gì?" 
                    rules={[{ required: true, message: 'Vui lòng chọn một hành động' }]}
                    initialValue="stamp_all"
                  >
                    <Select 
                      style={{ width: '100%' }}
                      placeholder="Chọn hành động..."
                      onChange={(val) => {
                        if (val === 'custom') {
                          form.setFieldsValue({
                            shiftLabel: 'Kíp lẻ mới',
                            timeRange: [dayjs(shift?.startTime, 'HH:mm'), dayjs(shift?.endTime, 'HH:mm')],
                            capacity: 10
                          });
                        } else if (typeof val === 'string' && val.startsWith('kip_')) {
                          const kId = Number(val.replace('kip_', ''));
                          const kip = shift?.kips?.find((k: any) => k.id === kId);
                          if (kip) {
                            form.setFieldsValue({
                              shiftLabel: kip.name,
                              timeRange: [
                                dayjs(kip.startTime || shift.startTime, 'HH:mm'), 
                                dayjs(kip.endTime || shift.endTime, 'HH:mm')
                              ],
                              capacity: kip.capacity
                            });
                          }
                        }
                      }}
                    >
                      <Select.OptGroup label="Bản mẫu theo Ca">
                        <Select.Option value="stamp_all">
                          <Space><BlockOutlined /><strong>Áp dụng TOÀN BỘ kíp của ca</strong></Space>
                        </Select.Option>
                        {shift?.kips?.map((k: any) => (
                          <Select.Option key={k.id} value={`kip_${k.id}`}>
                            <Space><PlusSquareOutlined /> Thêm kíp mẫu: {k.name}</Space>
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                      <Select.OptGroup label="Tùy chỉnh">
                        <Select.Option value="custom">
                          <Space><EditOutlined /> Tạo kíp mới (Không dùng mẫu)</Space>
                        </Select.Option>
                      </Select.OptGroup>
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.actionKey !== curr.actionKey}>
              {({ getFieldValue }) => {
                const action = getFieldValue('actionKey');
                if (action === 'stamp_all') {
                  return (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Hành động này sẽ khởi tạo đầy đủ các kíp trực theo cấu hình gốc của Ca làm việc này xuống lịch ngày.
                      </Text>
                    </div>
                  );
                }
                return null;
              }}
            </Form.Item>
          </Col>

          <Col span={14}>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.actionKey !== curr.actionKey}>
              {({ getFieldValue }) => {
                const action = getFieldValue('actionKey');
                if (action === 'stamp_all') return null;

                return (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Divider orientation="left" style={{ marginTop: 0 }}>
                      <SettingOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Cấu hình Kíp trực</span>
                    </Divider>

                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                       <Form.Item name="shiftLabel" label="Tiêu đề Kíp" rules={[{ required: true }]}>
                        <Input placeholder="VD: Kíp sáng học đường..." />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="timeRange" label="Giờ làm việc" rules={[{ required: true }]}>
                            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="capacity" label="Chỉ tiêu (Người)" initialValue={10}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="note" label="Ghi chú kíp">
                        <Input.TextArea placeholder="..." rows={2} />
                      </Form.Item>
                    </Space>
                  </motion.div>
                );
              }}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="useTemplate" valuePropName="checked" hidden><Checkbox /></Form.Item>
        <Form.Item name="kipId" hidden><Input /></Form.Item>
        <Form.Item name="status" hidden initialValue="open"><Input /></Form.Item>
      </div>

      <style>{`
        .custom-radio-group .ant-radio-wrapper {
          display: flex;
          align-items: center;
          width: 0;
          height: 0;
          overflow: hidden;
        }
        .mode-card {
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
        }
        .mode-card:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }
        .mode-card.active {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </FormModal>
  );
};

export default QuickCreateModal;
