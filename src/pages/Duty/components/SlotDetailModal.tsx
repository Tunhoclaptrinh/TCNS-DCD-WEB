import React from 'react';
import { Modal, Form, Input, InputNumber, Space, Typography, Avatar, Tag, Button, Alert, Row, Col, message, List, Divider } from 'antd';
import { 
  DeleteOutlined, 
  CheckCircleOutlined, 
  ClearOutlined, 
  StopOutlined, 
  PlusOutlined, 
  EditOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';
import apiClient from '@/config/axios.config';

import LeaveRequestModal from './LeaveRequestModal';
import SwapRequestModal from './SwapRequestModal';

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
  const [loading, setLoading] = React.useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = React.useState(false);
  const [isSwapModalVisible, setIsSwapModalVisible] = React.useState(false);
  const [allUsers, setAllUsers] = React.useState<any[]>([]);
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

  React.useEffect(() => {
    if (!open) return;
    
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get('/users');
        const rawData = res.data || res;
        const usersArray = Array.isArray(rawData) ? rawData : (rawData?.data || []);
        setAllUsers(usersArray);
      } catch (err) {
        console.error('Lỗi tải danh sách người dùng:', err);
      }
    };
    fetchUsers();
  }, [open]);

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

  const handleSwapRequest = async (targetUserId: number) => {
    if (!slot || !targetUserId) return;
    try {
      await dutyService.requestSwap(slot.id, targetUserId);
      message.success('Đã gửi yêu cầu đổi ca');
      setIsSwapModalVisible(false);
      onSuccess();
      onCancel();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Gửi yêu cầu thất bại');
    }
  };

  const renderHeader = () => (
    <Space>
      <EditOutlined style={{ color: 'var(--primary-color)' }} />
      <span style={{ fontWeight: 600 }}>Chi tiết kíp trực {slot && `- ${slot.shiftLabel}`}</span>
    </Space>
  );

  const renderFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
      {isAdmin && slot && (
        <>
          {!dayjs(slot.shiftDate).isBefore(now.startOf('day')) && (
            <Button loading={loading} onClick={() => form.submit()} type="primary" size="middle" style={{ minWidth: 100 }}>Lưu lại</Button>
          )}
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete} size="middle" style={{ minWidth: 100 }}>Xóa kíp</Button>
        </>
      )}
      {!isAdmin && slot && !dayjs(slot.shiftDate).isBefore(now.startOf('day')) && (
        <>
          {slot.assignedUserIds?.includes(currentUserId) ? (
            <>
              {(() => {
                const slotStart = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.startTime}`);
                const slotEnd = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`);
                const isActive = now.isAfter(slotStart.subtract(15, 'minute')) && now.isBefore(slotEnd);
                const isAttended = slot.attendedUserIds?.includes(currentUserId);

                if (isAttended) return <Tag color="green" icon={<CheckCircleOutlined />} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 6 }}>Đã điểm danh</Tag>;
                if (isActive) return <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAttendance} style={{ minWidth: 100 }}>Điểm danh</Button>;
                return null;
              })()}
              <Button type="primary" ghost icon={<EditOutlined />} onClick={() => setIsSwapModalVisible(true)} style={{ minWidth: 100 }}>Đổi ca</Button>
              <Button danger icon={<ClearOutlined />} onClick={handleUnregister} style={{ minWidth: 100 }}>Hủy kíp</Button>
              <Button icon={<StopOutlined />} onClick={() => setIsLeaveModalVisible(true)} style={{ minWidth: 100 }}>Xin nghỉ</Button>
            </>
          ) : (
            (slot.assignedUserIds?.length || 0) < (slot.capacity || slot.kip?.capacity || 0) && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleRegister} style={{ minWidth: 120 }}>Đăng ký ngay</Button>
            )
          )}
        </>
      )}
      <Button onClick={onCancel} style={{ minWidth: 100 }}>Đóng</Button>
    </div>
  );

  return (
    <>
      <Modal
        title={renderHeader()}
        open={open}
        onCancel={onCancel}
        footer={renderFooter()}
        width={750}
        destroyOnClose
        className="premium-modal"
      >
        {slot && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={
                <span>
                  Lịch trực: <b>Thứ {(dayjs(slot.shiftDate).day() + 6) % 7 + 2 === 8 ? 'Chủ Nhật' : (dayjs(slot.shiftDate).day() + 6) % 7 + 2}</b>, <b>Ngày {dayjs(slot.shiftDate).format('DD/MM/YYYY')}</b> (Tuần {dayjs(slot.shiftDate).format('ww')})
                  {dayjs(slot.shiftDate).isBefore(dayjs().startOf('day')) && (
                    <Tag color="default" style={{ marginLeft: 12 }}>Đã kết thúc</Tag>
                  )}
                </span>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24, borderRadius: 12, padding: '12px 16px' }}
            />

            <Form form={form} layout="vertical" onFinish={handleUpdate} disabled={!isAdmin || dayjs(slot.shiftDate).isBefore(now.startOf('day'))}>
              <Row gutter={24}>
                <Col span={14}>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}>
                    <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
                      <EditOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin cơ bản</span>
                    </Divider>
                    <Form.Item name="shiftLabel" label="Tiêu đề kíp" rules={[{ required: true }]}>
                      <Input prefix={<EditOutlined style={{ color: 'var(--primary-color)' }} />} />
                    </Form.Item>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Form.Item name="startTime" label="Bắt đầu (Giờ)">
                          <Input disabled />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="endTime" label="Kết thúc (Giờ)">
                          <Input disabled />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="note" label="Ghi chú / Địa điểm">
                      <Input.TextArea rows={3} placeholder="Thông tin bổ sung..." />
                    </Form.Item>
                  </div>
                </Col>
                <Col span={10}>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}>
                    <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
                      <TeamOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Nhân sự & Chỉ tiêu</span>
                    </Divider>
                    <Form.Item name="capacity" label="Chỉ tiêu thành viên">
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        Danh sách đăng ký ({slot.assignedUsers?.length || 0}/{slot.capacity || slot.kip?.capacity || 0})
                      </Text>
                      <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                        <List
                          size="small"
                          dataSource={slot.assignedUsers || []}
                          locale={{ emptyText: <Text type="secondary" italic>Chưa có ai đăng ký</Text> }}
                          renderItem={(u: any) => (
                            <List.Item style={{ padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <Space>
                                <Avatar size="small" src={u.avatar}>{u.name.charAt(0)}</Avatar>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{u.name}</div>
                                  <div style={{ fontSize: 11 }}>
                                    {slot.attendedUserIds?.includes(u.id) ? 
                                      <Tag color="success" style={{ fontSize: 9, borderRadius: 4, height: 16, lineHeight: '14px' }}>Đã điểm danh</Tag> : 
                                      <Tag color="default" style={{ fontSize: 9, borderRadius: 4, height: 16, lineHeight: '14px' }}>Vắng mặt</Tag>
                                    }
                                  </div>
                                </div>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Form>
          </div>
        )}
      </Modal>

      <LeaveRequestModal
        open={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onSubmit={handleLeaveRequest}
      />

      <SwapRequestModal
        open={isSwapModalVisible}
        onCancel={() => setIsSwapModalVisible(false)}
        onSubmit={handleSwapRequest}
        allUsers={allUsers}
        currentUserId={currentUserId}
      />
    </>
  );
};

export default SlotDetailModal;
