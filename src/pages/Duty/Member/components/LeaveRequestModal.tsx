import React, { useState, useEffect } from 'react';
import { Form, Input, Divider, Space, Select, message, Typography } from 'antd';
import { StopOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import FormModal from '@/components/common/FormModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';

interface LeaveRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { reason: string, slotId?: number }) => Promise<void>;
  globalMode?: boolean;
  loading?: boolean;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  open,
  onCancel,
  onSubmit,
  globalMode = false,
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
        form.setFieldValue('slotId', undefined); // clear selected slot when changing week
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
      // Reset safely on close
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

  const weekOptions = React.useMemo(() => {
    const options = [];
    const today = dayjs().startOf('isoWeek');
    for (let i = -2; i <= 4; i++) { // From 2 weeks ago to 4 weeks ahead
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

  const slotOptions = React.useMemo(() => {
    if (!globalMode) return [];
    const sorted = [...fetchedSlots].sort((a, b) => dayjs(a.shiftDate).valueOf() - dayjs(b.shiftDate).valueOf());
    const myDynamicSlots = sorted.filter(s => Array.isArray(s.assignedUserIds) && s.assignedUserIds.some((id: any) => String(id) === String(user?.id)));
    
    return myDynamicSlots.map(s => {
      const dateStr = dayjs(s.shiftDate).format('dd, DD/MM');
      const label = `${dateStr} • ${s.startTime}-${s.endTime} • ${s.shiftLabel || s.shiftName || s.name || 'Kíp trực'}`;
      
      return { 
        label: label, 
        value: s.id,
        disabled: s.status === 'locked' || s.isPast
      };
    });
  }, [fetchedSlots, globalMode, user?.id]);

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <StopOutlined style={{ color: '#ef4444' }} />
          <span>Yêu cầu xin nghỉ trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={submitting || loading}
      width={500}
      okText="Gửi yêu cầu"
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        {globalMode && (
          <>
            <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
              <CalendarOutlined style={{ color: '#ef4444' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Chọn tuần</span>
            </Divider>
            
            <Form.Item label="Chọn tuần">
              <Select
                value={selectedWeek}
                onChange={setSelectedWeek}
                options={weekOptions}
              />
            </Form.Item>
          </>
        )}

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <StopOutlined style={{ color: '#ef4444' }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin vắng mặt</span>
        </Divider>

        {globalMode && (
          <Form.Item 
            name="slotId" 
            label="Kíp trực vắng mặt" 
            rules={[{ required: true, message: 'Vui lòng chọn kíp bạn muốn xin nghỉ' }]}
          >
            <Select
              showSearch
              loading={fetching}
              disabled={fetching}
              placeholder={fetching ? "Đang tải dữ liệu..." : "Chọn kíp trực..."}
              optionFilterProp="label"
              options={slotOptions}
              notFoundContent={fetching ? null : "Không có kíp trực nào trong tuần này"}
            />
          </Form.Item>
        )}

        <Form.Item 
          name="reason" 
          label="Lý do xin nghỉ" 
          rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Vui lòng giải thích ngắn gọn lý do bạn không thể trực kíp này để Admin xem xét..." 
          />
        </Form.Item>
        
        <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>
          Lưu ý: Sau khi gửi, yêu cầu sẽ chờ Admin hoặc Staff phê duyệt. Bạn vẫn có trách nhiệm trực nếu yêu cầu chưa được chấp thuận.
        </div>
      </div>
    </FormModal>
  );
};

export default LeaveRequestModal;
