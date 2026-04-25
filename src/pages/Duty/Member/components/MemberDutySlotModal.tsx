import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  Row, 
  Col, 
  Space, 
  Divider, 
  Typography, 
  Avatar,
  List,
  Tag, 
  message,
  Form,
} from 'antd';
import { 
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LogoutOutlined,
  SwapOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  LockOutlined,
  UserOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/common/Button';
import dutyService, { DutySlot } from '@/services/duty.service';
import LeaveRequestModal from './LeaveRequestModal';
import SwapRequestModal from './SwapRequestModal';

const { Text, Title } = Typography;

interface MemberDutySlotModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  currentUserId: number;
  allSlots: DutySlot[];
  loading?: boolean;
  isOldGeneration?: boolean;
}

/**
 * Details and Action Modal for Duty Slot - Member Version
 */
const MemberDutySlotModal: React.FC<MemberDutySlotModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  currentUserId,
  allSlots,
  loading: externalLoading = false,
  isOldGeneration = false,
}) => {
  const [form] = Form.useForm();
  const { user: currentUserData } = useSelector((state: RootState) => state.auth);
  
  const visibilityMode = slot?.config?.visibilityMode || 'public';
  const OFFICIAL_POSITIONS = ['tv', 'tvb', 'pb', 'tb', 'dt'];
  const CTV_POSITION = 'ctc';
  
  const currentUserPos = (currentUserData as any)?.position;
  const isCurrentUserOfficial = OFFICIAL_POSITIONS.includes(currentUserPos);
  const isCurrentUserCTV = currentUserPos === CTV_POSITION;

  const checkVisibility = (targetUser: any) => {
    // Always see yourself
    if (String(targetUser.id) === String(currentUserId)) return true;
    
    const targetPos = targetUser?.position;
    const isTargetOfficial = OFFICIAL_POSITIONS.includes(targetPos);
    const isTargetCTV = targetPos === CTV_POSITION;

    if (visibilityMode === 'private_mutual') {
      // Hide if crossing boundaries (TV <-> CTV)
      if (isCurrentUserOfficial && isTargetCTV) return false;
      if (isCurrentUserCTV && isTargetOfficial) return false;
    }
    
    if (visibilityMode === 'protect_members') {
      // Hide TV from CTV
      if (isCurrentUserCTV && isTargetOfficial) return false;
    }
    
    return true;
  };

  const [loading, setLoading] = useState(false);
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

  const handleSwapRequest = async (values: { toSlotId: number, fromSlotId?: number }) => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.requestSwap({
        fromSlotId: slot.id,
        toSlotId: values.toSlotId
      });
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
    } catch (err) {
      message.error('Lỗi khi gửi yêu cầu xin nghỉ');
    } finally {
      setLoading(false);
    }
  };

  const isUserRegistered = Array.isArray(slot?.assignedUserIds) 
    ? slot?.assignedUserIds.some(id => String(id) === String(currentUserId)) 
    : false;
    
  const registeredCount = Array.isArray(slot?.assignedUserIds) ? slot?.assignedUserIds.length : 0;
  const capacity = slot?.capacity || slot?.kip?.capacity || 0;
  const isFull = registeredCount >= capacity;

  const isSpecialEvent = !!slot?.isSpecialEvent;
  const themeColor = isSpecialEvent ? '#3b82f6' : '#ec4899'; // Blue vs Pink
  const themeBg = isSpecialEvent ? '#eff6ff' : '#fff5f7';
  const themeBorder = isSpecialEvent ? '#dbeafe' : '#fce7f3';
  const themeText = isSpecialEvent ? '#1e40af' : '#9d174d';

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <Space>
          <ScheduleOutlined style={{ color: themeColor }} />
          <span>Chi tiết {isSpecialEvent ? 'Sự kiện' : 'ca trực'}</span>
        </Space>
      }
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <div className="slot-detail-container" style={{ padding: '0 8px' }}>
        <Row gutter={[24, 24]}>
          {/* Left Column: Info */}
          <Col span={14}>
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <InfoCircleOutlined style={{ color: themeColor }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin {isSpecialEvent ? 'Sự kiện' : 'ca trực'}</span>
            </Divider>
            
            <div style={{ paddingLeft: 8 }}>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{isSpecialEvent ? 'TÊN SỰ KIỆN' : 'TÊN CA TRỰC'}</Text>
                <div style={{ fontSize: 16, fontWeight: 600, color: isSpecialEvent ? themeColor : undefined }}>{slot?.shiftLabel}</div>
              </div>

              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>NGÀY TRỰC</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <CalendarOutlined style={{ color: themeColor }} />
                    <span style={{ fontWeight: 500 }}>{slot?.shiftDate ? dayjs(slot.shiftDate).format('dddd, DD/MM/YYYY') : '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>THỜI GIAN</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <ClockCircleOutlined style={{ color: themeColor }} />
                    <span style={{ fontWeight: 500 }}>{slot?.startTime} - {slot?.endTime}</span>
                  </div>
                </Col>
              </Row>

              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>TRẠNG THÁI</Text>
                <div style={{ marginTop: 4 }}>
                  {slot?.status === 'locked' ? (
                    <Tag color="error" icon={<LockOutlined />}>Đã khóa</Tag>
                  ) : (
                    <Tag color="success">Đang mở</Tag>
                  )}
                  {isFull && <Tag color="warning">Đã đầy ({registeredCount}/{capacity})</Tag>}
                  {!isFull && <Tag color="blue">Còn chỗ ({registeredCount}/{capacity})</Tag>}
                </div>
              </div>

              {slot?.note && slot.note !== 'INSTANCE' && (
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>GHI CHÚ</Text>
                  <div style={{ marginTop: 4, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {slot.note}
                  </div>
                </div>
              )}
            </div>

            <Divider orientation="left" style={{ marginTop: 24 }}>
              <TeamOutlined style={{ color: themeColor }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Danh sách đăng ký ({registeredCount})</span>
            </Divider>
            
            <div style={{ paddingLeft: 8, maxHeight: 180, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={slot?.assignedUsers || []}
                locale={{ emptyText: 'Chưa có người đăng ký' }}
                renderItem={(u: any) => {
                  const isVisible = checkVisibility(u);
                  const isMe = String(u.id) === String(currentUserId);
                  
                  const displayName = isVisible ? (u.name || u.fullName || u.username || u.email) : "Nhân sự trực (Bảo mật)";
                  const displaySub = isVisible ? u.email : "Thông tin được ẩn theo cấu hình kíp";
                  
                  return (
                    <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <List.Item.Meta
                        avatar={<Avatar src={isVisible ? u.avatar : undefined} icon={<UserOutlined />} style={{ backgroundColor: isSpecialEvent ? '#f5f3ff' : '#fdf2f8', color: themeColor }} />}
                        title={<span style={{ fontWeight: 500 }}>{displayName}</span>}
                        description={displaySub}
                      />
                      {isMe && <Tag color="magenta">Bạn</Tag>}
                    </List.Item>
                  );
                }}
              />
            </div>
          </Col>

          {/* Right Column: Actions */}
          <Col span={10}>
            <div style={{ 
              background: themeBg, 
              borderRadius: 12, 
              padding: '16px', 
              height: '100%', 
              border: `1px solid ${themeBorder}`,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: themeText }}>Thao tác</Title>
              
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {!isUserRegistered ? (
                  <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={handleRegister} 
                    loading={loading || externalLoading}
                    disabled={isFull || slot?.status === 'locked' || isOldGeneration}
                    icon={<CheckCircleOutlined />}
                  >
                    {isOldGeneration ? 'Chỉ xem' : (isFull ? 'Ca đã đầy' : 'Đăng ký trực ca này')}
                  </Button>
                ) : (
                  <>
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: 12, 
                        border: `1px solid ${themeBorder}`,
                        marginBottom: 8
                    }}>
                        <Text strong style={{ color: themeColor, display: 'block' }}>Bạn đã đăng ký {isSpecialEvent ? 'sự kiện' : 'ca'} này</Text>
                        
                        <div style={{ marginTop: 8 }}>
                          {/* Check attendance status */}
                          {(() => {
                              if (!slot) return null;
                              const now = dayjs();
                              const slotStart = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.startTime}`);
                              const slotEnd = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`);
                              const isActive = now.isAfter(slotStart.subtract(15, 'minute')) && now.isBefore(slotEnd);
                              const isAttended = Array.isArray(slot.attendedUserIds) && slot.attendedUserIds.includes(currentUserId);

                              if (isAttended) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã điểm danh</Tag>;
                              if (isActive) return (
                                <Tag color="processing" icon={<SyncOutlined spin />}>Đang diễn ra</Tag>
                              );
                              return null;
                          })()}
                        </div>
                    </div>

                    {!isOldGeneration && (
                      <>
                        <Button 
                          variant="outline" 
                          fullWidth 
                          danger 
                          onClick={handleUnregister} 
                          loading={loading || externalLoading}
                          icon={<CloseCircleOutlined />}
                        >
                          Hủy đăng ký
                        </Button>

                        <Button 
                          variant="outline" 
                          fullWidth 
                          onClick={() => setIsSwapModalVisible(true)}
                          icon={<SwapOutlined />}
                        >
                          Đổi ca / Chuyển ca
                        </Button>

                        <Button 
                          variant="ghost" 
                          fullWidth 
                          danger
                          onClick={() => setIsLeaveModalVisible(true)}
                          icon={<LogoutOutlined />}
                        >
                          Gửi đơn xin nghỉ
                        </Button>
                      </>
                    )}
                  </>
                )}

                <Divider style={{ margin: '8px 0' }} />
                
                <div style={{ fontSize: 12, color: '#9d174d', fontStyle: 'italic' }}>
                  * Lưu ý: Việc hủy đăng ký hoặc đổi ca nên được thực hiện sớm nhất có thể để đảm bảo quân số trực.
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </div>

      {/* Sub-modals */}
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
        loading={loading}
        availableSlots={allSlots}
        currentSlotId={slot?.id}
      />
    </FormModal>
  );
};

export default MemberDutySlotModal;
