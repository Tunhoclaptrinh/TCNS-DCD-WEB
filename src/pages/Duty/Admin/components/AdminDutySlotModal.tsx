import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button as AntButton,
  Space,
  Divider,
  Typography,
  Input,
  InputNumber,
  DatePicker,
  TimePicker,
  Form,
  message,
  Select,
  Tag,
  Avatar,
  Alert,
  Col,
  Tooltip,
  Row,
  Badge,
  Popconfirm,
  Popover,
} from 'antd';
import Button from '@/components/common/Button';
import {
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UnlockOutlined,
  LockOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  CloseOutlined,
  DeleteOutlined,
  SaveOutlined,
  WarningOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import DutyPersonnelPicker from '../../components/DutyPersonnelTable';
import { getAttendanceState, ATTENDANCE_STATE_CONFIG } from '../../components/AttendanceStatusTag';
import SlotStructureEditor from './SlotStructureEditor';
import SlotRequestsHistoryModal from '@/pages/Duty/Member/components/SlotRequestsHistoryModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { POSITION_LABELS } from '@/constants/user.constants';

import '../../DutyModal.less';

const { Text, Title } = Typography;

export const DEFAULT_VIOLATION_TYPES = [
  { key: 'absent_no_permission', label: 'Vắng mặt không phép', defaultPenalty: 50000, defaultCoeff: 1, description: 'Không có mặt tại kíp trực và không có đơn xin phép' },
  { key: 'late', label: 'Đi muộn', defaultPenalty: 10000, defaultCoeff: 1, description: 'Có mặt muộn sau giờ bắt đầu ca trực quy định' },
  { key: 'absent_with_permission_late', label: 'Báo muộn', defaultPenalty: 20000, defaultCoeff: 1, description: 'Xin nghỉ hoặc báo vắng sau hạn quy định' },
  { key: 'wrong_uniform', label: 'Sai tác phong / trang phục', defaultPenalty: 10000, defaultCoeff: 1, description: 'Không mặc đồng phục hoặc vi phạm tác phong' },
  { key: 'other', label: 'Khác (Ghi chú chi tiết)', defaultPenalty: 0, defaultCoeff: 1, description: 'Các vi phạm phát sinh khác ghi nhận theo ca' },
];

export const VIOLATION_TYPE_OPTIONS = DEFAULT_VIOLATION_TYPES.map(vt => ({
  value: vt.key,
  label: `${vt.label}${vt.defaultPenalty ? ` (${Number(vt.defaultPenalty).toLocaleString('vi-VN')}đ)` : ''}`,
  rawLabel: vt.label,
  defaultPenalty: vt.defaultPenalty,
  defaultCoeff: vt.defaultCoeff,
}));

export const getViolationTypeLabel = (type: string, customTypes: any[] = []) => {
  const custom = customTypes.find(ct => (ct.key || ct.value) === type);
  if (custom) return custom.rawLabel || custom.label;

  const map: Record<string, string> = {
    'absent_no_permission': 'Vắng mặt không phép',
    'late': 'Đi muộn',
    'absent_with_permission_late': 'Báo muộn',
    'wrong_uniform': 'Sai tác phong',
    'other': 'Lỗi khác',
  };
  return map[type] || type || 'Vi phạm';
};

export const getUserDisplayName = (u: any) => {
  if (!u) return 'Chưa rõ';
  if (u.lastName || u.firstName) {
    return `${u.lastName || ''} ${u.firstName || ''}`.trim();
  }
  return u.name || u.username || `#${u.id || ''}`;
};

export const getPositionInfo = (posCode: string, positionConfigs: any[] = []) => {
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

  const foundCfg = (positionConfigs || []).find((p: any) => p.id === posCode);
  if (foundCfg && foundCfg.name) {
    return { name: foundCfg.name, color: 'purple' };
  }

  return { name: POSITION_LABELS[posCode] || posCode || 'Thành viên', color: 'cyan' };
};

interface AdminDutySlotModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  templates: DutyShift[];
  loading?: boolean;
  /** Callback để mở lại modal Ca cha */
  onOpenCa?: (slot: DutySlot) => void;
}

