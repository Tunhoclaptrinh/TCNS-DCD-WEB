import React, { useState, useEffect, useCallback } from 'react';
import { Space, message, Typography, Tag, Modal, Tooltip, Avatar, Tabs, Form, Input, Select, Dropdown, Menu } from 'antd';
import { 
  CheckCircleOutlined, 
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined, 
  CalendarOutlined,
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
import UserSelect from '@/pages/Users/components/UserSelect';
import { getUserDisplayName } from '@/utils/formatters';
import AdminDutySlotModal from '@/pages/Duty/Admin/components/AdminDutySlotModal';

const { Title, Text } = Typography;

const SwapRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const { hasPermission, isAdmin } = useAccess();
  
  // Advanced Filtering state
  const [filterValues, setFilterValues] = useState<any>({});
  const [searchValue, setSearchValue] = useState('');
  
  // CRUD Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // Slot Detail Modal state
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotModalLoading, setSlotModalLoading] = useState(false);

  const handleOpenSlotModal = async (slotData: any) => {
    if (!slotData) {
      message.warning('Không tìm thấy thông tin kíp trực');
      return;
    }
    const slotId = slotData.id || slotData.slotId;
    setSlotModalLoading(true);
    try {
      if (slotId) {
        const res = await dutyService.getSlotById(slotId);
        if (res.data) {
          setSelectedSlot({
            ...slotData,
            ...res.data,
          });
        } else {
          setSelectedSlot(slotData);
        }
      } else {
        setSelectedSlot(slotData);
      }
      setIsSlotModalOpen(true);
    } catch (err) {
      setSelectedSlot(slotData);
      setIsSlotModalOpen(true);
    } finally {
      setSlotModalLoading(false);
    }
  };
  
  // Data for selects
  const [users, setUsers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

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

    // Make sure we have the requester and slots in the select options so it renders names instead of IDs
    if (record.requester) {
      setUsers(prev => prev.find(u => u.id === record.requester.id) ? prev : [...prev, record.requester]);
    }
    const missingSlots: any[] = [];
    if (record.fromSlot && !slots.find(s => s.id === record.fromSlot.id)) {
      missingSlots.push(record.fromSlot);
    }
    if (record.toSlot && !slots.find(s => s.id === record.toSlot.id)) {
      missingSlots.push(record.toSlot);
    }
    if (missingSlots.length > 0) {
      setSlots(prev => [...prev, ...missingSlots]);
    }

    form.setFieldsValue({
      requesterId: record.requesterId ? Number(record.requesterId) : undefined,
      fromSlotId: record.fromSlotId ? Number(record.fromSlotId) : undefined,
      toSlotId: record.toSlotId ? Number(record.toSlotId) : undefined,
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
          const hasSlotInfo = slot && ((slot.shiftName || slot.kipName || slot.shiftLabel) || slot.shiftDate);
          if (!hasSlotInfo) {
            return (
              <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 11, color: '#94a3b8' }}>
                — Trống —
              </Text>
            );
          }

          let shiftLabel = 'Kíp trực';
          if (slot.shiftName && slot.kipName) {
            shiftLabel = `${slot.shiftName} • ${slot.kipName}`;
          } else if (slot.shiftLabel) {
            shiftLabel = slot.shiftLabel;
          } else if (slot.shiftName || slot.kipName) {
            shiftLabel = slot.shiftName || slot.kipName;
          }
          const formattedDate = slot.shiftDate ? dayjs(slot.shiftDate).format('DD/MM (ddd)') : '';

          return (
            <div
              onClick={() => handleOpenSlotModal(slot)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: isTarget ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                backgroundColor: isTarget ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                minWidth: 115,
                textAlign: 'center'
              }}
              className="slot-pill-hover"
              title="Bấm để xem chi tiết ca trực"
            >
              <span style={{ color: isTarget ? '#1d4ed8' : 'var(--primary-color)', fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {shiftLabel}
              </span>
              {formattedDate && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, lineHeight: 1 }}>
                  <CalendarOutlined style={{ fontSize: 11, color: isTarget ? '#93c5fd' : '#94a3b8' }} />
                  <span style={{ fontSize: 11, color: isTarget ? '#3b82f6' : '#64748b', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                    {formattedDate}
                  </span>
                </div>
              )}
            </div>
          );
        };

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Space direction="vertical" size={0} style={{ minWidth: 150 }}>
              <Space>
                <Avatar size="small" src={r.requester?.avatar} icon={<UserOutlined />} />
                <Text strong>{getUserDisplayName(r.requester)}</Text>
              </Space>
            </Space>
            
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #f1f5f9', flex: 1, justifyContent: 'center', gap: 10 }}>
              {renderSlot(r.fromSlot, false)}
              <ArrowRightOutlined style={{ color: 'var(--primary-color)', margin: '0 2px', fontSize: 14, flexShrink: 0 }} />
              {renderSlot(r.toSlot, true)}
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
              <Tooltip title={`Xử lý bởi: ${getUserDisplayName(r.approver)} lúc ${dayjs(r.updatedAt).format('HH:mm DD/MM')}`}>
                <Space size={4}>
                  <Avatar size={16} src={r.approver.avatar} icon={<UserOutlined />} />
                  <Text type="secondary" style={{ fontSize: 10 }}>{getUserDisplayName(r.approver)}</Text>
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
          icon={<QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />}
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
          const canApproveSwap = isAdmin || hasPermission('duty:approve_swap');
          const canManage = isAdmin || hasPermission('duty:manage');
          
          return (
            <Space size="small">
              <>
                <Tooltip title={!canApproveSwap ? 'Bạn không có quyền duyệt' : 'Chấp nhận'}>
                  <Button
                    variant="ghost"
                    buttonSize="small"
                    icon={<CheckOutlined style={{ fontSize: 16, fontWeight: 'bold' }} />}
                    style={{ color: (r.status === 'pending' && canApproveSwap) ? '#52c41a' : '#bfbfbf', padding: '4px' }}
                    onClick={() => handleDecide(r.id, 'approved')}
                    disabled={r.status !== 'pending' || !canApproveSwap}
                  />
                </Tooltip>
                <Tooltip title={!canApproveSwap ? 'Bạn không có quyền duyệt' : 'Từ chối'}>
                  <Button
                    variant="ghost"
                    buttonSize="small"
                    icon={<CloseOutlined style={{ fontSize: 16, fontWeight: 'bold' }} />}
                    style={{ color: (r.status === 'pending' && canApproveSwap) ? '#ff4d4f' : '#bfbfbf', padding: '4px' }}
                    onClick={() => handleDecide(r.id, 'rejected')}
                    disabled={r.status !== 'pending' || !canApproveSwap}
                  />
                </Tooltip>
              </>
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                overlay={
                  <Menu>
                    <Menu.Item
                      key="edit"
                      icon={<EditOutlined />}
                      onClick={() => canManage ? openEdit(r) : undefined}
                      disabled={!canManage}
                      title={!canManage ? 'Bạn không có quyền chỉnh sửa' : undefined}
                    >
                      Chỉnh sửa
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      key="delete"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => canManage ? handleDelete(r.id) : undefined}
                      disabled={!canManage}
                      title={!canManage ? 'Bạn không có quyền xóa' : undefined}
                    >
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
        destroyOnClose
        footer={[
          <Button 
            key="cancel"
            variant="outline" 
            buttonSize="small"
            onClick={() => setIsModalVisible(false)} 
            style={{ minWidth: 88 }}
          >
            Hủy bỏ
          </Button>,
          <Button 
            key="submit"
            variant="primary" 
            buttonSize="small"
            onClick={handleModalOk} 
            style={{ minWidth: 88 }}
          >
            {editingId ? "Lưu lại" : "Lưu lại"}
          </Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="requesterId"
            label="Thành viên cần điều chuyển"
            rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
          >
            <UserSelect initialUsers={users} />
          </Form.Item>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
            <Form.Item
              name="fromSlotId"
              label="Kíp trực nguồn (Rời đi)"
              style={{ flex: 1, margin: 0 }}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn kíp hiện tại..."
                optionFilterProp="label"
                options={slots.map(s => ({ 
                  label: s.shiftDate ? `${dayjs(s.shiftDate).format('DD/MM')} - ${s.shiftLabel}` : s.shiftLabel, 
                  value: s.id 
                }))}
              />
            </Form.Item>

            <ArrowRightOutlined style={{ color: '#bfbfbf', marginTop: 38 }} />

            <Form.Item
              name="toSlotId"
              label="Kíp trực đích (Chuyển đến)"
              rules={[{ required: true, message: 'Vui lòng chọn kíp đích' }]}
              style={{ flex: 1, margin: 0 }}
            >
              <Select
                showSearch
                placeholder="Chọn kíp muốn đến..."
                optionFilterProp="label"
                options={slots.map(s => ({ 
                  label: s.shiftDate ? `${dayjs(s.shiftDate).format('DD/MM')} - ${s.shiftLabel}` : s.shiftLabel, 
                  value: s.id 
                }))}
              />
            </Form.Item>
          </div>

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

      {/* Slot Detail Modal */}
      <AdminDutySlotModal
        open={isSlotModalOpen}
        onCancel={() => {
          setIsSlotModalOpen(false);
          setSelectedSlot(null);
        }}
        onSuccess={() => {
          setIsSlotModalOpen(false);
          setSelectedSlot(null);
          fetchRequests();
        }}
        slot={selectedSlot}
        templates={[]}
        loading={slotModalLoading}
      />
    </div>
  );
};

export default SwapRequestsPage;
