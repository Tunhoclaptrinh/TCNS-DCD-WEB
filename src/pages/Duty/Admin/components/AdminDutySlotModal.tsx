import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
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
  Button,
  Tag,
  Avatar,
  List,
  Switch,
} from 'antd';
import { 
  ScheduleOutlined, 
  EyeOutlined,
  EyeInvisibleOutlined,
  UnlockOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  EditOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import FormModal from '@/components/common/FormModal';
import dutyService, { DutySlot, DutyShift } from '@/services/duty.service';
import DutyPersonnelPicker from '../../components/DutyPersonnelTable';
import SlotStructureEditor from './SlotStructureEditor';

const { Text, Title } = Typography;

interface AdminDutySlotModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  slot: DutySlot | null;
  templates: DutyShift[];
  loading?: boolean;
}

const AdminDutySlotModal: React.FC<AdminDutySlotModalProps> = ({
  open,
  onCancel,
  onSuccess,
  slot,
  templates,
  loading: externalLoading = false,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
  const [localShiftData, setLocalShiftData] = useState<any>(null);
  


  useEffect(() => {
    if (open && slot) {
      setLocalShiftData(null);
      
      form.setFieldsValue({
        ...slot,
        shiftDate: dayjs(slot.shiftDate),
        timeRange: slot.startTime && slot.endTime 
          ? [dayjs(slot.startTime, 'HH:mm'), dayjs(slot.endTime, 'HH:mm')] 
          : undefined,
        status: slot.status || 'open',
        visibilityMode: slot.config?.visibilityMode || 'public',
        assignedUserIds: slot.assignedUserIds || [],
        attendedUserIds: slot.attendedUserIds || []
      });
    }
  }, [open, slot, form]);

  const handleSubmit = async (values: any) => {
    if (!slot) return;
    setLoading(true);
    try {
      const targetDateStr = values.shiftDate.format('YYYY-MM-DD');
      
      if (localShiftData && slot.shiftId) {
        await dutyService.addShiftToDay(targetDateStr, slot.shiftId, {
          name: localShiftData.name,
          startTime: localShiftData.startTime,
          endTime: localShiftData.endTime,
        }, 'shifts');
      }

      const payload = {
        ...values,
        shiftDate: targetDateStr,
        startTime: values.timeRange?.[0]?.format('HH:mm'),
        endTime: values.timeRange?.[1]?.format('HH:mm'),
        config: {
          ...slot.config,
          visibilityMode: values.visibilityMode
        }
      };
      
      const res = await dutyService.updateSlot(slot.id, payload);
      
      if (res.success) {
        await dutyService.markAttendance(slot.id, values.attendedUserIds || []);
        message.success('Cập nhật kíp trực và điểm danh thành công');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      message.error('Lỗi khi cập nhật: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (userId: number, checked: boolean) => {
    const currentAttended = form.getFieldValue('attendedUserIds') || [];
    let nextAttended = [];
    if (checked) {
      nextAttended = [...new Set([...currentAttended, userId])];
    } else {
      nextAttended = currentAttended.filter((id: number) => id !== userId);
    }
    form.setFieldsValue({ attendedUserIds: nextAttended });
  };

  return (
    <FormModal
      open={open}
      form={form}
      title={
        <Space>
          <ScheduleOutlined />
          <span>Cập nhật Kíp trực</span>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleSubmit}
      loading={loading || externalLoading}
      width={900}
      okText="Lưu thay đổi"
    >
      <div style={{ padding: '0 4px' }}>
        <Form.Item noStyle shouldUpdate>
          {() => {
            const shiftId = slot?.shiftId;
            const shift = templates.find(s => s.id === shiftId);

            if (shift) {
              const isSpecial = !!shift.isSpecialEvent;
              return (
                <div style={{ 
                  background: isSpecial ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: '24px',
                  border: `1px solid ${isSpecial ? '#bfdbfe' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                      background: isSpecial ? '#3b82f6' : '#64748b',
                      color: 'white',
                      width: 50,
                      height: 50,
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800 }}>{dayjs(slot?.shiftDate).format('ddd')}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1 }}>{dayjs(slot?.shiftDate).format('DD')}</div>
                    </div>
                    <div>
                      <Space align="center" size={8}>
                        <Title level={5} style={{ margin: 0, color: isSpecial ? '#1e40af' : '#1e293b' }}>{shift.name}</Title>
                        {isSpecial && <Tag color="blue">SỰ KIỆN</Tag>}
                      </Space>
                      <div style={{ marginTop: 2 }}>
                        <Space style={{ color: isSpecial ? '#3b82f6' : '#64748b', fontSize: 13 }}>
                          <ClockCircleOutlined />
                          <Text strong style={{ color: 'inherit' }}>{shift.startTime} - {shift.endTime}</Text>
                        </Space>
                      </div>
                    </div>
                  </div>

                  <Button 
                    icon={<SettingOutlined />} 
                    size="small"
                    onClick={() => {
                      const nextVal = !isEditShiftOpen;
                      setIsEditShiftOpen(nextVal);
                      if (nextVal) {
                        setLocalShiftData({
                          name: shift.name,
                          startTime: shift.startTime,
                          endTime: shift.endTime,
                        });
                      }
                    }}
                    type={isEditShiftOpen ? 'primary' : 'default'}
                  >
                    {isEditShiftOpen ? "Lưu tạm thông số" : "Sửa thông số Ca"}
                  </Button>
                </div>
              );
            }
            return null;
          }}
        </Form.Item>

        {isEditShiftOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            style={{ marginBottom: 24, padding: '20px', background: '#fff', borderRadius: '12px', border: '1.5px dashed #bfdbfe' }}
          >
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <EditOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Chỉnh sửa thông số Ca riêng cho ngày này</span>
            </Divider>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Tên Ca hiển thị">
                  <Input 
                    value={localShiftData?.name} 
                    onChange={e => setLocalShiftData({ ...localShiftData, name: e.target.value })}
                    placeholder="Tên ca..."
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Thời gian hoạt động">
                  <TimePicker.RangePicker 
                    format="HH:mm" 
                    style={{ width: '100%' }}
                    value={localShiftData?.startTime && localShiftData?.endTime ? [dayjs(localShiftData.startTime, 'HH:mm'), dayjs(localShiftData.endTime, 'HH:mm')] : null}
                    onChange={(vals) => {
                      if (vals) {
                        setLocalShiftData({
                          ...localShiftData,
                          startTime: vals[0]!.format('HH:mm'),
                          endTime: vals[1]!.format('HH:mm')
                        });
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </motion.div>
        )}

        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
          <ThunderboltOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Thông số kíp trực</span>
        </Divider>

        <Row gutter={[24, 0]}>
          <Col span={10}>
            <Form.Item label="Tên Kíp / Nhãn" name="shiftLabel" rules={[{ required: true }]}>
              <Input placeholder="Tên hiển thị..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày trực" name="shiftDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Trạng thái" name="status">
              <Select>
                <Select.Option value="open">Đang mở (Open)</Select.Option>
                <Select.Option value="locked">Khóa (Locked)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[24, 0]}>
          <Col span={10}>
            <Form.Item label="Khung giờ trực" name="timeRange" rules={[{ required: true }]}>
              <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Tổng chỉ tiêu" name="capacity" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name="visibilityMode" 
              label="Bảo mật nhân sự"
              initialValue="public"
            >
              <Select
                options={[
                  { 
                    label: <Space><UnlockOutlined /><span>Công khai</span></Space>, 
                    value: 'public' 
                  },
                  { 
                    label: <Space><EyeInvisibleOutlined /><span>Bảo mật song phương</span></Space>, 
                    value: 'private_mutual' 
                  },
                  { 
                    label: <Space><EyeOutlined /><span>Bảo vệ Thành viên</span></Space>, 
                    value: 'protect_members' 
                  },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <SlotStructureEditor form={form} />

        <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
          <Space>
            <TeamOutlined /> <span style={{ fontSize: 13, fontWeight: 600 }}>Quản lý nhân sự & Điểm danh</span>
          </Space>
        </Divider>

        <div style={{ 
          background: '#f8fafc', 
          padding: '20px', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>Danh sách trực thực tế</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>Tích chọn để xác nhận nhân sự thực hiện trực</Text>
            </div>
            <Space size={12} align="center">
              <Form.Item name="assignedUserIds" noStyle style={{ marginBottom: 0 }}>
                <DutyPersonnelPicker 
                  type="primary"
                  label="Phân công kíp" 
                  onChange={(ids) => {
                    form.setFieldsValue({ assignedUserIds: ids });
                  }}
                />
              </Form.Item>
              
              <Form.Item name="attendedUserIds" noStyle style={{ marginBottom: 0 }}>
                <DutyPersonnelPicker 
                  label="Thêm ĐD bổ sung" 
                  icon={<UsergroupAddOutlined style={{ color: '#16a34a' }} />}
                  style={{ border: '1px solid #dcfce7', background: '#f0fdf4' }}
                />
              </Form.Item>

              <Button 
                type="primary" 
                ghost 
                onClick={() => {
                  const assigned = form.getFieldValue('assignedUserIds') || [];
                  form.setFieldsValue({ attendedUserIds: assigned });
                }}
                icon={<CheckCircleOutlined />}
                style={{ borderRadius: 8, minWidth: 120, height: 36 }}
              >
                Tất cả có mặt
              </Button>
            </Space>
          </div>

          <Form.Item noStyle shouldUpdate={(prev, curr) => (
            prev.assignedUserIds !== curr.assignedUserIds || 
            prev.attendedUserIds !== curr.attendedUserIds
          )}>
            {({ getFieldValue }) => {
              const assignedIds = getFieldValue('assignedUserIds') || [];
              const attendedIds = getFieldValue('attendedUserIds') || [];
              const allPossibleIds = [...new Set([...assignedIds, ...attendedIds])];
              
              return (
                <List
                  dataSource={allPossibleIds}
                  renderItem={(id: number) => {
                    const isAssigned = assignedIds.includes(id);
                    const isAttended = attendedIds.includes(id);
                    const userDetail = (slot?.assignedUsers || []).find(u => u.id === id);

                    return (
                      <List.Item 
                        style={{ 
                          padding: '12px 16px', 
                          background: '#fff', 
                          borderRadius: '12px', 
                          marginBottom: '8px',
                          border: `1px solid ${isAttended ? '#dcfce7' : '#f1f5f9'}`,
                          transition: 'all 0.2s'
                        }}
                        actions={[
                          <Space size={12}>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                              <Text strong style={{ fontSize: 12, color: isAttended ? '#16a34a' : '#64748b' }}>
                                {isAttended ? 'CÓ MẶT' : 'CHƯA ĐIỂM DANH'}
                              </Text>
                              {!isAssigned && <Tag color="orange" style={{ fontSize: '0.6rem', border: 'none', margin: 0 }}>BỐ SUNG</Tag>}
                            </div>
                            <Switch 
                              size="small"
                              checked={isAttended}
                              checkedChildren={<CheckOutlined />}
                              unCheckedChildren={<CloseOutlined />}
                              onChange={(checked) => handleToggleAttendance(id, checked)}
                            />
                          </Space>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} src={userDetail?.avatar} />}
                          title={<Text strong={isAttended}>{userDetail?.name || userDetail?.username || `#${id}`}</Text>}
                          description={
                            <Space split={<Divider type="vertical" />} style={{ fontSize: 11 }}>
                              <Text type="secondary">{userDetail?.studentId || 'Chưa rõ MSV'}</Text>
                              {isAssigned ? <Tag color="blue" style={{ fontSize: '0.6rem' }}>Theo lịch</Tag> : <Text type="warning">Nhân sự ngoài kíp</Text>}
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                  locale={{ emptyText: <div style={{ padding: '20px 0', textAlign: 'center' }}>Chưa có nhân sự nào được chọn</div> }}
                />
              );
            }}
          </Form.Item>
        </div>

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <InfoCircleOutlined /> <span style={{ fontSize: 13, marginLeft: 8 }}>Ghi chú quản trị</span>
        </Divider>

        <Form.Item name="note" noStyle>
          <Input.TextArea placeholder="Thông tin thêm..." rows={2} style={{ borderRadius: 8 }} />
        </Form.Item>
      </div>
    </FormModal>
  );
};

export default AdminDutySlotModal;
