import React, { useEffect, useState } from 'react';
import { Modal, Form, Space, Select, Row, Col, Typography, Badge, message } from 'antd';
import Button from '@/components/common/Button';
import { 
  SettingOutlined, CopyOutlined, DeleteOutlined, 
  ThunderboltOutlined, AppstoreOutlined
} from '@ant-design/icons';
const { Text } = Typography;
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
  const [loading, setLoading] = useState(false);
  const [hasSlots, setHasSlots] = useState(false);

  useEffect(() => {
    if (open) {
      checkWeekStatus();
      const defaultGroup = templateGroups.find(g => g.isDefault);
      form.setFieldsValue({
        templateId: defaultGroup?.id,
        mode: 'kips'
      });
    }
  }, [open, currentWeek, templateGroups]);

  const checkWeekStatus = async () => {
    try {
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const res = await dutyService.getWeeklySchedule(start);
      if (res.success && res.data) {
        setHasSlots((res.data.slots || []).length > 0);
      }
    } catch {
      setHasSlots(false);
    }
  };

  const handleGenerate = async (force: boolean = false) => {
    try {
      const values = await form.validateFields();
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');

      setLoading(true);
      const res = await dutyService.generateRangeSlots(start, end, values.templateId, values.mode);
      if (res.success) {
        message.success('Đã khởi tạo lịch trực thành công');
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
          okText: 'Xóa và Khởi tạo lại',
          okType: 'danger',
          onOk: () => handleGenerate(true)
        });
      } else {
        message.error('Lỗi khi khởi tạo: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWeek = async () => {
    try {
      setLoading(true);
      const prevWeekStart = currentWeek.subtract(1, 'week').startOf('isoWeek' as any).format('YYYY-MM-DD');
      const targetStart = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');

      const res = await dutyService.copyWeekSchedule(prevWeekStart, targetStart);
      if (res.success) {
        message.success('Đã sao chép lịch từ tuần trước thành công');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg.includes('already has slots') || errorMsg.includes('đã có lịch')) {
        Modal.confirm({
          title: 'Tuần đích đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và sao chép đè từ tuần trước không?',
          okText: 'Xóa và Sao chép',
          okType: 'danger',
          onOk: async () => {
            const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
            await dutyService.deleteWeeklySlots(start);
            return handleCopyWeek();
          }
        });
      } else {
        message.error('Lỗi khi sao chép: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearWeek = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa sạch lịch tuần này?',
      content: 'Toàn bộ các ca và kíp trực của tuần được chọn sẽ bị xóa vĩnh viễn.',
      okText: 'Xóa sạch',
      okType: 'danger',
      onOk: async () => {
        try {
          const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
          const res = await dutyService.deleteWeeklySlots(start);
          if (res.success) {
            message.success('Đã xóa sạch lịch tuần');
            onSuccess();
            onCancel();
          }
        } catch {
          message.error('Lỗi khi xóa lịch');
        }
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Khởi tạo & Quản lý Lịch Tuần</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              Tuần {currentWeek.format('ww')} ({currentWeek.startOf('isoWeek' as any).format('DD/MM')} - {currentWeek.endOf('isoWeek' as any).format('DD/MM/YYYY')})
            </Text>
          </div>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text type="secondary">Trạng thái tuần hiện tại:</Text>
          {hasSlots ? (
            <Badge status="processing" text={<Text strong style={{ color: '#059669' }}>Đã có lịch trực</Text>} />
          ) : (
            <Badge status="default" text={<Text type="secondary">Chưa có lịch trực</Text>} />
          )}
        </div>

        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item 
                name="templateId" 
                label={<span style={{ fontSize: 13, fontWeight: 600 }}><AppstoreOutlined /> Chọn Bản mẫu</span>} 
                rules={[{ required: true, message: 'Vui lòng chọn bản mẫu' }]}
              >
                <Select 
                  placeholder="Chọn nhóm bản mẫu" 
                  options={templateGroups.map(g => ({ 
                    label: `${g.name} ${g.isDefault ? '(Mặc định)' : ''}`, 
                    value: g.id 
                  }))} 
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item 
                name="mode" 
                label={<span style={{ fontSize: 13, fontWeight: 600 }}>Chế độ tạo</span>} 
                rules={[{ required: true }]}
              >
                <Select options={[
                  { label: 'Chi tiết Kíp', value: 'kips' },
                  { label: 'Chỉ tạo Ca', value: 'shifts' },
                  { label: 'Toàn bộ', value: 'all' }
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -4 }}>
            💡 Hệ thống sẽ dập khuôn toàn bộ ca/kíp từ Bản mẫu đã chọn sang 7 ngày của tuần này.
          </Text>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          {hasSlots ? (
            <Button 
              buttonSize="medium" 
              variant="outline" 
              icon={<DeleteOutlined />} 
              loading={loading}
              onClick={handleClearWeek}
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            >
              Xóa lịch tuần
            </Button>
          ) : <div />}

          <Space size={8}>
            <Button 
              buttonSize="medium" 
              variant="outline" 
              icon={<CopyOutlined />} 
              loading={loading}
              onClick={handleCopyWeek}
            >
              Sao chép tuần trước
            </Button>

            <Button 
              buttonSize="medium" 
              variant="primary" 
              icon={<ThunderboltOutlined />} 
              loading={loading}
              onClick={() => handleGenerate(false)}
            >
              Khởi tạo lịch
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default SetupWeekModal;
