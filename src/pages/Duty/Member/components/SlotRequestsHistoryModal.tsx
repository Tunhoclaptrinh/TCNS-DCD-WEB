import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Space, Typography, Avatar, Empty, Spin, Tabs, Timeline, Tooltip } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SwapOutlined, LogoutOutlined, HistoryOutlined, InfoCircleOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';
import { Button } from '@/components/common';
import { getUserDisplayName } from '@/utils/formatters';

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
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (open && slotId) {
      fetchRequests();
    }
  }, [open, slotId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [resReq, resLogs] = await Promise.all([
        dutyService.getSlotRequests(slotId),
        dutyService.getSlotLogs(slotId)
      ]);
      setData(resReq.data || { leaveRequests: [], swapRequests: [] });
      if (resLogs && resLogs.success && Array.isArray(resLogs.data)) {
        setLogs(resLogs.data);
      }
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

  const getResponseNote = (record: any) => {
    return record.decisionNote || record.rejectionReason || record.adminNote || record.responseNote || record.note || '';
  };

  const leaveColumns = [
    {
      title: 'Thành viên',
      key: 'user',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" src={record.user?.avatar} />
          <Text strong style={{ fontSize: 13 }}>{getUserDisplayName(record.user)}</Text>
        </Space>
      )
    },
    {
      title: 'Lý do xin nghỉ',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (val: string) => val || <Text type="secondary" italic>Không có</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Ghi chú / Phản hồi',
      key: 'responseNote',
      ellipsis: true,
      render: (_: any, record: any) => {
        const note = getResponseNote(record);
        if (!note) {
          if (record.status === 'approved') return <Text type="secondary" italic style={{ fontSize: 12 }}>Đã phê duyệt</Text>;
          if (record.status === 'rejected') return <Text type="secondary" italic style={{ fontSize: 12 }}>Không có ghi chú</Text>;
          return <Text type="secondary" italic style={{ fontSize: 12 }}>Chờ xử lý</Text>;
        }
        return (
          <Tooltip title={note}>
            <Text type={record.status === 'rejected' ? 'danger' : 'success'} style={{ fontSize: 12, fontWeight: 500 }}>
              {note}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (date: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{dayjs(date).format('HH:mm DD/MM')}</span>
    }
  ];

  const swapColumns = [
    {
      title: 'Người yêu cầu',
      key: 'requester',
      width: 150,
      render: (_: any, record: any) => {
        const u = record.requester || record.user;
        return (
          <Space>
            <Avatar size="small" src={u?.avatar} />
            <Text strong style={{ fontSize: 13 }}>{getUserDisplayName(u)}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Loại đổi',
      key: 'type',
      width: 100,
      render: (_: any, record: any) => {
        const isFrom = record.fromSlotId === slotId;
        return (
          <Tag color={isFrom ? 'orange' : 'blue'} style={{ fontSize: 11, margin: 0 }}>
            {isFrom ? 'Chuyển đi' : 'Chuyển đến'}
          </Tag>
        );
      }
    },
    {
      title: 'Lý do đổi kíp',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (val: string) => val || <Text type="secondary" italic>Không có</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Ghi chú / Phản hồi',
      key: 'responseNote',
      ellipsis: true,
      render: (_: any, record: any) => {
        const note = getResponseNote(record);
        if (!note) {
          if (record.status === 'approved') return <Text type="secondary" italic style={{ fontSize: 12 }}>Đã phê duyệt</Text>;
          if (record.status === 'rejected') return <Text type="secondary" italic style={{ fontSize: 12 }}>Không có ghi chú</Text>;
          return <Text type="secondary" italic style={{ fontSize: 12 }}>Chờ xử lý</Text>;
        }
        return (
          <Tooltip title={note}>
            <Text type={record.status === 'rejected' ? 'danger' : 'success'} style={{ fontSize: 12, fontWeight: 500 }}>
              {note}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (date: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{dayjs(date).format('HH:mm DD/MM')}</span>
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
      footer={[
        <Button key="close" variant="outline" buttonSize="small" onClick={onCancel} style={{ minWidth: 100 }}>
          Đóng
        </Button>
      ]}
      width={900}
      zIndex={1100}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin tip="Đang tải dữ liệu..." />
        </div>
      ) : (
        <Tabs defaultActiveKey="swap" animated={{ inkBar: true, tabPane: true }} size="small">
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
          <TabPane 
            tab={<span><HistoryOutlined /> Lịch sử đăng ký & Hoạt động ({logs.length})</span>} 
            key="logs"
          >
            {logs.length === 0 ? (
              <Empty description="Chưa có nhật ký hoạt động nào" style={{ padding: '24px 0' }} />
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 16px' }}>
                <Timeline mode="left">
                  {logs.map((log: any, idx: number) => {
                    const isTransfer = log.action === 'transfer' || log.action === 'swap';
                    const isRegister = log.action === 'register';
                    const isCancel = log.action === 'cancel';
                    const isLeave = log.action === 'leave';
                    const isAttendance = log.action === 'attendance';
                    
                    let color = 'blue';
                    let icon = <InfoCircleOutlined />;
                    if (isTransfer) { color = 'purple'; icon = <SwapOutlined />; }
                    if (isRegister) { color = 'green'; icon = <CheckCircleOutlined />; }
                    if (isCancel || isLeave) { color = 'red'; icon = <LogoutOutlined />; }
                    if (isAttendance) { color = 'gold'; icon = <CheckCircleOutlined />; }

                    return (
                      <Timeline.Item key={idx} color={color} dot={icon}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {log.details || log.description || (log.action === 'register' ? 'Đăng ký kíp trực' : (log.action === 'cancel' ? 'Hủy đăng ký kíp' : 'Hoạt động kíp'))}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                            🕒 {dayjs(log.createdAt).format('HH:mm:ss - DD/MM/YYYY')}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar size={16} src={log.performer?.avatar} icon={<UserOutlined />} />
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                              {getUserDisplayName(log.performer) || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </div>
            )}
          </TabPane>
        </Tabs>
      )}
    </Modal>
  );
};

export default SlotRequestsHistoryModal;
