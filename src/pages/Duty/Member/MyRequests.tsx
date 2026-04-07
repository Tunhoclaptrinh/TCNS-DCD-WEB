import React, { useState, useEffect, useCallback } from 'react';
import { Space, message, Typography, Tag, Tabs, Avatar as AntdAvatar, Tooltip, Popconfirm, Card } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  DeleteOutlined,
  SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';
import DataTable from '@/components/common/DataTable';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MyRequests: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id;
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');
  
  // Data
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);

  const fetchLeaveRequests = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ userId: currentUserId });
      setLeaveRequests(res.data || res || []);
    } catch (err) {
      message.error('Không thể tải đơn nghỉ');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const fetchSwapRequests = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Fetching all and filtering or using specialized query if available
      const res = await dutyService.getSwapRequests();
      const all = res.data || res || [];
      const filtered = all.filter((r: any) => 
        String(r.requesterId) === String(currentUserId) || 
        String(r.targetUserId) === String(currentUserId)
      );
      setSwapRequests(filtered);
    } catch (err) {
      message.error('Không thể tải đơn đổi ca');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (activeTab === 'leave') fetchLeaveRequests();
    else fetchSwapRequests();
  }, [activeTab, fetchLeaveRequests, fetchSwapRequests]);

  const handleCancelLeave = async (id: number) => {
    try {
      await dutyService.deleteLeaveRequest(id);
      message.success('Đã hủy đơn nghỉ');
      fetchLeaveRequests();
    } catch (err) {
      message.error('Lỗi khi hủy đơn');
    }
  };

  const leaveColumns = [
    {
      title: 'Kíp trực',
      dataIndex: 'slot',
      key: 'slot',
      render: (slot: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{slot?.shiftLabel || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {slot ? dayjs(slot.shiftDate).format('DD/MM/YYYY') : ''} ({slot?.startTime} - {slot?.endTime})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: any = {
          pending: { color: 'processing', text: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
          approved: { color: 'success', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
          rejected: { color: 'error', text: 'Từ chối', icon: <CloseCircleOutlined /> }
        };
        const { color, text, icon } = config[status] || { color: 'default', text: status, icon: <QuestionCircleOutlined /> };
        return <Tag color={color} icon={icon}>{text.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm DD/MM'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: any) => (
        record.status === 'pending' && (
          <Popconfirm title="Bạn có chắc muốn hủy đơn này?" onConfirm={() => handleCancelLeave(record.id)}>
            <Tooltip title="Hủy đơn">
              <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} />
            </Tooltip>
          </Popconfirm>
        )
      )
    }
  ];

  const swapColumns = [
    {
      title: 'Loại',
      key: 'type',
      render: (_: any, record: any) => {
        const isRequester = String(record.requesterId) === String(currentUserId);
        return (
          <Tag color={isRequester ? 'blue' : 'orange'}>
            {isRequester ? 'Gửi đi' : 'Nhận được'}
          </Tag>
        );
      }
    },
    {
      title: 'Đối tác',
      key: 'partner',
      render: (_: any, record: any) => {
        const isRequester = String(record.requesterId) === String(currentUserId);
        const partner = isRequester ? record.targetUser : record.requester;
        return (
          <Space>
            <AntdAvatar size="small" src={partner?.avatar} />
            <Text>{partner?.name || 'N/A'}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Nội dung đổi',
      key: 'swap',
      render: (_: any, record: any) => (
        <Space size="middle">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Ca của tôi</div>
            <Tag color="volcano">{record.sourceSlot?.shiftLabel || 'N/A'}</Tag>
          </div>
          <SwapOutlined style={{ color: '#1890ff' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Ca mục tiêu</div>
            <Tag color="cyan">{record.targetSlot?.shiftLabel || 'N/A'}</Tag>
          </div>
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: any = {
          pending: { color: 'processing', text: 'Đang chờ', icon: <ClockCircleOutlined /> },
          approved: { color: 'success', text: 'Thành công', icon: <CheckCircleOutlined /> },
          rejected: { color: 'error', text: 'Bị từ chối', icon: <CloseCircleOutlined /> }
        };
        const { color, text, icon } = config[status] || { color: 'default', text: status, icon: <QuestionCircleOutlined /> };
        return <Tag color={color} icon={icon}>{text.toUpperCase()}</Tag>;
      }
    }
  ];

  return (
    <div className="my-requests-container" style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>Quản lý yêu cầu của tôi</Title>
        <Text type="secondary">Theo dõi các đơn xin nghỉ và yêu cầu đổi ca bạn đã tạo hoặc nhận được.</Text>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} animated={{ inkBar: true, tabPane: true }}>
          <TabPane 
            tab={<span><CalendarOutlined />Đơn xin nghỉ</span>} 
            key="leave"
          >
            <DataTable
              columns={leaveColumns}
              dataSource={leaveRequests}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              hideCard
            />
          </TabPane>
          <TabPane 
            tab={<span><SwapOutlined />Đổi ca trực</span>} 
            key="swap"
          >
            <DataTable
              columns={swapColumns}
              dataSource={swapRequests}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              hideCard
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default MyRequests;
