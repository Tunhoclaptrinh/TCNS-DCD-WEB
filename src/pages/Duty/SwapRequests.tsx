import React, { useState, useEffect } from 'react';
import { Space, message, Typography, Tag, Modal, Button, Tooltip, Avatar } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SwapOutlined, QuestionCircleOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';
import DataTable from '@/components/common/DataTable';
import { useAccess } from '@/hooks/useAccess';

const { Title, Text } = Typography;

const SwapRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const { user } = useAccess();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dutyService.getSwapRequests();
      const rawData = res.data || res;
      setRequests(Array.isArray(rawData) ? rawData : (rawData?.data || []));
    } catch (err) {
      message.error('Không thể tải danh sách yêu cầu đổi ca');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecide = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      const res = await dutyService.decideSwap(id, decision);
      if (res.success) {
        message.success(decision === 'approved' ? 'Đã chấp thuận đổi ca' : 'Đã từ chối đổi ca');
        fetchRequests();
      }
    } catch (err) {
      message.error('Lỗi khi xử lý yêu cầu');
    }
  };

  const columns = [
    {
      title: 'Người yêu cầu',
      key: 'requester',
      width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{r.requester?.name || `User ${r.requesterId}`}</Text>
        </Space>
      )
    },
    {
      title: 'Người nhận',
      key: 'target',
      width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{r.targetUser?.name || `User ${r.targetUserId}`}</Text>
        </Space>
      )
    },
    {
      title: 'Kíp trực',
      key: 'slot',
      width: 250,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong color="blue">{r.slot?.shiftLabel}</Text>
          <Space size={4}>
            <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(r.slot?.shiftDate).format('dddd, DD/MM/YYYY')}</Text>
          </Space>
        </Space>
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
        const s = config[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('HH:mm DD/MM/YYYY'),
    }
  ];

  const filteredData = activeTab === 'all' 
    ? requests 
    : requests.filter(r => r.status === activeTab);

  return (
    <div className="swap-requests-page">
      <DataTable
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SwapOutlined style={{ color: 'var(--primary-color)', fontSize: 24 }} />
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Danh sách đổi ca</Title>
          </div>
        }
        loading={loading}
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        onRefresh={fetchRequests}
        searchable={true}
        searchPlaceholder="Tìm kiếm..."
        extra={
          <Space>
            <Button.Group>
              <Button type={activeTab === 'pending' ? 'primary' : 'default'} onClick={() => setActiveTab('pending')}>Chờ duyệt</Button>
              <Button type={activeTab === 'approved' ? 'primary' : 'default'} onClick={() => setActiveTab('approved')}>Đã duyệt</Button>
              <Button type={activeTab === 'rejected' ? 'primary' : 'default'} onClick={() => setActiveTab('rejected')}>Từ chối</Button>
              <Button type={activeTab === 'all' ? 'primary' : 'default'} onClick={() => setActiveTab('all')}>Tất cả</Button>
            </Button.Group>
          </Space>
        }
        customActions={(r) => {
          const isTarget = Number(r.targetUserId) === Number(user?.id);
          const isAdmin = user?.role === 'admin' || user?.role === 'staff';
          
          if (r.status === 'pending' && (isTarget || isAdmin)) {
            return (
              <Space size={4}>
                <Tooltip title="Chấp nhận">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    style={{ color: '#52c41a' }}
                    onClick={() => handleDecide(r.id, 'approved')}
                  />
                </Tooltip>
                <Tooltip title="Từ chối">
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined />}
                    style={{ color: '#ff4d4f' }}
                    onClick={() => handleDecide(r.id, 'rejected')}
                  />
                </Tooltip>
              </Space>
            );
          }
          return null;
        }}
      />
    </div>
  );
};

export default SwapRequestsPage;
