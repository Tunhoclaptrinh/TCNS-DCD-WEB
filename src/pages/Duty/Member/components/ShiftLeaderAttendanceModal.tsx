import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Typography, 
  Space, 
  Divider, 
  Select, 
  Button as AntButton, 
  Avatar, 
  Tag, 
  message, 
  Row, 
  Col, 
  Input, 
  InputNumber, 
  Form, 
  Empty, 
  Tooltip,
  Popconfirm,
  Popover,
  Badge
} from 'antd';
import { 
  CheckCircleOutlined, 
  UsergroupAddOutlined, 
  WarningOutlined, 
  CalendarOutlined,
  UserOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';
import { getUserDisplayName } from '@/utils/formatters';
import { Button } from '@/components/common';
import FormModal from '@/components/common/FormModal';
import { VIOLATION_TYPE_OPTIONS, getViolationTypeLabel } from '@/pages/Duty/Admin/components/AdminDutySlotModal';
import DutyPersonnelPicker from '../../components/DutyPersonnelTable';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import '../../DutyModal.less';

const { Text, Title } = Typography;

interface ShiftLeaderAttendanceModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
}

const ShiftLeaderAttendanceModal: React.FC<ShiftLeaderAttendanceModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot
}) => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const currentUserId = currentUser?.id;
  const [loading, setLoading] = useState(false);
  const [suppCoeff, setSuppCoeff] = useState<number>(1);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentSlot, setCurrentSlot] = useState<DutySlot | null>(slot);
  const [violationTypeOptions, setViolationTypeOptions] = useState<any[]>(VIOLATION_TYPE_OPTIONS);

  // Violation Management
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [violationUser, setViolationUser] = useState<any>(null);

  const getPositionTag = (pos: string) => {
    const map: Record<string, { color: string, label: string }> = {
      'ctv': { color: 'default', label: 'CTV' },
      'tv': { color: 'blue', label: 'Thành viên' },
      'tvb': { color: 'cyan', label: 'TV Chính thức' },
      'pb': { color: 'orange', label: 'Phó ban' },
      'tb': { color: 'volcano', label: 'Trưởng ban' },
      'dt': { color: 'gold', label: 'Đội trưởng' }
    };
    const info = map[pos] || { color: 'default', label: pos || 'Thành viên' };
    return <Tag color={info.color} style={{ fontSize: '10px', margin: 0 }}>{info.label}</Tag>;
  };
  const [violationForm] = Form.useForm();

  useEffect(() => {
    const loadViolationTypes = async () => {
      try {
        const res = await dutyService.getSettings();
        if (res.success && res.data?.violationTypes && Array.isArray(res.data.violationTypes) && res.data.violationTypes.length > 0) {
          setViolationTypeOptions(
            res.data.violationTypes.map((vt: any) => ({
              value: vt.key,
              label: `${vt.label}${vt.defaultPenalty ? ` (${Number(vt.defaultPenalty).toLocaleString('vi-VN')}đ)` : ''}`,
              rawLabel: vt.label,
              defaultPenalty: vt.defaultPenalty,
              defaultCoeff: vt.defaultCoeff,
            }))
          );
        }
      } catch (err) {
        // Fallback to default
      }
    };
    if (open) {
      loadViolationTypes();
    }
  }, [open]);

  useEffect(() => {
    setCurrentSlot(slot);
  }, [slot]);

  const refreshCurrentSlot = async () => {
    if (!slot?.id) return;
    try {
      const res = await dutyService.getSlot(slot.id);
      if (res.success && res.data) {
        setCurrentSlot(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh slot details:', err);
    }
  };

  useEffect(() => {
    if (currentSlot) {
      const assigned = currentSlot.assignedUsers || [];
      const attended = (currentSlot as any).attendedUsers || [];
      const userMap = new Map();
      assigned.forEach((u: any) => userMap.set(u.id, { ...u, isAssigned: true }));
      attended.forEach((u: any) => {
        const existing = userMap.get(u.id);
        userMap.set(u.id, { ...(existing || u), isAttended: true, isAssigned: !!existing?.isAssigned });
      });
      setAllUsers(Array.from(userMap.values()));
      setSuppCoeff(Number(currentSlot.coefficient ?? (currentSlot as any).kip?.coefficient ?? 1));
      setOverrides(currentSlot.attendanceOverrides || {});
    }
  }, [currentSlot]);

  const markAttendance = async (userId: number, customCoeff?: number) => {
    if (!currentSlot) return;
    const targetUser = allUsers.find(u => u.id === userId);
    const isSupplementary = targetUser && !targetUser.isAssigned;
    const isCurrentlyAttended = targetUser?.isAttended;

    // If unchecking a supplementary member
    if (isCurrentlyAttended && isSupplementary) {
      Modal.confirm({
        title: 'Xác nhận gỡ nhân sự bổ sung?',
        content: `Nhân sự "${getUserDisplayName(targetUser)}" là nhân sự trực bổ sung. Nếu hủy điểm danh, nhân sự này sẽ được gỡ khỏi kíp trực. Bạn có chắc chắn?`,
        okText: 'Gỡ khỏi kíp',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          setLoading(true);
          try {
            const res = await dutyService.leaderMarkAttendance(currentSlot.id, userId, customCoeff);
            if (res.success) {
              message.success(res.message || 'Đã gỡ điểm danh nhân sự bổ sung');
              await refreshCurrentSlot();
              onSuccess();
            }
          } catch (err: any) {
            message.error(err.response?.data?.message || 'Lỗi khi điểm danh');
          } finally {
            setLoading(false);
          }
        },
      });
      return;
    }

    setLoading(true);
    try {
      const res = await dutyService.leaderMarkAttendance(currentSlot.id, userId, customCoeff);
      if (res.success) {
        message.success(res.message || 'Cập nhật điểm danh thành công');
        await refreshCurrentSlot();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSupplementaryAttendance = async (userIds: number[], customCoeff: number) => {
    if (!currentSlot || userIds.length === 0) return;
    setLoading(true);
    try {
      let successCount = 0;
      for (const uId of userIds) {
        const res = await dutyService.leaderMarkAttendance(currentSlot.id, uId, customCoeff);
        if (res.success) successCount++;
      }
      if (successCount > 0) {
        message.success(`Đã thêm & điểm danh bổ sung ${successCount} nhân sự`);
        await refreshCurrentSlot();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi điểm danh bổ sung');
    } finally {
      setLoading(false);
    }
  };

  const handleReportViolation = async (values: any) => {
    if (!currentSlot || !violationUser) return;
    setLoading(true);
    try {
      const types = Array.isArray(values.types) ? values.types : (values.types ? [values.types] : []);
      if (types.length === 0) {
        message.warning('Vui lòng chọn ít nhất một loại lỗi');
        setLoading(false);
        return;
      }

      const res = await dutyService.reportViolation({
        slotId: currentSlot.id,
        userId: violationUser.id,
        types: types,
        note: values.note ?? ''
      });
      if (res.success) {
        message.success('Đã ghi nhận lỗi vi phạm');
        violationForm.resetFields();
        await refreshCurrentSlot();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi ghi nhận vi phạm');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingleViolation = async (violationId: number) => {
    if (!currentSlot || !violationUser) return;
    setLoading(true);
    try {
      const res = await dutyService.deleteViolation(currentSlot.id, violationUser.id, violationId);
      if (res.success) {
        message.success('Đã gỡ lỗi vi phạm');
        await refreshCurrentSlot();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi gỡ vi phạm');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllViolations = async () => {
    if (!currentSlot || !violationUser) return;
    Modal.confirm({
      title: 'Xác nhận gỡ tất cả lỗi vi phạm?',
      content: `Bạn có chắc chắn muốn xóa toàn bộ bản ghi lỗi của nhân sự "${getUserDisplayName(violationUser)}"?`,
      okText: 'Xóa tất cả',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await dutyService.deleteViolation(currentSlot.id, violationUser.id);
          if (res.success) {
            message.success('Đã gỡ toàn bộ vi phạm');
            setIsViolationModalOpen(false);
            violationForm.resetFields();
            await refreshCurrentSlot();
            onSuccess();
          }
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Lỗi khi gỡ vi phạm');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleMarkAllPresent = async () => {
    if (!currentSlot || allUsers.length === 0) return;
    const unAttended = allUsers.filter(u => !u.isAttended);
    if (unAttended.length === 0) {
      message.info('Tất cả nhân sự trong kíp đã được điểm danh có mặt.');
      return;
    }
    setLoading(true);
    try {
      let count = 0;
      for (const u of unAttended) {
        const res = await dutyService.leaderMarkAttendance(currentSlot.id, u.id, Number(currentSlot.coefficient || 1));
        if (res.success) count++;
      }
      message.success(`Đã đánh dấu có mặt cho ${count} nhân sự`);
      await refreshCurrentSlot();
      onSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi điểm danh tất cả');
    } finally {
      setLoading(false);
    }
  };

  const handleScanAbsentees = async () => {
    if (!currentSlot || allUsers.length === 0) return;
    const unAttendedAssigned = allUsers.filter(u => u.isAssigned && !u.isAttended);
    if (unAttendedAssigned.length === 0) {
      message.success('Tất cả nhân sự theo lịch đều đã điểm danh có mặt!');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận rà soát vắng mặt không phép',
      icon: <WarningOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div>
          <p>Phát hiện <b>{unAttendedAssigned.length} nhân sự</b> theo lịch nhưng chưa điểm danh có mặt:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#dc2626' }}>
            {unAttendedAssigned.map(u => (
              <li key={u.id}><b>{getUserDisplayName(u)}</b> (MSV: {u.studentId || 'Chưa có MSV'})</li>
            ))}
          </ul>
          <p style={{ fontSize: 12, color: '#64748b' }}>Hệ thống sẽ tự động ghi nhận lỗi <b>Vắng mặt không phép</b> cho các nhân sự trên.</p>
        </div>
      ),
      okText: 'Ghi nhận lỗi vắng mặt',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          let count = 0;
          for (const u of unAttendedAssigned) {
            const res = await dutyService.reportViolation({
              slotId: currentSlot.id,
              userId: u.id,
              types: ['absent_no_permission'],
              note: 'Rà soát vắng mặt không phép bởi Quản lý kíp'
            });
            if (res.success) count++;
          }
          message.success(`Đã ghi nhận vắng mặt cho ${count} nhân sự`);
          await refreshCurrentSlot();
          onSuccess();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Lỗi khi ghi nhận vắng mặt');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const attendedCount = allUsers.filter(u => u.isAttended).length;
  const currentViolationsOfUser = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(violationUser?.id)) || [];

  return (
    <Modal
      open={open}
      destroyOnHidden
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      title={
        <div className="duty-modal-header-row">
          <Space size={12}>
            <div className="duty-modal-header-icon-box">
              <CheckCircleOutlined style={{ fontSize: 22 }} />
            </div>
            <div>
              <Title level={4} className="duty-modal-header-text">Quản lý kíp trực & Điểm danh</Title>
              <Text type="secondary" className="duty-modal-header-hint">
                <CalendarOutlined style={{ marginRight: 4 }} />
                {currentSlot ? dayjs(currentSlot.shiftDate).format('dddd, DD/MM/YYYY') : ''} • {currentSlot?.startTime} - {currentSlot?.endTime}
              </Text>
            </div>
          </Space>
          <Tag color="indigo" style={{ borderRadius: 12, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
            {attendedCount}/{allUsers.length} có mặt
          </Tag>
        </div>
      }
    >
      <Divider style={{ margin: '16px 0' }} />

      {/* Batch Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <Space size={8}>
          <Button
            variant="success"
            buttonSize="small"
            icon={<CheckCircleOutlined />}
            loading={loading}
            onClick={handleMarkAllPresent}
          >
            Tất cả có mặt
          </Button>
          <Button
            variant="danger"
            buttonSize="small"
            icon={<WarningOutlined />}
            loading={loading}
            onClick={handleScanAbsentees}
          >
            Rà soát vắng & Ghi lỗi
          </Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Quản lý kíp: {allUsers.filter(u => u.isAttended).length}/{allUsers.length} có mặt
        </Text>
      </div>

      {/* Add supplementary user */}
      <div className="duty-slot-info-box">
        <div className="duty-slot-info-label">
          <UsergroupAddOutlined style={{ color: '#6366f1' }} />
          <span>Thêm nhân sự trực bổ sung ngoài lịch</span>
        </div>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={15}>
            <DutyPersonnelPicker
              variant="outline"
              buttonSize="medium"
              label="Chọn nhân sự điểm danh bổ sung (Thành viên & CTV)"
              icon={<UsergroupAddOutlined />}
              style={{ width: '100%' }}
              onChange={(ids) => {
                if (ids && ids.length > 0) {
                  handleBatchSupplementaryAttendance(ids, suppCoeff);
                }
              }}
            />
          </Col>
          <Col xs={24} sm={9}>
            <Tooltip title="Hệ số kíp được tính cho nhân sự bổ sung">
              <InputNumber
                min={0}
                max={10}
                step={0.25}
                value={suppCoeff}
                onChange={(val) => setSuppCoeff(val ?? 1)}
                addonAfter="kíp tính"
                style={{ width: '100%' }}
              />
            </Tooltip>
          </Col>
        </Row>
      </div>

      {/* User list */}
      <div className="duty-slot-modal-container">
        <div className="duty-slot-attendee-list">
          {allUsers.length === 0 ? (
            <Empty description="Không có nhân sự nào trong kíp trực này" style={{ padding: '32px 0' }} />
          ) : (
            allUsers.map((u: any) => {
              const isAttended = u.isAttended;
              const isAssigned = u.isAssigned;
              const userViolations = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(u.id)) || [];
              const defaultSlotCoeff = Number(currentSlot?.coefficient ?? 1);
              const overrideVal = overrides[String(u.id)] ?? overrides[Number(u.id)];
              const userCoeff = overrideVal !== undefined && overrideVal !== null ? overrideVal : defaultSlotCoeff;
              const isOverridden = overrideVal !== undefined && overrideVal !== null && overrideVal !== defaultSlotCoeff;
              const defaultLeaderId = (currentSlot?.assignedUserIds && currentSlot.assignedUserIds.length > 0)
                ? currentSlot.assignedUserIds[0]
                : (currentSlot?.assignedUsers && currentSlot.assignedUsers.length > 0)
                  ? currentSlot.assignedUsers[0].id
                  : null;
              const activeLeaderId = currentSlot?.tempLeaderId || defaultLeaderId;
              const isLeader = !!activeLeaderId && String(activeLeaderId) === String(u.id);
              const isMe = String(u.id) === String(currentUserId);

              const popoverViolationList = (
                <div className="duty-popover-violation-list" onClick={(e) => e.stopPropagation()}>
                  <div className="duty-popover-title">
                    Tất cả lỗi vi phạm ({userViolations.length}):
                  </div>
                  <div className="duty-popover-items-col">
                    {userViolations.map((v: any) => (
                      <div key={v.id} className="duty-popover-violation-item">
                        <div className="duty-popover-item-row">
                          <span className="popover-item-name">
                            {getViolationTypeLabel(v.type, violationTypeOptions)} (x{v.coefficient})
                          </span>
                          {v.createdAt && (
                            <span className="popover-item-time">
                              {dayjs(v.createdAt).format('HH:mm DD/MM')}
                            </span>
                          )}
                        </div>
                        {v.note && <div className="duty-popover-item-note"><FileTextOutlined style={{ marginRight: 4, fontSize: 11 }} />{v.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );

              const cardNode = (
                <div 
                  key={u.id}
                  className={`duty-slot-attendee-card ${isAttended ? 'is-attended' : ''}`}
                >
                  <div className="duty-slot-attendee-left">
                    {/* 1. Identity Box: Avatar + Name + MSV */}
                    <div className="duty-attendee-identity-box">
                      <Avatar 
                        src={u.avatar} 
                        icon={<UserOutlined />} 
                        size={40} 
                        className={`duty-attendee-avatar ${isAttended ? 'is-attended' : ''}`}
                      />
                      <div className="duty-attendee-identity-text">
                        <Tooltip title={getUserDisplayName(u)} placement="topLeft">
                          <div className="duty-attendee-name">
                            {getUserDisplayName(u)}
                          </div>
                        </Tooltip>
                        <div className="duty-attendee-msv">
                          MSV: {u.studentId || 'Chưa cập nhật'}
                        </div>
                      </div>
                    </div>

                    {/* 2. Middle Box: Tags & Violations */}
                    <div className="duty-attendee-middle-box">
                      <div className="duty-attendee-tags-row">
                        {getPositionTag(u.position)}
                        {isAssigned ? (
                          <Tag color="blue" className="duty-badge-tag">
                            Theo lịch
                          </Tag>
                        ) : (
                          <Tag color="purple" className="duty-badge-tag is-leader">
                            BỔ SUNG
                          </Tag>
                        )}
                        {isOverridden && (
                          <Tag color="gold" className="duty-badge-tag">
                            {userCoeff} kíp
                          </Tag>
                        )}
                      </div>

                      {userViolations.length > 0 && (
                        <div className="duty-attendee-violations-row">
                          {userViolations.length <= 2 ? (
                            userViolations.map((v: any) => (
                              <Tooltip
                                key={v.id}
                                title={
                                  <div>
                                    <div className="duty-tooltip-title">{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
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
                                  {getViolationTypeLabel(v.type, violationTypeOptions)} (x{v.coefficient})
                                </Tag>
                              </Tooltip>
                            ))
                          ) : (
                            <>
                              <Tooltip
                                key={userViolations[0].id}
                                title={
                                  <div>
                                    <div className="duty-tooltip-title">{getViolationTypeLabel(userViolations[0].type, violationTypeOptions)} (Hệ số: x{userViolations[0].coefficient})</div>
                                    {userViolations[0].note ? (
                                      <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Ghi chú:</b> {userViolations[0].note}</div>
                                    ) : (
                                      <div className="duty-tooltip-note-empty">Không có ghi chú thêm</div>
                                    )}
                                    {userViolations[0].createdAt && (
                                      <div className="duty-tooltip-time">
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(userViolations[0].createdAt).format('DD/MM/YYYY HH:mm')}
                                      </div>
                                    )}
                                  </div>
                                }
                              >
                                <Tag color="error" className="duty-badge-tag">
                                  {getViolationTypeLabel(userViolations[0].type, violationTypeOptions)} (x{userViolations[0].coefficient})
                                </Tag>
                              </Tooltip>
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
                                  +{userViolations.length - 1} khác
                                </Tag>
                              </Popover>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="duty-slot-attendee-right">
                    <div className="duty-attendee-coeff">
                      <Tooltip title={isAttended ? "Hệ số kíp thực tế tính cho nhân sự này" : "Nhân sự chưa điểm danh — hệ số chưa có hiệu lực"}>
                        <InputNumber
                          size="small"
                          min={0}
                          max={10}
                          step={0.25}
                          value={userCoeff}
                          addonAfter="kíp"
                          disabled={!isAttended}
                          className={isAttended && isOverridden ? 'duty-coeff-overridden' : ''}
                          onChange={(val) => {
                            const next = { ...overrides };
                            if (val === null || val === undefined || Number(val) === Number(defaultSlotCoeff)) {
                              delete next[String(u.id)];
                              delete next[Number(u.id)];
                            } else {
                              next[String(u.id)] = val;
                            }
                            setOverrides(next);
                          }}
                          onBlur={() => {
                            if (currentSlot) {
                              const next = { ...overrides };
                              const val = userCoeff;
                              if (val === null || val === undefined || Number(val) === Number(defaultSlotCoeff)) {
                                delete next[String(u.id)];
                                delete next[Number(u.id)];
                              } else {
                                next[String(u.id)] = val;
                              }
                              dutyService.updateSlot(currentSlot.id, { attendanceOverrides: next });
                            }
                          }}
                        />
                      </Tooltip>
                    </div>

                    <div className="duty-attendee-status">
                      <span className={`status-text ${isAttended ? 'is-attended' : 'is-not-attended'}`}>
                        {isAttended ? 'ĐÃ CÓ MẶT' : 'CHƯA ĐIỂM DANH'}
                      </span>
                      <div className="status-tags">
                        {isOverridden && isAttended && <Tag color="gold" className="duty-status-tag-mini">TÙY CHỈNH</Tag>}
                        {!isAssigned && <Tag color="purple" className="duty-status-tag-mini">BỔ SUNG</Tag>}
                      </div>
                    </div>

                    <div className="duty-attendee-action">
                      <Tooltip title={userViolations.length > 0 ? `Xem / Thêm lỗi (${userViolations.length})` : "Ghi lỗi vi phạm"}>
                        <AntButton 
                          type="text"
                          size="small" 
                          shape="circle" 
                          className={`duty-warning-btn ${userViolations.length > 0 ? 'has-violations' : ''}`}
                          icon={<WarningOutlined style={{ fontSize: 18 }} />} 
                          onClick={() => {
                            setViolationUser(u);
                            violationForm.resetFields();
                            setIsViolationModalOpen(true);
                          }} 
                        />
                      </Tooltip>
                    </div>

                    <div className="duty-attendee-action">
                      <Tooltip title={isAttended ? "Đã điểm danh" : "Bấm để điểm danh"}>
                        <div 
                          onClick={() => markAttendance(u.id, userCoeff)}
                          className={`duty-check-circle ${isAttended ? 'is-checked' : ''}`}
                          style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                          <CheckCircleOutlined style={{ color: isAttended ? '#fff' : '#cbd5e1', fontSize: 16 }} />
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );

              if (isLeader) {
                return (
                  <Badge.Ribbon 
                    key={u.id} 
                    text={isMe ? "Qlk • Bạn" : "Qlk"} 
                    color="red" 
                    placement="start"
                  >
                    {cardNode}
                  </Badge.Ribbon>
                );
              }

              return cardNode;
            })
          )}
        </div>
      </div>

      <div className="duty-done-row">
        <Button variant="primary" onClick={onCancel} style={{ padding: '0 32px' }}>Hoàn tất điểm danh</Button>
      </div>

      {/* Violation Modal */}
      <FormModal
        open={isViolationModalOpen}
        form={violationForm}
        title={
          <Space>
            <WarningOutlined style={{ color: '#ef4444' }} />
            <span>Ghi nhận lỗi vi phạm: {getUserDisplayName(violationUser)}</span>
          </Space>
        }
        onCancel={() => setIsViolationModalOpen(false)}
        onOk={handleReportViolation}
        okText="Ghi nhận lỗi"
        width={480}
      >
        <div className="duty-violation-modal-user-header" style={{ textAlign: 'center', marginBottom: 20 }}>
          <Avatar size={64} src={violationUser?.avatar} icon={<UserOutlined />} />
          <Title level={5} style={{ marginTop: 10, marginBottom: 2 }}>
            {getUserDisplayName(violationUser)}
          </Title>
          {violationUser?.studentId && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
              MSV: {violationUser.studentId}
            </div>
          )}
          {violationUser?.email && (
            <Text type="secondary" style={{ fontSize: 12 }}>{violationUser.email}</Text>
          )}
        </div>

        <Form.Item name="types" label="Chọn một hoặc nhiều loại lỗi vi phạm" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một loại lỗi' }]}>
          <Select 
            mode="multiple" 
            placeholder="Chọn một hoặc nhiều loại lỗi vi phạm..." 
            options={violationTypeOptions}
            allowClear
          />
        </Form.Item>

        <Form.Item 
          noStyle 
          shouldUpdate={(prev, curr) => prev.types !== curr.types}
        >
          {({ getFieldValue }) => {
            const selectedKeys: string[] = getFieldValue('types') || [];
            const selectedOpts = selectedKeys.map(k => violationTypeOptions.find(o => (o.value || o.key) === k)).filter(Boolean);
            const totalEstimatedPenalty = selectedOpts.reduce((acc, opt) => acc + ((Number(opt?.defaultPenalty) || 0) * (Number(opt?.defaultCoeff) || 1)), 0);

            if (selectedOpts.length === 0) return null;

            return (
              <div className="duty-violation-preview-box">
                <div className="preview-header">
                  <Text strong className="preview-header-label">
                    Đã chọn {selectedOpts.length} loại lỗi:
                  </Text>
                  {totalEstimatedPenalty > 0 && (
                    <Tag color="red" style={{ fontSize: 12, fontWeight: 700, margin: 0, padding: '2px 8px' }}>
                      Tổng phạt dự kiến: -{totalEstimatedPenalty.toLocaleString('vi-VN')}đ
                    </Tag>
                  )}
                </div>
                <div className="preview-list">
                  {selectedOpts.map(opt => {
                    const coeff = Number(opt.defaultCoeff) || 1;
                    const penalty = (Number(opt.defaultPenalty) || 0) * coeff;
                    return (
                      <div key={opt.value || opt.key} className="preview-item">
                        <Space size={6}>
                          <span>{opt.rawLabel || opt.label}</span>
                          <Tag color="default" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '14px' }}>
                            Hệ số: x{coeff}
                          </Tag>
                        </Space>
                        <span className={`preview-item-penalty ${penalty > 0 ? 'has-penalty' : 'no-penalty'}`}>
                          {penalty > 0 ? `-${penalty.toLocaleString('vi-VN')}đ` : 'Theo quy định'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        </Form.Item>
        <Form.Item name="note" label="Ghi chú chi tiết">
          <Input.TextArea placeholder="Nhập chi tiết lỗi (nếu có)..." rows={2} />
        </Form.Item>

        {currentViolationsOfUser.length > 0 && (
          <div className="duty-recorded-violations">
            <div className="recorded-violations-header">
              <Typography.Text strong className="recorded-violations-label">
                Các lỗi đã ghi nhận ({currentViolationsOfUser.length}):
              </Typography.Text>
              <AntButton danger type="link" size="small" onClick={handleDeleteAllViolations}>
                Xóa tất cả lỗi
              </AntButton>
            </div>
            <div className="recorded-violations-list">
              {currentViolationsOfUser.map((v: any) => (
                <Tooltip
                  key={v.id}
                  title={
                    <div>
                      <div className="duty-tooltip-title">{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
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
                  <div className="recorded-violation-item">
                    <div className="recorded-violation-info">
                      <div className="recorded-violation-name-row">
                        <span className="recorded-violation-name">
                          {getViolationTypeLabel(v.type, violationTypeOptions)}
                        </span>
                        <Tag color="red" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '14px' }}>
                          x{v.coefficient}
                        </Tag>
                      </div>
                      {v.note && (
                        <div className="recorded-violation-note">
                          📝 {v.note}
                        </div>
                      )}
                    </div>
                    <Popconfirm
                      title="Xác nhận xóa lỗi này?"
                      onConfirm={() => handleDeleteSingleViolation(v.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <AntButton type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </FormModal>
    </Modal>
  );
};

export default ShiftLeaderAttendanceModal;
