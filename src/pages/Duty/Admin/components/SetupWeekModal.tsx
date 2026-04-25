import React from 'react';
import { Modal, Form, Space, Card, Select, Tooltip, Divider, message } from 'antd';
import Button from '@/components/common/Button';
import { SettingOutlined, QuestionCircleOutlined, CopyOutlined, ClearOutlined } from '@ant-design/icons';
import dutyService from '@/services/duty.service';
import dayjs from 'dayjs';


interface SetupWeekModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentWeek: dayjs.Dayjs;
  templateGroups: any[];
}

const SetupWeekModal: React.FC<SetupWeekModalProps> = ({
  open,
  onCancel,
  onSuccess,
  currentWeek,
  templateGroups
}) => {
  const [form] = Form.useForm();

  const generateScheduleFromTemplates = async (force: boolean = false) => {
    try {
      const values = await form.validateFields();
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');
      const res = await dutyService.generateRangeSlots(start, end, values.templateId, values.mode);
      if (res.success) {
        message.success('Đã khởi tạo từ bản mẫu');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      if (err.errorFields) return;
      const errorMsg = err.response?.data?.message || err.message || '';
      if ((errorMsg.includes('already has slots') || errorMsg.includes('already exists')) && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và khởi tạo lại theo bản mẫu không?',
          okText: 'Xóa và Khởi tạo',
          okType: 'danger',
          onOk: () => generateScheduleFromTemplates(true)
        });
      } else {
        message.error('Lỗi khi khởi tạo: ' + errorMsg);
      }
    }
  };

  const handleCopyWeek = async (force: boolean = false) => {
    try {
      const prevWeekStart = currentWeek.subtract(1, 'week').startOf('isoWeek' as any).format('YYYY-MM-DD');
      const targetStart = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');

      const res = await dutyService.copyWeekSchedule(prevWeekStart, targetStart);
      if (res.success) {
        message.success('Đã sao chép lịch tuần trước');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg === 'Target week already has slots' && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và sao chép lại từ tuần trước không?',
          okText: 'Xóa và Sao chép',
          okType: 'danger',
          onOk: async () => {
            const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
            await dutyService.deleteWeeklySlots(start);
            return handleCopyWeek(true);
          }
        });
      } else {
        message.error('Lỗi khi sao chép: ' + errorMsg);
      }
    }
  };

  const handleClearWeek = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa sạch lịch tuần này?',
      okText: 'Xóa sạch',
      okType: 'danger',
      onOk: async () => {
        try {
          const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
          const res = await dutyService.deleteWeeklySlots(start);
          if (res.success) {
            message.success('Đã xóa lịch tuần');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Lỗi khi xóa lịch');
        }
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined style={{ color: 'var(--primary-color)' }} />
          <span>Thiết lập lịch trình nhanh (Tuần)</span>
          <Tooltip title="Các thao tác tác động lên toàn bộ dữ liệu của tuần hiện tại">
            <QuestionCircleOutlined style={{ fontSize: 14, color: 'var(--primary-color)' }} />
          </Tooltip>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <div key="footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Button variant="outline" buttonSize="small" onClick={onCancel} style={{ minWidth: 120 }}>Đóng</Button>
        </div>
      ]}
      width={400}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ templateId: templateGroups.find(g => g.isDefault)?.id, mode: 'kips' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card size="small" title="Cấu hình Khởi tạo" style={{ backgroundColor: '#f8fafc' }}>
            <Form.Item name="templateId" label="Chọn Bản mẫu" rules={[{ required: true }]}>
              <Select size="small" placeholder="Chọn nhóm bản mẫu" options={templateGroups.map(g => ({ label: g.name, value: g.id }))} />
            </Form.Item>
            <Form.Item name="mode" label="Chế độ khởi tạo" rules={[{ required: true }]}>
              <Select size="small" options={[
                { label: 'Chi tiết Kíp (Kips)', value: 'kips' },
                { label: 'Chỉ Ca (Shifts)', value: 'shifts' },
                { label: 'Toàn bộ (Both)', value: 'all' }
              ]} />
            </Form.Item>
          </Card>

          <Tooltip title="Tự động tạo các khung giờ kíp trực dựa trên cấu hình Bản mẫu đã thiết lập" placement="right">
            <Button buttonSize="small" fullWidth type="primary" icon={<SettingOutlined />} onClick={() => {
              Modal.confirm({
                title: 'Xác nhận khởi tạo?',
                content: 'Hệ thống sẽ dựa vào Bản mẫu để tạo các kíp trực cho tuần này. Các kíp đã có sẽ không bị ảnh hưởng.',
                onOk: generateScheduleFromTemplates
              });
            }}>Khởi tạo từ Bản mẫu</Button>
          </Tooltip>
 
          <Tooltip title="Lấy dữ liệu kíp trực của tuần trước đó áp dụng cho tuần này" placement="right">
            <Button buttonSize="small" fullWidth icon={<CopyOutlined />} onClick={() => {
              Modal.confirm({
                title: 'Xác nhận sao chép?',
                content: 'Toàn bộ kíp trực từ tuần trước sẽ được nhân bản sang tuần này.',
                onOk: handleCopyWeek
              });
            }}>Sao chép từ tuần trước</Button>
          </Tooltip>
 
          <Divider style={{ margin: '4px 0' }} />
 
          <Tooltip title="Xóa toàn bộ các kíp trực trong tuần này để làm lại từ đầu" placement="right">
            <Button buttonSize="small" fullWidth variant="danger" ghost icon={<ClearOutlined />} onClick={handleClearWeek}>Xóa sạch lịch tuần</Button>
          </Tooltip>
        </Space>
      </Form>
    </Modal>
  );
};

export default SetupWeekModal;
