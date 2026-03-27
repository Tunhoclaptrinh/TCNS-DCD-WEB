import React, { useState, useEffect } from 'react';
import { Space, message, Typography, Tag, Modal, Button, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InboxOutlined, QuestionCircleOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dutyService from '@/services/duty.service';
import DataTable from '@/components/common/DataTable';

const { Title, Text } = Typography;

const LeaveRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dutyService.getLeaveRequests({ status: 'pending' });
      const rawData = res.data || res;
      setRequests(Array.isArray(rawData) ? rawData : (rawData?.data || []));
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
      width: 250,
      render: (_: any, r: any) => (
        <Space>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <Space direction="vertical" size={0}>
            <Text strong>{r.user?.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{r.user?.studentId || r.user?.email}</Text>
          </Space>
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
      title: 'Thời gian',
      key: 'time',
      width: 150,
      render: (_: any, r: any) => (
        <Tag color="cyan">{r.slot?.startTime} - {r.slot?.endTime}</Tag>
      )
    },
    {
      title: 'Lý do xin nghỉ',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      minWidth: 200,
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('HH:mm DD/MM/YYYY'),
    }
  ];

  return (
    <div className="leave-requests-page">
      <DataTable
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <InboxOutlined style={{ color: 'var(--primary-color)', fontSize: 24 }} />
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Duyệt đơn xin nghỉ</Title>
          </div>
        }
        loading={loading}
        dataSource={requests}
        columns={columns}
        rowKey="id"
        onRefresh={fetchRequests}
        searchable={true}
        searchPlaceholder="Tìm kiếm nhân sự hoặc lý do..."
        extra={
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setIsGuideModalOpen(true)}
          >
            Hướng dẫn
          </Button>
        }
        customActions={(r) => (
          <Space size={4}>
            <Tooltip title="Duyệt đơn">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleResolve(r.id, 'approved')}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                danger
                type="text"
                size="small"
                icon={<CloseCircleOutlined />}
                style={{ color: '#ff4d4f' }}
                onClick={() => handleResolve(r.id, 'rejected')}
              />
            </Tooltip>
          </Space>
        )}
      />

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
              <b>Phê duyệt:</b> Bấm dấu tích xanh để chấp thuận. Hệ thống sẽ tự động gỡ người này khỏi kíp trực tương ứng.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Từ chối:</b> Bấm dấu X đỏ để từ chối yêu cầu. Thành viên vẫn sẽ phải tham gia kíp trực như cũ.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveRequestsPage;
