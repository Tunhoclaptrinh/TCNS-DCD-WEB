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
  List,
  Checkbox,
  Alert,
  Col,
  Tooltip,
  Row,
  Popconfirm,
} from 'antd';
import Button from '@/components/common/Button';
import {
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UnlockOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  CloseOutlined,
  DeleteOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import DutyPersonnelPicker from '../../components/DutyPersonnelTable';
import SlotStructureEditor from './SlotStructureEditor';
import SlotRequestsHistoryModal from '@/pages/Duty/Member/components/SlotRequestsHistoryModal';

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

  const handleToggleAttendance = (userId: number, checked: boolean, userDetail?: any) => {
    const assignedIds = form.getFieldValue('assignedUserIds') || [];
    const isAssigned = assignedIds.includes(userId);

    // If unchecking a supplementary member (not assigned in original schedule)
    if (!checked && !isAssigned) {
      const userName = userDetail?.lastName || userDetail?.firstName
        ? `${userDetail.lastName || ''} ${userDetail.firstName || ''}`.trim()
        : userDetail?.name || userDetail?.username || `#${userId}`;

      Modal.confirm({
        title: 'Xác nhận gỡ điểm danh bổ sung?',
        content: `Nhân sự "${userName}" là nhân sự điểm danh bổ sung (không có trong lịch phân công ban đầu). Nếu hủy điểm danh, nhân sự này sẽ được gỡ khỏi danh sách trực của kíp này. Bạn có chắc chắn?`,
        okText: 'Gỡ khỏi kíp',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: () => {
          const currentAttended = form.getFieldValue('attendedUserIds') || [];
          const nextAttended = currentAttended.filter((uId: number) => uId !== userId);
          const currentOverrides = { ...(form.getFieldValue('attendanceOverrides') || {}) };
          delete currentOverrides[String(userId)];
          delete currentOverrides[Number(userId)];
          form.setFieldsValue({
            attendedUserIds: nextAttended,
            attendanceOverrides: currentOverrides,
          });
        },
      });
      return;
    }

    const currentAttended = form.getFieldValue('attendedUserIds') || [];
    const nextAttended = checked
      ? [...new Set([...currentAttended, userId])]
      : currentAttended.filter((id: number) => id !== userId);
    form.setFieldsValue({ attendedUserIds: nextAttended });
  };

  // Tìm Ca bản mẫu để hiển thị context
  const parentShift = slot?.shiftId ? templates.find(s => String(s.id) === String(slot.shiftId)) : null;
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
      okText="Lưu thay đổi"
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%' }}>
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
            Lưu thay đổi
          </Button>
        </div>
      }
    >
      <div style={{ padding: '0 4px' }}>

        {/* Breadcrumb: Ca cha */}
        {parentShift && (
          <div style={{
            background: isSpecial
              ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '16px 24px',
            borderRadius: 16,
            marginBottom: 24,
            border: `1px solid ${isSpecial ? '#bfdbfe' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
          }}>
            <Space size={14}>
              <div style={{
                background: isSpecial ? '#3b82f6' : '#64748b',
                color: 'white',
                width: 44,
                height: 44,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800 }}>{dayjs(slot?.shiftDate).format('ddd')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{dayjs(slot?.shiftDate).format('DD')}</div>
              </div>
              <div>
                <Space size={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Thuộc Ca:</Text>
                  <Text strong style={{ color: isSpecial ? '#1e40af' : '#1e293b' }}>{parentShift.name}</Text>
                  {isSpecial && <Tag color="blue" style={{ fontSize: 10 }}>SỰ KIỆN</Tag>}
                </Space>
                <div style={{ marginTop: 2 }}>
                  <Space style={{ color: isSpecial ? '#3b82f6' : '#94a3b8', fontSize: 12 }}>
                    <ClockCircleOutlined />
                    <span>{parentShift.startTime} – {parentShift.endTime}</span>
                  </Space>
                </div>
              </div>
            </Space>

            {onOpenCa && slot && (
              <Button icon={<EditOutlined />} buttonSize="small" variant="outline" onClick={() => onOpenCa(slot)}>
                Xem Ca
              </Button>
            )}
          </div>
        )}

        {parentShift && (
          <Alert
            message="Ràng buộc thời gian kíp"
            description={`Kíp trực phải thuộc khung giờ của ca: ${parentShift.startTime} - ${parentShift.endTime}`}
            type="info"
            showIcon
            style={{ marginBottom: 24, borderRadius: 12 }}
          />
        )}

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ThunderboltOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông số Kíp trực</span>
        </Divider>

        <Row gutter={[24, 0]}>
          <Col span={10}>
            <Form.Item label="Tên Kíp" name="shiftLabel" rules={[{ required: true }]}>
              <Input placeholder="Tên hiển thị..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày trực" name="shiftDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Trạng thái" name="status">
              <Select placeholder="Chọn trạng thái">
                <Select.Option value="open">Đang mở</Select.Option>
                <Select.Option value="locked">Khóa</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[24, 0]}>
          <Col span={10}>
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
          <Col span={8}>
            <Form.Item label="Chỉ tiêu (người)" name="capacity" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignedUserIds !== curr.assignedUserIds || prev.capacity !== curr.capacity || prev.slotStructure !== curr.slotStructure}>
              {({ getFieldsValue }) => {
                const { assignedUserIds = [], capacity = 0, slotStructure = [] } = getFieldsValue();
                const structureTotal = Array.isArray(slotStructure) ? slotStructure.reduce((a: number, c: any) => a + (Number(c?.slots) || 0), 0) : 0;
                const count = assignedUserIds.length;
                if (structureTotal > 0 && capacity < structureTotal) {
                  return <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠️ Chỉ tiêu ({capacity}) nhỏ hơn Cơ cấu ({structureTotal} người).</div>;
                }
                if (count > 0 && count >= capacity) {
                  return <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>⚠️ Đã đạt/vượt chỉ tiêu ({count}/{capacity})</div>;
                }
                if (count > 0 && count < capacity) {
                  return <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>ℹ Còn trống {capacity - count} chỗ (Chỉ tiêu: {capacity}{structureTotal > 0 ? ` - Cơ cấu: ${structureTotal}` : ''})</div>;
                }
                if (structureTotal > 0) {
                  return <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4 }}>ℹ Đồng bộ theo cơ cấu: {structureTotal} người</div>;
                }
                return null;
              }}
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Hệ số kíp" name="coefficient" rules={[{ required: true }]}>
              <InputNumber min={0.25} step={0.25} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[24, 0]}>
          <Col span={isPrivacyEnabled ? 12 : 24}>
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
            <Col span={12}>
              <Form.Item name="privacyMaskType" label="Kiểu ẩn khi bị che" initialValue="masked">
                <Select
                  options={[
                    { label: '🎭 Mặt nạ (Hiện *** & Thành viên)', value: 'masked' },
                    { label: '🚫 Ẩn hoàn toàn khỏi danh sách', value: 'omitted' },
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>Quản lý nhân sự & Điểm danh</span>
          </Space>
        </Divider>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <Title level={5} style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Danh sách trực thực tế</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>Tích chọn để xác nhận nhân sự thực hiện trực.</Text>
            </div>
            <Space size={12} align="center">
              <Form.Item name="assignedUserIds" noStyle>
                <DutyPersonnelPicker
                  variant="primary"
                  label="Phân công"
                  onChange={(_, rows) => {
                    if (rows) updateCache(rows);
                  }}
                />
              </Form.Item>

              <Form.Item noStyle>
                <DutyPersonnelPicker
                  variant="outline"
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

              <Tooltip title="Tất cả có mặt">
                <Button
                  variant="outline"
                  buttonSize="small"
                  onClick={() => {
                    const assigned = form.getFieldValue('assignedUserIds') || [];
                    const currentAttended = form.getFieldValue('attendedUserIds') || [];
                    // Keep both assigned members and any supplementary members in the attended list
                    const allIds = Array.from(new Set([...assigned, ...currentAttended]));
                    form.setFieldsValue({ attendedUserIds: allIds });
                    message.success('Đã đánh dấu tất cả nhân sự có mặt');
                  }}
                  icon={<CheckCircleOutlined />}
                />
              </Tooltip>

              <Tooltip title="Quét vắng mặt">
                <Button
                  variant="danger"
                  buttonSize="small"
                  onClick={handleScanAbsentees}
                  icon={<WarningOutlined />}
                />
              </Tooltip>

              <Tooltip title="Xem lịch sử đổi kíp & xin nghỉ">
                <Button
                  variant="outline"
                  buttonSize="small"
                  shape="circle"
                  onClick={() => setIsRequestsModalVisible(true)}
                  icon={<ClockCircleOutlined style={{ fontSize: 14 }} />}
                  style={{ color: '#6366f1', borderColor: '#6366f1' }}
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

              return (
                <List
                  dataSource={allIds}
                  renderItem={(id: number) => {
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

                    return (
                      <List.Item
                        onClick={() => handleToggleAttendance(id, !isAttended, userDetail)}
                        style={{
                          padding: '10px 16px',
                          background: isAttended ? '#f0fdf4' : '#fff',
                          borderRadius: 8,
                          marginBottom: 8,
                          border: `1px solid ${isAttended ? '#dcfce7' : '#f1f5f9'}`,
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        actions={[
                          <Space size={10} key="actions" align="center">
                            <Tooltip title="Hệ số kíp thực tế được tính cho nhân sự này">
                              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <InputNumber
                                  size="small"
                                  min={0}
                                  step={0.25}
                                  max={10}
                                  value={userCoeff}
                                  addonAfter="kíp"
                                  style={{
                                    width: 96,
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    borderColor: isOverridden ? '#f59e0b' : '#cbd5e1',
                                    backgroundColor: isOverridden ? '#fffbeb' : '#fff'
                                  }}
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
                              </div>
                            </Tooltip>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                              <Text strong style={{ fontSize: 12, color: isAttended ? '#16a34a' : '#64748b' }}>
                                {isAttended ? 'ĐÃ CÓ MẶT' : 'CHƯA ĐIỂM DANH'}
                              </Text>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                                {isOverridden && <Tag color="gold" style={{ fontSize: '0.6rem', border: 'none', margin: 0, padding: '0 4px', lineHeight: '14px' }}>TÙY CHỈNH</Tag>}
                                {!isAssigned && <Tag color="orange" style={{ fontSize: '0.6rem', border: 'none', margin: 0, padding: '0 4px', lineHeight: '14px' }}>BỔ SUNG</Tag>}
                              </div>
                            </div>
                            <Tooltip title={userViolations.length > 0 ? `Xem / Thêm lỗi (${userViolations.length})` : "Ghi lỗi vi phạm"}>
                              <Button 
                                variant={userViolations.length > 0 ? "danger" : "secondary"} 
                                buttonSize="small" 
                                shape="circle" 
                                style={userViolations.length > 0 ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}
                                icon={<WarningOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViolationUser(userDetail);
                                  violationForm.resetFields();
                                  violationForm.setFieldsValue({ coefficient: 1, types: [] });
                                  setIsViolationModalOpen(true);
                                }} 
                              />
                            </Tooltip>
                            <Checkbox
                                checked={isAttended}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleAttendance(id, e.target.checked, userDetail);
                                }}
                                style={{ transform: 'scale(1.2)' }}
                              />
                          </Space>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} src={userDetail?.avatar} />}
                          title={
                            <Space>
                              <Text strong={isAttended}>
                                {userDetail?.lastName || userDetail?.firstName
                                  ? `${userDetail.lastName || ''} ${userDetail.firstName || ''}`.trim()
                                  : userDetail?.name || userDetail?.username || `#${id}`}
                              </Text>
                              {(currentSlot?.assignedUserIds || []).indexOf(id) === 0 && (
                                <div style={{ color: '#8b1d1d', fontSize: '11px', fontWeight: 600 }}>
                                  - Quản lý kíp
                                </div>
                              )}
                            </Space>
                          }
                          description={
                            <Space split={<Divider type="vertical" />} style={{ fontSize: 11 }} wrap>
                              <Text type="secondary">{userDetail?.studentId || 'Chưa rõ MSV'}</Text>
                              {isAssigned
                                ? <Tag color="blue" style={{ fontSize: '0.6rem' }}>Theo lịch</Tag>
                                : <Text type="warning">Ngoài kíp</Text>}
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
                                  <Tag color="error" style={{ fontSize: '0.6rem', cursor: 'pointer' }}>
                                    {getViolationTypeLabel(v.type, violationTypeOptions)} (x{v.coefficient})
                                  </Tag>
                                </Tooltip>
                              ))}
                              {leaveReq && <Tag color="warning" style={{ fontSize: '0.6rem' }}>Xin nghỉ ({leaveReq.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'})</Tag>}
                              {swapReq && <Tag color="processing" style={{ fontSize: '0.6rem' }}>Xin đổi ({swapReq.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'})</Tag>}
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                  locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center' }}>Chưa có nhân sự nào</div> }}
                />
              );
            }}
          </Form.Item>
        </div>

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <InfoCircleOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Ghi chú quản trị</span>
        </Divider>

        <Form.Item name="note" noStyle>
          <Input.TextArea size="small" placeholder="Thông tin thêm..." rows={2} />
        </Form.Item>
      </div>

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
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Avatar size={64} src={violationUser?.avatar} icon={<UserOutlined />} />
          <Title level={5} style={{ marginTop: 12, marginBottom: 4 }}>
            {violationUser?.lastName || violationUser?.firstName
              ? `${violationUser.lastName || ''} ${violationUser.firstName || ''}`.trim()
              : violationUser?.name || violationUser?.username || 'Nhân sự'}
          </Title>
          <Text type="secondary">{violationUser?.email}</Text>
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
          <Input.TextArea placeholder="Nhập chi tiết vi phạm (nếu có)..." rows={2} />
        </Form.Item>

        {(() => {
          const userViolations = currentSlot?.violations?.filter((v: any) => String(v.userId) === String(violationUser?.id)) || [];
          if (userViolations.length === 0) return null;
          return (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13, color: '#ef4444' }}>
                  Các lỗi đã ghi nhận ({userViolations.length}):
                </Text>
                <AntButton danger type="link" size="small" onClick={handleDeleteAllViolations}>
                  Xóa tất cả lỗi
                </AntButton>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
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
          );
        })()}
      </FormModal>
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
