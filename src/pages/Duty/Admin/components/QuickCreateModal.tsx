import React from 'react';
import { Form, Input, Space, Typography, TimePicker, message, List, Tag, Modal, Tooltip, Alert, InputNumber, Switch } from 'antd';
import { CalendarOutlined, TeamOutlined, EditOutlined, CloseOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift, DutySlot } from '@/services/duty.service';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/common/Button';

const { Text } = Typography;

interface QuickCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  date: dayjs.Dayjs | null;
  context: any; // { yOffset, shift }
  templates: DutyShift[];
  slotsByDay?: Record<string, DutySlot[]>;
  onOpenSlot?: (slot: DutySlot) => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  open,
  onCancel,
  onSuccess,
  date,
  context,
  slotsByDay = {},
  onOpenSlot,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'shift' | 'kip'>('shift');

  const shift = context?.shift as DutyShift | undefined;
  const dateStr = date?.format('YYYY-MM-DD') || '';
  const daySlots = slotsByDay[dateStr] || [];
  const kipSlots = shift
    ? daySlots.filter(s => String(s.shiftId) === String(shift.id) && s.kipId !== null)
    : [];

  // 1. Initialize viewMode ONLY when modal opens
  React.useEffect(() => {
    if (!open) return;
    
    if (context?.viewMode) {
      setViewMode(context.viewMode);
    } else if (shift) {
      setViewMode('kip');
    } else {
      setViewMode('shift');
    }
  }, [open]);

  // 2. Update form values when mode or data changes
  React.useEffect(() => {
    if (!open) return;
    
    const getTimeFromTop = (pos: number) => {
      const START_HOUR = 5;
      const PX_PER_HOUR = 60;
      const totalMinutes = Math.floor((pos / PX_PER_HOUR) * 60);
      const h = START_HOUR + Math.floor(totalMinutes / 60);
      const m = Math.floor((totalMinutes % 60) / 15) * 15;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const yOffset = context?.yOffset || 0;
    const startStr = (viewMode === 'kip' ? shift?.startTime : null) || shift?.startTime || getTimeFromTop(yOffset);
    const endStr = (viewMode === 'kip' ? shift?.endTime : null) || shift?.endTime || getTimeFromTop(yOffset + 120);

    form.setFieldsValue({
      shiftLabel: context?.kip?.name || (viewMode === 'kip' ? `Kíp ${kipSlots.length + 1}` : (shift?.name || 'Ca trực mới')),
      timeRange: [dayjs(startStr, 'HH:mm'), dayjs(endStr, 'HH:mm')],
      capacity: context?.kip?.capacity || 1,
      isSpecialEvent: shift?.isSpecialEvent || false,
      note: '',
    });
  }, [open, viewMode, shift, form]);

  const handleDeleteKip = async (kipId: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa Kíp?',
      content: 'Toàn bộ dữ liệu của kíp này (bao gồm phân công) sẽ bị xóa. Bạn có chắc chắn?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await dutyService.deleteActualKip(kipId);
          if (res.success) {
            message.success('Đã xóa kíp thành công');
            onSuccess();
          }
        } catch (err) {
          message.error('Lỗi khi xóa kíp');
        }
      }
    });
  };

  const handleRemoveShift = async () => {
    if (!shift) return;
    Modal.confirm({
      title: 'Xác nhận xóa toàn bộ Ca trực?',
      content: `Hành động này sẽ xóa Ca "${shift.name}" và toàn bộ các Kíp trực bên trong. Bạn có chắc chắn?`,
      okText: 'Xóa sạch',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await dutyService.removeShiftFromDay(dateStr, shift.id);
          if (res.success) {
            message.success('Đã xóa ca trực thành công');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Lỗi khi xóa ca trực');
        }
      }
    });
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const [start, end] = values.timeRange || [];
      const startTime = start?.format('HH:mm');
      const endTime = end?.format('HH:mm');
      const dateStr = date!.format('YYYY-MM-DD');

      if (viewMode === 'kip' && shift) {
        const payload = {
          shiftId: shift.id,
          name: values.shiftLabel,
          startTime,
          endTime,
          capacity: values.capacity || 1,
          coefficient: 1,
          note: values.note,
        };
        const res = await dutyService.createActualKip(payload);
        if (res.success) {
          message.success('Đã thêm Kíp vào Ca');
          onSuccess();
          onCancel();
        }
      } else if (context?.kip) {
        const payload = {
          shiftId: context.shift.id,
          name: values.shiftLabel,
          startTime,
          endTime,
          coefficient: context.kip.coefficient,
          capacity: context.kip.capacity || 1,
          note: values.note,
        };
        const res = await dutyService.createActualKip(payload);
        if (res.success) {
          message.success('Đã tạo Kíp từ mẫu');
          onSuccess();
          onCancel();
        }
      } else if (shift && viewMode === 'shift') {
        const payload = {
          name: values.shiftLabel,
          startTime,
          endTime,
          isSpecialEvent: values.isSpecialEvent,
          note: values.note,
        };
        const res = await dutyService.updateActualShift(shift.id, payload);
        if (res.success) {
          message.success('Đã cập nhật thông tin Ca');
          onSuccess();
          onCancel();
        }
      } else {
        const payload = {
          date: dateStr,
          name: values.shiftLabel,
          startTime,
          endTime,
          isSpecialEvent: values.isSpecialEvent,
          note: values.note,
        };
        const res = await dutyService.createActualShift(payload);
        if (res.success) {
          message.success('Đã tạo Ca trực thực tế');
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

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await handleFinish(values);
    } catch (error) {
      // Validation errors handled by Form
    }
  };

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
          <Space>
            {viewMode === 'kip' ? <TeamOutlined /> : <CalendarOutlined />}
            <span>
              {viewMode === 'kip' ? 'Thêm Kíp vào Ca' : (shift ? 'Sửa thông tin Ca' : 'Tạo Ca trực')}
              <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                — {date?.format('DD/MM')}
              </Text>
            </span>
          </Space>
          {shift && (
            <Tag
              color={viewMode === 'kip' ? 'blue' : 'orange'}
              style={{ cursor: 'pointer', borderRadius: 4 }}
              onClick={() => {
                const nextMode = viewMode === 'kip' ? 'shift' : 'kip';
                setViewMode(nextMode);
                if (nextMode === 'shift' && shift) {
                  form.setFieldsValue({
                    shiftLabel: shift.name,
                    timeRange: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
                  });
                } else if (nextMode === 'kip' && shift) {
                   form.setFieldsValue({
                     shiftLabel: `Kíp ${kipSlots.length + 1}`,
                     timeRange: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
                   });
                }
              }}
            >
              {viewMode === 'kip' ? 'Sửa thông tin Ca' : 'Quay lại Thêm Kíp'}
            </Tag>
          )}
        </div>
      }
      onCancel={onCancel}
      onOk={handleOk}
      loading={loading}
      width={540}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%' }}>
          {viewMode === 'shift' && shift && shift.isStamped && (
            <Button 
              variant="danger" 
              buttonSize="small" 
              onClick={handleRemoveShift} 
              icon={<DeleteOutlined />}
            >
              Xóa Ca trực này
            </Button>
          )}
          {viewMode === 'kip' && context?.kip && context.kip.isStamped && (
            <Button 
              variant="danger" 
              buttonSize="small" 
              onClick={() => handleDeleteKip(context.kip.id)} 
              icon={<DeleteOutlined />}
            >
              Xóa Kíp này
            </Button>
          )}
          <Button variant="outline" buttonSize="small" onClick={onCancel} disabled={loading} icon={<CloseOutlined />}>
            Hủy
          </Button>
          <Button variant="primary" buttonSize="small" onClick={handleOk} loading={loading} icon={<SaveOutlined />}>
            {viewMode === 'kip' ? "Tạo Kíp" : (shift ? "Lưu thay đổi" : "Tạo Ca")}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>

        {shift && viewMode === 'kip' && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 16,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>ĐANG THÊM KÍP CHO CA:</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a' }}>{shift.name}</div>
              <div style={{ fontSize: 12, color: '#3b82f6' }}>{shift.startTime} – {shift.endTime}</div>
            </div>
            <EditOutlined 
              style={{ color: '#3b82f6', fontSize: 18, cursor: 'pointer' }} 
              onClick={() => {
                setViewMode('shift');
                form.setFieldsValue({
                  shiftLabel: shift.name,
                  timeRange: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
                });
              }} 
            />
          </div>
        )}

        <Form.Item name="shiftLabel" label={viewMode === 'kip' ? "Tên Kíp" : "Tên Ca"} rules={[{ required: true, message: 'Nhập tên' }]}>
          <Input placeholder={viewMode === 'kip' ? "VD: Kíp 1..." : "VD: Ca sáng..."} />
        </Form.Item>

        {viewMode === 'kip' && shift && (
          <Alert
            message="Ràng buộc thời gian"
            description={`Kíp trực phải nằm trong khung giờ của ca: ${shift.startTime} - ${shift.endTime}`}
            type="info"
            showIcon
            style={{ marginBottom: 20, borderRadius: 12 }}
          />
        )}

        <Form.Item 
          name="timeRange" 
          label="Khung giờ" 
          rules={[
            { required: true, message: 'Chọn giờ' },
            {
              validator: (_, value) => {
                const isTimeInShiftRange = (target: string, shiftStart: string, shiftEnd: string) => {
                  if (!target || !shiftStart || !shiftEnd) return true;
                  if (shiftStart <= shiftEnd) {
                    return target >= shiftStart && target <= shiftEnd;
                  }
                  return target >= shiftStart || target <= shiftEnd;
                };

                if (viewMode === 'kip' && shift && value && value[0] && value[1]) {
                  const start = value[0].format('HH:mm');
                  const end = value[1].format('HH:mm');
                  if (!isTimeInShiftRange(start, shift.startTime, shift.endTime)) {
                    return Promise.reject(`Giờ bắt đầu phải từ ${shift.startTime} đến ${shift.endTime}`);
                  }
                  if (!isTimeInShiftRange(end, shift.startTime, shift.endTime)) {
                    return Promise.reject(`Giờ kết thúc phải từ ${shift.startTime} đến ${shift.endTime}`);
                  }
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <TimePicker.RangePicker 
            format="HH:mm" 
            style={{ width: '100%' }} 
            minuteStep={5}
            disabledTime={() => {
              if (viewMode === 'kip' && shift) {
                const [sh, sm] = shift.startTime.split(':').map(Number);
                const [eh, em] = shift.endTime.split(':').map(Number);
                return {
                  disabledHours: () => {
                    const hours = [];
                    for (let i = 0; i < 24; i++) {
                      if (i < sh || i > eh) hours.push(i);
                    }
                    return hours;
                  },
                  disabledMinutes: (h: number) => {
                    const mins = [];
                    if (h === sh) {
                      for (let i = 0; i < sm; i++) mins.push(i);
                    } else if (h === eh) {
                      for (let i = em + 1; i < 60; i++) mins.push(i);
                    }
                    return mins;
                  }
                };
              }
              return {};
            }}
          />
        </Form.Item>

        {viewMode === 'kip' && (
          <Form.Item name="capacity" label="Số lượng người trực" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        )}

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea placeholder="Ghi chú thêm..." rows={2} />
        </Form.Item>

        {viewMode === 'shift' && (
          <Form.Item name="isSpecialEvent" label="Loại Ca" valuePropName="checked" initialValue={false}>
            <Switch 
              checkedChildren="Sự kiện đặc biệt" 
              unCheckedChildren="Ca trực chuẩn" 
            />
          </Form.Item>
        )}

        {viewMode === 'kip' && kipSlots.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginTop: 16 }}>
            <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <TeamOutlined style={{ color: '#64748b', fontSize: 12 }} />
                <Text strong style={{ fontSize: 12, color: '#475569' }}>Các Kíp hiện có ({kipSlots.length})</Text>
              </Space>
            </div>
            <List
              size="small"
              dataSource={kipSlots}
              renderItem={(slot) => (
                <List.Item
                  style={{ padding: '8px 14px' }}
                  className="slot-list-item-hover"
                  actions={[
                    <Space size={12} key="actions">
                      <Tooltip title="Chỉnh sửa">
                        <EditOutlined style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => onOpenSlot?.(slot)} />
                      </Tooltip>
                      <Tooltip title="Xóa Kíp">
                        <CloseOutlined style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleDeleteKip(slot.kipId!)} />
                      </Tooltip>
                    </Space>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ background: '#bfdbfe', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                        {slot.assignedUserIds?.length || 0}/{slot.capacity || 0}
                      </div>
                    }
                    title={<Text strong style={{ fontSize: 13 }}>{slot.shiftLabel}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{slot.startTime} – {slot.endTime}</Text>}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
      <style>{`.slot-list-item-hover:hover { background: #f8fafc !important; }`}</style>
    </FormModal>
  );
};

export default QuickCreateModal;
