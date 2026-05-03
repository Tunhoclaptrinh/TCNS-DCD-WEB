import React, { useState } from 'react';
import { Modal, Form, DatePicker, Checkbox, Select, Space, Button, message, Divider, Typography, Row, Col } from 'antd';
import { CloudDownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ExportDutyModalProps {
  open: boolean;
  onCancel: () => void;
  defaultRange?: [dayjs.Dayjs, dayjs.Dayjs];
}

const ExportDutyModal: React.FC<ExportDutyModalProps> = ({ open, onCancel, defaultRange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleExport = async (values: any) => {
    setLoading(true);
    try {
      const { range, includeDays, mode } = values;
      await dutyService.exportRangeExcel({
        startDate: range[0].format('YYYY-MM-DD'),
        endDate: range[1].format('YYYY-MM-DD'),
        includeDays,
        mode
      });
      message.success('Đang khởi tạo tệp Excel...');
      onCancel();
    } catch (err) {
      message.error('Lỗi khi xuất dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CloudDownloadOutlined style={{ color: 'var(--primary-color)' }} />
          <span>Tùy chọn Xuất Lịch Trực (Excel)</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button 
          key="submit" 
          type="primary" 
          icon={<CloudDownloadOutlined />} 
          loading={loading}
          onClick={() => form.submit()}
          className="hifi-button"
        >
          Tải về ngay
        </Button>
      ]}
      width={520}
      className="premium-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          range: defaultRange || [dayjs().startOf('month'), dayjs().endOf('month')],
          mode: 'all',
          includeDays: [1, 2, 3, 4, 5, 6, 0]
        }}
        onFinish={handleExport}
        style={{ marginTop: 16 }}
      >
        <Form.Item 
          name="range" 
          label="Khoảng ngày cần tải" 
          rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày' }]}
        >
          <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item name="mode" label="Chế độ dữ liệu">
          <Select options={[
            { label: 'Toàn bộ (Lịch trực + Lịch họp)', value: 'all' },
            { label: 'Chỉ lịch trực', value: 'only_duty' },
            { label: 'Lịch trực & Lịch họp (Không bao gồm sự kiện khác)', value: 'with_meetings' },
          ]} />
        </Form.Item>

        <Form.Item name="includeDays" label="Các ngày trong tuần muốn xuất">
          <Checkbox.Group style={{ width: '100%' }}>
            <Row>
              <Col span={8}><Checkbox value={1}>Thứ 2</Checkbox></Col>
              <Col span={8}><Checkbox value={2}>Thứ 3</Checkbox></Col>
              <Col span={8}><Checkbox value={3}>Thứ 4</Checkbox></Col>
              <Col span={8}><Checkbox value={4}>Thứ 5</Checkbox></Col>
              <Col span={8}><Checkbox value={5}>Thứ 6</Checkbox></Col>
              <Col span={8}><Checkbox value={6}>Thứ 7</Checkbox></Col>
              <Col span={8}><Checkbox value={0}>Chủ nhật</Checkbox></Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
          <InfoCircleOutlined style={{ color: '#64748b', marginTop: 3 }} />
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            <Text type="secondary">
              Mẹo: Nếu chọn khoảng ngày lớn (ví dụ cả tháng), hệ thống sẽ tự động phân tách thành các trang (Sheet) theo từng tuần để bản in đẹp và chuyên nghiệp nhất.
            </Text>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default ExportDutyModal;
