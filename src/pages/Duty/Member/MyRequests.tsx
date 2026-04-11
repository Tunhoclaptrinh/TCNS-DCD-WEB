import React, { useState, useEffect, useCallback } from 'react';
import { Space, message, Typography, Tag, Tabs, Avatar as AntdAvatar, Tooltip, Popconfirm, Card } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  DeleteOutlined,
  SwapOutlined,
  PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/common';
import LeaveRequestModal from './components/LeaveRequestModal';
import SwapRequestModal from './components/SwapRequestModal';

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

  // Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const fetchLeaveRequests = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ userId: currentUserId });
      // Standardize extraction from BaseApiResponse { success: true, data: [...] } or direct array
      const rawData = res.data || res;
      setLeaveRequests(Array.isArray(rawData) ? rawData : (rawData?.data || []));
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
      const rawData = res.data || res;
      const all = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      
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

  const handleOpenLeaveModal = () => {
    setIsLeaveModalOpen(true);
  };

  const handleOpenSwapModal = () => {
    setIsSwapModalOpen(true);
  };

  const handleSubmitLeave = async (values: { reason: string, slotId?: number }) => {
    if (!values.slotId) return;
    try {
      const res = await dutyService.requestLeave(values.slotId, values.reason);
      if (res.success) {
        message.success('Tạo đơn xin nghỉ thành công');
        setIsLeaveModalOpen(false);
        fetchLeaveRequests();
      }
    } catch (err) {
      message.error('Lỗi khi gửi đơn xin nghỉ');
    }
  };

  const handleSubmitSwap = async (values: { toSlotId: number, fromSlotId?: number }) => {
    if (!values.fromSlotId || !values.toSlotId) return;
    try {
      const res = await dutyService.requestSwap({
        fromSlotId: values.fromSlotId,
        toSlotId: values.toSlotId
      });
      if (res.success) {
        message.success('Gửi yêu cầu đổi ca thành công');
        setIsSwapModalOpen(false);
        fetchSwapRequests();
      }
    } catch (err) {
      message.error('Lỗi khi gửi yêu cầu đổi ca');
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
    <div>
      <div>
        <Title level={4}>Quản lý yêu cầu của tôi</Title>
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
              extra={<Button icon={<PlusOutlined />} variant="primary" buttonSize="small" onClick={handleOpenLeaveModal}>Thêm đơn xin nghỉ</Button>}
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
              extra={<Button icon={<PlusOutlined />} variant="primary" buttonSize="small" onClick={handleOpenSwapModal}>Thêm đơn đổi ca</Button>}
            />
          </TabPane>
        </Tabs>
      </Card>

      <LeaveRequestModal 
        open={isLeaveModalOpen}
        onCancel={() => setIsLeaveModalOpen(false)}
        onSubmit={handleSubmitLeave}
        globalMode={true}
      />

      <SwapRequestModal
        open={isSwapModalOpen}
        onCancel={() => setIsSwapModalOpen(false)}
        onSubmit={handleSubmitSwap}
        globalMode={true}
      />
    </div>
  );
};

export default MyRequests;
