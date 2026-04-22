import React from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Row, 
  Col, 
  Space, 
  Divider, 
  Select, 
  TimePicker
} from 'antd';
import { 
  ScheduleOutlined, 
  EyeOutlined,
  EyeInvisibleOutlined,
  UnlockOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import { DutyKip } from '@/services/duty.service';
import SlotStructureEditor from './SlotStructureEditor';





interface KipModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingKip: Partial<DutyKip> | null;
  onSubmit: (values: any) => Promise<void>;
  loading?: boolean;
}

const KipModal: React.FC<KipModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingKip,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      if (editingKip) {
        form.setFieldsValue({
          ...editingKip,
          timeRange: editingKip.startTime && editingKip.endTime 
            ? [dayjs(editingKip.startTime, 'HH:mm'), dayjs(editingKip.endTime, 'HH:mm')] 
            : undefined
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingKip, form]);

  const handleOk = async (values: any) => {
    await onSubmit(values);
    onSuccess();
  };

  return (
    <FormModal
      open={open}
      title={editingKip?.id ? "Cập nhật Kíp trực" : "Thêm mới Kíp trực"}
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      width={900}
      destroyOnClose
    >
      <div style={{ padding: '0 4px' }}>
        <Form.Item name="shiftId" hidden><Input /></Form.Item>

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ScheduleOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin chi tiết Kíp</span>
        </Divider>

        <Row gutter={[24, 0]}>
          <Col span={12}>
            <Form.Item 
              name="name" 
              label="Tên Kíp trực" 
              rules={[{ required: true, message: 'Vui lòng nhập tên kíp' }]}
            >
              <Input placeholder="VD: Kíp 1, Trực sảnh..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="description" label="Địa điểm / Ghi chú">
              <Input placeholder="Ghi chú vị trí trực..." />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item name="capacity" label="Tổng chỉ tiêu (Người)" initialValue={1}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập chỉ tiêu" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="timeRange"
              label="Khung giờ đặc thù (Tùy chọn)"
              extra="Bỏ trống để sử dụng giờ mặc định của Ca"
            >
              <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} placeholder={['Bắt đầu', 'Kết thúc']} />
            </Form.Item>
          </Col>
        </Row>

        <SlotStructureEditor 
          form={form} 
          onTotalChange={(total) => {
            if (total > 0) {
              const currentCapacity = form.getFieldValue('capacity');
              if (total > (currentCapacity || 0)) {
                form.setFieldValue('capacity', total);
              }
            }
          }}
        />

        <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
          <GlobalOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Cấu hình Hiển thị & Lịch</span>
        </Divider>

        <Row gutter={[24, 0]}>
          <Col span={8}>
            <Form.Item name="coefficient" label="Hệ số công việc" initialValue={1}>
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="VD: 1.0" />
            </Form.Item>
          </Col>
          <Col span={16}>
             <Form.Item 
              name={['config', 'visibilityMode']} 
              label="Chế độ bảo mật / Tách lịch"
              initialValue="public"
            >
              <Select
                placeholder="Chọn chế độ bảo mật"
                options={[
                  { 
                    label: <Space><UnlockOutlined /><span>Công khai (Tất cả thấy nhau)</span></Space>, 
                    value: 'public' 
                  },
                  { 
                    label: <Space><EyeInvisibleOutlined /><span>Bảo mật song phương (TV & CTV ẩn nhau)</span></Space>, 
                    value: 'private_mutual' 
                  },
                  { 
                    label: <Space><EyeOutlined /><span>Bảo vệ TV (TV thấy CTV, CTV ẩn TV)</span></Space>, 
                    value: 'protect_members' 
                  },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item 
              name="daysOfWeek" 
              label="Lịch áp dụng riêng" 
              extra="Mặc định áp dụng cho tất cả ngày của Ca"
            >
              <Select
                mode="multiple"
                placeholder="Theo lịch chung của Ca"
                style={{ width: '100%' }}
                maxTagCount="responsive"
                options={[
                  { label: 'Thứ 2', value: 0 },
                  { label: 'Thứ 3', value: 1 },
                  { label: 'Thứ 4', value: 2 },
                  { label: 'Thứ 5', value: 3 },
                  { label: 'Thứ 6', value: 4 },
                  { label: 'Thứ 7', value: 5 },
                  { label: 'Chủ nhật', value: 6 }
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </FormModal>
  );
};

export default KipModal;
