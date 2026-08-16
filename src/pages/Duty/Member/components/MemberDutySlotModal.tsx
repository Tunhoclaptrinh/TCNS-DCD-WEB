import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  Row, 
  Col, 
  Space, 
  Typography, 
  Avatar,
  Tag, 
  message,
  Form,
  Button as AntButton,
  Tabs,
  // Timeline,
  Tooltip,
  Popover,
  Empty,
  Badge,
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
  UnlockOutlined,
  CloseOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import { getAttendanceState, ATTENDANCE_STATE_CONFIG } from '../../components/AttendanceStatusTag';
import Button from '@/components/common/Button';
import dutyService, { DutySlot } from '@/services/duty.service';
import { useAccess } from '@/hooks';
import { getViolationTypeLabel } from '@/pages/Duty/Admin/components/AdminDutySlotModal';
import LeaveRequestModal from './LeaveRequestModal';
import SwapRequestModal from './SwapRequestModal';
import { getUserDisplayName } from '@/utils/formatters';
import { POSITION_LABELS } from '@/constants/user.constants';

const { Text } = Typography;

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
  const privacyMaskType = slot?.config?.privacyMaskType || 'masked';
  const OFFICIAL_POSITIONS = ['tv', 'tvb', 'pb', 'tb', 'dt'];
  const CTV_POSITION = 'ctv';
  
  const getPositionInfo = (posCode: string) => {
    const raw = (posCode || '').toLowerCase().trim();

    if (raw === 'admin' || raw.includes('quản trị') || raw === 'dt' || raw.includes('đội trưởng')) {
      return { name: 'Đội trưởng', color: 'red' };
    }
    if (raw === 'tb' || raw === 'nsl' || raw.includes('trưởng ban')) {
      return { name: 'Trưởng ban', color: 'volcano' };
    }
    if (raw === 'pb' || raw === 'nsp' || raw.includes('phó ban')) {
      return { name: 'Phó ban', color: 'orange' };
    }
    if (raw === 'tvb' || raw === 'nss' || raw === 'ns' || raw.includes('thành viên ban') || raw.includes('chuyên viên')) {
      return { name: 'Thành viên Ban', color: 'blue' };
    }
    if (raw === 'ctv' || raw.includes('cộng tác viên')) {
      return { name: 'Cộng tác viên', color: 'green' };
    }
    if (raw === 'tv' || raw.includes('thành viên')) {
      return { name: 'Thành viên', color: 'cyan' };
    }

    return { name: POSITION_LABELS[posCode] || posCode || 'Thành viên', color: 'cyan' };
  };

  const checkVisibility = (targetUser: any) => {
    if (!targetUser) return false;
    // Always see yourself
    if (String(targetUser.id) === String(currentUserId)) return true;
    
    // Exception: Shift Leader / Temp Leader is ALWAYS VISIBLE to everyone!
    const isTargetLeader = (String(slot?.assignedUserIds?.[0]) === String(targetUser.id)) || 
                           (String(slot?.tempLeaderId) === String(targetUser.id));
    if (isTargetLeader) return true;
    
    const targetPos = (targetUser?.position || '').toLowerCase();
    const isTargetOfficial = OFFICIAL_POSITIONS.includes(targetPos) || targetPos.startsWith('ns');
    const isTargetCTV = targetPos === CTV_POSITION || targetPos === 'ctv';

    const currentUserPos = (currentUserData as any)?.position?.toLowerCase();
    const isCurrentUserOfficial = OFFICIAL_POSITIONS.includes(currentUserPos) || currentUserPos?.startsWith('ns');
    const isCurrentUserCTV = currentUserPos === CTV_POSITION || currentUserPos === 'ctv';

    if (visibilityMode === 'hidden_all') {
      return false;
    }

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
  // const [logs, setLogs] = useState<any[]>([]);
  // const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  /*
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
  */

  /*
  useEffect(() => {
    if (open && slot && activeTab === 'history') {
      fetchLogs();
    }
  }, [open, slot, activeTab]);
  */

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

  const [localAttendedUserIds, setLocalAttendedUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (slot) {
      const ids = (slot.attendedUserIds || (slot as any).attendedUsers || [])
        .map((u: any) => Number(u?.id ?? u))
        .filter(Boolean);
      setLocalAttendedUserIds(ids);
    }
  }, [slot]);

  const isAttendedMe = localAttendedUserIds.some((id: any) => String(id) === String(currentUserId)) || (
    Array.isArray(slot?.attendedUserIds) && slot.attendedUserIds.some((id: any) => String(id) === String(currentUserId))
  ) || (
    Array.isArray((slot as any)?.attendedUsers) && (slot as any).attendedUsers.some((u: any) => String(u?.id ?? u) === String(currentUserId))
  );
  const isUserRegistered = (
    Array.isArray(slot?.assignedUserIds) && slot.assignedUserIds.some((id: any) => String(id) === String(currentUserId))
  ) || (
    Array.isArray((slot as any)?.assignedUsers) && (slot as any).assignedUsers.some((u: any) => String(u?.id ?? u) === String(currentUserId))
  );
  const isSupplementaryMe = isAttendedMe && !isUserRegistered;
  const isInThisSlot = isUserRegistered || isAttendedMe;

  const baseSlotCoeff = Number((slot as any)?.coefficient ?? (slot as any)?.kip?.coefficient ?? (slot as any)?.shift?.coefficient ?? 1);
  const myPersonalCoeff = currentUserId && (slot as any)?.attendanceOverrides?.[String(currentUserId)] !== undefined
    ? Number((slot as any)?.attendanceOverrides?.[String(currentUserId)])
    : null;
  const myEarnedCoeff = myPersonalCoeff !== null ? myPersonalCoeff : baseSlotCoeff;
  const isCustomCoeff = myPersonalCoeff !== null && myPersonalCoeff !== baseSlotCoeff;

  // Derived slot timing
  const isPastSlot = slot ? dayjs().isAfter(
    dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`)
  ) : false;

  const registeredCount = Array.isArray(slot?.assignedUserIds) ? slot?.assignedUserIds.length : 0;
  const capacity = slot?.capacity || slot?.kip?.capacity || 0;
  const isFull = registeredCount >= capacity;

  const isSpecialEvent = !!slot?.isSpecialEvent;
  const isAdminAssigned = currentUserId && (slot as any)?.config?.adminAssignedUserIds?.includes(currentUserId);
  const isAssigned = isAdminAssigned || slot?.status === 'locked' || isSpecialEvent;
  const themeColor = isSpecialEvent ? '#3b82f6' : '#ec4899'; // Blue vs Pink

  const assignedList = slot?.assignedUsers || [];
  const attendedList = slot?.attendedUsers || [];
  const supplementaryList = attendedList.filter((au: any) => !assignedList.some((as: any) => String(as.id) === String(au.id)));
  const totalPersonnelCount = assignedList.length + supplementaryList.length;

  const myApprovedLeave = (slot?.leaveRequests || []).find((lr: any) => 
    String(lr.userId || lr.user?.id) === String(currentUserId) && (lr.status === 'approved' || lr.isApproved)
  );

  const approvedLeaveUserIds = React.useMemo(() => {
    return (slot?.leaveRequests || [])
      .filter((lr: any) => lr.status === 'approved' || lr.isApproved)
      .map((lr: any) => String(lr.userId || lr.user?.id));
  }, [slot?.leaveRequests]);

  const effectiveLeaderId = React.useMemo(() => {
    if (!slot) return null;
    if (slot.tempLeaderId) return String(slot.tempLeaderId);

    const activeAssignedUser = (slot.assignedUserIds || []).find(
      (id: any) => !approvedLeaveUserIds.includes(String(id))
    );

    return activeAssignedUser ? String(activeAssignedUser) : (slot.assignedUserIds?.[0] ? String(slot.assignedUserIds[0]) : null);
  }, [slot, approvedLeaveUserIds]);

  const isLeaderOfSlot = !!currentUserId && !!slot && !myApprovedLeave && (
    String(currentUserId) === String(effectiveLeaderId)
  );

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <Space>
          <CalendarOutlined style={{ color: '#1890ff' }} />
          <span>Chi tiết {isSpecialEvent ? 'sự kiện' : 'kíp trực'}</span>
        </Space>
      }
      onCancel={onCancel}
      footer={null}
      width={1000}
    >
      <div className="slot-detail-container" style={{ padding: '0 4px' }}>
        <Row gutter={[16, 16]}>
          {/* Left Column: Info */}
          <Col xs={24} md={16}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size='small'
              items={[
                {
                  key: 'info',
                  label: (
                    <Space>
                      <InfoCircleOutlined />
                      <span>Thông tin ca</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: '4px 8px' }}>
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
                        <Text type="secondary" style={{ fontSize: 12 }}>HỆ SỐ KÍP GỐC CỦA CA</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <ThunderboltOutlined style={{ color: '#64748b' }} />
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {baseSlotCoeff} kíp
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>TRẠNG THÁI KÍP TRỰC</Text>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {slot?.status === 'locked' ? (
                            <Tag color="error" icon={<LockOutlined />}>Đã khóa (Cố định)</Tag>
                          ) : (
                            <Tag color="success" icon={<UnlockOutlined />}>Đang mở đăng ký</Tag>
                          )}
                          {isPastSlot ? (
                            <Tag color="default" icon={<HistoryOutlined />}>Đã kết thúc</Tag>
                          ) : (
                            <Tag color="processing" icon={<SyncOutlined spin />}>Đang diễn ra</Tag>
                          )}
                          {isFull ? (
                            <Tag color="warning">Đã đầy ({registeredCount}/{capacity})</Tag>
                          ) : (
                            <Tag color="blue">Còn chỗ ({registeredCount}/{capacity})</Tag>
                          )}
                        </div>
                      </div>

                      {/* Personnel Structure Requirements */}
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>CƠ CẤU NHÂN SỰ YÊU CẦU</Text>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const rawStructure = (slot as any)?.slotStructure || slot?.kip?.slotStructure || (slot as any)?.shift?.slotStructure || [];
                            if (!Array.isArray(rawStructure) || rawStructure.length === 0) return <Text type="secondary" italic style={{ fontSize: 13 }}>Không có yêu cầu cơ cấu đặc biệt</Text>;
                            
                            // Tự động gộp / ẩn các cơ cấu trùng lặp
                            const structure = rawStructure.reduce((acc: any[], item: any) => {
                              const key = `${(item.label || '').toLowerCase().trim()}_${(item.positions || []).sort().join(',')}`;
                              const existing = acc.find(x => `${(x.label || '').toLowerCase().trim()}_${(x.positions || []).sort().join(',')}` === key);
                              if (existing) {
                                existing.slots = (Number(existing.slots) || 0) + (Number(item.slots) || 0);
                              } else {
                                acc.push({ ...item });
                              }
                              return acc;
                            }, []);
                            
                            const currentUserPos = String((currentUserData as any)?.position || '').toLowerCase().trim();
                            const currentUserRole = String((currentUserData as any)?.role || '').toLowerCase().trim();
                            const isCurrentUserCTV = currentUserPos === CTV_POSITION || currentUserRole === CTV_POSITION;
                            const isProtectingTV = (visibilityMode === 'protect_members' || visibilityMode === 'hide_tv_from_ctv' || visibilityMode === 'private_mutual') && isCurrentUserCTV && !isGlobalAdmin;

                            return structure
                              .filter((item: any) => {
                                const labelStr = String(item.label || '').toLowerCase().trim();
                                const posList = (item.positions || []).map((p: any) => String(p).toLowerCase().trim());
                                const isCTVItem = posList.includes('ctv') || posList.includes('ctc') || labelStr === 'ctv' || labelStr.includes('cộng tác viên');
                                const isOfficialItem = !isCTVItem && (
                                  posList.some((p: string) => OFFICIAL_POSITIONS.includes(p)) ||
                                  labelStr === 'tv' ||
                                  labelStr === 'tvb' ||
                                  labelStr.includes('thành viên') ||
                                  labelStr.includes('ban')
                                );

                                if (isProtectingTV && isOfficialItem && privacyMaskType === 'omitted') {
                                  return false;
                                }
                                return true;
                              })
                              .map((item: any, idx: number) => {
                                const labelStr = String(item.label || '').toLowerCase().trim();
                                const posList = (item.positions || []).map((p: any) => String(p).toLowerCase().trim());
                                const isCTVItem = posList.includes('ctv') || posList.includes('ctc') || labelStr === 'ctv' || labelStr.includes('cộng tác viên');
                                const isOfficialItem = !isCTVItem && (
                                  posList.some((p: string) => OFFICIAL_POSITIONS.includes(p)) ||
                                  labelStr === 'tv' ||
                                  labelStr === 'tvb' ||
                                  labelStr.includes('thành viên') ||
                                  labelStr.includes('ban')
                                );
                                const isMasked = isProtectingTV && isOfficialItem && privacyMaskType === 'masked';

                                const label = isMasked ? 'Thành viên' : (item.label || item.positions?.map((p: string) => getPositionInfo(p).name).join('/'));
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
                                    padding: '8px 12px',
                                    background: isMasked ? '#f8fafc' : (isMet ? '#f0fdf4' : '#f8fafc'),
                                    borderRadius: 8,
                                    border: `1px solid ${isMasked ? '#e2e8f0' : (isMet ? '#dcfce7' : '#e2e8f0')}`
                                  }}>
                                    <Space size={8}>
                                      <Tag 
                                        color={isMasked ? 'default' : (isMet ? 'green' : 'blue')} 
                                        style={{ 
                                          margin: 0, 
                                          borderRadius: 4, 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: 4,
                                          fontWeight: 600,
                                          padding: '2px 8px'
                                        }}
                                      >
                                        {isMasked && <LockOutlined style={{ fontSize: 11 }} />}
                                        <span>{label}</span>
                                      </Tag>
                                      <Text type={isMasked ? 'secondary' : (isMet ? 'success' : 'secondary')} style={{ fontSize: 12 }}>
                                        {isMasked ? 'Bảo mật' : (isMet ? 'Đã đủ' : `Còn thiếu ${requiredSlots - currentCount}`)}
                                      </Text>
                                    </Space>
                                    <Text strong style={{ color: isMasked ? '#94a3b8' : (isMet ? '#16a34a' : '#64748b'), fontSize: 13 }}>
                                      {isMasked ? `*** / ${requiredSlots}` : `${currentCount} / ${requiredSlots}`}
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
                      </div>
                    )
                  },
                  {
                    key: 'attendees',
                    label: (
                      <>
                        <TeamOutlined />
                        <span>DS nhân sự ({totalPersonnelCount})</span>
                      </>
                    ),
                    children: (
                      <div style={{ padding: '4px 8px' }}>
                        {isLeaderOfSlot && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fef08a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#854d0e', fontSize: 13, fontWeight: 600 }}>
                              <ThunderboltOutlined style={{ color: '#eab308' }} />
                              <span>Bạn là Quản lý kíp trực này</span>
                            </div>
                            {openAttendanceModal && slot && (
                              <AntButton 
                                type="primary" 
                                size="small" 
                                icon={<CheckCircleOutlined />}
                                onClick={() => {
                                  onCancel();
                                  openAttendanceModal(slot);
                                }}
                                style={{ background: '#f59e0b', borderColor: '#d97706' }}
                              >
                                Điểm danh & Quản lý kíp
                              </AntButton>
                            )}
                          </div>
                        )}
                        <div className="duty-slot-attendee-list">
                        {(() => {
                          const personnelList = [
                            ...(slot?.assignedUsers || []),
                            ...(slot?.attendedUsers || []).filter((au: any) => !(slot?.assignedUsers || []).some((as: any) => String(as.id) === String(au.id)))
                          ].filter((u: any) => {
                            if (privacyMaskType === 'omitted') {
                              return checkVisibility(u);
                            }
                            return true;
                          });

                          if (personnelList.length === 0) {
                            return <Empty description="Chưa có nhân sự nào trong kíp trực" style={{ padding: '24px 0' }} />;
                          }

                          return personnelList.map((u: any) => {
                            const isAssigned = (slot?.assignedUsers || []).some((as: any) => String(as.id) === String(u.id));
                            const isAdminAssignedUser = (slot as any)?.config?.adminAssignedUserIds?.some((id: any) => String(id) === String(u.id));
                            const defaultLeaderId = (slot?.assignedUserIds && slot.assignedUserIds.length > 0)
                               ? slot.assignedUserIds[0]
                               : (slot?.assignedUsers && slot.assignedUsers.length > 0)
                                 ? slot.assignedUsers[0].id
                                 : null;
                             const effectiveLeaderId = (slot as any)?.tempLeaderId || defaultLeaderId;
                             const isLeader = !!effectiveLeaderId && String(effectiveLeaderId) === String(u.id);
                            const isAttended = Array.isArray(slot?.attendedUserIds) && slot.attendedUserIds.some((id: any) => String(id) === String(u.id));
                            const isVisible = checkVisibility(u);
                            const isMe = String(u.id) === String(currentUserId);
                            const userViolations = slot?.violations?.filter((v: any) => String(v.userId) === String(u.id)) || [];
                            const displayName = isVisible ? getUserDisplayName(u) : "Nhân sự trực (Bảo mật)";
                            const posInfo = getPositionInfo(u.position);
                            const baseSlotCoeff = Number((slot as any)?.coefficient ?? (slot as any)?.kip?.coefficient ?? (slot as any)?.shift?.coefficient ?? 1);
                            const userOverriddenCoeff = (slot as any)?.attendanceOverrides?.[String(u.id)];
                            const hasCustomCoeff = userOverriddenCoeff !== undefined && userOverriddenCoeff !== null && Number(userOverriddenCoeff) !== baseSlotCoeff;

                            const allBadges: React.ReactNode[] = [];

                            // Add Leave Request status badge if exists
                            const userLeaveReq = (slot?.leaveRequests || []).find((lr: any) => 
                              String(lr.userId || lr.user?.id || lr.user) === String(u.id)
                            );
                            if (userLeaveReq) {
                              const isPending = userLeaveReq.status === 'pending';
                              const isApproved = userLeaveReq.status === 'approved' || userLeaveReq.isApproved;
                              const badgeColor = isPending ? 'gold' : isApproved ? 'warning' : 'default';
                              const badgeLabel = isPending ? 'Chờ duyệt nghỉ' : isApproved ? 'Đã duyệt nghỉ' : 'Nghỉ bị từ chối';
                              const badgeIcon = isPending ? <ClockCircleOutlined style={{ marginRight: 4 }} /> : isApproved ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : <CloseCircleOutlined style={{ marginRight: 4 }} />;

                              const leaveTooltipTitle = (
                                <div>
                                  <div className="duty-tooltip-title">Đơn xin nghỉ ca</div>
                                  {userLeaveReq.reason && (
                                    <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Lý do xin nghỉ:</b> {userLeaveReq.reason}</div>
                                  )}
                                  {userLeaveReq.status === 'rejected' && (
                                    <div className="duty-tooltip-note" style={{ color: '#ff7875' }}>
                                      <CloseCircleOutlined style={{ marginRight: 4 }} /><b>Lý do từ chối:</b> {userLeaveReq.rejectionReason || 'Không có lý do cụ thể'}
                                    </div>
                                  )}
                                  <div className="duty-tooltip-note">Trạng thái: {badgeLabel}</div>
                                </div>
                              );

                              allBadges.push(
                                <Tooltip key={`lr-${u.id}`} title={leaveTooltipTitle}>
                                  <Tag color={badgeColor} className="duty-badge-tag" style={{ cursor: 'pointer' }}>
                                    {badgeIcon}{badgeLabel}
                                  </Tag>
                                </Tooltip>
                              );
                            }

                            userViolations.forEach((v: any) => {
                              allBadges.push(
                                <Tooltip
                                  key={`v-${v.id}`}
                                  title={
                                    <div>
                                      <div className="duty-tooltip-title">{getViolationTypeLabel(v.type)} (Hệ số: x{v.coefficient})</div>
                                      {v.note ? (
                                        <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Ghi chú:</b> {v.note}</div>
                                      ) : (
                                        <div className="duty-tooltip-note-empty">Không có ghi chú thêm</div>
                                      )}
                                      {v.createdAt && (
                                        <div className="duty-tooltip-time">
                                          <ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(v.createdAt).format('DD/MM/YYYY HH:mm')}
                                        </div>
                                      )}
                                    </div>
                                  }
                                >
                                  <Tag color="error" className="duty-badge-tag">
                                    {getViolationTypeLabel(v.type)} (x{v.coefficient})
                                  </Tag>
                                </Tooltip>
                              );
                            });

                            const popoverViolationList = (
                              <div className="duty-popover-violation-list" onClick={(e) => e.stopPropagation()}>
                                <div className="duty-popover-title">
                                  Tất cả vi phạm ({userViolations.length}):
                                </div>
                                <div className="duty-popover-items-col">
                                  {userViolations.map((v: any) => (
                                    <Tooltip
                                      key={v.id}
                                      placement="right"
                                      title={
                                        <div>
                                          <div className="duty-tooltip-title">{getViolationTypeLabel(v.type)} (Hệ số: x{v.coefficient})</div>
                                          <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Ghi chú:</b> {v.note || 'Không có ghi chú thêm'}</div>
                                          {v.createdAt && (
                                            <div className="duty-tooltip-time">
                                              <ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(v.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                                            </div>
                                          )}
                                        </div>
                                      }
                                    >
                                      <div className="duty-popover-violation-item">
                                        <div className="duty-popover-item-row">
                                          <span className="popover-item-name">
                                            {getViolationTypeLabel(v.type)} (x{v.coefficient})
                                          </span>
                                          {v.createdAt && (
                                            <span className="popover-item-time">
                                              {dayjs(v.createdAt).format('HH:mm DD/MM')}
                                            </span>
                                          )}
                                        </div>
                                        {v.note && <div className="duty-popover-item-note"><FileTextOutlined style={{ marginRight: 4, fontSize: 11 }} />{v.note}</div>}
                                      </div>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            );

                            const cardNode = (
                              <div
                                key={u.id || u.studentId}
                                className={`duty-slot-attendee-card ${isAttended ? 'is-attended' : ''}`}
                                style={{
                                  borderColor: isMe ? '#fbcfe8' : undefined,
                                  backgroundColor: isMe ? '#fdf2f8' : undefined
                                }}
                              >
                                <div className="duty-slot-attendee-left">
                                  {/* Identity Box: Avatar + Name + MSV (No Email) */}
                                  <div className="duty-attendee-identity-box">
                                    <Avatar 
                                      size={40}
                                      icon={<UserOutlined />} 
                                      src={isVisible ? u.avatar : undefined} 
                                      className={`duty-attendee-avatar ${isAttended ? 'is-attended' : ''}`}
                                      style={{ 
                                        backgroundColor: isMe ? '#ec4899' : (isLeader ? '#f59e0b' : (isSpecialEvent ? '#8b5cf6' : themeColor)), 
                                        color: '#fff'
                                      }}
                                    />
                                    <div className="duty-attendee-identity-text">
                                      <Tooltip title={displayName} placement="topLeft">
                                        <div className="duty-attendee-name">
                                          {displayName}
                                        </div>
                                      </Tooltip>
                                      <div className="duty-attendee-msv">
                                        {isVisible ? `MSV: ${u.studentId || 'Chưa rõ MSV'}` : 'Bảo mật thông tin'}
                                      </div>
                                      {isVisible && posInfo && (
                                        <div style={{ marginTop: 2 }}>
                                          <Tag color={posInfo.color} style={{ fontSize: 10, padding: '0 6px', borderRadius: 4, lineHeight: '18px', fontWeight: 600, margin: 0 }}>
                                            {posInfo.name}
                                          </Tag>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Middle Box: Tags & Violations */}
                                  <div className="duty-attendee-middle-box">
                                    <div className="duty-attendee-tags-row">
                                      {!isAssigned ? (
                                        <Tag color="purple" className="duty-badge-tag is-leader">
                                          BỔ SUNG
                                        </Tag>
                                      ) : isAdminAssignedUser ? (
                                        <Tag color="blue" className="duty-badge-tag">
                                          Phân công
                                        </Tag>
                                      ) : (
                                        <Tag color="blue" className="duty-badge-tag">
                                          Theo lịch
                                        </Tag>
                                      )}
                                      {isVisible && isAttended && (
                                        hasCustomCoeff ? (
                                          <Tag color="gold" className="duty-badge-tag">
                                            <ThunderboltOutlined style={{ marginRight: 2 }} />{userOverriddenCoeff} kíp (Tính riêng)
                                          </Tag>
                                        ) : (
                                          <Tag color="blue" className="duty-badge-tag">
                                            <ThunderboltOutlined style={{ marginRight: 2 }} />{baseSlotCoeff} kíp
                                          </Tag>
                                        )
                                      )}
                                    </div>

                                    {allBadges.length > 0 && (
                                      <div className="duty-attendee-violations-row">
                                        {allBadges.length <= 2 ? (
                                          allBadges
                                        ) : (
                                          <>
                                            {allBadges.slice(0, 1)}
                                            <Popover 
                                              content={popoverViolationList} 
                                              trigger={['hover', 'click']} 
                                              mouseLeaveDelay={0.35}
                                              mouseEnterDelay={0.05}
                                              placement="bottomLeft"
                                            >
                                              <Tag 
                                                color="default" 
                                                className="duty-badge-more"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                +{allBadges.length - 1} khác
                                              </Tag>
                                            </Popover>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="duty-slot-attendee-right">
                                  <div className="duty-attendee-status">
                                    {(() => {
                                      const attendanceInfo = (slot as any)?.attendanceData?.[String(u.id)] || (slot as any)?.attendanceData?.[Number(u.id)];
                                      const checkInTimeStr = attendanceInfo?.time ? dayjs(attendanceInfo.time).format('HH:mm:ss DD/MM/YYYY') : null;
                                      const methodLabel = attendanceInfo?.method === 'admin' ? ' (Admin điểm danh)' : attendanceInfo?.method === 'leader' ? ' (Quản lý kíp điểm danh)' : attendanceInfo?.method === 'self_checkin' ? ' (Tự điểm danh)' : '';
                                      const attState = getAttendanceState(u, slot);
                                      const attCfg = ATTENDANCE_STATE_CONFIG[attState];

                                      if (attState === 'present') {
                                        return (
                                          <Tooltip title={checkInTimeStr ? `Đã điểm danh lúc: ${checkInTimeStr}${methodLabel}` : 'Đã điểm danh có mặt'}>
                                            <span className="status-text is-attended" style={{ color: attCfg.textColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                              {attCfg.icon} ĐÃ CÓ MẶT
                                            </span>
                                          </Tooltip>
                                        );
                                      }

                                      if (attState === 'excused') {
                                        return (
                                          <Tooltip title="Đã có đơn xin nghỉ được duyệt">
                                            <span className="status-text is-excused" style={{ color: attCfg.textColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                              {attCfg.icon} VẮNG CÓ LÝ DO
                                            </span>
                                          </Tooltip>
                                        );
                                      }

                                      if (attState === 'absent') {
                                        return (
                                          <Tooltip title="Vắng mặt không phép / Chưa điểm danh khi ca kết thúc">
                                            <span className="status-text is-absent" style={{ color: attCfg.textColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                              {attCfg.icon} VẮNG KHÔNG LÝ DO
                                            </span>
                                          </Tooltip>
                                        );
                                      }

                                      return (
                                        <span className="status-text is-not-attended" style={{ color: '#94a3b8' }}>
                                          CHƯA ĐIỂM DANH
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );

                            if (isLeader) {
                              return (
                                <Badge.Ribbon 
                                  key={u.id || u.studentId} 
                                  text={
                                    <Tooltip title={isMe ? "Quản lý kíp (Bạn)" : "Quản lý kíp"} placement="top">
                                      <span style={{ cursor: 'pointer'}}>{isMe ? "Qlk • Bạn" : "Qlk"}</span>
                                    </Tooltip>
                                  } 
                                  color="red" 
                                  placement="start"
                                >
                                  {cardNode}
                                </Badge.Ribbon>
                              );
                            }

                            if (isLeader) {
                              return (
                                <Badge.Ribbon 
                                  key={u.id || u.studentId} 
                                  text={
                                    <Tooltip title="Quản lý kíp" placement="top">
                                      <span style={{ cursor: 'pointer' }}>Qlk</span>
                                    </Tooltip>
                                  } 
                                  color="red" 
                                  placement="start"
                                >
                                  {cardNode}
                                </Badge.Ribbon>
                              );
                            }

                            if (isMe) {
                              return (
                                <Badge.Ribbon 
                                  key={u.id || u.studentId} 
                                  text={
                                    <Tooltip title="Tài khoản của bạn" placement="top">
                                      <span style={{ cursor: 'pointer' }}>Bạn</span>
                                    </Tooltip>
                                  } 
                                  color="magenta" 
                                  placement="start"
                                >
                                  {cardNode}
                                </Badge.Ribbon>
                              );
                            }

                            return (
                              <React.Fragment key={u.id || u.studentId}>
                                {cardNode}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )
        },
        /*
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
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {log.details || log.description || (log.action === 'register' ? 'Đăng ký kíp trực' : (log.action === 'cancel' ? 'Hủy đăng ký kíp' : 'Hoạt động kíp'))}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                            🕒 {dayjs(log.createdAt).format('HH:mm:ss - DD/MM/YYYY')}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar size={16} src={log.performer?.avatar} icon={<UserOutlined />} />
                             <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                               {getUserDisplayName(log.performer) || 'Hệ thống'}
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
        */
      ]}
    />
  </Col>

  {/* Right Column: Actions */}
          <Col xs={24} md={8}>
            <div className={`duty-member-action-sidebar ${isSpecialEvent ? 'is-special' : 'is-normal'}`}>
              <div className={`duty-sidebar-title ${isSpecialEvent ? 'is-special' : 'is-normal'}`}>Thao tác</div>
              
              <div className="duty-member-action-btn-group">
                {!isInThisSlot ? (
                  <Button 
                    variant="primary" 
                    buttonSize="small"
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
                    <div className={`duty-member-status-box ${isSupplementaryMe ? 'is-supplementary' : (isAssigned ? 'is-assigned' : 'is-registered')}`}>
                        <Text className={`status-box-title ${isSupplementaryMe ? 'is-supplementary' : (isAssigned ? 'is-assigned' : 'is-registered')}`}>
                          {isSupplementaryMe ? 'BẠN ĐƯỢC ĐIỂM DANH BỔ SUNG' : (isAssigned ? 'BẠN ĐƯỢC PHÂN CÔNG' : 'BẠN ĐÃ TỰ ĐĂNG KÝ')}
                        </Text>
                        <Text className="status-box-subtitle">
                          {isSupplementaryMe ? 'Trực bổ sung ngoài kíp' : (isAssigned ? 'Trạng thái: Chính thức' : 'Trạng thái: Đăng ký cá nhân')}
                        </Text>
                        
                        <div className="status-box-body">
                          {/* Check attendance status */}
                          {(() => {
                              if (!slot) return null;
                              const now = dayjs();
                              const slotStart = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.startTime}`);
                              const slotEnd = dayjs(`${dayjs(slot.shiftDate).format('YYYY-MM-DD')} ${slot.endTime}`);
                              const beforeMins = Math.max(0, Number(settings?.selfCheckInBeforeMinutes ?? 15));
                              const afterMins = Math.max(0, Number(settings?.selfCheckInAfterMinutes ?? 15));
                              const earliestCheckIn = slotStart.subtract(beforeMins, 'minute');
                              const latestCheckIn = slotEnd.add(afterMins, 'minute');
                              const isActive = now.isAfter(earliestCheckIn) && now.isBefore(latestCheckIn);
                              const isAttended = isAttendedMe;
                              const isPast = now.isAfter(latestCheckIn);

                              if (isAttended) return (
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                  <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0, fontWeight: 600, padding: '2px 8px' }}>
                                    {isSupplementaryMe ? 'Đã điểm danh (Bổ sung)' : 'Đã điểm danh có mặt'}
                                  </Tag>
                                  <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                                    <ThunderboltOutlined style={{ marginRight: 4 }} />Được tính: {myEarnedCoeff} kíp {isCustomCoeff && '(Tùy chỉnh riêng)'}
                                  </div>
                                  {isLeaderOfSlot && (
                                    <div style={{ marginTop: 8 }}>
                                      <Tag color="gold" icon={<ThunderboltOutlined />} style={{ margin: 0, marginBottom: 8 }}>Quản lý kíp</Tag>
                                      {openAttendanceModal && slot && (
                                        <Button 
                                          variant="primary" 
                                          buttonSize="small"
                                          fullWidth 
                                          onClick={() => {
                                            onCancel();
                                            openAttendanceModal(slot);
                                          }}
                                          icon={<CheckCircleOutlined />}
                                          style={{ background: '#f59e0b', borderColor: '#d97706' }}
                                        >
                                          ĐIỂM DANH & QUẢN LÝ KÍP
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </Space>
                              );
                              
                              if (isActive && !isAttended && isUserRegistered) return (
                                <Button 
                                  variant="primary" 
                                  buttonSize="small"
                                  fullWidth 
                                  loading={loading || externalLoading}
                                  onClick={async () => {
                                    if (!slot) return;
                                    try {
                                      setLoading(true);
                                      if (onSelfCheckIn) {
                                        await onSelfCheckIn(slot.id);
                                      } else {
                                        const res = await dutyService.selfCheckIn(slot.id);
                                        if (res.success) {
                                          message.success(res.message || 'Tự điểm danh thành công!');
                                        }
                                      }
                                      setLocalAttendedUserIds(prev => [...prev, Number(currentUserId)]);
                                      onSuccess?.();
                                    } catch (err: any) {
                                      message.error(err?.response?.data?.message || err?.message || 'Tự điểm danh thất bại');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  icon={<SyncOutlined />}
                                >
                                  TỰ ĐIỂM DANH
                                </Button>
                              );

                              if (isActive) return <Tag color="processing" icon={<SyncOutlined spin />}>Đang diễn ra</Tag>;
                              if (isPast) return <Tag color="default" icon={<CloseCircleOutlined />}>Vắng mặt / Chưa điểm danh</Tag>;
                              return <Tag color="blue">Chờ điểm danh</Tag>;
                          })()}
                        </div>
                    </div>

                    {!isOldGeneration && (
                      <>
                        {(() => {
                          const canSelfCancel = !isAssigned && !isAttendedMe && (settings?.allowUnregisterWhenFull || !isFull) && canCancel;
                          const isAdminBypass = isGlobalAdmin || isStaff;
                          const cancelDisabled = (!canSelfCancel && !isAdminBypass) || isAttendedMe;

                          const cancelLabel = !canCancel 
                            ? 'Không có quyền hủy' 
                            : isAttendedMe 
                              ? 'Đã điểm danh — không thể hủy' 
                              : 'Hủy đăng ký';

                          const cancelHintText = !canCancel
                            ? 'Bạn không có quyền thực hiện thao tác này'
                            : isAttendedMe
                              ? 'Bạn đã được điểm danh có mặt trong kíp trực này'
                              : (isAssigned ? 'Kíp đã được phân công/khóa, vui lòng liên hệ Admin để thay đổi' : 'Kíp đã đầy, vui lòng liên hệ Admin để hủy');

                          return (
                            <>
                              <Button 
                                variant="outline" 
                                buttonSize="small"
                                fullWidth 
                                danger 
                                onClick={handleUnregister} 
                                loading={loading || externalLoading}
                                disabled={cancelDisabled}
                                icon={<CloseCircleOutlined />}
                              >
                                {cancelLabel}
                              </Button>
                              
                              {cancelDisabled && (
                                <div className="duty-member-btn-hint">
                                  {cancelHintText}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {(() => {
                          // Check existing requests for current user on this specific slot
                          const myLeaveReq = (slot?.leaveRequests || []).find((lr: any) => 
                            String(lr.userId || lr.user?.id || lr.user) === String(currentUserId)
                          );
                          const mySwapReq = (slot?.swapRequests || []).find((sr: any) => 
                            String(sr.requesterId || sr.requester?.id || sr.user?.id || sr.user) === String(currentUserId)
                          );

                          const hasPendingLeave = myLeaveReq && myLeaveReq.status === 'pending';
                          const hasApprovedLeave = myLeaveReq && (myLeaveReq.status === 'approved' || myLeaveReq.isApproved);
                          const hasPendingSwap = mySwapReq && mySwapReq.status === 'pending';

                          // Disable swap/leave when slot already ended, user is already attended, or request is pending/approved
                          const slotActionFrozen = isPastSlot || isAttendedMe;
                          
                          let swapDisabled = !canRegister || slotActionFrozen || hasPendingLeave || hasApprovedLeave || hasPendingSwap;
                          let leaveDisabled = !canRegister || slotActionFrozen || hasPendingLeave || hasApprovedLeave || hasPendingSwap;

                          let swapLabel = 'Đổi ca / Chuyển ca';
                          let leaveLabel = 'Gửi đơn xin nghỉ';

                          if (!canRegister) {
                            swapLabel = 'Không có quyền đổi ca';
                            leaveLabel = 'Không có quyền xin nghỉ';
                          } else if (isAttendedMe) {
                            swapLabel = 'Đã điểm danh — không thể đổi ca';
                            leaveLabel = 'Đã điểm danh — không cần xin nghỉ';
                          } else if (isPastSlot) {
                            swapLabel = 'Kíp đã kết thúc';
                            leaveLabel = 'Kíp đã kết thúc';
                          } else if (hasApprovedLeave) {
                            swapLabel = 'Đã duyệt nghỉ ca này';
                            leaveLabel = 'Đã được duyệt xin nghỉ ca này';
                          } else if (hasPendingLeave) {
                            swapLabel = 'Đang chờ duyệt nghỉ — không thể đổi ca';
                            leaveLabel = 'Đang chờ duyệt đơn xin nghỉ';
                          } else if (hasPendingSwap) {
                            swapLabel = 'Đang chờ duyệt đơn đổi ca';
                            leaveLabel = 'Đang chờ duyệt đổi ca — không thể xin nghỉ';
                          }

                          return (
                            <>
                              <Button
                                variant="outline"
                                buttonSize="small"
                                fullWidth
                                onClick={() => setIsSwapModalVisible(true)}
                                disabled={swapDisabled}
                                icon={<SwapOutlined />}
                              >
                                {swapLabel}
                              </Button>

                              <Button
                                variant="ghost"
                                buttonSize="small"
                                fullWidth
                                danger
                                onClick={() => setIsLeaveModalVisible(true)}
                                disabled={leaveDisabled}
                                icon={<LogoutOutlined />}
                              >
                                {leaveLabel}
                              </Button>
                            </>
                          );
                        })()}
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
              </div>
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
