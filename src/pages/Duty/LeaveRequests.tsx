import React, { useState, useEffect, useCallback } from 'react';
import { Space, message, Typography, Tag, Modal, Tooltip, Tabs, Input, Form, Avatar as AntdAvatar, Select, Row, Col, Dropdown, Menu } from 'antd';
import { Button } from '@/components/common';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined, 
  CalendarOutlined, 
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ContainerOutlined,
  MenuOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';
import apiClient from "@/config/axios.config";
import DataTable from '@/components/common/DataTable';
import StatisticsCard from '@/components/common/StatisticsCard';

const { Text } = Typography;

const LeaveRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  
  // Advanced Filtering state
  const [filterValues, setFilterValues] = useState<any>({});
  const [searchValue, setSearchValue] = useState('');
  
  // Rejection Modal state
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectForm] = Form.useForm();

  // CRUD Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  
  // Data for selects
  const [users, setUsers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users', { params: { limit: 1000 } });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const res = await dutyService.getWeeklySchedule();
      setSlots(res.data?.slots || []);
    } catch (err) {
      console.error('Failed to fetch slots');
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      fetchUsers();
      fetchAvailableSlots();
    }
  }, [isModalVisible]);

  const fetchRequests = useCallback(async (status?: string, params: any = {}) => {
    setLoading(true);
    try {
      const currentTab = status || activeTab;
      const queryParams = {
        ...(currentTab === 'all' ? {} : { status: currentTab }),
        ...filterValues,
        ...params,
        ...(searchValue ? { _q: searchValue } : {})
      };
      
      const res = await dutyService.getLeaveRequests(queryParams);
      const rawData = res.data || res;
      setRequests(Array.isArray(rawData) ? rawData : (rawData?.data || []));
    } catch (err) {
      message.error('Không thể tải danh sách đơn nghỉ');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterValues, searchValue]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await dutyService.getStats();
      setStats(res.data || res);
    } catch (err) {
      console.error('Failed to fetch stats');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests]);

  const handleResolve = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const res = await dutyService.resolveLeaveRequest(id, status, reason || '');
      if (res.success || res) {
        message.success(status === 'approved' ? 'Đã duyệt đơn nghỉ' : 'Đã từ chối đơn nghỉ');
        fetchRequests();
        fetchStats();
      }
    } catch (err) {
      message.error('Lỗi khi xử lý đơn');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dutyService.deleteLeaveRequest(id);
      message.success('Đã xóa đơn nghỉ');
      fetchRequests();
      fetchStats();
    } catch (err) {
      message.error('Lỗi khi xóa đơn');
    }
  };

  const handleBatchDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => dutyService.deleteLeaveRequest(id)));
      message.success(`Đã xóa ${ids.length} đơn nghỉ`);
      fetchRequests();
      fetchStats();
    } catch (err) {
      message.error('Lỗi khi xóa hàng loạt');
    }
  };

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      userId: record.userId,
      slotId: record.slotId,
      reason: record.reason,
      status: record.status,
      rejectionReason: record.rejectionReason
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await dutyService.updateLeaveRequest(editingId, values);
        message.success('Đã cập nhật đơn nghỉ');
      } else {
        await dutyService.createLeaveManual(values);
        message.success('Đã tạo đơn nghỉ mới');
      }
      setIsModalVisible(false);
      fetchRequests();
      fetchStats();
    } catch (err) {
      message.error('Lỗi khi lưu thông tin');
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    rejectForm.resetFields();
    setIsRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (rejectingId) {
        await handleResolve(rejectingId, 'rejected', values.reason);
        setIsRejectModalVisible(false);
      }
    } catch (err) {
      // Form validation error
    }
  };

  const columns = [
    {
      title: 'Nhân sự gửi đơn',
      key: 'user',
      width: 280,
      render: (_: any, r: any) => (
        <Space size="middle">
          <AntdAvatar 
            src={r.user?.avatar} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: 'var(--primary-color)', flexShrink: 0 }}
          />
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 15 }}>{r.user?.name}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{r.user?.studentId || r.user?.email}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Chi tiết kíp trực',
      key: 'slot',
      width: 250,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>{r.slot?.shiftLabel}</Text>
          <Space size={8} style={{ marginTop: 4 }}>
            <CalendarOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(r.slot?.shiftDate).format('dddd, DD/MM/YYYY')}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Khung giờ',
      key: 'time',
      width: 150,
      render: (_: any, r: any) => (
        <Tag color="cyan" icon={<ClockCircleOutlined />}>
          {r.slot?.startTime} - {r.slot?.endTime}
        </Tag>
      )
    },
    {
      title: 'Lý do & Ghi chú',
      key: 'reason',
      minWidth: 200,
      render: (_: any, r: any) => (
        <div style={{ padding: '4px 0' }}>
          <Text style={{ display: 'block', fontSize: 14 }}>{r.reason}</Text>
          {r.status === 'rejected' && r.rejectionReason && (
            <div style={{ marginTop: 4 }}>
              <Text type="danger" style={{ fontSize: 12, fontStyle: 'italic' }}>
                Phản hồi: {r.rejectionReason}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config: any = {
          pending: { color: 'orange', text: 'Chờ duyệt' },
          approved: { color: 'green', text: 'Đã duyệt' },
          rejected: { color: 'red', text: 'Từ chối' },
        };
        const { color, text } = config[status] || { color: 'default', text: status };
        return <Tag color={color}>{text.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => <Text type="secondary">{dayjs(date).format('HH:mm DD/MM/YYYY')}</Text>,
    }
  ];

  const requestStats = stats?.requests || {};

  return (
    <div className="leave-requests-page" style={{ paddingBottom: 24 }}>
      <DataTable
        headerContent={
          <div style={{ marginBottom: 16 }}>
            <StatisticsCard
              loading={statsLoading}
              hideCard
              data={[
                {
                  title: 'Đang chờ duyệt',
                  value: requestStats.leavePending || 0,
                  icon: <ClockCircleOutlined />,
                  valueColor: '#faad14',
                  onClick: () => setActiveTab('pending'),
                  selected: activeTab === 'pending'
                },
                {
                  title: 'Đã phê duyệt',
                  value: requestStats.leaveApproved || 0,
                  icon: <CheckCircleOutlined />,
                  valueColor: '#52c41a',
                  onClick: () => setActiveTab('approved'),
                  selected: activeTab === 'approved'
                },
                {
                  title: 'Đã từ chối',
                  value: requestStats.leaveRejected || 0,
                  icon: <CloseCircleOutlined />,
                  valueColor: '#ff4d4f',
                  onClick: () => setActiveTab('rejected'),
                  selected: activeTab === 'rejected'
                },
                {
                  title: 'Tổng số đơn',
                  value: (requestStats.leavePending || 0) + (requestStats.leaveApproved || 0) + (requestStats.leaveRejected || 0),
                  icon: <ContainerOutlined />,
                  valueColor: '#1890ff',
                  onClick: () => setActiveTab('all'),
                  selected: activeTab === 'all'
                }
              ]}
              colSpan={{ xs: 24, sm: 12, md: 6 }}
              rowGutter={16}
            />
            
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginTop: 16 }}
              items={[
                { label: 'Cần xử lý', key: 'pending', icon: <ClockCircleOutlined /> },
                { label: 'Đã duyệt', key: 'approved', icon: <CheckCircleOutlined /> },
                { label: 'Từ chối', key: 'rejected', icon: <CloseCircleOutlined /> },
                { label: 'Tất cả đơn', key: 'all', icon: <HistoryOutlined /> },
              ]}
            />
          </div>
        }
        title="Quản lý đơn xin nghỉ"
        loading={loading}
        dataSource={requests}
        columns={columns}
        rowKey="id"
        onRefresh={() => {
          fetchRequests();
          fetchStats();
        }}
        searchable={true}
        searchPlaceholder="Tìm kiếm thành viên, lý do..."
        extra={
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setIsGuideModalOpen(true)}
            variant="ghost"
          >
            Hướng dẫn
          </Button>
        }
        customActions={(r) => (
          <Space size="small">
            <Tooltip title="Chấp thuận">
              <Button
                variant="ghost"
                buttonSize="small"
                icon={<CheckCircleOutlined style={{ fontSize: 16 }} />}
                style={{ color: r.status === 'pending' ? '#52c41a' : '#bfbfbf', padding: '4px' }}
                onClick={() => handleResolve(r.id, 'approved')}
                disabled={r.status !== 'pending'}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                variant="ghost"
                buttonSize="small"
                icon={<CloseCircleOutlined style={{ fontSize: 16 }} />}
                style={{ color: r.status === 'pending' ? '#ff4d4f' : '#bfbfbf', padding: '4px' }}
                onClick={() => openRejectModal(r.id)}
                disabled={r.status !== 'pending'}
              />
            </Tooltip>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              overlay={
                <Menu>
                  <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                    Chỉnh sửa
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => handleDelete(r.id)}>
                    Xóa vĩnh viễn
                  </Menu.Item>
                </Menu>
              }
            >
              <Button variant="ghost" buttonSize="small" style={{ padding: '4px' }}>
                <MenuOutlined style={{ fontSize: 16 }} />
              </Button>
            </Dropdown>
          </Space>
        )}
        onAdd={openAdd}
        batchOperations={true}
        onBatchDelete={handleBatchDelete}
        filters={[
          {
            key: "status",
            label: "Trạng thái xử lý",
            type: "select" as const,
            operators: ['eq'],
            options: [
              { label: "Chờ duyệt", value: "pending" },
              { label: "Đã duyệt", value: "approved" },
              { label: "Từ chối", value: "rejected" },
            ],
          },
          {
            key: "createdAt",
            label: "Ngày gửi đơn",
            type: "date" as const,
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
          },
          {
            key: "reason",
            label: "Lý do nghỉ",
            type: "input" as const,
            operators: ['like'],
          }
        ]}
        filterValues={filterValues}
        onFilterChange={(key, val) => {
          const newFilters = { ...filterValues, [key]: val };
          setFilterValues(newFilters);
          fetchRequests(activeTab, newFilters);
        }}
        onClearFilters={() => {
          setFilterValues({});
          fetchRequests(activeTab, {});
        }}
        onSearch={(val) => {
          setSearchValue(val);
          fetchRequests(activeTab, { _q: val });
        }}
      />

      {/* Admin CRUD Modal */}
      <Modal
        title={editingId ? "Chỉnh sửa đơn nghỉ" : "Thêm mới đơn nghỉ (Admin)"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={500}
        centered
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 16 }}>
            <Button 
              variant="ghost" 
              onClick={() => setIsModalVisible(false)} 
              style={{ minWidth: 120 }}
            >
              Hủy bỏ
            </Button>
            <Button 
              variant="primary" 
              onClick={handleModalOk} 
              style={{ minWidth: 120 }}
            >
              {editingId ? "Cập nhật" : "Tạo đơn"}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" style={{ padding: '8px 0' }}>
          <Form.Item
            name="userId"
            label="Thành viên"
            rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm kiếm theo tên, MSV hoặc email..."
              optionFilterProp="children"
              filterOption={(input, option: any) => {
                const searchStr = (option?.label || '').toLowerCase();
                const dataStr = (option?.['data-search'] || '').toLowerCase();
                return searchStr.includes(input.toLowerCase()) || dataStr.includes(input.toLowerCase());
              }}
              options={users.map(u => ({ 
                label: u.name, 
                value: u.id,
                'data-search': `${u.studentId || ''} ${u.email || ''}`,
                render: (
                  <Space>
                    <AntdAvatar size="small" src={u.avatar} icon={<UserOutlined />} />
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 13 }}>{u.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{u.studentId || u.email}</Text>
                    </Space>
                  </Space>
                )
              }))}
              optionRender={(option) => option.data.render}
            />
          </Form.Item>

          <Form.Item
            name="slotId"
            label="Kíp trực"
            rules={[{ required: true, message: 'Vui lòng chọn kíp trực' }]}
          >
            <Select
              showSearch
              placeholder="Chọn kíp trực từ danh sách..."
              optionFilterProp="label"
              options={slots.map(s => ({ 
                label: `${dayjs(s.shiftDate).format('DD/MM')} - ${s.shiftLabel} (${s.startTime}-${s.endTime})`, 
                value: s.id 
              }))}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do nghỉ"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea placeholder="Nhập lý do vắng mặt..." rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="status" label="Trạng thái xử lý" initialValue="pending">
                <Select options={[
                  { label: '🔥 Chờ duyệt', value: 'pending' },
                  { label: '✅ Đã duyệt (Tự động gỡ tên)', value: 'approved' },
                  { label: '❌ Từ chối', value: 'rejected' },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) => 
              getFieldValue('status') === 'rejected' ? (
                <Form.Item name="rejectionReason" label="Lý do từ chối" rules={[{ required: true, message: 'Nhập lý do từ chối' }]}>
                  <Input.TextArea placeholder="Ghi chú lý do từ chối gửi đến thành viên..." rows={2} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        title="Từ chối đơn xin nghỉ"
        open={isRejectModalVisible}
        onOk={handleRejectSubmit}
        onCancel={() => setIsRejectModalVisible(false)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối đơn nghỉ' }]}
          >
            <Input.TextArea placeholder="Nhập lý do gửi đến thành viên..." rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Guide Modal */}
      <Modal
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />
            <span>Hướng dẫn Duyệt đơn nghỉ</span>
          </Space>
        }
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[
          <Button key="close" variant="primary" onClick={() => setIsGuideModalOpen(false)} style={{ minWidth: 100 }}>Đã hiểu</Button>
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p>Trang này giúp Admin quản lý đơn xin nghỉ của thành viên theo quy trình:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <b>Xử lý đơn:</b> Các đơn mới sẽ nằm trong tab <b>Cần xử lý</b>. Bạn có thể Duyệt hoặc Từ chối kèm lý do.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Hệ thống tự động:</b> Khi Duyệt, thành viên sẽ tự động được gỡ tên khỏi kíp trực đã đăng ký.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Thông báo:</b> Thành viên sẽ nhận được thông báo ngay khi đơn được xử lý.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Lịch sử:</b> Các đơn đã xử lý có thể xem lại tại các tab tương ứng hoặc <b>Tất cả đơn</b>.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveRequestsPage;
