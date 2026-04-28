
import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Row, Col, DatePicker, Select, 
  Space, Tag, Typography, message, 
  Tooltip, Empty, Divider, Modal, Input, List,
  Avatar, Progress, Tabs
} from 'antd';
import { 
  FileExcelOutlined, 
  BellOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  UserOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { dutyService } from '@/services/duty.service';
import { userService } from '@/services/user.service';
import { generationService } from '@/services/generation.service';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Button, StatisticsCard } from '@/components/common';
import UsersDetailModal from '@/pages/Users/components/Detail';
import { 
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [filters, setFilters] = useState<{
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    departmentId?: string;
    generationId?: number;
    viewType: 'range' | 'week';
    week?: dayjs.Dayjs;
  }>({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
    departmentId: undefined,
    generationId: undefined,
    viewType: 'range',
    week: dayjs()
  });

  // Modal states
  const [commentModal, setCommentModal] = useState<{ open: boolean; user?: any; comment: string }>({
    open: false,
    user: null,
    comment: ''
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; user?: any }>({
    open: false,
    user: null
  });
  const [fullProfileModal, setFullProfileModal] = useState<{ open: boolean; user?: any }>({
    open: false,
    user: null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (filters.viewType === 'week' && filters.week) {
        startDate = filters.week.startOf('isoWeek').toISOString();
        endDate = filters.week.endOf('isoWeek').toISOString();
      } else if (filters.dateRange[0] && filters.dateRange[1]) {
        startDate = filters.dateRange[0].toISOString();
        endDate = filters.dateRange[1].toISOString();
      } else {
        // Fallback or handle empty range
        startDate = dayjs().startOf('month').toISOString();
        endDate = dayjs().endOf('month').toISOString();
      }

      const params = {
        startDate,
        endDate,
        departmentId: filters.departmentId,
        generationId: filters.generationId
      };
      const res = await dutyService.getComprehensiveStats(params);
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [userRes, genRes] = await Promise.all([
        userService.getAll({ _limit: 1000 }),
        generationService.getAll()
      ]);
      const users = userRes.data || [];
      const deptNames = Array.from(new Set(users.map((u: any) => u.department).filter(Boolean)));
      setDepartments(deptNames.map(name => ({ id: name, name })));
      setGenerations(genRes.data || []);
    } catch (err) {
      console.error('Metadata load error', err);
    }
  };

  useEffect(() => { loadMetadata(); }, []);
  useEffect(() => { fetchData(); }, [filters]);

  const handleNotify = async (targetUser?: any) => {
    const usersToNotify = targetUser ? [targetUser] : stats.details.filter((s: any) => s.isWarning);
    if (usersToNotify.length === 0) {
      message.info('Không có thành viên nào cần thông báo.');
      return;
    }
    
    try {
      await dutyService.notifyAbsentees(usersToNotify);
      message.success(`Đã gửi thông báo cho ${usersToNotify.length} thành viên.`);
      if (commentModal.open) setCommentModal({ ...commentModal, open: false });
    } catch (err) {
      message.error('Lỗi khi gửi thông báo');
    }
  };

  const handleExport = () => {
    if (!stats || !stats.details) return;
    const headers = ['MSV', 'Họ tên', 'Ban', 'Chức vụ', 'Tổng kíp', 'Số lỗi', 'HS Phạt', 'Kíp thiếu', 'Tổng nhận (VNĐ)'];
    const csvRows = [
      headers.join(','),
      ...stats.details.map((s: any) => [
        s.studentId,
        `"${s.name}"`,
        s.department,
        s.position,
        s.totalKips,
        s.violationCount,
        s.penaltyCoefficient,
        s.deficiency,
        s.finalAmount
      ].join(','))
    ];
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ThongKeTrực_${dayjs().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: 'Nhân sự',
      key: 'user',
      fixed: 'left' as const,
      width: 220,
      render: (_: any, record: any) => (
        <Space style={{ cursor: 'pointer' }} onClick={() => setDetailModal({ open: true, user: record })}>
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.studentId} - {record.department}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Tổng kíp',
      dataIndex: 'totalKips',
      key: 'totalKips',
      align: 'center' as const,
      sorter: (a: any, b: any) => a.totalKips - b.totalKips,
      render: (val: number, record: any) => (
        <Tooltip title={`Định mức: ${record.userQuota} kíp`}>
          <Text strong style={{ color: record.isWarning ? '#cf1322' : '#3f8600' }}>{val}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Thiếu',
      dataIndex: 'deficiency',
      key: 'deficiency',
      align: 'center' as const,
      render: (val: number) => val > 0 ? <Tag color="error">{val}</Tag> : <Tag color="success">Đủ</Tag>
    },
    {
      title: 'Lỗi',
      dataIndex: 'violationCount',
      key: 'violationCount',
      align: 'center' as const,
      render: (val: number) => val > 0 ? <Text type="danger">{val}</Text> : <Text type="secondary">0</Text>
    },
    {
      title: 'Tạm tính',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      align: 'right' as const,
      render: (val: number) => <Text strong>{val.toLocaleString()}đ</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Nhận xét & Nhắc nhở">
            <Button 
              variant="ghost" 
              buttonSize="small" 
              icon={<CommentOutlined />} 
              onClick={() => setCommentModal({ open: true, user: record, comment: '' })}
            />
          </Tooltip>
          <Tooltip title="Xem chi tiết">
            <Button 
              variant="ghost" 
              buttonSize="small" 
              icon={<InfoCircleOutlined />} 
              onClick={() => setDetailModal({ open: true, user: record })}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const getChartData = () => {
    if (!stats) return [];
    const groups: any = {};
    stats.details.forEach((s: any) => {
      groups[s.department] = (groups[s.department] || 0) + s.totalKips;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  return (
    <div style={{ padding: '0px' }}>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>Báo cáo & Thống kê Trực ca</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<BellOutlined />} onClick={() => handleNotify()} variant="danger" disabled={!stats?.summary?.warningCount}>
              Nhắc nhở toàn đội ({stats?.summary?.warningCount || 0})
            </Button>
            <Button icon={<FileExcelOutlined />} variant="primary" onClick={handleExport}>
              Xuất dữ liệu
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Space wrap size="large">
          <Space direction="vertical" size={2}>
            <Text type="secondary">Chế độ xem</Text>
            <Select 
              value={filters.viewType} 
              onChange={(val) => setFilters(f => ({ ...f, viewType: val }))}
              style={{ width: 120 }}
              options={[
                { label: 'Khoảng ngày', value: 'range' },
                { label: 'Theo tuần', value: 'week' }
              ]}
            />
          </Space>

          {filters.viewType === 'range' ? (
            <Space direction="vertical" size={2}>
              <Text type="secondary">Khoảng thời gian</Text>
              <RangePicker 
                value={filters.dateRange} 
                onChange={(val) => {
                  if (val && val[0] && val[1]) setFilters(f => ({ ...f, dateRange: [val[0], val[1]] }));
                }} 
              />
            </Space>
          ) : (
            <Space direction="vertical" size={2}>
              <Text type="secondary">Chọn tuần</Text>
              <DatePicker 
                picker="week" 
                value={filters.week} 
                onChange={(val) => val && setFilters(f => ({ ...f, week: val }))}
              />
            </Space>
          )}

          <Space direction="vertical" size={2}>
            <Text type="secondary">Ban / Đơn vị</Text>
            <Select 
              style={{ width: 180 }} 
              placeholder="Tất cả các ban"
              allowClear
              options={departments.map(d => ({ label: d.name, value: d.id }))}
              onChange={(val) => setFilters(f => ({ ...f, departmentId: val }))}
            />
          </Space>
          <Space direction="vertical" size={2}>
            <Text type="secondary">Khóa / Thế hệ</Text>
            <Select 
              style={{ width: 120 }} 
              placeholder="Tất cả"
              allowClear
              options={generations.map(g => ({ label: g.name, value: g.id }))}
              onChange={(val) => setFilters(f => ({ ...f, generationId: val }))}
            />
          </Space>
        </Space>
      </Card>

      <StatisticsCard
        hideCard
        rowGutter={16}
        containerStyle={{ marginBottom: 24 }}
        colSpan={{ xs: 24, sm: 12, lg: 6 }}
        loading={loading}
        data={[
          { title: "Tổng kíp", value: stats?.summary?.totalKips || 0, valueColor: "#52c41a", icon: <CheckCircleOutlined /> },
          { title: "Thiếu định mức", value: stats?.summary?.warningCount || 0, valueColor: "#cf1322", icon: <WarningOutlined /> },
          { title: "Lỗi ghi nhận", value: stats?.summary?.totalViolations || 0, valueColor: "#faad14", icon: <CloseCircleOutlined /> },
          { title: "Tạm tính quỹ", value: `${(stats?.summary?.totalPayout || 0).toLocaleString()}đ`, valueColor: "#1890ff", icon: <FileExcelOutlined /> }
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col span={17}>
          <Card title="Danh sách hiệu suất" style={{ borderRadius: 12 }}>
            <Table 
              dataSource={stats?.details || []} 
              columns={columns} 
              loading={loading}
              rowKey="userId"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
        <Col span={7}>
          <Card title="Phân bổ theo Ban" style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ height: 280 }}>
              {stats?.details?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={getChartData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {getChartData().map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </div>
            <Divider>Tỷ lệ hoàn thành</Divider>
            <div style={{ textAlign: 'center' }}>
              <Progress 
                type="dashboard" 
                percent={stats?.details?.length > 0 ? Math.round(((stats.details.length - stats.summary.warningCount) / stats.details.length) * 100) : 0} 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              />
              <div style={{ marginTop: 8 }}><Text type="secondary">Thành viên đạt định mức</Text></div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal: Nhận xét & Thông báo */}
      <Modal
        title={`Gửi nhận xét & Nhắc nhở: ${commentModal.user?.name}`}
        open={commentModal.open}
        onCancel={() => setCommentModal({ ...commentModal, open: false })}
        onOk={() => handleNotify(commentModal.user)}
        okText="Gửi thông báo"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Nội dung nhắc nhở sẽ được gửi qua hệ thống thông báo cho thành viên này.</Text>
        </div>
        <TextArea 
          rows={4} 
          placeholder="Nhập nhận xét hoặc nội dung nhắc nhở..." 
          value={commentModal.comment}
          onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
        />
      </Modal>

      {/* Modal: Chi tiết thành viên */}
      <Modal
        title="Chi tiết hiệu suất cá nhân"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, user: null })}
        footer={null}
        width={700}
      >
        {detailModal.user && (
          <div style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'center' }}>
              <Avatar size={64} src={detailModal.user.avatar} icon={<UserOutlined />} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{detailModal.user.name}</Title>
                <Text type="secondary">{detailModal.user.studentId} | {detailModal.user.department} | {detailModal.user.position}</Text>
              </div>
            </div>
            
            <Tabs defaultActiveKey="stats">
              <Tabs.TabPane tab="Tổng quan" key="stats">
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small" title="Định mức">
                      <Statistic title="Yêu cầu" value={detailModal.user.userQuota} suffix="kíp" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" title="Thực tế">
                      <Statistic title="Đã trực" value={detailModal.user.totalKips} suffix="kíp" />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" title="Vi phạm">
                      <Statistic title="Số lỗi" value={detailModal.user.violationCount} valueStyle={{ color: '#cf1322' }} />
                    </Card>
                  </Col>
                </Row>
                <div style={{ marginTop: 24 }}>
                  <Text strong>Tình trạng hoàn thành</Text>
                  <Progress 
                    percent={Math.min(100, Math.round((detailModal.user.totalKips / detailModal.user.userQuota) * 100))} 
                    status={detailModal.user.isWarning ? "exception" : "success"}
                    strokeColor={detailModal.user.isWarning ? '#cf1322' : '#52c41a'}
                  />
                </div>
                <Divider />
                <div style={{ textAlign: 'center' }}>
                  <Button 
                    variant="primary" 
                    icon={<UserOutlined />} 
                    onClick={() => {
                      setFullProfileModal({ open: true, user: detailModal.user });
                    }}
                  >
                    Xem hồ sơ đầy đủ
                  </Button>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Đơn từ & Vi phạm" key="history">
                <List
                  size="small"
                  dataSource={[
                    { label: 'Số đơn xin nghỉ', value: detailModal.user.leaveCount, color: 'orange' },
                    { label: 'Số đơn đổi kíp', value: detailModal.user.swapCount, color: 'blue' },
                    { label: 'Hệ số phạt vi phạm', value: detailModal.user.penaltyCoefficient, color: 'red' }
                  ]}
                  renderItem={item => (
                    <List.Item extra={<Tag color={item.color}>{item.value}</Tag>}>
                      {item.label}
                    </List.Item>
                  )}
                />
              </Tabs.TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      {/* Modal: Hồ sơ thành viên đầy đủ */}
      <UsersDetailModal 
        open={fullProfileModal.open}
        user={fullProfileModal.user}
        onCancel={() => setFullProfileModal({ open: false, user: null })}
        avatarFallback={`data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>'
        )}`}
        formatDateTime={(val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '--'}
      />
    </div>
  );
};

const Statistic: React.FC<{ title: string; value: any; suffix?: string; valueStyle?: any }> = ({ title, value, suffix, valueStyle }) => (
  <div>
    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 600, ...valueStyle }}>{value} <span style={{ fontSize: 12 }}>{suffix}</span></div>
  </div>
);

export default StatisticsPage;
