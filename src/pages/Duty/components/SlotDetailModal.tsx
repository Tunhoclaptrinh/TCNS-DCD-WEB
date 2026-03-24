import React from 'react';
import { Modal, Form, Input, InputNumber, Space, Typography, Avatar, Tag, Button, Alert, Row, Col, message, List, Card } from 'antd';
import { 
  InfoCircleOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined, 
  ClearOutlined, 
  StopOutlined, 
  PlusOutlined, 
  EditOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';

const { Text } = Typography;

interface SlotDetailModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  isAdmin: boolean;
  currentUserId: number;
}

const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  isAdmin,
  currentUserId
}) => {
  const [form] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = React.useState(false);
  const now = dayjs();

  React.useEffect(() => {
    if (open && slot) {
      form.setFieldsValue({
        ...slot,
        shiftDate: dayjs(slot.shiftDate),
        timeRange: slot.startTime && slot.endTime ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] : undefined
      });
    }
  }, [open, slot, form]);

  const handleUpdate = async (values: any) => {
    if (!slot) return;
    setLoading(true);
    try {
      const { timeRange, shiftDate, ...rest } = values;
      const data = {
        ...rest,
        shiftDate: shiftDate.format('YYYY-MM-DD'),
        startTime: timeRange?.[0]?.format('HH:mm'),
        endTime: timeRange?.[1]?.format('HH:mm'),
      };
      const res = await dutyService.updateSlot(slot.id, data);
      if (res.success) {
        message.success('Đã cập nhật kíp trực');
        onSuccess();
        onCancel();
      }
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!slot) return;
    Modal.confirm({
      title: 'Xóa kíp trực?',
      content: 'Bạn có chắc chắn muốn xóa kíp trực này không?',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await dutyService.deleteSlot(slot.id);
          if (res.success) {
            message.success('Đã xóa kíp trực');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Xóa thất bại');
        }
      }
    });
  };

  const handleAttendance = async () => {
    if (!slot) return;
    try {
      await dutyService.markAttendance(slot.id, [currentUserId]);
      message.success('Điểm danh thành công!');
      onSuccess();
      onCancel();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Điểm danh thất bại');
    }
  };

  const handleRegister = async () => {
    if (!slot) return;
    try {
      const res = await dutyService.registerToSlot(slot.id);
      if (res.success) {
        message.success('Đã đăng ký kíp trực');
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  const handleUnregister = async () => {
    if (!slot) return;
    try {
      const res = await dutyService.cancelRegistration(slot.id);
      if (res.success) {
        message.success('Đã hủy đăng ký');
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Hủy thất bại');
    }
  };

  const handleLeaveRequest = async (values: { reason: string }) => {
    if (!slot) return;
    try {
      await dutyService.requestLeave(slot.id, values.reason);
      message.success('Đã gửi yêu cầu xin nghỉ');
      setIsLeaveModalVisible(false);
      onSuccess();
      onCancel();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Gửi yêu cầu thất bại');
    }
  };

  const renderHeader = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '95%' }}>
      <Space>
        <InfoCircleOutlined style={{ color: '#1890ff' }} />
        <span>Chi tiết kíp trực {slot && `- ${slot.shiftLabel}`}</span>
      </Space>
      <div style={{ display: 'flex', gap: 8 }}>
        {isAdmin && slot && (
          <>
            {!dayjs(slot.shiftDate).isBefore(now.startOf('day')) && (
              <Button loading={loading} onClick={() => form.submit()} type="primary">Lưu thay đổi</Button>
            )}
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Xóa kíp</Button>
          </>
        )}
        {!isAdmin && slot && !dayjs(slot.shiftDate).isBefore(now.startOf('day')) && (
          <Space>
            {slot.assignedUserIds?.includes(currentUserId) ? (
              <Space>
                {(() => {
                  const slotStart = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.startTime}`);
                  const slotEnd = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`);
                  const isActive = now.isAfter(slotStart.subtract(15, 'minute')) && now.isBefore(slotEnd);
                  const isAttended = slot.attendedUserIds?.includes(currentUserId);

                  if (isAttended) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã điểm danh</Tag>;
                  if (isActive) return <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAttendance}>Điểm danh ngay</Button>;
                  return null;
                })()}
                <Button danger icon={<ClearOutlined />} onClick={handleUnregister}>Hủy đăng ký</Button>
                <Button icon={<StopOutlined />} onClick={() => setIsLeaveModalVisible(true)}>Xin nghỉ</Button>
              </Space>
            ) : (
              (slot.assignedUserIds?.length || 0) < (slot.capacity || slot.kip?.capacity || 0) && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleRegister}>Đăng ký ca này</Button>
              )
            )}
          </Space>
        )}
        <Button onClick={onCancel}>Đóng</Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        title={renderHeader()}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={700}
        destroyOnClose
        className="premium-modal"
      >
        {slot && (
          <div style={{ marginTop: 12 }}>
            <Alert
              message={
                <span>
                  Ca này thuộc <b>Tuần {dayjs(slot.shiftDate).format('ww')}</b> - <b>{dayjs(slot.shiftDate).format('DD/MM/YYYY')}</b>
                  {dayjs(slot.shiftDate).isBefore(dayjs().startOf('day')) && (
                    <Tag color="default" style={{ marginLeft: 8 }}>Quá khứ</Tag>
                  )}
                </span>
              }
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />

            <Form form={form} layout="vertical" onFinish={handleUpdate} disabled={!isAdmin || dayjs(slot.shiftDate).isBefore(now.startOf('day'))}>
              <Row gutter={24}>
                <Col span={14}>
                  <Card size="small" title="Thông tin cơ bản" style={{ borderRadius: 12 }}>
                    <Form.Item name="shiftLabel" label={<Text strong>Tiêu đề</Text>} rules={[{ required: true }]}>
                      <Input prefix={<EditOutlined />} />
                    </Form.Item>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="startTime" label={<Text strong>Bắt đầu</Text>}>
                          <Input disabled />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="endTime" label={<Text strong>Kết thúc</Text>}>
                          <Input disabled />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="note" label={<Text strong>Ghi chú</Text>}>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={10}>
                  <Card size="small" title="Thành viên & Chỉ tiêu" style={{ borderRadius: 12, height: '100% ' }}>
                    <Form.Item name="capacity" label={<Text strong>Chỉ tiêu (Người)</Text>}>
                      <InputNumber min={1} style={{ width: '100% ' }} />
                    </Form.Item>
                    <Form.Item label={<Text strong>Nhân sự đã đăng ký</Text>}>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <List
                          size="small"
                          dataSource={slot.assignedUsers || []}
                          renderItem={(u: any) => (
                            <List.Item style={{ padding: '8px 0' }}>
                              <Space>
                                <Avatar src={u.avatar}>{u.name.charAt(0)}</Avatar>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                    {slot.attendedUserIds?.includes(u.id) ? 
                                      <Tag color="green" style={{ fontSize: 10 }}>Đã điểm danh</Tag> : 
                                      <Tag color="default" style={{ fontSize: 10 }}>Chưa điểm danh</Tag>
                                    }
                                  </div>
                                </div>
                              </Space>
                            </List.Item>
                          )}
                        />
                        {(slot.assignedUsers?.length || 0) === 0 && <Text type="secondary" italic>Chưa có ai đăng ký</Text>}
                      </div>
                    </Form.Item>
                  </Card>
                </Col>
              </Row>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="Yêu cầu xin nghỉ"
        open={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onOk={() => leaveForm.submit()}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={leaveForm} layout="vertical" onFinish={handleLeaveRequest}>
          <Form.Item name="reason" label="Lý do xin nghỉ" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <Input.TextArea rows={4} placeholder="Vui lòng giải thích ngắn gọn lý do bạn không thể trực kíp này..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// Need to import List from 'antd' and add it to the destructured components if used

export default SlotDetailModal;