const AdminDutySlotModal: React.FC<AdminDutySlotModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  templates,
  loading: externalLoading = false,
  onOpenCa,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedUsersCache, setSelectedUsersCache] = useState<any[]>([]);
  const [currentSlot, setCurrentSlot] = useState<DutySlot | null>(slot);
  const [violationTypeOptions, setViolationTypeOptions] = useState<any[]>(VIOLATION_TYPE_OPTIONS);

  // Violation Management
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [violationUser, setViolationUser] = useState<any>(null);
  const [violationForm] = Form.useForm();
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);

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

  const updateCache = (rows: any[]) => {
    setSelectedUsersCache(prev => {
      const map = new Map(prev.filter(r => r && r.id).map(r => [r.id, r]));
      (rows || []).filter(r => r && r.id).forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
  };

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentSlot(null);
    } else if (open && slot) {
      form.resetFields();
      setCurrentSlot(slot);
    }
  }, [open, slot, form]);

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
    if (open && currentSlot) {
      form.resetFields();
      const structure = currentSlot.slotStructure || (currentSlot as any).kip?.slotStructure || (currentSlot as any).shift?.slotStructure || [];
      const structureTotal = Array.isArray(structure) ? structure.reduce((acc: number, c: any) => acc + (Number(c?.slots) || 0), 0) : 0;
      const initialCapacity = Math.max(
        Number(currentSlot.capacity ?? (currentSlot as any).kip?.capacity ?? 1),
        structureTotal,
        (currentSlot.assignedUserIds || []).length
      );

      form.setFieldsValue({
        ...currentSlot,
        capacity: initialCapacity,
        coefficient: Number(currentSlot.coefficient ?? (currentSlot as any).kip?.coefficient ?? (currentSlot as any).shift?.coefficient ?? 1),
        shiftDate: dayjs(currentSlot.shiftDate),
        timeRange:
          currentSlot.startTime && currentSlot.endTime
            ? [dayjs(currentSlot.startTime, 'HH:mm'), dayjs(currentSlot.endTime, 'HH:mm')]
            : undefined,
        status: currentSlot.status || 'open',
        visibilityMode: currentSlot.config?.visibilityMode || 'public',
        privacyMaskType: currentSlot.config?.privacyMaskType || 'masked',
        assignedUserIds: currentSlot.assignedUserIds || [],
        attendedUserIds: currentSlot.attendedUserIds || [],
        slotStructure: currentSlot.slotStructure || (currentSlot as any).kip?.slotStructure || (currentSlot as any).shift?.slotStructure || [],
        attendanceOverrides: currentSlot.attendanceOverrides ? { ...currentSlot.attendanceOverrides } : {},
      });
      if (currentSlot.assignedUsers) updateCache(currentSlot.assignedUsers);
    }
  }, [open, currentSlot, form]);

  // Auto-increase capacity when assignedUserIds change
  const assignedIds = Form.useWatch('assignedUserIds', form);
  const visibilityMode = Form.useWatch('visibilityMode', form);
  const isPrivacyEnabled = visibilityMode && visibilityMode !== 'public';
  useEffect(() => {
    if (assignedIds && Array.isArray(assignedIds) && assignedIds.length > 0) {
      const currentCapacity = form.getFieldValue('capacity') || 0;
      if (assignedIds.length > currentCapacity) {
        form.setFieldsValue({ capacity: assignedIds.length });
      }
    }
  }, [assignedIds, form]);

  const handleSubmit = async (values: any) => {
    if (!currentSlot) return;
    setLoading(true);
    try {
      const allFormValues = form.getFieldsValue(true);
      const targetDateStr = values.shiftDate.format('YYYY-MM-DD');
      const payload = {
        ...allFormValues,
        ...values,
        assignedUserIds: allFormValues.assignedUserIds || [],
        attendedUserIds: allFormValues.attendedUserIds || [],
        attendanceOverrides: allFormValues.attendanceOverrides || {},
        slotStructure: allFormValues.slotStructure || [],
        shiftDate: targetDateStr,
        startTime: values.timeRange?.[0]?.format('HH:mm'),
        endTime: values.timeRange?.[1]?.format('HH:mm'),
        config: { 
          ...currentSlot.config, 
          visibilityMode: values.visibilityMode,
          privacyMaskType: values.privacyMaskType 
        },
      };

      const res = await dutyService.updateSlot(currentSlot.id, payload);
      if (res.success) {
        message.success('Cập nhật kíp trực thành công. Thông báo đã được gửi đến các thành viên.');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      message.error('Lỗi khi cập nhật: ' + (err.response?.data?.message || err.message));
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
        message.success(`Đã ghi nhận lỗi cho ${violationUser.name || violationUser.fullName || 'nhân sự'}`);
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
        message.success('Đã gỡ lỗi vi phạm thành công');
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
      title: 'Xác nhận gỡ tất cả vi phạm?',
      content: `Bạn có chắc chắn muốn xóa toàn bộ bản ghi vi phạm của "${violationUser.lastName || violationUser.firstName ? `${violationUser.lastName || ''} ${violationUser.firstName || ''}`.trim() : violationUser.name || 'nhân sự này'}"? Khoản phạt liên kết trong hệ thống cũng sẽ được tự động xóa.`,
      okText: 'Xóa tất cả',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await dutyService.deleteViolation(currentSlot.id, violationUser.id);
          if (res.success) {
            message.success('Đã gỡ toàn bộ vi phạm thành công');
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

  const handleRemoveSupplementary = (userId: number) => {
    const currentAttended = form.getFieldValue('attendedUserIds') || [];
    const nextAttended = currentAttended.filter((uId: number) => uId !== userId);
    const currentOverrides = { ...(form.getFieldValue('attendanceOverrides') || {}) };
    delete currentOverrides[String(userId)];
    delete currentOverrides[Number(userId)];
    form.setFieldsValue({
      attendedUserIds: nextAttended,
      attendanceOverrides: currentOverrides,
    });
  };

  const handleToggleAttendance = (userId: number, checked: boolean) => {
    const currentAttended = form.getFieldValue('attendedUserIds') || [];
    const nextAttended = checked
      ? [...new Set([...currentAttended, userId])]
      : currentAttended.filter((id: number) => id !== userId);
    form.setFieldsValue({ attendedUserIds: nextAttended });
  };

  // Tìm Ca bản mẫu để hiển thị context từ dữ liệu thật trong cơ sở dữ liệu
  const parentShift = React.useMemo(() => {
    if (!slot) return null;
    if ((slot as any).shift) return (slot as any).shift;
    if (slot.shiftId && Array.isArray(templates)) {
      const found = templates.find((s: any) => String(s.id) === String(slot.shiftId));
      if (found) return found;
    }
    return null;
  }, [slot, templates]);
  const isSpecial = !!parentShift?.isSpecialEvent;

  const handleDeleteKip = () => {
    if (!slot?.kipId) return;
    Modal.confirm({
      title: 'Xác nhận xóa Kíp?',
      content: 'Toàn bộ dữ liệu của kíp này (bao gồm phân công, điểm danh) sẽ bị xóa. Bạn có chắc chắn?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await dutyService.deleteActualKip(slot.kipId!);
          if (res.success) {
            message.success('Đã xóa kíp thành công');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Lỗi khi xóa kíp');
        }
      },
    });
  };

  const handleScanAbsentees = () => {
    if (!currentSlot) return;
    const assignedIds = form.getFieldValue('assignedUserIds') || [];
    const attendedIds = form.getFieldValue('attendedUserIds') || [];

    // Identify absentees
    const absentees = assignedIds.filter((id: number) => !attendedIds.includes(id));
    
    // Filter out those with approved leave
    const unexcusedAbsentees = absentees.filter((id: number) => {
      const hasApprovedLeave = currentSlot.leaveRequests?.some(r => String(r.userId) === String(id) && r.status === 'approved');
      const hasApprovedSwap = currentSlot.swapRequests?.some(r => String(r.fromSlotId) === String(currentSlot.id) && String(r.userId) === String(id) && r.status === 'approved');
      const alreadyHasViolation = currentSlot.violations?.some(v => String(v.userId) === String(id));
      return !hasApprovedLeave && !hasApprovedSwap && !alreadyHasViolation;
    });

    if (unexcusedAbsentees.length === 0) {
      message.info('Không tìm thấy trường hợp vắng mặt không phép mới nào.');
      return;
    }

    Modal.confirm({
      title: `Phát hiện ${unexcusedAbsentees.length} trường hợp vắng mặt`,
      content: `Hệ thống ghi nhận ${unexcusedAbsentees.length} nhân sự vắng mặt không lý do. Bạn có muốn ghi lỗi "Vắng mặt không phép" (Hệ số 1) cho những người này không?`,
      okText: 'Ghi lỗi hàng loạt',
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(unexcusedAbsentees.map((id: number) => 
            dutyService.reportViolation({
              slotId: currentSlot.id,
              userId: id,
              type: 'absent_no_permission',
              coefficient: 1,
              note: 'Hệ thống tự động ghi nhận vắng mặt'
            })
          ));
          message.success(`Đã ghi lỗi cho ${unexcusedAbsentees.length} nhân sự.`);
          await refreshCurrentSlot();
          onSuccess();
        } catch (err) {
          message.error('Lỗi khi ghi lỗi hàng loạt');
        }
      }
    });
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      await handleSubmit(values);
    } catch (error) {
      // Validation errors are handled by Form.Item
    }
  };

  return (
    <>
    <FormModal
      open={open}
      form={form}
      destroyOnClose
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Kíp trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleConfirm}
      loading={loading || externalLoading}
      width={900}
      okText="Lưu lại"
      footer={
        <div className="duty-modal-footer">
          {slot?.kipId && (
            <Button 
              variant="danger" 
              buttonSize="small" 
              onClick={handleDeleteKip} 
              icon={<DeleteOutlined />}
            >
              Xóa Kíp này
            </Button>
          )}
          <Button variant="outline" buttonSize="small" onClick={onCancel} disabled={loading} icon={<CloseOutlined />}>
            Hủy
          </Button>
          <Button variant="primary" buttonSize="small" onClick={handleConfirm} loading={loading} icon={<SaveOutlined />} style={{ fontWeight: 600 }}>
            Lưu lại
          </Button>
        </div>
      }
    >
      <div className="duty-slot-modal-container">
        {/* Breadcrumb: Ca cha (Luôn hiển thị ở trên cùng Modal nếu có) */}
        {parentShift && (
          <div className={`duty-slot-parent-banner ${isSpecial ? 'is-special' : 'is-normal'}`} style={{ marginBottom: 16 }}>
            <Space size={14}>
              <div className={`duty-slot-banner-date-badge ${isSpecial ? 'is-special' : 'is-normal'}`}>
                <div className="date-badge-dow">{dayjs(slot?.shiftDate).format('ddd')}</div>
                <div className="date-badge-day">{dayjs(slot?.shiftDate).format('DD')}</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Thuộc Ca:</Text>
                  <Text strong style={{ fontSize: 16, fontWeight: 700, color: isSpecial ? '#1e40af' : '#0f172a' }}>
                    {parentShift.name}
                  </Text>
                  {isSpecial && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>SỰ KIỆN</Tag>}
                </div>
                <div style={{ marginTop: 2 }}>
                  <Space className={`duty-slot-banner-time ${isSpecial ? 'is-special' : 'is-normal'}`} size={6}>
                    <ClockCircleOutlined style={{ fontSize: 13 }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{parentShift.startTime} – {parentShift.endTime}</span>
                  </Space>
                </div>
              </div>
            </Space>

            {onOpenCa && slot && (
              <Button icon={<EditOutlined />} buttonSize="small" variant="outline" onClick={() => onOpenCa(slot)}>
                Chỉnh sửa Ca
              </Button>
            )}
          </div>
        )}

        {parentShift && (
          <Alert
            message={<span><b>Ràng buộc thời gian:</b> Kíp trực phải thuộc khung giờ ca <b>{parentShift.name}</b> ({parentShift.startTime} – {parentShift.endTime})</span>}
            type="warning"
            showIcon
            style={{ marginBottom: 16}}
          />
        )}

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ThunderboltOutlined /> <span className="duty-divider-label">Thông số Kíp trực</span>
        </Divider>

        <Row gutter={[16, 12]}>
          <Col xs={24} sm={10}>
            <Form.Item label="Tên Kíp" name="shiftLabel" rules={[{ required: true }]}>
              <Input placeholder="Tên hiển thị..." />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Ngày trực" name="shiftDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item label="Trạng thái" name="status" rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}>
              <Select placeholder="Chọn trạng thái">
                <Select.Option value="open">
                  <Space><UnlockOutlined style={{ color: '#16a34a' }} /><span>Đang mở</span></Space>
                </Select.Option>
                <Select.Option value="locked">
                  <Space><LockOutlined style={{ color: '#dc2626' }} /><span>Đã khóa</span></Space>
                </Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 12]}>
          <Col xs={24} sm={10}>
            <Form.Item 
              label="Khung giờ" 
              name="timeRange" 
              rules={[
                { required: true },
                {
                  validator: (_, value) => {
                    const isTimeInShiftRange = (target: string, shiftStart: string, shiftEnd: string) => {
                      if (!target || !shiftStart || !shiftEnd) return true;
                      if (shiftStart <= shiftEnd) {
                        return target >= shiftStart && target <= shiftEnd;
                      }
                      return target >= shiftStart || target <= shiftEnd;
                    };

                    if (parentShift && value && value[0] && value[1]) {
                      const start = value[0].format('HH:mm');
                      const end = value[1].format('HH:mm');
                      if (!isTimeInShiftRange(start, parentShift.startTime, parentShift.endTime)) {
                        return Promise.reject(`Giờ bắt đầu phải từ ${parentShift.startTime} đến ${parentShift.endTime}`);
                      }
                      if (!isTimeInShiftRange(end, parentShift.startTime, parentShift.endTime)) {
                        return Promise.reject(`Giờ kết thúc phải từ ${parentShift.startTime} đến ${parentShift.endTime}`);
                      }
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <TimePicker.RangePicker 
                format="HH:mm" 
                style={{ width: '100%' }} 
                minuteStep={5} 
                disabledTime={() => {
                  if (parentShift) {
                    const [sh, sm] = parentShift.startTime.split(':').map(Number);
                    const [eh, em] = parentShift.endTime.split(':').map(Number);
                    return {
                      disabledHours: () => {
                        const hours = [];
                        for (let i = 0; i < 24; i++) {
                          if (i < sh || i > eh) hours.push(i);
                        }
                        return hours;
                      },
                      disabledMinutes: (h: number) => {
                        const mins = [];
                        if (h === sh) {
                          for (let i = 0; i < sm; i++) mins.push(i);
                        } else if (h === eh) {
                          for (let i = em + 1; i < 60; i++) mins.push(i);
                        }
                        return mins;
                      }
                    };
                  }
                  return {};
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Chỉ tiêu (người)" name="capacity" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignedUserIds !== curr.assignedUserIds || prev.capacity !== curr.capacity || prev.slotStructure !== curr.slotStructure}>
              {({ getFieldsValue }) => {
                const { assignedUserIds = [], capacity = 0, slotStructure = [] } = getFieldsValue();
                const structureTotal = Array.isArray(slotStructure) ? slotStructure.reduce((a: number, c: any) => a + (Number(c?.slots) || 0), 0) : 0;
                const count = assignedUserIds.length;
                if (structureTotal > 0 && capacity < structureTotal) {
                  return <div className="duty-capacity-hint is-error"><WarningOutlined style={{ marginRight: 6 }} />Chỉ tiêu ({capacity}) nhỏ hơn Cơ cấu ({structureTotal} người).</div>;
                }
                if (count > 0 && count >= capacity) {
                  return <div className="duty-capacity-hint is-warning"><WarningOutlined style={{ marginRight: 6 }} />Đã đạt/vượt chỉ tiêu ({count}/{capacity})</div>;
                }
                if (count > 0 && count < capacity) {
                  return <div className="duty-capacity-hint is-success"><InfoCircleOutlined style={{ marginRight: 6 }} />Còn trống {capacity - count} chỗ (Chỉ tiêu: {capacity}{structureTotal > 0 ? ` - Cơ cấu: ${structureTotal}` : ''})</div>;
                }
                if (structureTotal > 0) {
                  return <div className="duty-capacity-hint is-info"><InfoCircleOutlined style={{ marginRight: 6 }} />Đồng bộ theo cơ cấu: {structureTotal} người</div>;
                }
                return null;
              }}
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item label="Hệ số kíp" name="coefficient" rules={[{ required: true }]}>
              <InputNumber min={0.25} step={0.25} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 12]}>
          <Col xs={24} sm={isPrivacyEnabled ? 12 : 24}>
            <Form.Item name="visibilityMode" label="Chế độ bảo mật" initialValue="public">
              <Select
                options={[
                  { label: <Space><UnlockOutlined /><span>Công khai (Tất cả thấy nhau)</span></Space>, value: 'public' },
                  { label: <Space><EyeInvisibleOutlined /><span>Bảo mật song phương (TV & CTV ẩn nhau)</span></Space>, value: 'private_mutual' },
                  { label: <Space><EyeOutlined /><span>Bảo vệ TV (TV thấy CTV, CTV ẩn TV)</span></Space>, value: 'protect_members' },
                  { label: <Space><TeamOutlined /><span>Ẩn toàn bộ (Chỉ thấy bản thân)</span></Space>, value: 'hidden_all' },
                ]}
              />
            </Form.Item>
          </Col>
          {isPrivacyEnabled && (
            <Col xs={24} sm={12}>
              <Form.Item name="privacyMaskType" label="Kiểu ẩn khi bị che" initialValue="masked">
                <Select
                  options={[
                    { 
                      label: <Space><EyeInvisibleOutlined style={{ color: '#3b82f6' }} /><span>Mặt nạ (Hiện *** & Thành viên)</span></Space>, 
                      value: 'masked' 
                    },
                    { 
                      label: <Space><EyeOutlined style={{ color: '#ef4444' }} /><span>Ẩn hoàn toàn khỏi danh sách</span></Space>, 
                      value: 'omitted' 
                    },
                  ]}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <SlotStructureEditor 
          form={form} 
          assignedUsers={selectedUsersCache} 
          onTotalChange={(total) => {
            if (total > 0) {
              const currentCap = form.getFieldValue('capacity') || 0;
              if (total > currentCap) {
                form.setFieldsValue({ capacity: total });
              }
            }
          }}
        />

        <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
          <Space>
            <TeamOutlined />
            <span className="duty-divider-label-bold">Quản lý nhân sự & Điểm danh</span>
          </Space>
        </Divider>

        <div className="duty-slot-attendee-section">
          <div className="duty-slot-attendee-header">
            <div>
              <Title level={5} className="duty-attendee-section-title">Danh sách trực thực tế</Title>
              <Text type="secondary" className="duty-attendee-section-hint">Tích chọn để xác nhận nhân sự thực hiện trực.</Text>
            </div>
            <Space size={8} align="center">
              <Form.Item name="assignedUserIds" noStyle>
                <DutyPersonnelPicker
                  variant="primary"
                  buttonSize="small"
                  label="Phân công"
                  onChange={(_, rows) => {
                    if (rows) updateCache(rows);
                  }}
                />
              </Form.Item>

              <Form.Item noStyle>
                <DutyPersonnelPicker
                  variant="outline"
                  buttonSize="small"
                  label="ĐD bổ sung"
                  icon={<UsergroupAddOutlined />}
                  hideBadge
                  value={form.getFieldValue('attendedUserIds') || []}
                  onChange={(selectedIds, rows) => {
                    const currentAttended = form.getFieldValue('attendedUserIds') || [];
                    const merged = Array.from(new Set([...currentAttended, ...(selectedIds || [])]));
                    form.setFieldsValue({ attendedUserIds: merged });
                    if (rows) updateCache(rows);
                  }}
                />
              </Form.Item>

              <Tooltip title="Đánh dấu tất cả có mặt">
                <AntButton
                  type="text"
                  shape="circle"
                  onClick={() => {
                    const assigned = form.getFieldValue('assignedUserIds') || [];
                    const currentAttended = form.getFieldValue('attendedUserIds') || [];
                    const allIds = Array.from(new Set([...assigned, ...currentAttended]));
                    form.setFieldsValue({ attendedUserIds: allIds });
                    message.success('Đã đánh dấu tất cả nhân sự có mặt');
                  }}
                  icon={<CheckCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />}
                />
              </Tooltip>

              <Tooltip title="Quét vắng mặt không phép">
                <AntButton
                  type="text"
                  shape="circle"
                  onClick={handleScanAbsentees}
                  icon={<WarningOutlined style={{ color: '#ef4444', fontSize: 18 }} />}
                />
              </Tooltip>

              <Tooltip title="Xem lịch sử đổi kíp & xin nghỉ">
                <AntButton
                  type="text"
                  shape="circle"
                  onClick={() => setIsRequestsModalVisible(true)}
                  icon={<HistoryOutlined style={{ color: '#6366f1', fontSize: 18 }} />}
                />
              </Tooltip>
            </Space>
          </div>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const assignedIds = getFieldValue('assignedUserIds') || [];
              const attendedIds = getFieldValue('attendedUserIds') || [];
              const allIds = [...new Set([...assignedIds, ...attendedIds])];
              const formOverrides = getFieldValue('attendanceOverrides') || {};
              const currentSlotCoeff = getFieldValue('coefficient') || 1;

              if (allIds.length === 0) {
                return (
                  <div className="duty-attendee-empty">
                    <Text type="secondary">Chưa có nhân sự nào trong kíp trực này</Text>
                  </div>
                );
              }

              return (
                <div className="duty-slot-attendee-list">
                  {allIds.map((id: number) => {
                    const isAssigned = assignedIds.includes(id);
                    const isAttended = attendedIds.includes(id);
                    const userViolations = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(id)) || [];
                    const leaveReq = currentSlot?.leaveRequests?.find((r: any) => String(r.userId) === String(id));
                    const swapReq = currentSlot?.swapRequests?.find((r: any) => String(r.userId) === String(id));
                    
                    const userDetail =
                      (currentSlot?.assignedUsers || []).find((u: any) => u && String(u.id) === String(id)) ||
                      (currentSlot?.attendedUsers || []).find((u: any) => u && String(u.id) === String(id)) ||
                      selectedUsersCache.find((u: any) => u && String(u.id) === String(id));

                    const defaultSlotCoeff = currentSlotCoeff;
                    const overrideVal = formOverrides[String(id)] ?? formOverrides[Number(id)];
                    const userCoeff = overrideVal !== undefined && overrideVal !== null ? overrideVal : defaultSlotCoeff;
                    const isOverridden = overrideVal !== undefined && overrideVal !== null && overrideVal !== defaultSlotCoeff;
                    const defaultLeaderId = (currentSlot?.assignedUserIds && currentSlot.assignedUserIds.length > 0)
                      ? currentSlot.assignedUserIds[0]
                      : (currentSlot?.assignedUsers && currentSlot.assignedUsers.length > 0)
                        ? currentSlot.assignedUsers[0].id
                        : null;
                    const activeLeaderId = currentSlot?.tempLeaderId || defaultLeaderId;
                    const isLeader = !!activeLeaderId && String(activeLeaderId) === String(id);
                    const isMe = String(id) === String(currentUserId);

                    const allBadges: React.ReactNode[] = [];
                    userViolations.forEach((v: any) => {
                      allBadges.push(
                        <Tooltip 
                          key={`v-${v.id}`} 
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
                                  🕒 {dayjs(v.createdAt).format('DD/MM/YYYY HH:mm')}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <Tag color="error" className="duty-badge-tag">
                            {getViolationTypeLabel(v.type, violationTypeOptions)} (x{v.coefficient})
                          </Tag>
                        </Tooltip>
                      );
                    });

                    if (leaveReq) {
                      const isPending = leaveReq.status === 'pending';
                      const isApproved = leaveReq.status === 'approved' || leaveReq.isApproved;
                      const badgeColor = isPending ? 'gold' : isApproved ? 'warning' : 'default';
                      const badgeLabel = isPending ? 'Chờ duyệt nghỉ' : isApproved ? 'Đã duyệt nghỉ' : 'Nghỉ bị từ chối';
                      const badgeIcon = isPending ? <ClockCircleOutlined style={{ marginRight: 4 }} /> : isApproved ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : <CloseCircleOutlined style={{ marginRight: 4 }} />;

                      const leaveTooltipTitle = (
                        <div>
                          <div className="duty-tooltip-title">Đơn xin nghỉ ca</div>
                          {leaveReq.reason && (
                            <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Lý do xin nghỉ:</b> {leaveReq.reason}</div>
                          )}
                          {leaveReq.status === 'rejected' && (
                            <div className="duty-tooltip-note" style={{ color: '#ff7875' }}>
                              <CloseCircleOutlined style={{ marginRight: 4 }} /><b>Lý do từ chối:</b> {leaveReq.rejectionReason || 'Không có lý do cụ thể'}
                            </div>
                          )}
                          <div className="duty-tooltip-note">Trạng thái: {badgeLabel}</div>
                        </div>
                      );

                      allBadges.push(
                        <Tooltip key="leave" title={leaveTooltipTitle}>
                          <Tag color={badgeColor} className="duty-badge-tag" style={{ cursor: 'pointer' }}>
                            {badgeIcon}{badgeLabel}
                          </Tag>
                        </Tooltip>
                      );
                    }

                    if (swapReq) {
                      const isPending = swapReq.status === 'pending';
                      const isApproved = swapReq.status === 'approved' || swapReq.isApproved;
                      const badgeColor = isPending ? 'processing' : isApproved ? 'success' : 'default';
                      const badgeLabel = isPending ? 'Chờ duyệt đổi ca' : isApproved ? 'Đã duyệt đổi ca' : 'Đổi ca bị từ chối';

                      allBadges.push(
                        <Tag key="swap" color={badgeColor} className="duty-badge-tag">
                          {badgeLabel}
                        </Tag>
                      );
                    }

                    const popoverViolationList = (
                      <div className="duty-popover-violation-list" onClick={(e) => e.stopPropagation()}>
                        <div className="duty-popover-title">
                          Tất cả vi phạm & Đơn từ ({allBadges.length}):
                        </div>
                        <div className="duty-popover-items-col">
                          {userViolations.map((v: any) => (
                            <Tooltip
                              key={v.id}
                              placement="right"
                              title={
                                <div>
                                  <div className="duty-tooltip-title">{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
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
                            </Tooltip>
                          ))}
                          {leaveReq && (() => {
                            const leaveStatusLabel = leaveReq.status === 'pending' ? 'Chờ duyệt' : (leaveReq.status === 'approved' || leaveReq.isApproved ? 'Đã duyệt' : 'Bị từ chối');
                            return (
                              <Tooltip
                                placement="right"
                                title={
                                  <div>
                                    <div className="duty-tooltip-title">Đơn xin nghỉ ca</div>
                                    <div className="duty-tooltip-note"><FileTextOutlined style={{ marginRight: 4 }} /><b>Lý do xin nghỉ:</b> {leaveReq.reason || 'Không có lý do'}</div>
                                    {leaveReq.status === 'rejected' && (
                                      <div className="duty-tooltip-note" style={{ color: '#ff7875' }}>
                                        <CloseCircleOutlined style={{ marginRight: 4 }} /><b>Lý do từ chối:</b> {leaveReq.rejectionReason || 'Không có lý do cụ thể'}
                                      </div>
                                    )}
                                    <div className="duty-tooltip-note">Trạng thái: {leaveStatusLabel}</div>
                                  </div>
                                }
                              >
                                <div className="duty-popover-leave-item">
                                  <b>Xin nghỉ:</b> {leaveStatusLabel} {leaveReq.reason ? ` - ${leaveReq.reason}` : ''}
                                  {leaveReq.status === 'rejected' && leaveReq.rejectionReason ? ` (Từ chối: ${leaveReq.rejectionReason})` : ''}
                                </div>
                              </Tooltip>
                            );
                          })()}
                          {swapReq && (() => {
                            const swapStatusLabel = swapReq.status === 'pending' ? 'Chờ duyệt' : (swapReq.status === 'approved' || swapReq.isApproved ? 'Đã duyệt' : 'Bị từ chối');
                            return (
                              <Tooltip
                                placement="right"
                                title={
                                  <div>
                                    <div className="duty-tooltip-title">Đơn xin đổi kíp</div>
                                    <div className="duty-tooltip-note">Trạng thái: {swapStatusLabel}</div>
                                  </div>
                                }
                              >
                                <div className="duty-popover-swap-item">
                                  <b>Xin đổi kíp:</b> {swapStatusLabel}
                                </div>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      </div>
                    );

                    const cardNode = (
                      <div
                        key={id}
                        onClick={() => {
                          if (isAssigned || !isAttended) {
                            handleToggleAttendance(id, !isAttended);
                          }
                        }}
                        className={`duty-slot-attendee-card ${isAttended ? 'is-attended' : ''}`}
                      >
                        {/* Left Side: Identity Box (Left) + Tags & Violations (Middle) */}
                        <div className="duty-slot-attendee-left">
                          {/* 1. Identity Box: Avatar + Name + MSV */}
                          <div className="duty-attendee-identity-box">
                            <Avatar 
                              size={40}
                              icon={<UserOutlined />} 
                              src={userDetail?.avatar} 
                              className={`duty-attendee-avatar ${isAttended ? 'is-attended' : ''}`}
                            />
                            <div className="duty-attendee-identity-text">
                              <Tooltip title={getUserDisplayName(userDetail)} placement="topLeft">
                                <div className="duty-attendee-name">
                                  {getUserDisplayName(userDetail)}
                                </div>
                              </Tooltip>
                              <div className="duty-attendee-msv">
                                MSV: {userDetail?.studentId || 'Chưa rõ MSV'}
                              </div>
                              {(() => {
                                const posInfo = getPositionInfo(userDetail?.position || userDetail?.role);
                                return posInfo ? (
                                  <div style={{ marginTop: 2 }}>
                                    <Tag color={posInfo.color} style={{ fontSize: 10, padding: '0 6px', borderRadius: 4, lineHeight: '18px', fontWeight: 600, margin: 0 }}>
                                      {posInfo.name}
                                    </Tag>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          {/* 2. Middle Box: Tags & Violations */}
                          <div className="duty-attendee-middle-box">
                            <div className="duty-attendee-tags-row">
                              {isAssigned ? (
                                <Tag color="blue" className="duty-badge-tag">
                                  Theo lịch
                                </Tag>
                              ) : (
                                <Tag color="orange" className="duty-badge-tag">
                                  Ngoài kíp
                                </Tag>
                              )}
                              {userDetail?.department && (
                                <span className="duty-attendee-dept">
                                  ({userDetail.department})
                                </span>
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

                        {/* Right Side: Inputs & Actions (Strict horizontal alignment) */}
                        <div className="duty-slot-attendee-right" onClick={(e) => e.stopPropagation()}>
                          <div className="duty-attendee-coeff">
                            <Tooltip title="Hệ số kíp thực tế được tính cho nhân sự này">
                              <InputNumber
                                size="small"
                                min={0}
                                step={0.25}
                                max={10}
                                value={userCoeff}
                                addonAfter="kíp"
                                className={isOverridden ? 'duty-coeff-overridden' : ''}
                                onChange={(val) => {
                                  const current = form.getFieldValue('attendanceOverrides') || {};
                                  const nextOverrides = { ...current };
                                  if (val === null || val === undefined || Number(val) === Number(defaultSlotCoeff)) {
                                    delete nextOverrides[String(id)];
                                    delete nextOverrides[Number(id)];
                                  } else {
                                    nextOverrides[String(id)] = val;
                                  }
                                  form.setFieldsValue({ attendanceOverrides: nextOverrides });
                                }}
                              />
                            </Tooltip>
                          </div>

                          <div className="duty-attendee-status">
                            {(() => {
                              const attendanceInfo = (slot as any)?.attendanceData?.[String(id)] || (slot as any)?.attendanceData?.[Number(id)];
                              const checkInTimeStr = attendanceInfo?.time ? dayjs(attendanceInfo.time).format('HH:mm:ss DD/MM/YYYY') : null;
                              const methodLabel = attendanceInfo?.method === 'admin' ? ' (Admin điểm danh)' : attendanceInfo?.method === 'leader' ? ' (Quản lý kíp điểm danh)' : attendanceInfo?.method === 'self_checkin' ? ' (Tự điểm danh)' : '';

                              const attState = getAttendanceState(userDetail, slot);
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
                            <div className="status-tags">
                              {isOverridden && <Tag color="gold" className="duty-status-tag-mini">TÙY CHỈNH</Tag>}
                              {!isAssigned && <Tag color="orange" className="duty-status-tag-mini">BỔ SUNG</Tag>}
                            </div>
                          </div>

                          <div className="duty-attendee-actions-box">
                            <div className="duty-attendee-action">
                              <Tooltip title={userViolations.length > 0 ? `Xem / Thêm lỗi (${userViolations.length})` : "Ghi lỗi vi phạm"}>
                                <AntButton 
                                  type="text"
                                  size="small" 
                                  shape="circle" 
                                  className={`duty-warning-btn ${userViolations.length > 0 ? 'has-violations' : ''}`}
                                  icon={<WarningOutlined style={{ fontSize: 18 }} />} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViolationUser(userDetail);
                                    violationForm.resetFields();
                                    setIsViolationModalOpen(true);
                                  }} 
                                />
                              </Tooltip>
                            </div>

                            <div className="duty-attendee-action">
                              {!isAssigned && isAttended ? (
                                <Popconfirm
                                  title="Gỡ điểm danh bổ sung?"
                                  description={`Nhân sự "${getUserDisplayName(userDetail)}" sẽ được gỡ khỏi danh sách trực.`}
                                  okText="Gỡ khỏi kíp"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true, size: 'small' }}
                                  cancelButtonProps={{ size: 'small' }}
                                  placement="topRight"
                                  onConfirm={(e) => {
                                    e?.stopPropagation();
                                    handleRemoveSupplementary(id);
                                  }}
                                >
                                  <Tooltip title="Bấm để gỡ điểm danh bổ sung">
                                    <div 
                                      onClick={(e) => e.stopPropagation()}
                                      className="duty-check-circle is-checked"
                                    >
                                      <CheckOutlined style={{ color: '#fff', fontSize: 12, fontWeight: 800 }} />
                                    </div>
                                  </Tooltip>
                                </Popconfirm>
                              ) : (
                                <Tooltip title={isAttended ? "Bấm để hủy điểm danh" : "Bấm để điểm danh"}>
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleAttendance(id, !isAttended);
                                    }}
                                    className={`duty-check-circle ${isAttended ? 'is-checked' : ''}`}
                                  >
                                    <CheckOutlined style={{ color: isAttended ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 800 }} />
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    if (isLeader) {
                      return (
                        <Badge.Ribbon 
                          key={id} 
                          text={
                            <Tooltip title={isMe ? "Quản lý kíp (Bạn)" : "Quản lý kíp"} placement="top">
                              <span style={{ cursor: 'pointer' }}>{isMe ? "Qlk • Bạn" : "Qlk"}</span>
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
                          key={id} 
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
                          key={id} 
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
                      <React.Fragment key={id}>
                        {cardNode}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            }}
          </Form.Item>
        </div>

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <InfoCircleOutlined /> <span className="duty-divider-label">Ghi chú quản trị</span>
        </Divider>

        <Form.Item name="note" noStyle>
          <Input.TextArea size="small" placeholder="Thông tin thêm..." rows={2} />
        </Form.Item>
      </div>
    </FormModal>

      {/* Violation Modal for Admin */}
      <FormModal 
        open={isViolationModalOpen} 
        form={violationForm} 
        title={<Space><WarningOutlined style={{ color: '#ef4444' }} /> <span>Ghi nhận vi phạm</span></Space>} 
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
          <Input.TextArea placeholder="Nhập chi tiết vi phạm (nếu có)..." rows={2} />
        </Form.Item>

        {(() => {
          const userViolations = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(violationUser?.id)) || [];
          if (userViolations.length === 0) return null;
          return (
            <div className="duty-recorded-violations">
              <div className="recorded-violations-header">
                <Text strong className="recorded-violations-label">
                  Các lỗi đã ghi nhận ({userViolations.length}):
                </Text>
                <AntButton danger type="link" size="small" onClick={handleDeleteAllViolations}>
                  Xóa tất cả lỗi
                </AntButton>
              </div>
              <div className="recorded-violations-list">
                {userViolations.map((v: any) => (
                  <Tooltip
                    key={v.id}
                    title={
                      <div>
                        <div style={{ fontWeight: 600 }}>{getViolationTypeLabel(v.type, violationTypeOptions)} (Hệ số: x{v.coefficient})</div>
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
                            <FileTextOutlined style={{ marginRight: 4, fontSize: 11 }} />{v.note}
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
          );
        })()}
      </FormModal>

    <SlotRequestsHistoryModal
      open={isRequestsModalVisible}
      onCancel={() => setIsRequestsModalVisible(false)}
      slotId={slot?.id || 0}
      slotLabel={slot?.shiftLabel}
    />
  </>
);
};

export default AdminDutySlotModal;
