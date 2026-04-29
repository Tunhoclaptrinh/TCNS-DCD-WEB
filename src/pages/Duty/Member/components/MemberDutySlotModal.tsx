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
  Button as AntButton,
  Tabs,
  Timeline,
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
  CloseOutlined,
  UserOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/common/Button';
import dutyService, { DutySlot } from '@/services/duty.service';
import { useAccess } from '@/hooks';
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
  externalLoading?: boolean;
  isOldGeneration?: boolean;
  settings?: any;
  onSelfCheckIn?: (slotId: number) => Promise<void>;
  openAttendanceModal?: (slot: DutySlot) => void;
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
  externalLoading = false,
  isOldGeneration = false,
  settings,
  onSelfCheckIn,
  openAttendanceModal,
}) => {
  const [form] = Form.useForm();
  const [showWarning, setShowWarning] = useState(true);
  const { user: currentUserData } = useSelector((state: RootState) => state.auth);
  const { isStaff, isAdmin: isGlobalAdmin, hasPermission } = useAccess();
  
  const canRegister = hasPermission('duty:register:self');
  const canCancel = hasPermission('duty:update');
  const visibilityMode = slot?.config?.visibilityMode || 'public';
  const OFFICIAL_POSITIONS = ['tv', 'tvb', 'pb', 'tb', 'dt'];
  const CTV_POSITION = 'ctc';
  
  const POSITION_MAP: Record<string, { name: string, color: string, alias?: string[] }> = {
    'admin': { name: 'Quản trị viên', color: 'red' },
    'dt': { name: 'Đội trưởng', color: 'red' },
    'tb': { name: 'Trưởng ban', color: 'volcano' },
    'nsl': { name: 'Trưởng ban (NS)', color: 'volcano' },
    'pb': { name: 'Phó ban', color: 'orange' },
    'nsp': { name: 'Phó ban (NS)', color: 'orange' },
    'tvb': { name: 'Thành viên Ban', color: 'blue' },
    'nss': { name: 'Chuyên viên (NS)', color: 'blue' },
    'ns': { name: 'Chuyên viên', color: 'blue' },
    'tv': { name: 'Thành viên', color: 'cyan' },
    'ctc': { name: 'Cộng tác viên', color: 'green' },
    'ctv': { name: 'Cộng tác viên', color: 'green' },
  };

  // Helper to get normalized position name
  const getPositionInfo = (posCode: string) => {
    const code = (posCode || '').toLowerCase();
    if (POSITION_MAP[code]) return POSITION_MAP[code];
    
    // Check aliases or partial matches
    for (const key in POSITION_MAP) {
      if (key === code) return POSITION_MAP[key];
    }
    return { name: posCode || 'Thành viên', color: 'default' };
  };

  const checkVisibility = (targetUser: any) => {
    // Always see yourself
    if (String(targetUser.id) === String(currentUserId)) return true;
    
    const targetPos = (targetUser?.position || '').toLowerCase();
    const isTargetOfficial = OFFICIAL_POSITIONS.includes(targetPos) || targetPos.startsWith('ns');
    const isTargetCTV = targetPos === CTV_POSITION || targetPos === 'ctv' || targetPos === 'ctc';

    const currentUserPos = (currentUserData as any)?.position?.toLowerCase();
    const isCurrentUserOfficial = OFFICIAL_POSITIONS.includes(currentUserPos) || currentUserPos?.startsWith('ns');
    const isCurrentUserCTV = currentUserPos === CTV_POSITION || currentUserPos === 'ctv' || currentUserPos === 'ctc';

    if (visibilityMode === 'private_mutual') {
      if (isCurrentUserOfficial && isTargetCTV) return false;
      if (isCurrentUserCTV && isTargetOfficial) return false;
    }
    
    if (visibilityMode === 'protect_members') {
      if (isCurrentUserCTV && isTargetOfficial) return false;
    }
    
    return true;
  };

  const [loading, setLoading] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isSwapModalVisible, setIsSwapModalVisible] = useState(false);

  // History Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('info');


  const fetchLogs = async () => {
    if (!slot) return;
    setLoadingLogs(true);
    try {
      const res = await dutyService.getSlotLogs(slot.id);
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch slot logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (open && slot && activeTab === 'history') {
      fetchLogs();
    }
  }, [open, slot, activeTab]);

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

  const handleSwapRequest = async (values: { toSlotId: number, fromSlotId?: number, reason: string }) => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.requestSwap({
        fromSlotId: slot.id,
        toSlotId: values.toSlotId,
        reason: values.reason
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
  const isAdminAssigned = currentUserId && (slot as any)?.config?.adminAssignedUserIds?.includes(currentUserId);
  const isAssigned = isAdminAssigned || slot?.status === 'locked' || isSpecialEvent;
  const themeColor = isSpecialEvent ? '#3b82f6' : '#ec4899'; // Blue vs Pink
  const themeBg = isSpecialEvent ? '#eff6ff' : '#fff5f7';
  const themeBorder = isSpecialEvent ? '#dbeafe' : '#fce7f3';
  const themeText = isSpecialEvent ? '#1e40af' : '#9d174d';

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <>
          <ScheduleOutlined style={{ color: themeColor }} />
          <span>Chi tiết {isSpecialEvent ? 'Sự kiện' : 'ca trực'}</span>
        </>
      }
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <div className="slot-detail-container" style={{ padding: '0 8px' }}>
        <Row gutter={[24, 24]}>
          {/* Left Column: Info */}
          <Col span={14}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                {
                  key: 'info',
                  label: (
                    <Space>
                      <InfoCircleOutlined />
                      Thông tin
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: '4px 8px', maxHeight: 450, overflowY: 'auto' }}>
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
                        <Text type="secondary" style={{ fontSize: 12 }}>SỐ KÍP ĐƯỢC TÍNH</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <ThunderboltOutlined style={{ color: '#d97706' }} />
                          <span style={{ fontWeight: 600, color: '#d97706' }}>{(slot as any)?.coefficient || 1} kíp</span>
                        </div>
                      </div>

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

                      {/* Personnel Structure Requirements */}
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>CƠ CẤU NHÂN SỰ YÊU CẦU</Text>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const structure = (slot as any)?.slotStructure || slot?.kip?.slotStructure || (slot as any)?.shift?.slotStructure || [];
                            if (!Array.isArray(structure) || structure.length === 0) return <Text type="secondary" italic style={{ fontSize: 13 }}>Không có yêu cầu cơ cấu đặc biệt</Text>;
                            
                            return structure.map((item: any, idx: number) => {
                              const label = item.label || item.positions?.map((p: string) => getPositionInfo(p).name).join('/');
                              const requiredSlots = item.slots || item.count || 0;
                              const currentCount = slot?.assignedUsers?.filter(u => {
                                const uPos = (u.position || '').toLowerCase();
                                const uPosName = getPositionInfo(uPos).name.toLowerCase();
                                if (Array.isArray(item.positions)) {
                                  return item.positions.some((p: string) => {
                                    const pLower = p.toLowerCase();
                                    return pLower === uPos || pLower === uPosName;
                                  });
                                }
                                const itemPos = (item.position || '').toLowerCase();
                                return uPos === itemPos || uPosName === itemPos;
                              }).length || 0;
                              const isMet = currentCount >= requiredSlots;
                              return (
                                <div key={idx} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  background: isMet ? '#f0fdf4' : '#f8fafc',
                                  borderRadius: 8,
                                  border: `1px solid ${isMet ? '#dcfce7' : '#e2e8f0'}`
                                }}>
                                  <Space>
                                    <Tag color={isMet ? 'green' : 'blue'} style={{ margin: 0, borderRadius: 4 }}>
                                      {label}
                                    </Tag>
                                    <Text type={isMet ? 'success' : 'secondary'} style={{ fontSize: 12 }}>
                                      {isMet ? 'Đã đủ' : `Còn thiếu ${requiredSlots - currentCount}`}
                                    </Text>
                                  </Space>
                                  <Text strong style={{ color: isMet ? '#16a34a' : '#64748b' }}>
                                    {currentCount} / {requiredSlots}
                                  </Text>
                                </div>
                              );
                            });
                          })()}
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


                      <Divider orientation="left" style={{ marginTop: 24 }}>
                        <TeamOutlined style={{ color: themeColor }} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Danh sách đăng ký ({registeredCount})</span>
                      </Divider>
                      
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <List
                          size="small"
                          dataSource={[
                            ...(slot?.assignedUsers || []),
                            ...(slot?.attendedUsers || []).filter((au: any) => !(slot?.assignedUsers || []).some((as: any) => String(as.id) === String(au.id)))
                          ]}
                          locale={{ emptyText: 'Chưa có người đăng ký' }}
                          renderItem={(u: any, index: number) => {
                            const isAssigned = (slot?.assignedUsers || []).some((as: any) => String(as.id) === String(u.id));
                            const isVisible = checkVisibility(u);
                            const isMe = String(u.id) === String(currentUserId);
                            const existingViolation = slot?.violations?.find((v: any) => String(v.userId) === String(u.id));
                            const displayName = isVisible ? (u.name || u.fullName || u.username || u.email) : "Nhân sự trực (Bảo mật)";
                            const displaySub = isVisible ? u.email : "Thông tin được ẩn theo cấu hình kíp";
                            const posInfo = getPositionInfo(u.position);

                            return (
                              <List.Item
                                actions={[]}
                              >
                                <List.Item.Meta
                                  avatar={<Avatar src={isVisible ? u.avatar : undefined} icon={<UserOutlined />} style={{ backgroundColor: isSpecialEvent ? '#f5f3ff' : '#fdf2f8', color: themeColor }} />}
                                  title={
                                    <Space size={8} style={{ width: '100%' , justifyContent: 'space-between' }}>
                                      <span style={{ fontWeight: 600 }}>{displayName}</span>
                                      {isMe && <Tag color="magenta" style={{ fontSize: 9, borderRadius: 4, margin: 0 }}>Bạn</Tag>}
                                       {isVisible && (
                                        <Tag color={posInfo.color} style={{ fontSize: '10px', borderRadius: 4, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                          {posInfo.name}
                                        </Tag>
                                      )}
                                      {!isAssigned && <Tag color="orange" style={{ fontSize: 9, borderRadius: 4, margin: 0 }}>Ngoài kíp</Tag>}
                                      {(index === 0 && !isMe) && <Tag color="gold" style={{ fontSize: 9, borderRadius: 4 }}>Quản lý kíp</Tag>}
                                      {existingViolation && <Tag color="error" style={{ fontSize: 9, borderRadius: 4 }}>{existingViolation.type} (x{existingViolation.coefficient})</Tag>}
                                    </Space>
                                  }
                                  description={displaySub}
                                />
                              </List.Item>
                            );
                          }}
                        />
                      </div>
                    </div>
                  )
        },
        {
          key: 'history',
          label: (
            <Space>
              <HistoryOutlined />
              Lịch sử
            </Space>
          ),
          children: (
            <div style={{ padding: '16px 8px', maxHeight: 450, overflowY: 'auto' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <SyncOutlined spin style={{ fontSize: 20, color: themeColor }} />
                  <div style={{ marginTop: 8, color: '#64748b' }}>Đang tải lịch sử...</div>
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  Chưa có hoạt động nào được ghi lại
                </div>
              ) : (
                <Timeline mode="left">
                  {logs.map((log, idx) => {
                    const isTransfer = log.action === 'transfer' || log.action === 'swap';
                    const isRegister = log.action === 'register';
                    const isCancel = log.action === 'cancel';
                    const isLeave = log.action === 'leave';
                    const isAttendance = log.action === 'attendance';
                    
                    let color = 'blue';
                    let icon = <InfoCircleOutlined />;
                    
                    if (isTransfer) { color = 'purple'; icon = <SwapOutlined />; }
                    if (isRegister) { color = 'green'; icon = <CheckCircleOutlined />; }
                    if (isCancel || isLeave) { color = 'red'; icon = <LogoutOutlined />; }
                    if (isAttendance) { color = 'gold'; icon = <CheckCircleOutlined />; }

                    return (
                      <Timeline.Item key={idx} color={color} dot={icon}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{log.description}</div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                            {dayjs(log.createdAt).format('HH:mm - DD/MM/YYYY')}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar size={16} src={log.performer?.avatar} icon={<UserOutlined />} />
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              {log.performer?.name || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              )}
            </div>
          )
        }
      ]}
    />
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
                    disabled={isFull || slot?.status === 'locked' || isOldGeneration || !canRegister}
                    icon={<CheckCircleOutlined />}
                  >
                    {!canRegister ? 'Không có quyền đăng ký' : (isOldGeneration ? 'Chỉ xem' : (isFull ? 'Ca đã đầy' : 'Đăng ký trực ca này'))}
                  </Button>
                ) : (
                  <>
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: 12, 
                        border: `1px solid ${isAssigned ? '#dbeafe' : '#d1fae5'}`,
                        marginBottom: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                        <Space direction="vertical" size={2}>
                          <Text strong style={{ color: isAssigned ? '#2563eb' : '#059669', display: 'block', fontSize: 13 }}>
                            BẠN {isAssigned ? 'ĐƯỢC PHÂN CÔNG' : 'ĐÃ TỰ ĐĂNG KÝ'} KÍP NÀY
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {isAssigned ? 'Trạng thái: Chính thức' : 'Trạng thái: Đăng ký cá nhân'}
                          </Text>
                        </Space>
                        
                        <div style={{ marginTop: 8 }}>
                          {/* Check attendance status */}
                          {(() => {
                              if (!slot) return null;
                              const now = dayjs();
                              const slotStart = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.startTime}`);
                              const slotEnd = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`);
                              const isActive = now.isAfter(slotStart.subtract(15, 'minute')) && now.isBefore(slotEnd);
                              const isAttended = Array.isArray(slot.attendedUserIds) && slot.attendedUserIds.includes(currentUserId);
                              const isPast = now.isAfter(slotEnd);
                              const isCheckInWindow = Math.abs(now.diff(slotStart, 'minute')) <= 2;
                              const isDuringShift = now.isAfter(slotStart) && now.isBefore(slotEnd);
                              
                              const isActingLeader = (String(currentUserId) === String(slot.assignedUserIds?.[0]) && isAttended) || 
                                                     (String(currentUserId) === String(slot.tempLeaderId));

                              if (isAttended) return (
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                  <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Đã điểm danh</Tag>
                                  {isActingLeader && (
                                    <div style={{ marginTop: 8 }}>
                                      <Tag color="gold" icon={<ThunderboltOutlined />} style={{ margin: 0, marginBottom: 8 }}>Quản lý kíp</Tag>
                                      {isDuringShift && openAttendanceModal && (
                                        <Button 
                                          variant="primary" 
                                          fullWidth 
                                          onClick={() => {
                                            onCancel();
                                            openAttendanceModal(slot);
                                          }}
                                          style={{ background: '#fbbf24', borderColor: '#fbbf24', color: '#78350f' }}
                                          icon={<CheckCircleOutlined />}
                                        >
                                          QUẢN LÝ KÍP
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </Space>
                              );
                              
                              if (isCheckInWindow && onSelfCheckIn) return (
                                <Button 
                                  variant="primary" 
                                  fullWidth 
                                  onClick={() => onSelfCheckIn(slot.id)}
                                  style={{ background: '#10b981', borderColor: '#10b981' }}
                                  icon={<SyncOutlined />}
                                >
                                  TỰ ĐIỂM DANH
                                </Button>
                              );

                              if (isActive) return <Tag color="processing" icon={<SyncOutlined spin />}>Đang diễn ra</Tag>;
                              if (isPast) return <Tag color="default" icon={<CloseCircleOutlined />}>Vắng mặt / Chưa điểm danh</Tag>;
                              return null;
                          })()}
                        </div>
                    </div>

                    {!isOldGeneration && (
                      <>
                        {(() => {
                          const canSelfCancel = !isAssigned && (settings?.allowUnregisterWhenFull || !isFull) && canCancel;
                          const isAdminBypass = isGlobalAdmin || isStaff;
                          const cancelDisabled = !canSelfCancel && !isAdminBypass;

                          return (
                            <>
                              <Button 
                                variant="outline" 
                                fullWidth 
                                danger 
                                onClick={handleUnregister} 
                                loading={loading || externalLoading}
                                disabled={cancelDisabled}
                                icon={<CloseCircleOutlined />}
                              >
                                {!canCancel ? 'Không có quyền hủy' : 'Hủy đăng ký'}
                              </Button>
                              
                              {cancelDisabled && (
                                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '-8px', marginBottom: '8px', padding: '0 4px', textAlign: 'center' }}>
                                  {!canCancel 
                                    ? 'Bạn không có quyền thực hiện thao tác này' 
                                    : (isAssigned ? 'Kíp đã được phân công/khóa, vui lòng liên hệ Admin để thay đổi' : 'Kíp đã đầy, vui lòng liên hệ Admin để hủy')}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        <Button 
                          variant="outline" 
                          fullWidth 
                          onClick={() => setIsSwapModalVisible(true)}
                          disabled={!canRegister}
                          icon={<SwapOutlined />}
                        >
                          {!canRegister ? 'Không có quyền đổi ca' : 'Đổi ca / Chuyển ca'}
                        </Button>

                        <Button 
                          variant="ghost" 
                          fullWidth 
                          danger
                          onClick={() => setIsLeaveModalVisible(true)}
                          disabled={!canRegister}
                          icon={<LogoutOutlined />}
                        >
                          {!canRegister ? 'Không có quyền xin nghỉ' : 'Gửi đơn xin nghỉ'}
                        </Button>
                      </>
                    )}
                  </>
                )}

                {showWarning && (
                  <div style={{ 
                    marginTop: 8,
                    padding: '6px 10px', 
                    background: '#fff5f7', 
                    border: '1px solid #fce7f3', 
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}>
                    <Text style={{ fontSize: 11, color: '#9d174d', fontStyle: 'italic', flex: 1 }}>
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Mọi thay đổi (hủy/đổi) cần thực hiện sớm nhất có thể. Kíp đã khóa không thể tự ý thay đổi.
                    </Text>
                    <AntButton 
                      type="text" 
                      size="small" 
                      icon={<CloseOutlined style={{ fontSize: 10 }} />} 
                      onClick={() => setShowWarning(false)}
                      style={{ height: 20, width: 20, color: '#9d174d', opacity: 0.6 }}
                    />
                  </div>
                )}
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
        initialSlotLabel={slot ? `${dayjs(slot.shiftDate).format('DD/MM')} • ${slot.shiftLabel}` : ''}
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
