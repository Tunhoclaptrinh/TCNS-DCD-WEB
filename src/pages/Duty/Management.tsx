import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Tabs, Divider, Alert, DatePicker, Row, Col, Tooltip, Table, Tag, Checkbox, Badge } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ScheduleOutlined, SettingOutlined,
  InboxOutlined,
  LeftOutlined, RightOutlined, LayoutOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import dutyService, { DutyShift } from '@/services/duty.service';

const { Text, Title } = Typography;

const DutyManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotFilterWeek, setSlotFilterWeek] = useState(dayjs().startOf('isoWeek' as any));
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Modals Visibility
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isKipModalOpen, setIsKipModalOpen] = useState(false);
  const [isSlotEditModalOpen, setIsSlotEditModalOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Forms
  const [shiftForm] = Form.useForm();
  const [kipForm] = Form.useForm();
  const [slotEditForm] = Form.useForm();
  const [coordinationForm] = Form.useForm();
  const [manualSlotForm] = Form.useForm();

  // Selected Items for Editing
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [editingKip, setEditingKip] = useState<any>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [selectedShiftTemplate, setSelectedShiftTemplate] = useState<number | null>(null);
  const [previewDates, setPreviewDates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => slotFilterWeek.add(i, 'day')),
    [slotFilterWeek]
  );

  useEffect(() => {
    fetchTemplates();
    fetchSlots();
    fetchLeaveRequests();
  }, [slotFilterWeek]);

  const fetchTemplates = async () => {
    try {
      const res = await dutyService.getTemplates();
      if (res.success && res.data) setTemplates(res.data);
    } catch (err) { message.error('Lỗi tải bản mẫu'); }
  };

  const fetchSlots = async () => {
    setSlotLoading(true);
    try {
      const res = await dutyService.getWeeklySchedule(slotFilterWeek.format('YYYY-MM-DD'));
      if (res.success && res.data) setSlots(res.data.slots || []);
    } catch (err) { message.error('Lỗi tải danh sách ca'); }
    finally { setSlotLoading(false); }
  };

  const fetchLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ status: 'pending' });
      if (res.success) setLeaveRequests(res.data);
    } catch (err) { }
    finally { setLeaveLoading(false); }
  };

  const handleSubmitShift = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      startTime: timeRange[0].format('HH:mm'),
      endTime: timeRange[1].format('HH:mm')
    };
    try {
      const res = editingShift
        ? await dutyService.updateShiftTemplate(editingShift.id, data)
        : await dutyService.createShiftTemplate(data);
      if (res.success) {
        message.success('Đã lưu ca trực');
        setIsShiftModalOpen(false);
        fetchTemplates();
      }
    } catch (err) { message.error('Lỗi khi lưu'); }
  };

  const handleCreateKip = async (values: any) => {
    const { timeRange, ...rest } = values;
    const data = {
      ...rest,
      startTime: timeRange?.[0]?.format('HH:mm'),
      endTime: timeRange?.[1]?.format('HH:mm')
    };
    try {
      const res = editingKip?.id
        ? await dutyService.updateKipTemplate(editingKip.id, data)
        : await dutyService.createKipTemplate(data);
      if (res.success) {
        message.success('Đã lưu kíp trực');
        setIsKipModalOpen(false);
        fetchTemplates();
      }
    } catch (err) { message.error('Lỗi khi lưu'); }
  };

  const handleDeleteShift = (id: number) => {
    Modal.confirm({
      title: 'Xóa bản mẫu ca trực?',
      content: 'Tất cả kíp thuộc ca này cũng sẽ bị xóa.',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteShiftTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const handleDeleteKip = (id: number) => {
    Modal.confirm({
      title: 'Xóa kíp?',
      okType: 'danger',
      onOk: async () => {
        const res = await dutyService.deleteKipTemplate(id);
        if (res.success) { message.success('Đã xóa'); fetchTemplates(); }
      }
    });
  };

  const handleResolveLeave = async (id: number, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = prompt('Lý do từ chối:') || '';
      if (!reason) return;
    }
    try {
      const res = await dutyService.resolveLeaveRequest(id, status, reason);
      if (res.success) {
        message.success('Đã xử lý');
        fetchLeaveRequests();
      }
    } catch (err) { message.error('Lỗi xử lý'); }
  };

  const tabItems = [
    {
      key: '1',
      label: <span><InboxOutlined /> Quản lý Ca đã lập</span>,
      children: (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Space><InboxOutlined /><Title level={5} style={{ margin: 0 }}>Lịch trực Chi tiết</Title></Space>
              <Divider type="vertical" style={{ height: 24 }} />
              <Space>
                <Button icon={<LeftOutlined />} onClick={() => setSlotFilterWeek(slotFilterWeek.subtract(1, 'week'))} />
                <DatePicker picker="week" value={slotFilterWeek} allowClear={false} onChange={(val) => val && setSlotFilterWeek(val.startOf('isoWeek' as any))} format="[Tuần] ww (DD/MM)" style={{ width: 160 }} />
                <Button icon={<RightOutlined />} onClick={() => setSlotFilterWeek(slotFilterWeek.add(1, 'week'))} />
                <Tooltip title="Về tuần hiện tại theo thời gian hệ thống">
                  <Button type="primary" ghost onClick={() => setSlotFilterWeek(dayjs().startOf('isoWeek' as any))}>Hiện tại</Button>
                </Tooltip>
              </Space>
            </div>
          }
          className="hifi-border"
          extra={<Button icon={<ScheduleOutlined />} onClick={fetchSlots}>Làm mới</Button>}
        >
          <div style={{ marginBottom: 20 }}>
            <Space wrap>
              {weekDays.map(d => {
                const isSelected = d.isSame(selectedDate, 'day');
                const slotCount = slots.filter(s => dayjs(s.shiftDate).isSame(d, 'day')).length;
                return (
                  <Button
                    key={d.toISOString()}
                    type={isSelected ? 'primary' : 'default'}
                    onClick={() => setSelectedDate(d)}
                    style={{ height: 48, minWidth: 80 }}
                  >
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{d.locale('vi').format('ddd')}</div>
                    <div><b>{d.format('DD/MM')}</b> {slotCount > 0 && <Badge count={slotCount} size="small" offset={[5, -5]} />}</div>
                  </Button>
                );
              })}
            </Space>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Cấu hình cho {selectedDate.locale('vi').format('dddd, [ngày] DD/MM')}</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              manualSlotForm.setFieldsValue({ date: selectedDate });
              setActiveTab('2'); // Fallback to manual add in Tab 2 or I can add a dedicated modal here
              message.info('Vui lòng thêm ca tại phần "Thêm Ca đơn lẻ" phía dưới');
            }}>Thêm ca cho ngày này</Button>
          </div>

          <Table
            loading={slotLoading}
            dataSource={slots.filter(s => dayjs(s.shiftDate).isSame(selectedDate, 'day'))}
            rowKey="id"
            size="middle"
            pagination={false}
            columns={[
              {
                title: 'Khung giờ',
                render: (_, r) => <Text strong>{r.startTime} - {r.endTime}</Text>
              },
              { title: 'Ca & Kíp', dataIndex: 'shiftLabel' },
              { title: 'Trạng thái', dataIndex: 'status', render: (s) => <Tag color={s === 'locked' ? 'red' : 'green'}>{s === 'locked' ? 'Đã khóa' : 'Đang mở'}</Tag> },
              {
                title: 'Thao tác', render: (_, r) => (
                  <Space>
                    <Tooltip title="Chỉnh sửa nhanh thông tin ca này (nhãn, giờ)">
                      <Button type="link" icon={<EditOutlined />} onClick={() => {
                        setEditingSlot(r);
                        slotEditForm.setFieldsValue({
                          ...r,
                          shiftDate: dayjs(r.shiftDate),
                          timeRange: r.startTime && r.endTime ? [dayjs(r.startTime, 'HH:mm'), dayjs(r.endTime, 'HH:mm')] : []
                        });
                        setIsSlotEditModalOpen(true);
                      }} />
                    </Tooltip>
                    <Tooltip title="Xóa ca trực này khỏi lịch trình">
                      <Button type="link" danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({
                          title: 'Xóa ca này?',
                          onOk: async () => {
                            const res = await dutyService.deleteSlot(r.id);
                            if (res.success) { message.success('Đã xóa'); fetchSlots(); }
                          }
                        });
                      }} />
                    </Tooltip>
                  </Space>
                )
              }
            ]}
          />
        </Card>
      )
    },
    {
      key: '2',
      label: <span><ScheduleOutlined /> Điều phối & Lập lịch</span>,
      children: (
        <div className="coordination-tab">
          <Card title={<Space><ScheduleOutlined /><span>Lập lịch Hàng loạt</span></Space>} className="hifi-border">
            {!isReviewMode ? (
              <Form form={coordinationForm} layout="vertical" onFinish={(v) => {
                const [start, end] = v.range;
                const days = [];
                let curr = dayjs(start);
                while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                  const dayKips = templates.flatMap(s => s.kips.map(k => ({ ...k, shiftName: s.name, sStart: s.startTime, sEnd: s.endTime, shiftId: s.id }))).filter(k => (k.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes((curr.day() + 6) % 7));
                  days.push({ date: curr.clone(), kips: dayKips, isSelected: dayKips.length > 0 });
                  curr = curr.add(1, 'day');
                }
                setPreviewDates(days); setIsReviewMode(true);
              }}>
                <Form.Item name="range" label="Khoảng ngày áp dụng" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100% ' }} size="large" /></Form.Item>
                <Space><Button type="primary" htmlType="submit" size="large">Xem trước</Button><Button danger ghost size="large" onClick={() => { const r = coordinationForm.getFieldValue('range'); if (r) dutyService.deleteRangeSlots(r[0].format('YYYY-MM-DD'), r[1].format('YYYY-MM-DD')).then(() => message.success('Đã xóa')); }}>Xóa vùng chọn</Button></Space>
              </Form>
            ) : (
              <div>
                <Space style={{ marginBottom: 16 }}><Button onClick={() => setIsReviewMode(false)}>Quay lại</Button><Button type="primary" loading={loading} onClick={async () => {
                  setLoading(true); try {
                    for (const d of previewDates.filter(x => x.isSelected)) {
                      for (const k of d.kips) {
                        await dutyService.createSlot({ shiftDate: d.date.format('YYYY-MM-DD'), shiftLabel: `${k.shiftName} - ${k.name}`, startTime: k.startTime || k.sStart, endTime: k.endTime || k.sEnd, capacity: k.capacity, order: k.order, kipId: k.id, shiftId: k.shiftId });
                      }
                    }
                    message.success('Đã tạo lịch'); setIsReviewMode(false); fetchSlots();
                  } catch (e) { message.error('Lỗi'); } finally { setLoading(false); }
                }}>Xác nhận tạo {previewDates.filter(x => x.isSelected).length} ngày</Button></Space>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                  {previewDates.map((d, i) => (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                      <Checkbox checked={d.isSelected} onChange={e => { const n = [...previewDates]; n[i].isSelected = e.target.checked; setPreviewDates(n); }}>{d.date.format('DD/MM')} ({d.date.locale('vi').format('dd')})</Checkbox>
                      <Text type="secondary">{d.kips.length} ca</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card title="Thêm Ca đơn lẻ" style={{ marginTop: 24 }} className="hifi-border">
            <Form form={manualSlotForm} layout="vertical" onFinish={async (v) => {
              const s = templates.find(x => x.id === v.shiftId);
              const k = s?.kips.find(x => x.id === v.kipId);
              const res = await dutyService.createSlot({
                shiftDate: v.date.format('YYYY-MM-DD'),
                shiftLabel: v.shiftLabel || `${s?.name} - ${k?.name}`,
                startTime: k?.startTime || s?.startTime, endTime: k?.endTime || s?.endTime, capacity: k?.capacity || 1, order: k?.order, kipId: k?.id, shiftId: s?.id
              });
              if (res.success) { message.success('Đã thêm'); manualSlotForm.resetFields(); fetchSlots(); }
            }}>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="date" label="Ngày"><DatePicker style={{ width: '100% ' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="shiftId" label="Ca Bản mẫu"><Select onChange={v => setSelectedShiftTemplate(v)} options={templates.map(s => ({ label: s.name, value: s.id }))} /></Form.Item></Col>
                <Col span={8}><Form.Item name="kipId" label="Kíp"><Select options={templates.find(s => s.id === selectedShiftTemplate)?.kips.map(k => ({ label: k.name, value: k.id })) || []} /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" block>Tạo ca trực này</Button>
            </Form>
          </Card>
        </div>
      )
    },
    {
      key: '3',
      label: <span><LayoutOutlined /> Cấu hình Bản mẫu</span>,
      children: (
        <div className="templates-tab">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div><Title level={4} style={{ margin: 0 }}>Bản mẫu Ca trực</Title><Text type="secondary">Cấu hình khung giờ cố định</Text></div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingShift(null); shiftForm.resetFields(); setIsShiftModalOpen(true); }}>Thêm Ca mới</Button>
          </div>
          {templates.map(s => (
            <Card key={s.id} className="hifi-border" style={{ marginBottom: 20 }} title={<Space><Text strong>{s.name}</Text><Tag color="blue">{s.startTime} - {s.endTime}</Tag></Space>} extra={<Space><Button size="small" icon={<EditOutlined />} onClick={() => { setEditingShift(s); shiftForm.setFieldsValue({ ...s, timeRange: [dayjs(s.startTime, 'HH:mm'), dayjs(s.endTime, 'HH:mm')] }); setIsShiftModalOpen(true); }} /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteShift(s.id)} /></Space>}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text strong>Danh sách Kíp</Text><Button type="link" size="small" icon={<PlusOutlined />} onClick={() => { setEditingKip({ shiftId: s.id }); kipForm.resetFields(); kipForm.setFieldsValue({ shiftId: s.id }); setIsKipModalOpen(true); }}>Thêm Kíp</Button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.kips.map(k => (
                  <div key={k.id} style={{ padding: '10px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={0}><Text strong>{k.name}</Text><Text type="secondary" style={{ fontSize: '0.8rem' }}>Tiết: {k.order} {k.endPeriod ? ` - ${k.endPeriod}` : ''} • Chỉ tiêu: {k.capacity}</Text></Space>
                    <Space><Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditingKip(k); kipForm.setFieldsValue({ ...k, timeRange: k.startTime && k.endTime ? [dayjs(k.startTime, 'HH:mm'), dayjs(k.endTime, 'HH:mm')] : undefined }); setIsKipModalOpen(true); }} /><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteKip(k.id)} /></Space>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )
    },
    {
      key: '4',
      label: <span><InboxOutlined /> Duyệt đơn nghỉ {leaveRequests.length > 0 && <span style={{ color: 'red' }}>({leaveRequests.length})</span>}</span>,
      children: (
        <Card title="Đang chờ phê duyệt" className="hifi-border">
          <Table
            loading={leaveLoading}
            dataSource={leaveRequests}
            rowKey="id"
            columns={[
              { title: 'Nhân sự', render: (_, r) => <b>{r.user?.name}</b> },
              { title: 'Ca trực', render: (_, r) => <span>{r.slot?.shiftLabel} ({dayjs(r.slot?.shiftDate).format('DD/MM')})</span> },
              { title: 'Lý do', dataIndex: 'reason' },
              {
                title: 'Thao tác', render: (_, r) => (
                  <Space><Button type="primary" size="small" onClick={() => handleResolveLeave(r.id, 'approved')}>Duyệt</Button><Button danger size="small" onClick={() => handleResolveLeave(r.id, 'rejected')}>Từ chối</Button></Space>
                )
              }
            ]}
          />
        </Card>
      )
    },
    {
      key: '5',
      label: <span><SettingOutlined /> Cài đặt chung</span>,
      children: (
        <Card title="Cấu hình hệ thống" className="hifi-border">
          <Form layout="vertical">
            <Form.Item label="Số tiết trực tối đa trong ngày"><InputNumber defaultValue={22} style={{ width: 120 }} /></Form.Item>
            <Divider />
            <Button type="primary" disabled>Lưu thay đổi</Button>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <div className="duty-management-page" style={{ padding: '24px 40px' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>Thiết lập & Điều phối Trực</Title>
        <Text type="secondary">Quản lý bản mẫu ca kíp, lập lịch hàng loạt và phê duyệt đơn nghỉ</Text>
      </div>

      <Alert
        message="Hướng dẫn Quản lý"
        description={
          <ul>
            <li>Sử dụng <b>Bản mẫu</b> để định nghĩa khung giờ cố định.</li>
            <li>Dùng <b>Lập lịch Hàng loạt</b> để tự động phủ kín lịch cho tháng/tuần mới.</li>
            <li>Các ca trực có thể được điều chỉnh thủ công tại tab <b>Quản lý Ca đã lập</b>.</li>
          </ul>
        }
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        className="hifi-tabs"
      />

      {/* Modals for Shift, Kip, Slot Edit */}
      <Modal title={editingShift ? "Sửa Bản mẫu Ca" : "Thêm Ca mới"} open={isShiftModalOpen} onCancel={() => setIsShiftModalOpen(false)} onOk={() => shiftForm.submit()} destroyOnClose>
        <Form form={shiftForm} layout="vertical" onFinish={handleSubmitShift}>
          <Form.Item name="name" label="Tên Ca" rules={[{ required: true }]}><Input placeholder="VD: Ca Sáng" /></Form.Item>
          <Form.Item name="timeRange" label="Khung giờ" rules={[{ required: true }]}><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} /></Form.Item>
          <Form.Item name="order" label="Thứ tự"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingKip?.id ? "Sửa Kíp" : "Thêm Kíp mới"} open={isKipModalOpen} onCancel={() => setIsKipModalOpen(false)} onOk={() => kipForm.submit()} destroyOnClose>
        <Form form={kipForm} layout="vertical" onFinish={handleCreateKip}>
          <Form.Item name="shiftId" hidden><Input /></Form.Item>
          <Form.Item name="name" label="Tên Kíp" rules={[{ required: true }]}><Input placeholder="VD: Kíp 1" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="capacity" label="Chỉ tiêu" initialValue={1}><InputNumber min={1} style={{ width: '100% ' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="order" label="Tiết bắt đầu" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100% ' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="timeRange" label="Giờ riêng (Tùy chọn)"><TimePicker.RangePicker format="HH:mm" style={{ width: '100% ' }} /></Form.Item>
          <Form.Item name="daysOfWeek" label="Ngày áp dụng"><Select mode="multiple" options={[{ label: 'Thứ 2', value: 0 }, { label: 'Thứ 3', value: 1 }, { label: 'Thứ 4', value: 2 }, { label: 'Thứ 5', value: 3 }, { label: 'Thứ 6', value: 4 }, { label: 'Thứ 7', value: 5 }, { label: 'Chủ Nhật', value: 6 }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Chỉnh sửa Ca trực trực tiếp" open={isSlotEditModalOpen} onCancel={() => setIsSlotEditModalOpen(false)} onOk={() => slotEditForm.submit()} width={500}>
        <Form form={slotEditForm} layout="vertical" onFinish={async (v) => {
          const res = await dutyService.updateSlot(editingSlot.id, { ...v, shiftDate: v.shiftDate.format('YYYY-MM-DD'), startTime: v.timeRange?.[0]?.format('HH:mm'), endTime: v.timeRange?.[1]?.format('HH:mm') });
          if (res.success) { message.success('Cập nhật thành công'); setIsSlotEditModalOpen(false); fetchSlots(); }
        }}>
          <Form.Item label="Tên hiển thị" name="shiftLabel"><Input /></Form.Item>
          <Form.Item label="Thời gian" name="timeRange"><TimePicker.RangePicker format="HH:mm" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DutyManagement;
