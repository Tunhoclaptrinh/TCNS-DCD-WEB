import React, { useState, useEffect } from 'react';
import {
  Modal,
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

  // Violation Management
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [violationUser, setViolationUser] = useState<any>(null);
  const [violationForm] = Form.useForm();
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);

  const updateCache = (rows: any[]) => {
    setSelectedUsersCache(prev => {
      const map = new Map(prev.filter(r => r && r.id).map(r => [r.id, r]));
      (rows || []).filter(r => r && r.id).forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
  };

  useEffect(() => {
    if (open && slot) {
      form.setFieldsValue({
        ...slot,
        shiftDate: dayjs(slot.shiftDate),
        timeRange:
          slot.startTime && slot.endTime
            ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')]
            : undefined,
        status: slot.status || 'open',
        visibilityMode: slot.config?.visibilityMode || 'public',
        assignedUserIds: slot.assignedUserIds || [],
        attendedUserIds: slot.attendedUserIds || [],
        slotStructure: slot.slotStructure || (slot as any).kip?.slotStructure || (slot as any).shift?.slotStructure || [],
      });
      if (slot.assignedUsers) updateCache(slot.assignedUsers);
    }
  }, [open, slot, form]);

  // Auto-increase capacity when assignedUserIds change
  const assignedIds = Form.useWatch('assignedUserIds', form);
  useEffect(() => {
    if (assignedIds && Array.isArray(assignedIds) && assignedIds.length > 0) {
      const currentCapacity = form.getFieldValue('capacity') || 0;
      if (assignedIds.length > currentCapacity) {
        form.setFieldsValue({ capacity: assignedIds.length });
      }
    }
  }, [assignedIds, form]);

  const handleSubmit = async (values: any) => {
    if (!slot) return;
    setLoading(true);
    try {
      const targetDateStr = values.shiftDate.format('YYYY-MM-DD');
      const payload = {
        ...values,
        shiftDate: targetDateStr,
        startTime: values.timeRange?.[0]?.format('HH:mm'),
        endTime: values.timeRange?.[1]?.format('HH:mm'),
        config: { ...slot.config, visibilityMode: values.visibilityMode },
      };

      const res = await dutyService.updateSlot(slot.id, payload);
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
    if (!slot || !violationUser) return;
    setLoading(true);
    try {
      const res = await dutyService.reportViolation({
        slotId: slot.id,
        userId: violationUser.id,
        ...values
      });
      if (res.success) {
        message.success(`Đã ghi nhận lỗi cho ${violationUser.name || violationUser.fullName}`);
        setIsViolationModalOpen(false);
        violationForm.resetFields();
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi ghi nhận vi phạm');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (userId: number, checked: boolean) => {
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
    if (!slot) return;
    const assignedIds = form.getFieldValue('assignedUserIds') || [];
    const attendedIds = form.getFieldValue('attendedUserIds') || [];

    // Identify absentees
    const absentees = assignedIds.filter((id: number) => !attendedIds.includes(id));
    
    // Filter out those with approved leave
    const unexcusedAbsentees = absentees.filter((id: number) => {
      const hasApprovedLeave = slot.leaveRequests?.some(r => String(r.userId) === String(id) && r.status === 'approved');
      const hasApprovedSwap = slot.swapRequests?.some(r => String(r.fromSlotId) === String(slot.id) && String(r.userId) === String(id) && r.status === 'approved');
      const alreadyHasViolation = slot.violations?.some(v => String(v.userId) === String(id));
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
              slotId: slot.id,
              userId: id,
              type: 'Vắng mặt không phép',
              coefficient: 1,
              note: 'Hệ thống tự động ghi nhận vắng mặt'
            })
          ));
          message.success(`Đã ghi lỗi cho ${unexcusedAbsentees.length} nhân sự.`);
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
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignedUserIds !== curr.assignedUserIds || prev.capacity !== curr.capacity}>
              {({ getFieldsValue }) => {
                const { assignedUserIds = [], capacity = 0 } = getFieldsValue();
                const count = assignedUserIds.length;
                if (count > 0 && count >= capacity) {
                  return <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>⚠️ Đã đạt/vượt chỉ tiêu ({count}/{capacity})</div>;
                }
                if (count > 0 && count < capacity) {
                  return <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>ℹ️ Còn trống {capacity - count} chỗ</div>;
                }
                return null;
              }}
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Hệ số kíp" name="coefficient" initialValue={1} rules={[{ required: true }]}>
              <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="visibilityMode" label="Bảo mật" initialValue="public">
              <Select
                options={[
                  { label: <Space><UnlockOutlined /><span>Công khai</span></Space>, value: 'public' },
                  { label: <Space><EyeInvisibleOutlined /><span>Song phương</span></Space>, value: 'private_mutual' },
                  { label: <Space><EyeOutlined /><span>Bảo vệ TV</span></Space>, value: 'protect_members' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <SlotStructureEditor form={form} assignedUsers={selectedUsersCache} />

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

              <Form.Item name="attendedUserIds" noStyle>
                <DutyPersonnelPicker
                  variant="outline"
                  label="ĐD bổ sung"
                  icon={<UsergroupAddOutlined />}
                  hideBadge
                  onChange={(_, rows) => {
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
                    form.setFieldsValue({ attendedUserIds: assigned });
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

          <Form.Item noStyle shouldUpdate={(prev, curr) =>
            prev.assignedUserIds !== curr.assignedUserIds || prev.attendedUserIds !== curr.attendedUserIds
          }>
            {({ getFieldValue }) => {
              const assignedIds = getFieldValue('assignedUserIds') || [];
              const attendedIds = getFieldValue('attendedUserIds') || [];
              const allIds = [...new Set([...assignedIds, ...attendedIds])];

              return (
                <List
                  dataSource={allIds}
                  renderItem={(id: number) => {
                    const isAssigned = assignedIds.includes(id);
                    const isAttended = attendedIds.includes(id);
                    const existingViolation = slot?.violations?.find((v: any) => String(v.userId) === String(id));
                    const leaveReq = slot?.leaveRequests?.find((r: any) => String(r.userId) === String(id));
                    const swapReq = slot?.swapRequests?.find((r: any) => String(r.userId) === String(id));
                    
                    const userDetail =
                      (slot?.assignedUsers || []).find((u: any) => u && String(u.id) === String(id)) ||
                      (slot?.attendedUsers || []).find((u: any) => u && String(u.id) === String(id)) ||
                      selectedUsersCache.find((u: any) => u && String(u.id) === String(id));

                    return (
                      <List.Item
                        onClick={() => handleToggleAttendance(id, !isAttended)}
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
                          <Space size={12} key="actions">
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                              <Text strong style={{ fontSize: 12, color: isAttended ? '#16a34a' : '#64748b' }}>
                                {isAttended ? 'ĐÃ CÓ MẶT' : 'CHƯA ĐIỂM DANH'}
                              </Text>
                              {!isAssigned && <Tag color="orange" style={{ fontSize: '0.6rem', border: 'none', margin: 0 }}>BỔ SUNG</Tag>}
                            </div>
                            <Tooltip title={existingViolation ? "Sửa lỗi vi phạm" : "Ghi lỗi vi phạm"}>
                              <Button 
                                variant={existingViolation ? "primary" : "danger"} 
                                buttonSize="small" 
                                shape="circle" 
                                style={existingViolation ? { background: '#f59e0b', borderColor: '#f59e0b' } : {}}
                                icon={<WarningOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViolationUser(userDetail);
                                  if (existingViolation) {
                                    violationForm.setFieldsValue({
                                      type: existingViolation.type,
                                      coefficient: existingViolation.coefficient,
                                      note: existingViolation.note
                                    });
                                  } else {
                                    violationForm.resetFields();
                                    violationForm.setFieldsValue({ coefficient: 1 });
                                  }
                                  setIsViolationModalOpen(true);
                                }} 
                              />
                            </Tooltip>
                            <Checkbox
                                checked={isAttended}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleAttendance(id, e.target.checked);
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
                              {(slot?.assignedUserIds || []).indexOf(id) === 0 && (
                                <div style={{ color: '#8b1d1d', fontSize: '11px', fontWeight: 600 }}>
                                  - Quản lý kíp
                                </div>
                              )}
                            </Space>
                          }
                          description={
                            <Space split={<Divider type="vertical" />} style={{ fontSize: 11 }}>
                              <Text type="secondary">{userDetail?.studentId || 'Chưa rõ MSV'}</Text>
                              {isAssigned
                                ? <Tag color="blue" style={{ fontSize: '0.6rem' }}>Theo lịch</Tag>
                                : <Text type="warning">Ngoài kíp</Text>}
                              {existingViolation && <Tag color="error" style={{ fontSize: '0.6rem' }}>{existingViolation.type} (x{existingViolation.coefficient})</Tag>}
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
        width={400}
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

        <Form.Item name="type" label="Loại lỗi" rules={[{ required: true }]}>
          <Select placeholder="Chọn loại lỗi vi phạm">
            <Select.Option value="Vắng mặt không phép">Vắng mặt không phép</Select.Option>
            <Select.Option value="Đi muộn">Đi muộn</Select.Option>
            <Select.Option value="Sai tác phong">Sai tác phong</Select.Option>
            <Select.Option value="Khác">Khác (Ghi chú chi tiết)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="coefficient" label="Hệ số lỗi" initialValue={1} rules={[{ required: true }]}>
          <InputNumber min={0.1} max={5} step={0.5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú chi tiết">
          <Input.TextArea placeholder="Nhập chi tiết vi phạm..." rows={3} />
        </Form.Item>
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
