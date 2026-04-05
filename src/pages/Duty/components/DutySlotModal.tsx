import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Row, 
  Col, 
  Space, 
  Divider, 
  Select, 
  DatePicker, 
  TimePicker, 
  Badge, 
  Typography, 
  Avatar, 
  List, 
  Tag, 
  Button as AntButton,
  message,
} from 'antd';
import { 
  EditOutlined, 
  ClockCircleOutlined, 
  TeamOutlined, 
  ScheduleOutlined, 
  SettingOutlined, 
  CheckCircleOutlined,
  SwapOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/common/Button';
import dutyService, { DutySlot } from '@/services/duty.service';
import apiClient from '@/config/axios.config';
import DutyPersonnelPicker, { POSITION_LABELS } from './DutyPersonnelTable';
import LeaveRequestModal from './LeaveRequestModal';
import SwapRequestModal from './SwapRequestModal';

const { Text } = Typography;

interface DutySlotModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  isAdmin: boolean;
  currentUserId: number;
  loading?: boolean;
}

/**
 * Unified Modal for Duty Slot Details and Management
 */
const DutySlotModal: React.FC<DutySlotModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  isAdmin,
  currentUserId,
  loading: externalLoading = false,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isSwapModalVisible, setIsSwapModalVisible] = useState(false);

  // Sync slot data to form
  useEffect(() => {
    if (open && slot) {
      form.setFieldsValue({
        ...slot,
        shiftDate: dayjs(slot.shiftDate),
        timeRange: slot.startTime && slot.endTime 
          ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] 
          : undefined,
        status: slot.status || 'open'
      });
    }
  }, [open, slot, form]);

  // Fetch all users for Swap Flow
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get('/users');
        const rawData = res.data || res;
        const usersArray = Array.isArray(rawData) ? rawData : (rawData?.data || []);
        setAllUsers(usersArray);
      } catch (err) {
        console.error('Lỗi khi tải danh sách người dùng:', err);
      }
    };
    if (open) fetchUsers();
  }, [open]);

  const watchedAssignedIds = Form.useWatch('assignedUserIds', form) || [];
  
  const currentAssignedUsers = React.useMemo(() => {
    if (!watchedAssignedIds.length) return [];
    if (allUsers.length > 0) {
      return watchedAssignedIds.map((id: any) => {
        const user = allUsers.find(u => u.id === id);
        if (user) return user;
        return slot?.assignedUsers?.find((u: any) => u.id === id) || { id, name: `User ${id}` };
      });
    }
    return slot?.assignedUsers || [];
  }, [watchedAssignedIds, allUsers, slot]);

  const handleOk = async (values: any) => {
    if (!isAdmin) {
      onCancel();
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        ...values,
        shiftDate: values.shiftDate?.format('YYYY-MM-DD'),
        startTime: values.timeRange?.[0]?.format('HH:mm'),
        endTime: values.timeRange?.[1]?.format('HH:mm')
      };
      
      const res = await dutyService.updateSlot(slot?.id!, data);
      if (res.success) {
        message.success('Cập nhật kíp trực thành công');
        onSuccess();
        onCancel();
      }
    } catch (err) {
      message.error('Lỗi khi cập nhật kíp trực');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.registerToSlot(slot.id);
      if (res.success) {
        message.success('Đăng ký thành công');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.cancelRegistration(slot.id);
      if (res.success) {
        message.success('Hủy đăng ký thành công');
        onSuccess();
        onCancel();
      }
    } catch (err) {
      message.error('Lỗi khi hủy đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRequest = async (targetUserId: number) => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.requestSwap(slot.id, targetUserId);
      if (res.success) {
        message.success('Gửi yêu cầu đổi ca thành công');
        setIsSwapModalVisible(false);
        onSuccess();
        onCancel();
      }
    } catch (err) {
      message.error('Lỗi khi gửi yêu cầu đổi ca');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRequest = async (values: { reason: string }) => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.requestLeave(slot.id, values.reason);
      if (res.success) {
        message.success('Gửi yêu cầu xin nghỉ thành công');
        setIsLeaveModalVisible(false);
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const isUserRegistered = slot?.assignedUserIds?.includes(currentUserId);
  const registeredCount = slot?.assignedUserIds?.length || 0;
  const capacity = slot?.capacity || slot?.kip?.capacity || 0;
  const isFull = registeredCount >= capacity;

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <div style={{ width: 4, height: 18, background: '#6366f1', borderRadius: 2 }} />
          <span>{isAdmin ? (slot?.id ? "Hiệu chỉnh Kíp trực" : "Thêm mới Kíp trực") : "Chi tiết Kíp trực"}</span>
          {slot?.status && (
            <Tag color={slot.status === 'open' ? 'success' : 'error'} style={{ marginLeft: 8, borderRadius: 12 }}>
              {slot.status === 'open' ? 'ĐANG MỞ' : 'ĐÃ KHÓA'}
            </Tag>
          )}
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading || externalLoading}
      width={780}
      destroyOnClose
      okText={isAdmin ? "Lưu thay đổi" : "Đóng"}
      cancelText="Hủy bỏ"
    >
      <div style={{ padding: '0 4px' }}>
        {/* SECTION 1: BASIC INFO */}
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <EditOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin hiển thị & Trạng thái</span>
        </Divider>

        <Row gutter={[24, 16]}>
          <Col span={isAdmin ? 16 : 24}>
            <Form.Item 
              label="Tiêu đề hiển thị (Trên lịch)" 
              name="shiftLabel" 
              rules={[{ required: true }]}
            >
              <Input 
                prefix={<EditOutlined style={{ color: '#6366f1' }} />} 
                placeholder="VD: Kíp 1 - Tòa A" 
                readOnly={!isAdmin}
                bordered={isAdmin}
              />
            </Form.Item>
          </Col>
          {isAdmin && (
            <Col span={8}>
              <Form.Item label="Trạng thái" name="status">
                <Select options={[
                  { label: <Badge status="success" text="Đang mở (Cho phép ĐK)" />, value: 'open' },
                  { label: <Badge status="error" text="Đã khóa (Chỉ xem)" />, value: 'locked' }
                ]} />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* SECTION 2: TIME & CAPACITY */}
        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Thời gian & Chỉ tiêu</span>
        </Divider>

        <Row gutter={[24, 16]}>
          <Col span={8}>
            <Form.Item label="Ngày diễn ra" name="shiftDate" rules={[{ required: true }]}>
              <DatePicker 
                style={{ width: '100%' }} 
                format="DD/MM/YYYY" 
                readOnly={!isAdmin}
                bordered={isAdmin}
                inputReadOnly
                {...(isAdmin ? {} : { open: false, suffixIcon: null })}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item label="Khung giờ thực tế" name="timeRange" rules={[{ required: true }]}>
              <TimePicker.RangePicker 
                format="HH:mm" 
                style={{ width: '100%' }} 
                readOnly={!isAdmin}
                bordered={isAdmin}
                inputReadOnly
                {...(isAdmin ? {} : { open: false, suffixIcon: null })}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Chỉ tiêu" name="capacity" rules={[{ required: true }]}>
              <InputNumber 
                min={1} 
                style={{ width: '100%' }} 
                prefix={<TeamOutlined style={{ color: '#6366f1' }} />} 
                readOnly={!isAdmin}
                bordered={isAdmin}
              />
            </Form.Item>
          </Col>
        </Row>

        {!isAdmin && (
          <div style={{ marginBottom: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Space size={12}>
                  <CalendarOutlined style={{ fontSize: 20, color: '#6366f1' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Tương tác cá nhân</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {isUserRegistered ? "Bạn đã đăng ký tham gia kíp này" : "Bạn chưa tham gia kíp này"}
                    </div>
                  </div>
                </Space>
              </Col>
              <Col>
                <Space>
                  {isUserRegistered ? (
                    <>
                      <AntButton 
                        type="primary" 
                        danger 
                        size="small" 
                        icon={<InfoCircleOutlined />}
                        onClick={() => setIsLeaveModalVisible(true)}
                      >
                        Xin nghỉ
                      </AntButton>
                      <AntButton 
                        size="small" 
                        icon={<SwapOutlined />}
                        onClick={() => setIsSwapModalVisible(true)}
                      >
                        Đổi ca
                      </AntButton>
                      <AntButton 
                        type="link" 
                        danger 
                        size="small" 
                        onClick={handleUnregister}
                      >
                        Hủy đăng ký
                      </AntButton>
                    </>
                  ) : (
                    <Button 
                      variant="primary" 
                      buttonSize="small" 
                      onClick={handleRegister}
                      disabled={isFull || slot?.status === 'locked'}
                    >
                      {isFull ? "Đã đủ người" : "+ Đăng ký trực"}
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* SECTION 3: PERSONNEL */}
        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ScheduleOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Quản lý nhân sự</span>
        </Divider>

        {isAdmin && (
          <div style={{ marginBottom: 20 }}>
            <Form.Item label="Phân công trực (ID)" name="assignedUserIds" noStyle>
              <DutyPersonnelPicker label="Thực hiện phân công nhân sự" />
            </Form.Item>
          </div>
        )}

        {/* PREVIEW LIST (Professional Style) */}
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 13, color: '#475569' }}>
              DANH SÁCH NHÂN SỰ ĐÃ ĐĂNG KÝ ({currentAssignedUsers.length} / {capacity})
            </Text>
            {currentAssignedUsers.length > capacity && (
              <Tag color="error">Vượt chỉ tiêu</Tag>
            )}
          </div>

          <List
            size="small"
            dataSource={currentAssignedUsers}
            locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center' }}><Text type="secondary" italic>Chứa có ai đăng ký</Text></div> }}
            renderItem={(u: any) => {
              const isAttended = slot?.attendedUserIds?.includes(u.id);
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
                      <Avatar src={u.avatar} style={{ border: '2px solid #f1f5f9' }}>{u.name?.charAt(0)}</Avatar>
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
                        <Text type="secondary">{u.studentId || u.email || 'N/A'}</Text>
                        {u.department && <Text style={{ color: '#6366f1', fontWeight: 500 }}>{u.department}</Text>}
                      </Space>
                    }
                  />
                  <div style={{ textAlign: 'right' }}>
                    {isAttended ? 
                      <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 6, margin: 0 }}>ĐÃ ĐIỂM DANH</Tag> : 
                      <Tag color="default" style={{ borderRadius: 6, margin: 0, color: '#94a3b8' }}>CHƯA ĐIỂM DANH</Tag>
                    }
                  </div>
                </List.Item>
              );
            }}
          />
        </div>

        {isAdmin && (
          <>
            <div style={{ marginTop: 20 }}>
              <Form.Item label="Xác nhận điểm danh" name="attendedUserIds">
                <DutyPersonnelPicker label="Ghi nhận điểm danh thực tế" />
              </Form.Item>
            </div>

            <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
              <SettingOutlined style={{ color: '#6366f1' }} /> 
              <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin bổ sung</span>
            </Divider>

            <Form.Item label="Ghi chú / Địa điểm trực" name="note">
              <Input.TextArea placeholder="Thông tin thêm cho kíp trực này..." rows={3} />
            </Form.Item>
          </>
        )}
      </div>

      <LeaveRequestModal
        open={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onSubmit={handleLeaveRequest}
        loading={loading}
      />

      <SwapRequestModal
        open={isSwapModalVisible}
        onCancel={() => setIsSwapModalVisible(false)}
        onSubmit={handleSwapRequest}
        allUsers={allUsers}
        currentUserId={currentUserId}
      />
    </FormModal>
  );
};

export default DutySlotModal;
