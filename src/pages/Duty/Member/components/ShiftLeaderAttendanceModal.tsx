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
  Tooltip
} from 'antd';
import { 
  CheckCircleOutlined, 
  UsergroupAddOutlined, 
  WarningOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService, { DutySlot } from '@/services/duty.service';
import { getUserDisplayName } from '@/utils/formatters';
import UserSelect from '@/pages/Users/components/UserSelect';
import { Button } from '@/components/common';
import FormModal from '@/components/common/FormModal';

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
    if (slot) {
      const assigned = slot.assignedUsers || [];
      const attended = (slot as any).attendedUsers || [];
      const userMap = new Map();
      assigned.forEach((u: any) => userMap.set(u.id, { ...u, isAssigned: true }));
      attended.forEach((u: any) => {
        const existing = userMap.get(u.id);
        userMap.set(u.id, { ...(existing || u), isAttended: true, isAssigned: !!existing?.isAssigned });
      });
      setAllUsers(Array.from(userMap.values()));
      setSuppCoeff(Number(slot.coefficient ?? (slot as any).kip?.coefficient ?? 1));
      setOverrides(slot.attendanceOverrides || {});
    }
  }, [slot]);



  const markAttendance = async (userId: number, customCoeff?: number) => {
    if (!slot) return;
    setLoading(true);
    try {
      const res = await dutyService.leaderMarkAttendance(slot.id, userId, customCoeff);
      if (res.success) {
        message.success(res.message || 'Cập nhật điểm danh thành công');
        setSelectedUser(null);
        onSuccess();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi điểm danh');
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
        message.success('Đã ghi nhận lỗi vi phạm');
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


  const attendedCount = allUsers.filter(u => u.isAttended).length;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: '#fff7ed', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid #fed7aa'
          }}>
            <CheckCircleOutlined style={{ color: '#f97316', fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>ĐIỂM DANH & QUẢN LÝ KÍP</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Dành riêng cho Quản lý kíp trực</Text>
          </div>
        </div>
      }
      bodyStyle={{ padding: '20px 24px' }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      {/* Slot Summary Info */}
      <div style={{ 
        background: '#fafafa', 
        padding: '16px 20px', 
        borderRadius: 12, 
        border: '1px solid #f0f0f0',
        marginBottom: 24
      }}>
        <Row gutter={24}>
          <Col span={10}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>CA TRỰC</Text>
            <Title level={5} style={{ margin: 0 }}>{slot?.shiftLabel}</Title>
          </Col>
          <Col span={7}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>THỜI GIAN</Text>
            <Space>
              <CalendarOutlined style={{ color: '#f97316' }} />
              <Text strong>{dayjs(slot?.shiftDate).format('DD/MM/YYYY')}</Text>
              <Divider type="vertical" />
              <ClockCircleOutlined style={{ color: '#f97316' }} />
              <Text strong>{slot?.startTime} - {slot?.endTime}</Text>
            </Space>
          </Col>
          <Col span={7} style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>TỶ LỆ CÓ MẶT</Text>
            <Title level={4} style={{ margin: 0, color: '#10b981' }}>
              {attendedCount} / {allUsers.length}
            </Title>
          </Col>
        </Row>
      </div>

      {/* Supplementary Attendance Search */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
          <UsergroupAddOutlined style={{ marginRight: 8, color: '#f97316' }} />
          Điểm danh nhân sự bổ sung (không có trong lịch)
        </Text>
        <Space.Compact style={{ width: '100%' }}>
          <UserSelect
            placeholder="Gõ tên hoặc mã nhân sự để tìm kiếm..."
            value={selectedUser}
            onChange={setSelectedUser}
            style={{ flex: 1 }}
          />
          <InputNumber
            min={0}
            step={0.25}
            max={10}
            value={suppCoeff}
            onChange={(val) => setSuppCoeff(val || 1)}
            addonAfter="kíp"
            style={{ width: 110, height: 40, borderRadius: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}
          />
          <AntButton 
            type="primary" 
            icon={<CheckCircleOutlined />}
            style={{ background: '#10b981', borderColor: '#10b981', height: 40 }}
            disabled={!selectedUser || loading}
            onClick={() => {
              if (selectedUser) {
                markAttendance(selectedUser, suppCoeff);
              }
            }}
          >
            Điểm danh ngay
          </AntButton>
        </Space.Compact>
      </div>

      <Divider style={{ margin: '24px 0' }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>DANH SÁCH NHÂN SỰ TRỰC</span>
      </Divider>

      {/* Attendance List */}
      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '4px' }}>
        {allUsers.length === 0 ? (
          <Empty description="Chưa có nhân sự nào trong danh sách" />
        ) : (
          <Row gutter={[12, 12]}>
            {allUsers.map((u) => {
              const isAttended = u.isAttended;
              const isLeader = (slot?.assignedUserIds?.[0] === u.id) || (slot?.tempLeaderId === u.id);
              const defaultSlotCoeff = Number(slot?.coefficient ?? (slot as any)?.kip?.coefficient ?? 1);
              const overrideVal = overrides[String(u.id)] ?? overrides[Number(u.id)];
              const userCoeff = overrideVal !== undefined && overrideVal !== null ? overrideVal : defaultSlotCoeff;
              const isOverridden = overrideVal !== undefined && overrideVal !== null && overrideVal !== defaultSlotCoeff;
              
              return (
                <Col span={24} key={u.id}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    background: isAttended ? '#f0fdf4' : '#fff', 
                    border: `1px solid ${isAttended ? '#bcf0da' : '#f0f0f0'}`,
                    borderRadius: 12,
                    transition: 'all 0.2s',
                    boxShadow: isAttended ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <Avatar 
                      size={48} 
                      src={u.avatar} 
                      icon={<UserOutlined />} 
                      style={{ border: `2px solid ${isAttended ? '#10b981' : '#f0f0f0'}` }}
                    />
                    <div style={{ marginLeft: 16, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 15 }}>{getUserDisplayName(u)}</Text>
                        {getPositionTag(u.position)}
                        {isLeader && <Tag color="warning" icon={<ThunderboltOutlined />}>Quản lý kíp</Tag>}
                        {!u.isAssigned && <Tag color="purple">Bổ sung</Tag>}
                        {isOverridden && <Tag color="gold" style={{ fontSize: 10 }}>Tùy chỉnh: {userCoeff} kíp</Tag>}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{u.studentId || u.username || 'N/A'}</Text>
                    </div>

                    <Space size={12} align="center">
                      <Tooltip title="Hệ số kíp thực tế được tính cho nhân sự này">
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
                            setOverrides(prev => {
                              const next = { ...prev };
                              if (val === null || val === undefined) {
                                delete next[String(u.id)];
                              } else {
                                next[String(u.id)] = val;
                              }
                              return next;
                            });
                          }}
                          onBlur={() => {
                            if (slot) {
                              dutyService.updateSlot(slot.id, { attendanceOverrides: overrides });
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
                        type="text"
                        onClick={() => {
                          setViolationUser(u);
                          const existing = slot?.violations?.find((v: any) => String(v.userId) === String(u.id));
                          if (existing) {
                            violationForm.setFieldsValue(existing);
                          } else {
                            violationForm.resetFields();
                            violationForm.setFieldsValue({ coefficient: 1 });
                          }
                          setIsViolationModalOpen(true);
                        }}
                      >
                        Báo lỗi
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
            <span>Ghi nhận lỗi vi phạm: {violationUser?.name}</span>
          </Space>
        }
        onCancel={() => setIsViolationModalOpen(false)}
        onOk={handleReportViolation}
        width={400}
      >
        <Form.Item name="type" label="Loại lỗi" rules={[{ required: true, message: 'Vui lòng chọn loại lỗi' }]}>
          <Select placeholder="Chọn loại lỗi vi phạm">
            <Select.Option value="Vắng mặt không phép">Vắng mặt không phép</Select.Option>
            <Select.Option value="Đi muộn">Đi muộn</Select.Option>
            <Select.Option value="Sai tác phong">Sai tác phong</Select.Option>
            <Select.Option value="Khác">Khác (Ghi chú)</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="coefficient" label="Hệ số lỗi" initialValue={1} rules={[{ required: true }]}>
          <InputNumber min={0.1} max={5} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú chi tiết">
          <Input.TextArea placeholder="Nhập chi tiết lỗi..." rows={3} />
        </Form.Item>
      </FormModal>
    </Modal>
  );
};

export default ShiftLeaderAttendanceModal;
