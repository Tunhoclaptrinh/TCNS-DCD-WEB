import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Space, message, Typography, TimePicker, Select, Tabs, Divider } from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  ScheduleOutlined, SettingOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InboxOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutyShift } from '@/services/duty.service';

const { Text, Title } = Typography;

const DutyManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<DutyShift[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isKipModalOpen, setIsKipModalOpen] = useState(false);
  
  const [shiftForm] = Form.useForm();
  const [kipForm] = Form.useForm();
  
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [editingKip, setEditingKip] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('1');
  
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await dutyService.getTemplates();
      if (res.success) setTemplates(res.data || []);
    } catch (err) {
      message.error('Không thể tải bản mẫu');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ filter: { status: 'pending' } });
      if (res.success) setLeaveRequests(res.data?.data || []);
    } catch (err) {
      message.error('Không thể tải danh sách xin nghỉ');
    } finally {
      setLeaveLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchLeaveRequests();
  }, []);

  const handleSubmitShift = async (values: any) => {
    try {
      const { timeRange, ...rest } = values;
      const data = {
        ...rest,
        startTime: timeRange?.[0]?.format('HH:mm') || '08:00',
        endTime: timeRange?.[1]?.format('HH:mm') || '17:00'
      };
      
      let res;
      if (editingShift) {
        res = await dutyService.updateShiftTemplate(editingShift.id, data);
      } else {
        res = await dutyService.createShiftTemplate(data);
      }

      if (res.success) {
        message.success(editingShift ? 'Đã cập nhật ca' : 'Đã tạo ca trực');
        setIsShiftModalOpen(false);
        setEditingShift(null);
        shiftForm.resetFields();
        fetchTemplates();
      }
    } catch (err) {
      message.error('Lỗi khi lưu ca');
    }
  };

  const handleDeleteShift = (id: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa ca',
      content: 'Xóa ca sẽ xóa tất cả các kíp bên trong. Bạn có chắc chắn?',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await dutyService.deleteShiftTemplate(id);
          if (res.success) {
            message.success('Đã xóa ca trực');
            fetchTemplates();
          }
        } catch (err) {
          message.error('Lỗi khi xóa ca');
        }
      }
    });
  };

  const handleCreateKip = async (values: any) => {
    try {
      const { timeRange, ...rest } = values;
      const data = {
        ...rest,
        startTime: timeRange?.[0]?.format('HH:mm'),
        endTime: timeRange?.[1]?.format('HH:mm'),
        duration: timeRange ? `${timeRange[0].format('HH:mm')} - ${timeRange[1].format('HH:mm')}` : undefined
      };
      
      let res;
      if (editingKip && editingKip.id) {
        res = await dutyService.updateKipTemplate(editingKip.id, data);
      } else {
        res = await dutyService.createKipTemplate(data);
      }

      if (res.success) {
        message.success(editingKip && editingKip.id ? 'Đã cập nhật kíp' : 'Đã tạo kíp');
        setIsKipModalOpen(false);
        setEditingKip(null);
        kipForm.resetFields();
        fetchTemplates();
      }
    } catch (err) {
      message.error('Lỗi khi lưu kíp');
    }
  };

  const handleDeleteKip = (id: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa kíp',
      content: 'Bạn có chắc chắn muốn xóa kíp này?',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await dutyService.deleteKipTemplate(id);
          if (res.success) {
            message.success('Đã xóa kíp');
            fetchTemplates();
          }
        } catch (err) {
          message.error('Lỗi khi xóa kíp');
        }
      }
    });
  };

  const handleResolveLeave = async (id: number, status: 'approved' | 'rejected') => {
    try {
      let rejectionReason = '';
      if (status === 'rejected') {
        rejectionReason = prompt('Lý do từ chối:') || 'Không có lý do cụ thể';
      }
      
      const res = await dutyService.resolveLeaveRequest(id, status, rejectionReason);
      if (res.success) {
        message.success(status === 'approved' ? 'Đã duyệt đơn nghỉ' : 'Đã từ chối đơn nghỉ');
        fetchLeaveRequests();
      }
    } catch (err) {
      message.error('Lỗi khi xử lý đơn');
    }
  };

  const tabItems = [
    {
      key: '1',
      label: <span><ScheduleOutlined /> Danh sách Ca & Kíp Trực</span>,
      children: (
        <div className="shift-list">
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Cấu hình Ca/Kíp Bản mẫu</Title>
            <Button 
              type="primary" 
              size="large"
              icon={<PlusOutlined />} 
              onClick={() => {
                shiftForm.resetFields();
                setEditingShift(null);
                setIsShiftModalOpen(true);
              }}
              className="hifi-primary-btn"
            >
              Thêm Ca Trực Mới
            </Button>
          </div>
          {loading ? (
            <Card loading />
          ) : templates.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">Chưa có cấu hình ca trực nào. Hãy nhấn nút phía trên để bắt đầu.</Text>
            </Card>
          ) : (
            templates.map((shift: DutyShift) => (
              <Card 
                key={shift.id} 
                className="management-shift-card hifi-border"
                style={{ marginBottom: 20 }}
                title={
                  <Space size="middle">
                    <Title level={5} style={{ margin: 0, color: '#1e293b' }}>{shift.name}</Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                      <Text type="secondary" style={{ fontSize: '0.85rem' }}>{shift.startTime} - {shift.endTime}</Text>
                    </div>
                  </Space>
                }
                extra={
                  <Space split={<Divider type="vertical" />}>
                      <Button 
                        size="small" 
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => { 
                          setEditingKip({ shiftId: shift.id });
                          kipForm.setFieldsValue({ shiftId: shift.id });
                          setIsKipModalOpen(true); 
                        }}
                      >
                        Thêm Kíp
                      </Button>
                    <Button 
                      size="small" 
                      type="text" 
                      icon={<EditOutlined />} 
                      onClick={() => {
                        setEditingShift(shift);
                        shiftForm.setFieldsValue({
                          ...shift,
                          timeRange: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')]
                        });
                        setIsShiftModalOpen(true);
                      }}
                    />
                    <Button 
                      size="small" 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => handleDeleteShift(shift.id)}
                    />
                  </Space>
                }
              >
                <div className="kip-list">
                  {shift.kips.length === 0 ? (
                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                        Chưa có kíp nào được thiết lập cho ca này.
                      </Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {shift.kips.map((kip: any) => (
                        <div key={kip.id} className="management-kip-item hifi-kip-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 8 }}>
                            <Space direction="vertical" size={2}>
                              <Space>
                                <Text strong style={{ color: '#0f172a', fontSize: '1rem' }}>{kip.name}</Text>
                                <div className="kip-days-tags">
                                  {(kip.daysOfWeek || [0,1,2,3,4,5,6]).map((d: number) => {
                                    const labels = ['T2','T3','T4','T5','T6','T7','CN'];
                                    return <span key={d} className={`day-tag day-${d}`}>{labels[d]}</span>;
                                  })}
                                </div>
                              </Space>
                              <Space size="middle">
                                <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                                  Giờ: <b>{kip.duration || 'Theo Ca'}</b>
                                </Text>
                                <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                                  Tiết: <b>{kip.order}{kip.endPeriod ? ` - ${kip.endPeriod}` : ''}</b>
                                </Text>
                              </Space>
                              {kip.description && (
                                <Text type="secondary" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                  &bull; {kip.description}
                                </Text>
                              )}
                            </Space>
                            <Space size="large">
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Hệ số / Số người</div>
                                <Text strong style={{ color: '#0369a1' }}>{kip.coefficient}</Text>
                                <Text type="secondary"> / </Text>
                                <Text strong style={{ color: '#b45309' }}>{kip.capacity}</Text>
                              </div>
                              <Space>
                                  <Button 
                                    size="small" 
                                    type="text" 
                                    icon={<EditOutlined />} 
                                    onClick={() => {
                                      setEditingKip(kip);
                                      kipForm.setFieldsValue({
                                        ...kip,
                                        timeRange: kip.startTime && kip.endTime ? [dayjs(kip.startTime, 'HH:mm'), dayjs(kip.endTime, 'HH:mm')] : undefined,
                                        daysOfWeek: kip.daysOfWeek || [0,1,2,3,4,5,6],
                                        description: kip.description
                                      });
                                      setIsKipModalOpen(true);
                                    }}
                                  />
                                <Button 
                                  size="small" 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  onClick={() => handleDeleteKip(kip.id)}
                                />
                              </Space>
                            </Space>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )
    },
    {
      key: '2',
      label: <span><SettingOutlined /> Cài đặt chung</span>,
      children: (
        <Card title="Cấu hình hệ thống trực" className="hifi-border">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Title level={5}>Số tiết trong ngày hiển thị trên lịch</Title>
              <InputNumber min={1} max={30} defaultValue={22} style={{ width: 120 }} />
              <Text type="secondary" style={{ marginLeft: 12 }}>Tiết (Mặc định: 22 tiết theo lịch học cơ bản)</Text>
            </div>
            
            <Divider />
            
            <div>
              <Title level={5}>Quy tắc tự động</Title>
              <Select 
                defaultValue="none"
                style={{ width: 300 }}
                options={[
                  { label: 'Không tự động khóa', value: 'none' },
                  { label: 'Khóa ca sau khi đủ số lượng', value: 'auto-lock' },
                  { label: 'Cần phê duyệt đăng ký', value: 'approval-required' },
                ]}
              />
            </div>
            
            <Divider />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <Space>
                <Text type="secondary" italic style={{ fontSize: '0.8rem' }}> (Các cài đặt này sẽ được áp dụng cho toàn bộ các ca trực mới tạo) </Text>
                <Button type="primary" size="large" className="hifi-primary-btn" disabled>Lưu Cài Đặt</Button>
              </Space>
            </div>
          </Space>
        </Card>
      )
    },
    {
      key: '3',
      label: <span><InboxOutlined /> Duyệt đơn nghỉ {leaveRequests.length > 0 && <span style={{ color: 'red' }}>({leaveRequests.length})</span>}</span>,
      children: (
        <div className="leave-requests-container">
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Phê duyệt đơn xin nghỉ</Title>
            <Button icon={<InboxOutlined />} onClick={fetchLeaveRequests} size="large">Làm mới</Button>
          </div>
          <Card className="hifi-border">
          {leaveLoading ? (
            <Card loading />
          ) : leaveRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
               <InboxOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
               <br />
               <Text type="secondary">Không có đơn xin nghỉ nào đang chờ duyệt.</Text>
            </div>
          ) : (
            <div className="leave-request-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {leaveRequests.map((req: any) => (
                <Card 
                   key={req.id} 
                   size="small" 
                   style={{ background: '#fff' }}
                   extra={
                     <Space>
                       <Button 
                         type="primary" 
                         size="small" 
                         icon={<CheckCircleOutlined />} 
                         onClick={() => handleResolveLeave(req.id, 'approved')}
                       >
                         Duyệt
                       </Button>
                       <Button 
                         danger 
                         size="small" 
                         icon={<CloseCircleOutlined />} 
                         onClick={() => handleResolveLeave(req.id, 'rejected')}
                       >
                         Từ chối
                       </Button>
                     </Space>
                   }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <Text strong>{req.user?.name || `User #${req.userId}`}</Text>
                       <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                          {dayjs(req.createdAt).format('HH:mm DD/MM/YYYY')}
                       </Text>
                    </div>
                    <div>
                        <Text type="secondary">Ca trực: </Text>
                        <Text strong>{req.slot?.shiftLabel ? `${req.slot.shiftLabel}` : `Slot #${req.slotId}`}</Text>
                        {req.slot?.shiftDate && (
                           <Text> ({dayjs(req.slot.shiftDate).format('DD/MM')})</Text>
                        )}
                    </div>
                    <div style={{ background: '#f8fafc', padding: 8, borderRadius: 4, borderLeft: '3px solid #3b82f6' }}>
                       <Text italic>"{req.reason}"</Text>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
      )
    }
  ];

  return (
    <div className="duty-management-container" style={{ padding: '0 8px' }}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        className="hifi-tabs"
      />

      {/* Shift Modal */}
      <Modal
        title={editingShift ? "Chỉnh sửa Ca Trực" : "Thêm Ca Trực Mới"}
        open={isShiftModalOpen}
        onCancel={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
        }}
        onOk={() => shiftForm.submit()}
        destroyOnClose
      >
        <Form form={shiftForm} layout="vertical" onFinish={handleSubmitShift}>
          <Form.Item name="name" label="Tên Ca Trực" rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}>
            <Input placeholder="VD: Ca Sáng, Ca Chiều" size="large" />
          </Form.Item>
          <Form.Item name="timeRange" label="Thời gian hoạt động (Mặc định)" rules={[{ required: true, message: 'Vui lòng chọn khung thời gian' }]}>
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="order" label="Thứ tự hiển thị" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả thêm về ca trực nếu cần..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Kip Modal */}
      <Modal
        title={editingKip && editingKip.id ? "Chỉnh sửa Kíp Trực" : (editingKip?.shiftId ? "Thêm Kíp Mới" : "Thêm Kíp Trực")}
        open={isKipModalOpen}
        onCancel={() => {
          setIsKipModalOpen(false);
          setEditingKip(null);
        }}
        onOk={() => kipForm.submit()}
        destroyOnClose
        width={500}
      >
        <Form form={kipForm} layout="vertical" onFinish={handleCreateKip}>
          <Form.Item name="shiftId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên Kíp" rules={[{ required: true, message: 'Vui lòng nhập tên kíp' }]}>
            <Input placeholder="VD: Kíp 1, Kíp 2" size="large" />
          </Form.Item>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="coefficient" label="Hệ số lương/công" initialValue={1}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="capacity" label="Số lượng người đăng ký" initialValue={1}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="timeRange" label="Khung giờ trực (Nếu khác Ca)">
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="daysOfWeek" label="Ngày áp dụng trong tuần" initialValue={[0,1,2,3,4,5,6]}>
            <Select 
              mode="multiple" 
              placeholder="Chọn các ngày áp dụng"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              options={[
                { label: 'Thứ 2', value: 0 }, { label: 'Thứ 3', value: 1 },
                { label: 'Thứ 4', value: 2 }, { label: 'Thứ 5', value: 3 },
                { label: 'Thứ 6', value: 4 }, { label: 'Thứ 7', value: 5 },
                { label: 'Chủ Nhật', value: 6 },
              ]}
            />
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />
          <Title level={5} style={{ fontSize: '0.9rem', marginBottom: 12 }}>Phạm vi Tiết hiển thị</Title>
          
          <Space align="baseline" size="middle">
            <Form.Item label="Tiết bắt đầu" name="order" initialValue={1} rules={[{ required: true }]}>
              <InputNumber min={1} max={22} />
            </Form.Item>
            <Text>&rarr;</Text>
            <Form.Item 
              label="Tiết kết thúc" 
              name="endPeriod"
              dependencies={['order']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('order') <= value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Phải lớn hơn tiết bắt đầu'));
                  },
                }),
              ]}
            >
              <InputNumber min={1} max={22} placeholder="Kéo dài" />
            </Form.Item>
          </Space>
          
          <Form.Item name="description" label="Ghi chú mặc định (Địa điểm, lưu ý...)">
            <Input.TextArea rows={2} placeholder="Sẽ tự động điền vào Lịch khi khởi tạo..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DutyManagement;
