import React, { useState, useEffect, useCallback } from 'react';
import { Space, message, Typography, Tag, Modal, Tooltip, Avatar, Tabs, Form, Input, Select, Dropdown, Menu } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined, 
  UserOutlined, 
  ClockCircleOutlined,
  HistoryOutlined,
  ContainerOutlined,
  ArrowRightOutlined,
  MenuOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';
import { Button, TabSwitcher, DataTable } from '@/components/common';
import StatisticsCard from '@/components/common/StatisticsCard';
import { useAccess } from '@/hooks/useAccess';
import apiClient from "@/config/axios.config";

const { Title, Text } = Typography;

const SwapRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const { user } = useAccess();
  
  // Advanced Filtering state
  const [filterValues, setFilterValues] = useState<any>({});
  const [searchValue, setSearchValue] = useState('');
  
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
      
      const res = await dutyService.getSwapRequests(queryParams);
      const rawData = res.data || res;
      setRequests(Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []));
    } catch (err) {
      message.error('Không thể tải danh sách yêu cầu đổi ca');
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

  const handleDecide = async (id: number, decision: 'approved' | 'rejected') => {
    if (decision === 'approved') {
      const req = requests.find(r => r.id === id);
      const targetSlot = slots.find(s => s.id === req?.toSlotId);
      
      if (targetSlot) {
        const currentCount = targetSlot.assignedUserIds?.length || 0;
        const capacity = targetSlot.capacity || 0;
        
        if (currentCount >= capacity && capacity > 0) {
          Modal.confirm({
            title: 'Kíp trực đã đủ người',
            content: `Kíp trực này hiện đã có ${currentCount}/${capacity} người. Bạn có chắc chắn muốn điều chuyển thêm thành viên này vào không?`,
            okText: 'Tiếp tục điều chuyển',
            cancelText: 'Hủy bỏ',
            onOk: async () => {
              try {
                const res = await dutyService.decideSwap(id, decision);
                if (res.success || res) {
                  message.success('Đã điều chuyển nhân sự thành công');
                  fetchRequests();
                  fetchStats();
                }
              } catch (err) {
                message.error('Lỗi khi xử lý yêu cầu');
              }
            }
          });
          return;
        }
      }
    }

    try {
      const res = await dutyService.decideSwap(id, decision);
      if (res.success || res) {
        message.success(decision === 'approved' ? 'Đã điều chuyển nhân sự thành công' : 'Đã từ chối điều chuyển');
        fetchRequests();
        fetchStats();
      }
    } catch (err) {
      message.error('Lỗi khi xử lý yêu cầu');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dutyService.deleteSwapRequest(id);
      message.success('Đã xóa yêu cầu đổi ca');
      fetchRequests();
      fetchStats();
    } catch (err) {
      message.error('Lỗi khi xóa yêu cầu');
    }
  };

  const handleBatchDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => dutyService.deleteSwapRequest(id)));
      message.success(`Đã xóa ${ids.length} yêu cầu đổi ca`);
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
      requesterId: record.requesterId,
      targetUserId: record.targetUserId,
      fromSlotId: record.fromSlotId,
      toSlotId: record.toSlotId,
      reason: record.reason,
      status: record.status
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await dutyService.updateSwapRequest(editingId, values);
        message.success('Đã cập nhật yêu cầu');
      } else {
        await dutyService.createSwapManual(values);
        message.success('Đã tạo yêu cầu đổi ca (Admin)');
      }
      setIsModalVisible(false);
      fetchRequests();
      fetchStats();
    } catch (err) {
      message.error('Lỗi khi lưu thông tin');
    }
  };

  const columns = [
    {
      title: 'Thông tin điều chuyển',
      key: 'transfer',
      width: 500,
      render: (_: any, r: any) => {
        const renderSlot = (slot: any, isTarget: boolean) => {
          if (!slot) return <Text type="secondary" italic>N/A</Text>;
          return (
            <Space direction="vertical" size={0}>
              <Text strong={isTarget} style={{ fontSize: 12, color: isTarget ? '#1890ff' : 'inherit' }}>
                {slot.shiftLabel}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(slot.shiftDate).format('DD/MM')} ({dayjs(slot.shiftDate).format('ddd')})
              </Text>
            </Space>
          );
        };

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Space direction="vertical" size={0} style={{ minWidth: 150 }}>
              <Space>
                <Avatar size="small" src={r.requester?.avatar} icon={<UserOutlined />} />
                <Text strong>{r.requester?.name}</Text>
              </Space>
            </Space>
            
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '6px 16px', borderRadius: 8, border: '1px solid #f0f0f0', flex: 1, justifyContent: 'space-between' }}>
              <div style={{ minWidth: 110 }}>{renderSlot(r.fromSlot, false)}</div>
              <ArrowRightOutlined style={{ color: 'var(--primary-color)', margin: '0 12px', fontSize: 14 }} />
              <div style={{ minWidth: 110 }}>{renderSlot(r.toSlot, true)}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 250,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <div style={{ 
            maxWidth: 240, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            fontSize: 12,
            color: '#64748b'
          }}>
            {reason || <Text type="secondary" italic>Không có lý do</Text>}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Ngày trực',
      key: 'date',
      width: 150,
      render: (_: any, r: any) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(r.toSlot?.shiftDate).format('DD/MM/YYYY')}
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: string, r: any) => {
        const config: any = {
          pending: { color: 'orange', text: 'Chờ duyệt' },
          approved: { color: 'green', text: 'Đã duyệt' },
          rejected: { color: 'red', text: 'Từ chối' },
        };
        const s = config[status] || { color: 'default', text: status };
        
        return (
          <Space direction="vertical" size={4}>
            <Tag color={s.color} style={{ margin: 0 }}>{s.text.toUpperCase()}</Tag>
            {r.approver && (
              <Tooltip title={`Xử lý bởi: ${r.approver.name} lúc ${dayjs(r.updatedAt).format('HH:mm DD/MM')}`}>
                <Space size={4}>
                  <Avatar size={16} src={r.approver.avatar} icon={<UserOutlined />} />
                  <Text type="secondary" style={{ fontSize: 10 }}>{r.approver.name}</Text>
                </Space>
              </Tooltip>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => <Text type="secondary">{dayjs(date).format('HH:mm DD/MM/YYYY')}</Text>,
    }
  ];

  const requestStats = stats?.requests || {};

  return (
    <div className="swap-requests-page" style={{ paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space size={12}>
          <Title level={4} style={{ margin: 0, fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px', color: '#1e293b' }}>
            Quản lý đổi kíp trực
          </Title>
          <Tag color="cyan" bordered={false} style={{ borderRadius: 6, fontWeight: 500 }}>Điều chuyển</Tag>
        </Space>
        <Button
          variant="ghost"
          buttonSize="small"
          icon={<QuestionCircleOutlined />}
          onClick={() => setIsGuideModalOpen(true)}
          style={{ 
            color: '#595959',
            border: '1px solid #d9d9d9',
            height: 32
          }}
        >
          Hướng dẫn
        </Button>
      </div>

      <DataTable
        headerContent={
          <div style={{ marginBottom: 16 }}>
            <StatisticsCard
              loading={statsLoading}
              hideCard
              data={[
                {
                  title: 'Yêu cầu chờ duyệt',
                  value: requestStats.swapPending || 0,
                  icon: <ClockCircleOutlined />,
                  valueColor: '#faad14',
                  onClick: () => setActiveTab('pending'),
                  selected: activeTab === 'pending'
                },
                {
                  title: 'Đã hoàn thành',
                  value: requestStats.swapApproved || 0,
                  icon: <CheckCircleOutlined />,
                  valueColor: '#52c41a',
                  onClick: () => setActiveTab('approved'),
                  selected: activeTab === 'approved'
                },
                {
                  title: 'Tổng số đơn',
                  value: (requestStats.swapPending || 0) + (requestStats.swapApproved || 0),
                  icon: <ContainerOutlined />,
                  valueColor: '#1890ff',
                  onClick: () => setActiveTab('all'),
                  selected: activeTab === 'all'
                }
              ]}
              colSpan={{ xs: 24, sm: 12, md: 8 }}
              rowGutter={16}
            />
            
            <TabSwitcher>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                style={{ marginTop: 16 }}
                items={[
                  { label: 'Cần xác nhận', key: 'pending', icon: <ClockCircleOutlined /> },
                  { label: 'Đã xử lý', key: 'approved', icon: <CheckCircleOutlined /> },
                  { label: 'Tất cả', key: 'all', icon: <HistoryOutlined /> },
                ]}
              />
            </TabSwitcher>
          </div>
        }
        title={null}
        loading={loading}
        dataSource={requests}
        columns={columns}
        rowKey="id"
        onRefresh={() => {
          fetchRequests();
          fetchStats();
        }}
        searchable={true}
        searchPlaceholder="Tìm kiếm thành viên..."
        extra={null}
        customActions={(r) => {
          const isTarget = Number(r.targetUserId) === Number(user?.id);
          const isAdmin = user?.role === 'admin' || user?.role === 'staff';
          
          return (
            <Space size="small">
              {(isTarget || isAdmin) && (
                <>
                  <Tooltip title="Chấp nhận">
                    <Button
                      variant="ghost"
                      buttonSize="small"
                      icon={<CheckCircleOutlined style={{ fontSize: 16 }} />}
                      style={{ color: r.status === 'pending' ? '#52c41a' : '#bfbfbf', padding: '4px' }}
                      onClick={() => handleDecide(r.id, 'approved')}
                      disabled={r.status !== 'pending'}
                    />
                  </Tooltip>
                  <Tooltip title="Từ chối">
                    <Button
                      variant="ghost"
                      buttonSize="small"
                      icon={<CloseCircleOutlined style={{ fontSize: 16 }} />}
                      style={{ color: r.status === 'pending' ? '#ff4d4f' : '#bfbfbf', padding: '4px' }}
                      onClick={() => handleDecide(r.id, 'rejected')}
                      disabled={r.status !== 'pending'}
                    />
                  </Tooltip>
                </>
              )}
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
          );
        }}
        onAdd={openAdd}
        batchOperations={true}
        onBatchDelete={handleBatchDelete}
        filters={[
          {
            key: "status",
            label: "Trạng thái",
            type: "select" as const,
            operators: ['eq'],
            options: [
              { label: "Chờ duyệt", value: "pending" },
              { label: "Đã hoàn thành", value: "approved" },
              { label: "Đã từ chối", value: "rejected" },
            ],
          },
          {
            key: "createdAt",
            label: "Ngày tạo yêu cầu",
            type: "date" as const,
            operators: ['gte', 'lte'],
            defaultOperator: 'gte',
          },
          {
            key: "reason",
            label: "Lý do đổi",
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
        title={editingId ? "Chỉnh sửa yêu cầu đổi ca" : "Tạo yêu cầu đổi ca (Admin)"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={700}
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
              {editingId ? "Cập nhật" : "Tạo yêu cầu"}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="requesterId"
            label="Thành viên cần điều chuyển"
            rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm kiếm thành viên..."
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
                    <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
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

          <Space style={{ width: '100%' }} direction="horizontal">
            <Form.Item
              name="fromSlotId"
              label="Kíp trực nguồn (Rời đi)"
              style={{ flex: 1, minWidth: 250 }}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn kíp hiện tại..."
                optionFilterProp="label"
                options={slots.map(s => ({ 
                  label: `${dayjs(s.shiftDate).format('DD/MM')} - ${s.shiftLabel}`, 
                  value: s.id 
                }))}
              />
            </Form.Item>

            <ArrowRightOutlined style={{ marginTop: 10, color: '#bfbfbf' }} />

            <Form.Item
              name="toSlotId"
              label="Kíp trực đích (Chuyển đến)"
              rules={[{ required: true, message: 'Vui lòng chọn kíp đích' }]}
              style={{ flex: 1, minWidth: 250 }}
            >
              <Select
                showSearch
                placeholder="Chọn kíp muốn đến..."
                optionFilterProp="label"
                options={slots.map(s => ({ 
                  label: `${dayjs(s.shiftDate).format('DD/MM')} - ${s.shiftLabel}`, 
                  value: s.id 
                }))}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="reason"
            label="Lý do đổi"
          >
            <Input.TextArea placeholder="Nhập lý do (không bắt buộc)..." rows={2} />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái" initialValue="pending">
            <Select options={[
              { label: 'Chờ duyệt', value: 'pending' },
              { label: 'Đã duyệt (Thực hiện điều chuyển ngay)', value: 'approved' },
              { label: 'Từ chối', value: 'rejected' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />
            <span>Hướng dẫn Đổi kíp & Chuyển ca</span>
          </Space>
        }
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[
          <Button key="close" variant="primary" onClick={() => setIsGuideModalOpen(false)} style={{ minWidth: 100 }}>Đã hiểu</Button>
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p>Trang này quản lý các yêu cầu điều chuyển nhân sự giữa các kíp trực:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <b>Sứ mệnh:</b> Điều chuyển linh hoạt nhân sự giữa các kíp trực để tối ưu hóa đội ngũ.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Linh hoạt Sức chứa:</b> Admin có thể điều chuyển thêm người vào kíp đã đầy. Hệ thống sẽ cảnh báo nhưng không ngăn cản.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Minh bạch:</b> Mọi lộ trình di chuyển (Từ kíp nào sang kíp nào) đều được ghi log chi tiết.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default SwapRequestsPage;
