import React from 'react';
import { Modal, Form, Input, InputNumber, Space, Typography, Avatar, Tag, Button, Row, Col, message, List, Divider, Switch } from 'antd';
import { 
  DeleteOutlined, 
  CheckCircleOutlined, 
  ClearOutlined, 
  StopOutlined, 
  PlusOutlined, 
  EditOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';
import apiClient from '@/config/axios.config';

import LeaveRequestModal from './LeaveRequestModal';
import SwapRequestModal from './SwapRequestModal';
import DutyPersonnelPicker, { POSITION_LABELS } from './DutyPersonnelTable';

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
        status: slot.status === 'open' // Normalize status for switch
      });
    }
  }, [open, slot, form]);

  const watchedAssignedIds = Form.useWatch('assignedUserIds', form) || [];
  
  const currentAssignedUsers = React.useMemo(() => {
    if (!watchedAssignedIds.length) return [];
    return allUsers.filter(u => watchedAssignedIds.includes(u.id));
  }, [watchedAssignedIds, allUsers]);

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
      const { status, ...rest } = values;
      const res = await dutyService.updateSlot(slot.id, {
        ...rest,
        status: status ? 'open' : 'locked',
      });
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

  const renderFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
      {isAdmin && slot && (
        <>
          {!dayjs(slot.shiftDate).isBefore(now.startOf('day')) && (
            <Button loading={loading} onClick={() => form.submit()} type="primary">Lưu lại</Button>
          )}
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Xóa kíp</Button>
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

                if (isAttended) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã điểm danh</Tag>;
                if (isActive) return <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAttendance}>Điểm danh</Button>;
                return null;
              })()}
              <Button type="primary" ghost icon={<EditOutlined />} onClick={() => setIsSwapModalVisible(true)}>Đổi ca</Button>
              <Button danger icon={<ClearOutlined />} onClick={handleUnregister}>Hủy kíp</Button>
              <Button icon={<StopOutlined />} onClick={() => setIsLeaveModalVisible(true)}>Xin nghỉ</Button>
            </>
          ) : (
            (slot.assignedUserIds?.length || 0) < (slot.capacity || slot.kip?.capacity || 0) && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleRegister}>Đăng ký ngay</Button>
            )
          )}
        </>
      )}
      <Button onClick={onCancel}>Đóng</Button>
    </div>
  );

  return (
    <>
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Chi tiết kíp trực</span>
          </Space>
        }
        open={open}
        onCancel={onCancel}
        footer={renderFooter()}
        width={900}
        destroyOnClose
      >
        {slot && (
          <Form form={form} layout="vertical" onFinish={handleUpdate} disabled={!isAdmin || dayjs(slot.shiftDate).isBefore(now.startOf('day'))}>
             <div style={{ marginBottom: 16 }}>
              <Space>
                <CalendarOutlined />
                <span>
                  <b>Thứ {(dayjs(slot.shiftDate).day() + 6) % 7 + 2 === 8 ? 'Chủ Nhật' : (dayjs(slot.shiftDate).day() + 6) % 7 + 2}, Ngày {dayjs(slot.shiftDate).format('DD/MM/YYYY')}</b>
                </span>
                <Tag color="blue">Tuần {dayjs(slot.shiftDate).format('ww')}</Tag>
              </Space>
             </div>

            <Divider orientation="left">Thông tin chung</Divider>

            <Row gutter={24} align="bottom">
              <Col span={19}>
                <Form.Item name="shiftLabel" label="Tên kíp trực" rules={[{ required: true }]}>
                  <Input placeholder="Tiêu đề kíp..." />
                </Form.Item>
              </Col>
              <Col span={5}>
                {isAdmin && (
                  <Form.Item name="status" label="Trạng thái kíp" valuePropName="checked">
                    <Switch checkedChildren="Mở" unCheckedChildren="Khóa" />
                  </Form.Item>
                )}
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Bắt đầu">
                  <Input value={slot.startTime} prefix={<ClockCircleOutlined />} disabled />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Kết thúc">
                  <Input value={slot.endTime} prefix={<ClockCircleOutlined />} disabled />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="capacity" label="Chỉ tiêu" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="note" label="Ghi chú">
                  <Input.TextArea rows={2} placeholder="Vị trí, công việc..." />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" style={{ margin: '24px 0 16px' }}>
              <Space>
                <TeamOutlined style={{ color: 'var(--primary-color)' }} />
                <span>Nhân sự kíp trực</span>
              </Space>
            </Divider>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Space direction="vertical" size={0}>
                  <Text strong style={{ fontSize: 13, color: '#475569' }}>
                    DANH SÁCH ĐĂNG KÝ ({currentAssignedUsers.length} / {slot.capacity || slot.kip?.capacity || 0})
                  </Text>
                  {currentAssignedUsers.length > (slot.capacity || slot.kip?.capacity || 0) && (
                    <Text type="danger" style={{ fontSize: 11 }}>Vượt chỉ tiêu cho phép</Text>
                  )}
                </Space>
                
                {isAdmin && (
                  <Form.Item name="assignedUserIds" noStyle>
                    <DutyPersonnelPicker 
                      label="Phân công" 
                    />
                  </Form.Item>
                )}
              </div>

              <List
                size="small"
                dataSource={currentAssignedUsers}
                locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center' }}><Text type="secondary" italic>Chứa có ai đăng ký</Text></div> }}
                renderItem={(u: any) => {
                  const isAttended = slot.attendedUserIds?.includes(u.id);
                  return (
                    <List.Item 
                      style={{ 
                        padding: '10px 12px', 
                        background: '#ffffff', 
                        borderRadius: '8px', 
                        marginBottom: '8px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={u.avatar} 
                            style={{ border: '2px solid #f1f5f9' }}
                          >
                            {u.name?.charAt(0)}
                          </Avatar>
                        }
                        title={
                          <Space size={8}>
                            <Text strong style={{ fontSize: 13 }}>{u.name}</Text>
                            {u.position && (
                              <Tag color="cyan" style={{ border: 'none', fontSize: 10, lineHeight: '16px', borderRadius: 4 }}>
                                {POSITION_LABELS[u.position] || u.position}
                              </Tag>
                            )}
                          </Space>
                        }
                        description={
                          <Space split={<Divider type="vertical" />} style={{ fontSize: 11 }}>
                            <Text type="secondary">{u.studentId || 'N/A'}</Text>
                            {u.department && <Text style={{ color: 'var(--primary-color)', fontWeight: 500 }}>{u.department}</Text>}
                          </Space>
                        }
                      />
                      <div style={{ textAlign: 'right' }}>
                        {isAttended ? 
                          <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 6, margin: 0, padding: '0 8px' }}>ĐÃ ĐIỂM DANH</Tag> : 
                          <Tag color="default" style={{ borderRadius: 6, margin: 0, padding: '0 8px', color: '#94a3b8' }}>VẮNG MẶT</Tag>
                        }
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          </Form>
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
