import React, { useState, useEffect } from 'react';
import { Form, Select, Divider, Space, Alert, message } from 'antd';
import { ClockCircleOutlined, SwapOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import FormModal from '@/components/common/FormModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';

interface ShiftTransferModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { toSlotId: number, fromSlotId?: number }) => Promise<void>;
  globalMode?: boolean;
  availableSlots?: any[];
  currentSlotId?: number;
  loading?: boolean;
}

const ShiftTransferModal: React.FC<ShiftTransferModalProps> = ({
  open,
  onCancel,
  onSubmit,
  globalMode = false,
  availableSlots = [],
  currentSlotId,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedWeek, setSelectedWeek] = useState<string>(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const [fetchedSlots, setFetchedSlots] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && globalMode) {
      const fetchSlots = async () => {
        setFetching(true);
        // Clear slots on week change
        form.setFieldValue('fromSlotId', undefined);
        form.setFieldValue('toSlotId', undefined);
        
        try {
          const res = await dutyService.getWeeklySchedule(selectedWeek);
          const rawData = (res.data || res) as any;
          const slots = Array.isArray(rawData?.slots) ? rawData.slots : (Array.isArray(rawData) ? rawData : []);
          setFetchedSlots(slots);
        } catch (e) {
          message.error("Lỗi khi tải lịch trực");
        } finally {
          setFetching(false);
        }
      };
      fetchSlots();
    }
  }, [selectedWeek, open, globalMode, form]);

  useEffect(() => {
    if (!open) {
      setSelectedWeek(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
    }
  }, [open]);

  const handleOk = async (values: any) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFromSlotId = Form.useWatch('fromSlotId', form);
  const activeSourceSlotId = globalMode ? selectedFromSlotId : currentSlotId;

  // Options configuration
  const weekOptions = React.useMemo(() => {
    const options = [];
    const today = dayjs().startOf('isoWeek');
    for (let i = -2; i <= 4; i++) {
      const w = today.add(i, 'week');
      let prefix = "";
      if (i === 0) prefix = "(Tuần này) ";
      else if (i === 1) prefix = "(Tuần sau) ";
      else if (i === -1) prefix = "(Tuần trước) ";
      
      options.push({
        label: `${prefix}Tuần ${w.format('DD/MM')} - ${w.add(6, 'day').format('DD/MM')}`,
        value: w.format('YYYY-MM-DD')
      });
    }
    return options;
  }, []);

  const myDynamicSlots = React.useMemo(() => {
    if (!globalMode) return [];
    const sorted = [...fetchedSlots].sort((a, b) => dayjs(a.shiftDate).valueOf() - dayjs(b.shiftDate).valueOf());
    const matched = sorted.filter(s => Array.isArray(s.assignedUserIds) && s.assignedUserIds.some((id: any) => String(id) === String(user?.id)));
    
    return matched.map(s => {
      const dateStr = dayjs(s.shiftDate).format('dd, DD/MM');
      const label = `${dateStr} • ${s.startTime}-${s.endTime} • ${s.shiftLabel || s.shiftName || s.name || 'Kíp trực'}`;
      
      return { 
        label: label, 
        value: s.id,
        disabled: s.status === 'locked' || s.isPast
      };
    });
  }, [fetchedSlots, globalMode, user?.id]);

  const targetSlots = React.useMemo(() => {
    const dataSource = globalMode ? fetchedSlots : availableSlots;
    const sorted = [...dataSource]
      .filter(s => s.id !== activeSourceSlotId)
      .sort((a, b) => {
        const dateA = dayjs(a.shiftDate).valueOf();
        const dateB = dayjs(b.shiftDate).valueOf();
        if (dateA !== dateB) return dateA - dateB;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
      
    // Because they're already constrained to a week by selection (if global) or by calendar context,
    // we don't strictly need to group by week here, but let's do it for consistency.
    const groups: Record<string, any[]> = {};
    sorted.forEach(s => {
      const weekStart = dayjs(s.shiftDate).startOf('isoWeek');
      const weekEnd = weekStart.add(6, 'day');
      const groupLabel = `Tuần ${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM')}`;
      if (!groups[groupLabel]) groups[groupLabel] = [];
      const dateStr = dayjs(s.shiftDate).format('dd, DD/MM');
      const label = `${dateStr} • ${s.startTime}-${s.endTime} • ${s.shiftLabel || s.shiftName || s.name || 'Kíp trực'}`;
      groups[groupLabel].push({ label, value: s.id, disabled: s.status === 'locked' });
    });
    
    return Object.entries(groups).map(([label, options]) => ({ label, options }));
  }, [fetchedSlots, availableSlots, globalMode, activeSourceSlotId]);

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <SwapOutlined style={{ color: '#6366f1' }} />
          <span>Yêu cầu chuyển kíp/ca trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={submitting || loading}
      width={550}
      okText="Gửi yêu cầu chuyển"
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Alert 
          message="Hướng dẫn chuyển kíp" 
          description={!globalMode 
            ? "Bạn đang yêu cầu chuyển từ kíp hiện tại sang một kíp khác. Yêu cầu này sẽ được gửi tới Ban quản lý để phê duyệt."
            : "Chọn kíp bạn đang trực và muốn đổi đi, sau đó chọn kíp đích muốn đổi tới."} 
          type="info" 
          showIcon 
          style={{ marginBottom: 20, borderRadius: 10 }}
        />

        {globalMode && (
          <>
            <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
              <CalendarOutlined style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 13, marginLeft: 8 }}>Chọn tuần</span>
            </Divider>
            
            <Form.Item label="Chọn tuần">
              <Select
                value={selectedWeek}
                onChange={setSelectedWeek}
                options={weekOptions}
              />
            </Form.Item>

            <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
              <ClockCircleOutlined style={{ color: '#6366f1' }} /> 
              <span style={{ fontSize: 13, marginLeft: 8 }}>Kíp trực của bạn</span>
            </Divider>
            
            <Form.Item 
              name="fromSlotId" 
              label="Kíp trực hiện tại" 
              rules={[{ required: true, message: 'Vui lòng chọn kíp bạn đang trực' }]}
            >
              <Select
                showSearch
                loading={fetching}
                disabled={fetching}
                placeholder={fetching ? "Đang tải dữ liệu..." : "Chọn kíp trực..."}
                optionFilterProp="label"
                options={myDynamicSlots}
                notFoundContent={fetching ? null : "Không có kíp trực nào trong tuần này"}
              />
            </Form.Item>
          </>
        )}

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Chọn kíp trực muốn chuyển tới</span>
        </Divider>

        <Form.Item 
          name="toSlotId" 
          label="Kíp trực đích" 
          rules={[{ required: true, message: 'Vui lòng chọn kíp muốn chuyển đến' }]}
        >
          <Select
            showSearch
            loading={fetching}
            disabled={fetching}
            style={{ width: '100%' }}
            placeholder={fetching ? "Đang tải dữ liệu..." : "Tìm kiếm theo kíp..."}
            optionFilterProp="label"
            options={targetSlots}
          />
        </Form.Item>
        
        <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 8 }}>
          Lưu ý: Sau khi chuyển thành công, vị trí cũ của bạn sẽ được giải phóng để người khác đăng ký.
        </div>
      </div>
    </FormModal>
  );
};

export default ShiftTransferModal;
