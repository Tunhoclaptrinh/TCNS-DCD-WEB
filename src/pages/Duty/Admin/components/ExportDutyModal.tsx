import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  DatePicker, 
  Checkbox, 
  Select, 
  Space, 
  Button, 
  message, 
  Row,
  Col,
  Card,
  Tag,
  Descriptions
} from 'antd';
import { 
  CloudDownloadOutlined, 
  TeamOutlined, 
  UserOutlined, 
  IdcardOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dutyService from '@/services/duty.service';

dayjs.extend(isoWeek);

const { RangePicker } = DatePicker;

interface ExportDutyModalProps {
  open: boolean;
  onCancel: () => void;
  defaultRange?: [dayjs.Dayjs, dayjs.Dayjs];
}

const VI_DAY_NAMES: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  0: 'Chủ nhật',
};

const ExportDutyModal: React.FC<ExportDutyModalProps> = ({ open, onCancel, defaultRange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Watch form values for live summary
  const range = Form.useWatch('range', form);
  const memberFilter = Form.useWatch('memberFilter', form);
  const mode = Form.useWatch('mode', form);
  const includeDays = Form.useWatch('includeDays', form) || [1, 2, 3, 4, 5, 6, 0];

  useEffect(() => {
    if (open) {
      const initialRange = defaultRange || [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')];
      form.setFieldsValue({
        range: initialRange,
        mode: 'all',
        memberFilter: 'all',
        includeDays: [1, 2, 3, 4, 5, 6, 0]
      });
    }
  }, [open, defaultRange, form]);

  const handleDayPreset = (type: 'all' | 'weekdays' | 'weekend') => {
    if (type === 'all') form.setFieldValue('includeDays', [1, 2, 3, 4, 5, 6, 0]);
    else if (type === 'weekdays') form.setFieldValue('includeDays', [1, 2, 3, 4, 5]);
    else if (type === 'weekend') form.setFieldValue('includeDays', [6, 0]);
  };

  const handleExport = async (values: any) => {
    setLoading(true);
    try {
      const { range: exportRange, includeDays: days, mode: exportMode, memberFilter: filter } = values;
      await dutyService.exportRangeExcel({
        startDate: exportRange[0].format('YYYY-MM-DD'),
        endDate: exportRange[1].format('YYYY-MM-DD'),
        includeDays: days,
        mode: exportMode,
        memberFilter: filter
      });
      message.success('Đang khởi tạo tệp Excel tải về...');
      onCancel();
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.statusCode === 403 || err?.status === 403) {
        message.error('Bạn không có quyền xuất lịch trực ra file Excel');
      } else {
        message.error('Lỗi khi xuất dữ liệu Excel');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper texts for summary preview
  const startDateStr = range?.[0]?.format('DD/MM/YYYY') || '';
  const endDateStr = range?.[1]?.format('DD/MM/YYYY') || '';
  const totalDays = range ? range[1].diff(range[0], 'day') + 1 : 0;

  const memberFilterLabel = 
    memberFilter === 'tv' 
      ? 'Chỉ Thành viên (TV)' 
      : memberFilter === 'ctv' 
        ? 'Chỉ Cộng tác viên (CTV)' 
        : 'Tất cả (TV & CTV)';

  const modeLabel = 
    mode === 'only_duty' 
      ? 'Chỉ lịch trực' 
      : mode === 'with_meetings' 
        ? 'Lịch trực & Lịch họp' 
        : 'Toàn bộ dữ liệu';

  const selectedDaysLabel = includeDays.length === 7 
    ? 'Cả tuần (7 ngày)' 
    : includeDays.length === 5 && !includeDays.includes(6) && !includeDays.includes(0)
      ? 'Ngày thường (T2 - T6)'
      : includeDays.map((d: number) => VI_DAY_NAMES[d]).join(', ');

  const datePresets = [
    { label: 'Tuần này', value: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] as [dayjs.Dayjs, dayjs.Dayjs] },
    { label: 'Tuần sau', value: [dayjs().add(1, 'week').startOf('isoWeek'), dayjs().add(1, 'week').endOf('isoWeek')] as [dayjs.Dayjs, dayjs.Dayjs] },
    { label: 'Cả tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
    { label: 'Tháng sau', value: [dayjs().add(1, 'month').startOf('month'), dayjs().add(1, 'month').endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
  ];

  return (
    <Modal
      title={
        <Space align="center" size={8}>
          <FileExcelOutlined style={{ fontSize: 20, color: '#10b981' }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>Tùy chọn Xuất Lịch Trực (Excel)</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Đóng
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          icon={<CloudDownloadOutlined />} 
          loading={loading}
          onClick={() => form.submit()}
        >
          Tải file Excel ngay
        </Button>
      ]}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          range: defaultRange || [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')],
          mode: 'all',
          memberFilter: 'all',
          includeDays: [1, 2, 3, 4, 5, 6, 0]
        }}
        onFinish={handleExport}
        style={{ marginTop: 12 }}
      >
        <Row gutter={[16, 0]}>
          {/* 1. Khoảng thời gian */}
          <Col span={24}>
            <Form.Item 
              name="range" 
              label={<Space><CalendarOutlined /><span>Khoảng thời gian xuất file</span></Space>}
              rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày' }]}
            >
              <RangePicker 
                style={{ width: '100%' }} 
                format="DD/MM/YYYY" 
                presets={datePresets}
              />
            </Form.Item>
          </Col>

          {/* 2. Ngày trong tuần */}
          <Col span={24}>
            <Form.Item 
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Space wrap><ScheduleOutlined /><span>Các ngày trong tuần muốn xuất</span></Space>
                  <Space size={4} wrap>
                    <Button size="small" type="link" onClick={() => handleDayPreset('all')}>Tất cả</Button>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <Button size="small" type="link" onClick={() => handleDayPreset('weekdays')}>Ngày thường</Button>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <Button size="small" type="link" onClick={() => handleDayPreset('weekend')}>Cuối tuần</Button>
                  </Space>
                </div>
              }
              name="includeDays"
            >
              <Checkbox.Group style={{ width: '100%' }}>
                <Row gutter={[8, 8]}>
                  <Col xs={12} sm={8} md={3}><Checkbox value={1}>Thứ 2</Checkbox></Col>
                  <Col xs={12} sm={8} md={3}><Checkbox value={2}>Thứ 3</Checkbox></Col>
                  <Col xs={12} sm={8} md={3}><Checkbox value={3}>Thứ 4</Checkbox></Col>
                  <Col xs={12} sm={8} md={3}><Checkbox value={4}>Thứ 5</Checkbox></Col>
                  <Col xs={12} sm={8} md={3}><Checkbox value={5}>Thứ 6</Checkbox></Col>
                  <Col xs={12} sm={8} md={4}><Checkbox value={6}><span style={{ color: '#e11d48' }}>Thứ 7</span></Checkbox></Col>
                  <Col xs={12} sm={8} md={5}><Checkbox value={0}><span style={{ color: '#e11d48' }}>Chủ nhật</span></Checkbox></Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Col>

          {/* 3. Đối tượng thành viên */}
          <Col xs={24} sm={12}>
            <Form.Item 
              name="memberFilter" 
              label={<Space wrap><TeamOutlined /><span>Đối tượng thành viên</span></Space>}
            >
              <Select
                options={[
                  { label: <Space><TeamOutlined /><span>Tất cả (TV & CTV)</span></Space>, value: 'all' },
                  { label: <Space><UserOutlined /><span>Chỉ Thành viên chính thức (TV)</span></Space>, value: 'tv' },
                  { label: <Space><IdcardOutlined /><span>Chỉ Cộng tác viên (CTV)</span></Space>, value: 'ctv' },
                ]}
              />
            </Form.Item>
          </Col>

          {/* 4. Chế độ dữ liệu */}
          <Col xs={24} sm={12}>
            <Form.Item 
              name="mode" 
              label={<Space wrap><FileTextOutlined /><span>Nội dung cần tải</span></Space>}
            >
              <Select 
                options={[
                  { label: 'Toàn bộ dữ liệu (Lịch + Họp + Sự kiện)', value: 'all' },
                  { label: 'Chỉ lịch trực các ca kíp', value: 'only_duty' },
                  { label: 'Lịch trực & Lịch họp', value: 'with_meetings' },
                ]} 
              />
            </Form.Item>
          </Col>

          {/* 5. Khung Tóm tắt thông số */}
          <Col span={24}>
            <Card 
              size="small" 
              title={<Space wrap><InfoCircleOutlined style={{ color: '#1677ff' }} /><span>Tóm tắt thông số xuất file Excel</span></Space>}
              style={{ background: '#f8fafc', borderColor: '#e2e8f0', marginTop: 4 }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Descriptions 
                size="small" 
                column={{ xs: 1, sm: 2 }}
                colon={true}
                labelStyle={{ color: '#64748b', fontWeight: 500 }}
                contentStyle={{ fontWeight: 600, color: '#1e293b' }}
              >
                <Descriptions.Item label={<Space size={4}><CalendarOutlined style={{ color: '#64748b' }} /><span>Thời gian</span></Space>}>
                  {startDateStr} – {endDateStr} ({totalDays} ngày)
                </Descriptions.Item>
                <Descriptions.Item label={<Space size={4}><ScheduleOutlined style={{ color: '#64748b' }} /><span>Ngày xuất</span></Space>}>
                  {selectedDaysLabel}
                </Descriptions.Item>
                <Descriptions.Item label={<Space size={4}><TeamOutlined style={{ color: '#64748b' }} /><span>Đối tượng</span></Space>}>
                  <Tag color={memberFilter === 'tv' ? 'blue' : memberFilter === 'ctv' ? 'green' : 'geekblue'} style={{ margin: 0 }}>
                    {memberFilterLabel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<Space size={4}><FileTextOutlined style={{ color: '#64748b' }} /><span>Nội dung</span></Space>}>
                  <Tag color="purple" style={{ margin: 0 }}>
                    {modeLabel}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ExportDutyModal;

