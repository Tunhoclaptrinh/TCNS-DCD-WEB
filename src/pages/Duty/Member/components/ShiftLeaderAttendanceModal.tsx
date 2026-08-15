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
  Popconfirm
} from 'antd';
import { 
  CheckCircleOutlined, 
  UsergroupAddOutlined, 
  WarningOutlined, 
  CalendarOutlined,
  UserOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';
import { getUserDisplayName } from '@/utils/formatters';
import UserSelect from '@/pages/Users/components/UserSelect';
import { Button } from '@/components/common';
import FormModal from '@/components/common/FormModal';
import { VIOLATION_TYPE_OPTIONS, getViolationTypeLabel } from '@/pages/Duty/Admin/components/AdminDutySlotModal';

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
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
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
              setSelectedUser(null);
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
        setSelectedUser(null);
        await refreshCurrentSlot();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi điểm danh');
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <Space size={12}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 10, 
              background: '#e0e7ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#4f46e5'
            }}>
              <CheckCircleOutlined style={{ fontSize: 22 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: '1.15rem' }}>Quản lý kíp trực & Điểm danh</Title>
              <Text type="secondary" style={{ fontSize: '0.8rem' }}>
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

      {/* Add supplementary user */}
      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 20, border: '1px dashed #cbd5e1' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <UsergroupAddOutlined style={{ color: '#6366f1' }} />
          <span>Thêm nhân sự trực bổ sung ngoài lịch</span>
        </div>
        <Row gutter={8} align="middle">
          <Col flex="auto">
            <UserSelect
              value={selectedUser}
              onChange={(val: any) => setSelectedUser(val)}
              placeholder="Tìm kiếm nhân sự bổ sung (theo tên, MSV)..."
            />
          </Col>
          <Col flex="100px">
            <Tooltip title="Hệ số kíp được tính cho nhân sự này">
              <InputNumber
                min={0}
                max={10}
                step={0.25}
                value={suppCoeff}
                onChange={(val) => setSuppCoeff(val ?? 1)}
                addonAfter="kíp"
                style={{ width: '100%' }}
              />
            </Tooltip>
          </Col>
          <Col>
            <Button
              variant="primary"
              disabled={!selectedUser}
              loading={loading}
              onClick={() => {
                if (selectedUser) {
                  markAttendance(selectedUser, suppCoeff);
                }
              }}
            >
              Thêm & Điểm danh
            </Button>
          </Col>
        </Row>
      </div>

      {/* User list */}
      <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: 4 }}>
        {allUsers.length === 0 ? (
          <Empty description="Không có nhân sự nào trong kíp trực này" style={{ padding: '32px 0' }} />
        ) : (
          <Row gutter={[12, 12]}>
            {allUsers.map((u: any) => {
              const isAttended = u.isAttended;
              const isAssigned = u.isAssigned;
              const userViolations = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(u.id)) || [];
              const defaultSlotCoeff = Number(currentSlot?.coefficient ?? 1);
              const overrideVal = overrides[String(u.id)] ?? overrides[Number(u.id)];
              const userCoeff = overrideVal !== undefined && overrideVal !== null ? overrideVal : defaultSlotCoeff;
              const isOverridden = overrideVal !== undefined && overrideVal !== null && overrideVal !== defaultSlotCoeff;

              return (
                <Col span={24} key={u.id}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isAttended ? '#f0fdf4' : '#fff',
                    border: `1px solid ${isAttended ? '#86efac' : '#e2e8f0'}`,
                    transition: 'all 0.2s',
                    boxShadow: isAttended ? '0 1px 3px rgba(34, 197, 94, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Space size={12}>
                      <Avatar 
                        src={u.avatar} 
                        icon={<UserOutlined />} 
                        size={42} 
                        style={{ border: isAttended ? '2px solid #22c55e' : '2px solid #cbd5e1' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: '0.95rem' }}>{getUserDisplayName(u)}</Text>
                          {getPositionTag(u.position)}
                          {!isAssigned && (
                            <Tag color="purple" style={{ fontSize: '10px', margin: 0, fontWeight: 600 }}>
                              BỔ SUNG
                            </Tag>
                          )}
                          {isOverridden && (
                            <Tag color="gold" style={{ fontSize: '10px', margin: 0 }}>
                              {userCoeff} kíp
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>MSV: {u.studentId || 'Chưa cập nhật'}</span>
                          {userViolations.map((v: any) => (
                            <Tooltip
                              key={v.id}
                              title={
                                <div>
                                  <div style={{ fontWeight: 600 }}>{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
                                  {v.note ? (
                                    <div style={{ marginTop: 2 }}>📝 <b>Ghi chú:</b> {v.note}</div>
                                  ) : (
                                    <div style={{ marginTop: 2, color: '#cbd5e1' }}>Không có ghi chú thêm</div>
                                  )}
                                  {v.createdAt && (
                                    <div style={{ marginTop: 2, fontSize: 10, color: '#94a3b8' }}>
                                      🕒 {dayjs(v.createdAt).format('DD/MM/YYYY HH:mm')}
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <Tag
                                color="error"
                                style={{ fontSize: '10px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                              >
                                {getViolationTypeLabel(v.type, violationTypeOptions)} (x{v.coefficient})
                              </Tag>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </Space>

                    <Space size={8}>
                      <Tooltip title="Chỉnh sửa số kíp được tính riêng cho nhân sự này">
                        <InputNumber
                          size="small"
                          min={0}
                          max={10}
                          step={0.25}
                          value={userCoeff}
                          addonAfter="kíp"
                          style={{
                            width: 90,
                            borderRadius: 6,
                            borderColor: isOverridden ? '#f59e0b' : '#cbd5e1',
                            backgroundColor: isOverridden ? '#fffbeb' : '#fff'
                          }}
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

                      <Tooltip title={isAttended ? "Đã điểm danh" : "Bấm để điểm danh"}>
                        <div 
                          onClick={() => markAttendance(u.id, userCoeff)}
                          style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: isAttended ? '#10b981' : '#fff',
                            border: `2px solid ${isAttended ? '#10b981' : '#e2e8f0'}`,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isAttended ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
                          }}
                        >
                          <CheckCircleOutlined style={{ color: isAttended ? '#fff' : '#e2e8f0', fontSize: 18 }} />
                        </div>
                      </Tooltip>

                      <AntButton 
                        icon={<WarningOutlined />} 
                        danger 
                        type={userViolations.length > 0 ? "primary" : "text"}
                        style={userViolations.length > 0 ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                        onClick={() => {
                          setViolationUser(u);
                          violationForm.resetFields();
                          violationForm.setFieldsValue({ coefficient: 1, types: [] });
                          setIsViolationModalOpen(true);
                        }}
                      >
                        {userViolations.length > 0 ? `Lỗi (${userViolations.length})` : 'Báo lỗi'}
                      </AntButton>
                    </Space>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      <div style={{ marginTop: 32, textAlign: 'right' }}>
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
              <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13, color: '#334155' }}>
                    Đã chọn {selectedOpts.length} loại lỗi:
                  </Text>
                  {totalEstimatedPenalty > 0 && (
                    <Tag color="red" style={{ fontSize: 12, fontWeight: 700, margin: 0, padding: '2px 8px' }}>
                      Tổng phạt dự kiến: -{totalEstimatedPenalty.toLocaleString('vi-VN')}đ
                    </Tag>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedOpts.map(opt => {
                    const coeff = Number(opt.defaultCoeff) || 1;
                    const penalty = (Number(opt.defaultPenalty) || 0) * coeff;
                    return (
                      <div 
                        key={opt.value || opt.key} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', background: '#fff', borderRadius: 6, border: '1px solid #f1f5f9' }}
                      >
                        <Space size={6}>
                          <span>{opt.rawLabel || opt.label}</span>
                          <Tag color="default" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '14px' }}>
                            Hệ số: x{coeff}
                          </Tag>
                        </Space>
                        <span style={{ fontWeight: 600, color: penalty > 0 ? '#ef4444' : '#64748b' }}>
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
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text strong style={{ fontSize: 13, color: '#ef4444' }}>
                Các lỗi đã ghi nhận ({currentViolationsOfUser.length}):
              </Typography.Text>
              <AntButton danger type="link" size="small" onClick={handleDeleteAllViolations}>
                Xóa tất cả lỗi
              </AntButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {currentViolationsOfUser.map((v: any) => (
                <Tooltip
                  key={v.id}
                  title={
                    <div>
                      <div style={{ fontWeight: 600 }}>{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
                      {v.note ? (
                        <div style={{ marginTop: 2 }}>📝 <b>Ghi chú:</b> {v.note}</div>
                      ) : (
                        <div style={{ marginTop: 2, color: '#cbd5e1' }}>Không có ghi chú thêm</div>
                      )}
                      {v.createdAt && (
                        <div style={{ marginTop: 2, fontSize: 10, color: '#94a3b8' }}>
                          🕒 {dayjs(v.createdAt).format('DD/MM/YYYY HH:mm')}
                        </div>
                      )}
                    </div>
                  }
                >
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: '#fef2f2',
                      borderRadius: 6,
                      border: '1px solid #fee2e2',
                      cursor: 'help'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: '#991b1b' }}>
                          {getViolationTypeLabel(v.type, violationTypeOptions)}
                        </span>
                        <Tag color="red" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '14px' }}>
                          x{v.coefficient}
                        </Tag>
                      </div>
                      {v.note && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
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
