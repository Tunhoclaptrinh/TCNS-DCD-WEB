import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, message, Typography, Tag, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';

const { Title, Text } = Typography;

const LeaveRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ status: 'pending' });
      setRequests(res.data || res);
    } catch (err) {
      message.error('Không thể tải danh sách đơn nghỉ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResolve = async (id: number, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = prompt('Lý do từ chối:') || '';
      if (!reason) return;
    }
    try {
      const res = await dutyService.resolveLeaveRequest(id, status, reason);
      if (res.success) {
        message.success(status === 'approved' ? 'Đã duyệt đơn nghỉ' : 'Đã từ chối đơn nghỉ');
        fetchRequests();
      }
    } catch (err) {
      message.error('Lỗi khi xử lý đơn');
    }
  };

  const columns = [
    {
      title: 'Nhân sự',
      key: 'user',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.user?.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{r.user?.studentId || r.user?.email}</Text>
        </Space>
      )
    },
    {
      title: 'Ca trực',
      key: 'slot',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text>{r.slot?.shiftLabel}</Text>
          <Tag color="blue">{dayjs(r.slot?.shiftDate).format('dddd, DD/MM/YYYY')}</Tag>
        </Space>
      )
    },
    {
      title: 'Thời gian trực',
      key: 'time',
      render: (_: any, r: any) => (
        <Text>{r.slot?.startTime} - {r.slot?.endTime}</Text>
      )
    },
    {
      title: 'Lý do xin nghỉ',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm DD/MM'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleResolve(r.id, 'approved')}
          >
            Duyệt
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleResolve(r.id, 'rejected')}
          >
            Từ chối
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="leave-requests-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
          <InboxOutlined style={{ marginRight: 8 }} />
          Duyệt đơn xin nghỉ
        </Title>
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setIsGuideModalOpen(true)}
        >
          Hướng dẫn
        </Button>
      </div>

      <Card className="hifi-border">
        <Table
          loading={loading}
          dataSource={requests}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'Không có đơn nghỉ nào đang chờ xử lý' }}
        />
      </Card>

      <Modal
        title="Hướng dẫn Duyệt đơn nghỉ"
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[<Button key="close" type="primary" onClick={() => setIsGuideModalOpen(false)}>Đã hiểu</Button>]}
      >
        <div style={{ padding: '8px 0' }}>
          <p>Trang này cho phép bạn quản lý các yêu cầu xin nghỉ từ thành viên:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <b>Giao diện:</b> Danh sách mặc định chỉ hiển thị các đơn đang ở trạng thái <b>Chờ duyệt</b>.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Phê duyệt:</b> Bấm dấu tích xanh để chấp thuận. Hệ thống sẽ tự động gỡ người này khỏi ca trực tương ứng.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Từ chối:</b> Bấm dấu X đỏ để từ chối yêu cầu. Thành viên vẫn sẽ phải tham gia ca trực như cũ.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveRequestsPage;
