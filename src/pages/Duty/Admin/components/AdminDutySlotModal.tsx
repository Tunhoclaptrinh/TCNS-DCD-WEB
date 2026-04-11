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
  Tooltip,
  Modal,
} from 'antd';
import { 
  EditOutlined, 
  ClockCircleOutlined, 
  TeamOutlined, 
  ScheduleOutlined, 
  SettingOutlined, 
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import dutyService, { DutySlot } from '@/services/duty.service';
import apiClient from '@/config/axios.config';
import DutyPersonnelPicker, { POSITION_LABELS } from '../../components/DutyPersonnelTable';

const { Text } = Typography;

interface AdminDutySlotModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  loading?: boolean;
}

/**
 * Management Modal for Duty Slot - Admin Version
 */
const AdminDutySlotModal: React.FC<AdminDutySlotModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  loading: externalLoading = false,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

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

  // Fetch all users for picking
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get('/users');
        const rawData = res.data || res;
        const usersArray = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
        setAllUsers(usersArray);
      } catch (err) {
        console.error('Lỗi khi tải danh sách người dùng:', err);
      }
    };
    if (open) fetchUsers();
  }, [open]);

  const watchedAssignedIds = Form.useWatch('assignedUserIds', form) || [];
  
  const currentAssignedUsers = React.useMemo(() => {
    const rawIds = watchedAssignedIds.length > 0 ? watchedAssignedIds : (slot?.assignedUserIds || []);
    if (!rawIds.length) return [];
    
    return rawIds.map((id: any) => {
      const user = allUsers.find(u => String(u.id) === String(id)) || 
                   slot?.assignedUsers?.find((u: any) => String(u.id) === String(id));
      if (user) return user;
      return { id, name: `User ${id}` };
    });
  }, [watchedAssignedIds, allUsers, slot]);

  const handleOk = async (values: any) => {
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

  const handleDelete = async () => {
    if (!slot) return;
    Modal.confirm({
      title: 'Xác nhận xóa kíp trực?',
      content: 'Thao tác này sẽ xóa kíp trực vĩnh viễn khỏi lịch. Bạn có chắc chắn muốn tiếp tục?',
      okText: 'Xóa kíp',
      okType: 'danger',
      cancelText: 'Hủy bỏ',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await dutyService.deleteSlot(slot.id);
          if (res.success) {
            message.success('Đã xóa kíp trực');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Lỗi khi xóa kíp trực');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const watchedAttendedIds = Form.useWatch('attendedUserIds', form) || [];

  const toggleAttendance = async (uId: number) => {
    const currentAttended = form.getFieldValue('attendedUserIds') || [];
    let nextAttended: number[];
    
    if (currentAttended.some((id: any) => String(id) === String(uId))) {
      nextAttended = currentAttended.filter((id: any) => String(id) !== String(uId));
    } else {
      nextAttended = [...currentAttended, uId];
    }
    
    form.setFieldValue('attendedUserIds', nextAttended);
    
    if (slot?.id) {
      try {
        await dutyService.markAttendance(slot.id, nextAttended);
        message.success(nextAttended.includes(uId) ? 'Đã ghi nhận điểm danh' : 'Đã hủy điểm danh');
      } catch (err) {
        message.error('Lỗi khi ghi nhận điểm danh');
        form.setFieldValue('attendedUserIds', currentAttended);
      }
    }
  };

  return (
    <FormModal
      open={open}
      title={
        <Space>
          <div style={{ width: 4, height: 18, background: '#6366f1', borderRadius: 2 }} />
          <span>{slot?.id ? "Hiệu chỉnh Kíp trực" : "Thêm mới Kíp trực"}</span>
          {slot?.status && (
            <Tag color={slot.status === 'open' ? 'success' : 'error'} style={{ marginLeft: 8, borderRadius: 12 }}>
              {slot.status === 'open' ? 'ĐANG MỞ' : 'ĐÃ KHÓA'}
            </Tag>
          )}
          {slot?.id && (
            <AntButton 
              danger 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              style={{ marginLeft: 16 }}
            >
              Xóa kíp
            </AntButton>
          )}
        </Space>
      }
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading || externalLoading}
      width={780}
      destroyOnClose
      okText="Lưu thay đổi"
      cancelText="Hủy bỏ"
    >
      <div style={{ padding: '0 4px' }}>
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <EditOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin hiển thị & Trạng thái</span>
        </Divider>

        <Row gutter={[24, 16]}>
          <Col span={16}>
            <Form.Item 
              label="Tiêu đề hiển thị (Trên lịch)" 
              name="shiftLabel" 
              rules={[{ required: true }]}
            >
              <Input 
                prefix={<EditOutlined style={{ color: '#6366f1' }} />} 
                placeholder="VD: Kíp 1 - Tòa A" 
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Trạng thái" name="status">
              <Select options={[
                { label: <Badge status="success" text="Đang mở (Cho phép ĐK)" />, value: 'open' },
                { label: <Badge status="error" text="Đã khóa (Chỉ xem)" />, value: 'locked' }
              ]} />
            </Form.Item>
          </Col>
        </Row>

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
                inputReadOnly
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item label="Khung giờ thực tế" name="timeRange" rules={[{ required: true }]}>
              <TimePicker.RangePicker 
                format="HH:mm" 
                style={{ width: '100%' }} 
                inputReadOnly
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Chỉ tiêu" name="capacity" rules={[{ required: true }]}>
              <InputNumber 
                min={1} 
                style={{ width: '100%' }} 
                prefix={<TeamOutlined style={{ color: '#6366f1' }} />} 
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <ScheduleOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Quản lý nhân sự</span>
        </Divider>

        <div style={{ marginBottom: 20 }}>
          <Form.Item label="Phân công trực (ID)" name="assignedUserIds" noStyle>
            <DutyPersonnelPicker label="Thực hiện phân công nhân sự" />
          </Form.Item>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 13, color: '#475569' }}>
              DANH SÁCH NHÂN SỰ ĐÃ ĐĂNG KÝ ({currentAssignedUsers.length} / {form.getFieldValue('capacity') || slot?.capacity || 0})
            </Text>
          </div>

          <List
            size="small"
            dataSource={currentAssignedUsers}
            locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center' }}><Text type="secondary" italic>Chứa có ai đăng ký</Text></div> }}
            renderItem={(u: any) => {
              const isAttended = watchedAttendedIds.includes(u.id);
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
                    <Space size={8}>
                      {isAttended ? 
                        <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 6, margin: 0 }}>ĐÃ ĐIỂM DANH</Tag> : 
                        <Tag color="default" style={{ borderRadius: 6, margin: 0, color: '#94a3b8' }}>VẮNG MẶT</Tag>
                      }
                      
                      <Tooltip title={isAttended ? "Hủy điểm danh" : "Xác nhận điểm danh"}>
                        <AntButton 
                          size="small"
                          shape="circle"
                          type={isAttended ? "primary" : "default"}
                          icon={<CheckCircleOutlined />}
                          onClick={() => toggleAttendance(u.id)}
                          style={{ 
                            fontSize: 12,
                            borderColor: isAttended ? '#22c55e' : '#cbd5e1',
                            background: isAttended ? '#22c55e' : 'transparent',
                            color: isAttended ? '#fff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </List.Item>
              );
            }}
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <Form.Item label="Xác nhận điểm danh" name="attendedUserIds">
            <DutyPersonnelPicker 
              label="Ghi nhận điểm danh thực tế" 
              userIds={watchedAssignedIds}
            />
          </Form.Item>
        </div>

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <SettingOutlined style={{ color: '#6366f1' }} /> 
          <span style={{ fontSize: 13, marginLeft: 8 }}>Thông tin bổ sung</span>
        </Divider>

        <Form.Item label="Ghi chú / Địa điểm trực" name="note">
          <Input.TextArea placeholder="Thông tin thêm cho kíp trực này..." rows={3} />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default AdminDutySlotModal;
