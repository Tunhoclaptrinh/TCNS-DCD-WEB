import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Space, Typography, Avatar, Empty, Spin, Tabs } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SwapOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';

const { Text } = Typography;
const { TabPane } = Tabs;

interface SlotRequestsHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  slotId: number;
  slotLabel?: string;
}

const SlotRequestsHistoryModal: React.FC<SlotRequestsHistoryModalProps> = ({ open, onCancel, slotId, slotLabel }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ leaveRequests: any[], swapRequests: any[] }>({ leaveRequests: [], swapRequests: [] });

  useEffect(() => {
    if (open && slotId) {
      fetchRequests();
    }
  }, [open, slotId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dutyService.getSlotRequests(slotId);
      setData(res.data || { leaveRequests: [], swapRequests: [] });
    } catch (err) {
      console.error('Failed to fetch slot requests history', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const config: any = {
      pending: { color: 'processing', text: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
      approved: { color: 'success', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', text: 'Từ chối', icon: <CloseCircleOutlined /> }
    };
    const { color, text, icon } = config[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
    return <Tag color={color} icon={icon}>{text.toUpperCase()}</Tag>;
  };

  const leaveColumns = [
    {
      title: 'Thành viên',
      key: 'user',
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" src={record.user?.avatar} />
          <Text>{record.user?.name || 'N/A'}</Text>
        </Space>
      )
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
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm DD/MM')
    }
  ];

  const swapColumns = [
    {
      title: 'Người yêu cầu',
      key: 'requester',
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" src={record.user?.avatar} />
          <Text>{record.user?.name || 'N/A'}</Text>
        </Space>
      )
    },
    {
      title: 'Loại đổi',
      key: 'type',
      render: (_: any, record: any) => {
        const isFrom = record.fromSlotId === slotId;
        return (
          <Tag color={isFrom ? 'orange' : 'blue'}>
            {isFrom ? 'Chuyển đi' : 'Chuyển đến'}
          </Tag>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm DD/MM')
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Biến động nhân sự - {slotLabel || `Kíp #${slotId}`}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      zIndex={1100}
      bodyStyle={{ padding: '12px 24px 24px' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin tip="Đang tải dữ liệu..." />
        </div>
      ) : (
        <Tabs defaultActiveKey="swap" animated={{ inkBar: true, tabPane: true }}>
          <TabPane 
            tab={<span><SwapOutlined /> Đổi kíp ({data.swapRequests.length})</span>} 
            key="swap"
          >
            <Table 
              columns={swapColumns} 
              dataSource={data.swapRequests} 
              pagination={{ pageSize: 5 }} 
              rowKey="id"
              size="small"
              locale={{ emptyText: <Empty description="Chưa có yêu cầu đổi kíp nào" /> }}
            />
          </TabPane>
          <TabPane 
            tab={<span><LogoutOutlined /> Xin nghỉ ({data.leaveRequests.length})</span>} 
            key="leave"
          >
            <Table 
              columns={leaveColumns} 
              dataSource={data.leaveRequests} 
              pagination={{ pageSize: 5 }} 
              rowKey="id"
              size="small"
              locale={{ emptyText: <Empty description="Chưa có đơn xin nghỉ nào" /> }}
            />
          </TabPane>
        </Tabs>
      )}
    </Modal>
  );
};

export default SlotRequestsHistoryModal;
