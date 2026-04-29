
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, DatePicker, Select, 
  Space, Typography, message, 
  Tooltip, Empty, Divider, Modal, Input,
  Avatar, Progress, InputNumber, Button,
  Tag, Spin, List
} from 'antd';
import { 
  FileExcelOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  SendOutlined,
  CommentOutlined,
  SettingOutlined,
  TableOutlined,
  SyncOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { dutyService } from '@/services/duty.service';
import { userService } from '@/services/user.service';
import { generationService } from '@/services/generation.service';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { StatisticsCard, DataTable } from '@/components/common';
import UsersDetailModal from '@/pages/Users/components/Detail';
import MatrixViewModal from './components/MatrixViewModal';
import QuotaSettingsModal from './components/QuotaSettingsModal';
import { 
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Custom styles for hover effects
const styles = `
  .quota-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
  }
  .edit-icon {
    color: #1890ff;
    cursor: pointer;
    font-size: 12px;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  }
  .quota-cell:hover .edit-icon {
    opacity: 1;
    transform: scale(1.1);
  }
  .quota-cell:hover .quota-value {
    color: #1890ff !important;
  }
`;

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    departmentId?: any;
    generationId?: any;
    viewType: 'range' | 'week';
    week: dayjs.Dayjs;
  }>({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
    departmentId: undefined,
    generationId: undefined,
    viewType: 'week',
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
  const [userRemarks, setUserRemarks] = useState<any[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);

  useEffect(() => {
    if (detailModal.open && detailModal.user) {
      fetchUserRemarks(detailModal.user.userId);
    } else {
      setUserRemarks([]);
    }
  }, [detailModal.open, detailModal.user]);

  const fetchUserRemarks = async (userId: number) => {
    setLoadingRemarks(true);
    try {
      const res = await dutyService.getUserRemarks(userId);
      if (res.success) {
        setUserRemarks(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch remarks', err);
    } finally {
      setLoadingRemarks(false);
    }
  };
  const [fullProfileModal, setFullProfileModal] = useState<{ open: boolean; user?: any }>({
    open: false,
    user: null
  });
  const [adjustmentModal, setAdjustmentModal] = useState<{ open: boolean; user?: any; newQuota: number }>({
    open: false,
    user: null,
    newQuota: 0
  });
  
  const [tableParams, setTableParams] = useState<any>({
    pagination: { current: 1, pageSize: 10 }
  });
  const [settingsModal, setSettingsModal] = useState<{ open: boolean, data: any }>({ open: false, data: null });

  const handleTableChange = (pagination: any, tableFilters: any, sorter: any) => {
    setTableParams({
      pagination,
      filters: tableFilters,
      sorter,
    });
  };

  const handleOpenSettings = async () => {
    try {
      const res = await dutyService.getSettings();
      if (res.success) {
        setSettingsModal({ open: true, data: res.data });
      }
    } catch (err) {
      message.error('Lỗi khi tải cấu hình');
    }
  };

  const handleSaveSettings = async (values: any) => {
    try {
      const res = await dutyService.updateSettings(values);
      if (res.success) {
        message.success('Đã lưu cấu hình định mức chuyên sâu');
        setSettingsModal({ open: false, data: null });
        fetchData();
      }
    } catch (err) {
      message.error('Không thể lưu cấu hình. Vui lòng thử lại.');
    }
  };

  const loadMetadata = async () => {
    try {
      const genRes = await generationService.getAll();
      if (genRes.success) {
        setGenerations(genRes.data || []);
      }
      
      // Fetch real departments from User Service Stats
      const userStatsRes = await userService.getStats();
      const statsData = userStatsRes.data || (userStatsRes as any);
      if (statsData && statsData.byDepartment) {
        const realDepts = Object.keys(statsData.byDepartment)
          .filter(name => name !== '__unassigned__' && name !== 'undefined' && name !== 'null')
          .sort()
          .map(name => ({ id: name, name: name }));
        
        if (realDepts.length > 0) {
          setDepartments(realDepts);
        } else {
          // Fallback to standard ones if no data yet
          const DEFAULT_DEPTS = ['Nhân sự', 'Tài chính', 'Truyền thông', 'Sự kiện', 'Kỹ thuật', 'Đối ngoại'];
          setDepartments(DEFAULT_DEPTS.map(d => ({ id: d, name: d })));
        }
      }
    } catch (err) {
      console.error('Metadata load error', err);
    }
  };

  useEffect(() => { loadMetadata(); }, []);

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
      if (res.success && res.data) {
        setStats(res.data);
        const meta = res.data.meta;
        if (meta) {
          // Keep our full list of departments, but sync generations if provided
          if (meta.generations) setGenerations(meta.generations);
        }
      }
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const handleNotify = async (targetUser?: any) => {
    const usersToNotify = targetUser ? [targetUser] : stats.details.filter((s: any) => s.isWarning);
    if (usersToNotify.length === 0) {
      message.info('Không có thành viên nào cần thông báo.');
      return;
    }
    try {
      await dutyService.notifyAbsentees(usersToNotify, commentModal.comment);
      message.success(`Đã gửi thông báo cho ${usersToNotify.length} thành viên.`);
      setCommentModal({ open: false, user: null, comment: '' });
    } catch (err) {
      message.error('Lỗi khi gửi thông báo');
    }
  };

  const handleNotifyAbsentees = async () => {
    const absentees = stats?.details?.filter((s: any) => s.isWarning) || [];
    if (absentees.length === 0) {
      message.info('Không có nhân sự thiếu kíp để thông báo');
      return;
    }
    setLoading(true);
    try {
      await dutyService.notifyAbsentees(absentees);
      message.success(`Đã gửi thông báo nhắc nhở tới ${absentees.length} nhân sự`);
    } catch (err) {
      message.error('Lỗi khi gửi thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleShowFullProfile = async (u: any) => {
    try {
      const res = await userService.getById(u.userId);
      if (res.success) {
        setFullProfileModal({ open: true, user: res.data });
      } else {
        message.error('Không thể tải thông tin chi tiết thành viên');
      }
    } catch (err) {
      message.error('Lỗi khi tải hồ sơ thành viên');
    }
  };

  const handleApplyAdjustment = () => {
    if (!adjustmentModal.user) return;
    const newDetails = stats.details.map((s: any) => {
      if (s.userId === adjustmentModal.user.userId) {
        const newQuota = adjustmentModal.newQuota;
        const newDeficiency = Math.max(0, newQuota - s.totalKips);
        return {
          ...s,
          userQuota: newQuota,
          deficiency: newDeficiency,
          isWarning: s.totalKips < newQuota
        };
      }
      return s;
    });
    setStats({ ...stats, details: newDetails });
    setAdjustmentModal({ open: false, user: null, newQuota: 0 });
    message.success('Đã cập nhật định mức tạm thời');
  };

  const handleExport = () => {
    if (!stats || !stats.details) return;
    const headers = ['MSV', 'Họ tên', 'Ban', 'Chức vụ', 'Tổng kíp', 'Định mức', 'Thiếu', 'Số lỗi', 'Tổng nhận (VNĐ)'];
    const csvRows = [
      headers.join(','),
      ...stats.details.map((s: any) => [
        s.studentId,
        `"${s.name}"`,
        s.department,
        s.position,
        s.totalKips,
        s.userQuota,
        s.deficiency,
        s.violationCount,
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

  const changeWeek = (direction: number) => {
    setFilters(f => ({ ...f, week: f.week.add(direction, 'week') }));
  };

  const columns: any[] = [
    {
      title: 'Thành viên',
      key: 'user',
      fixed: 'left' as const,
      width: 220,
      searchable: true,
      dataIndex: 'name',
      render: (_: any, record: any) => (
        <Space style={{ cursor: 'pointer' }} onClick={() => setDetailModal({ open: true, user: record })}>
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.studentId}</Text>
          </Space>
        </Space>
      )
    },
    { title: 'Đơn vị', dataIndex: 'department', key: 'department', width: 140 },
    {
      title: 'Tổng kíp',
      dataIndex: 'totalKips',
      key: 'totalKips',
      width: 100,
      align: 'center',
      sorter: (a: any, b: any) => a.totalKips - b.totalKips,
      render: (val: number, record: any) => (
        <div className="quota-cell">
          <Text strong style={{ color: record.isWarning ? '#cf1322' : '#3f8600' }}>
            {val}
          </Text>
          <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
            / {record.userQuota || 0}
          </span>
          <Tooltip title="Sửa định mức riêng">
            <EditOutlined 
              className="edit-icon"
              style={{ marginLeft: 8 }}
              onClick={(e) => {
                e.stopPropagation();
                setAdjustmentModal({ open: true, user: record, newQuota: record.userQuota });
              }}
            />
          </Tooltip>
        </div>
      )
    },
    {
      title: 'Tình trạng',
      dataIndex: 'deficiency',
      key: 'deficiency',
      width: 110,
      align: 'center',
      render: (val: number) => val > 0 ? <Tag color="error">Thiếu {val}</Tag> : <Tag color="success">Đủ</Tag>
    },
    {
      title: 'Số lỗi',
      dataIndex: 'violationCount',
      key: 'violationCount',
      width: 80,
      align: 'center',
      render: (count: number) => count > 0 ? <Tag color="red">{count}</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Tạm tính',
      dataIndex: 'totalEarnings',
      key: 'totalEarnings',
      width: 130,
      align: 'right',
      render: (val: number) => <Text strong>{(val / 1000).toLocaleString()}k</Text>
    },
  ];

  const getChartData = () => {
    if (!stats) return [];
    const groups: any = {};
    stats.details.forEach((s: any) => {
      const dept = s.department || 'Khác';
      groups[dept] = (groups[dept] || 0) + s.totalKips;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  const getRoleChartData = () => {
    if (!stats) return [];
    const groups: any = { 'Thành viên': 0, 'CTV': 0 };
    stats.details.forEach((s: any) => {
      const pos = s.position?.toLowerCase() || '';
      if (pos.includes('cộng tác viên') || pos.includes('ctv')) {
        groups['CTV']++;
      } else {
        groups['Thành viên']++;
      }
    });
    return Object.keys(groups).filter(k => groups[k] > 0).map(k => ({ name: k, value: groups[k] }));
  };

  return (
    <div style={{ padding: '0px' }}>
      <style>{styles}</style>
      {/* 1. Header Section */}
        <Row justify="space-between" align="middle" style={{marginBottom: 12}}>
          <Col>
            <Space align="center" size={8}>
              <Title level={4} style={{ margin: 0 }}>Thống kê & Quyết toán Trực ca</Title>
              <Tooltip title="Quản lý định mức kíp trực, theo dõi hiệu suất làm việc và tự động tính toán chi trả thù lao cho thành viên.">
                <QuestionCircleOutlined style={{ color: '#bfbfbf', cursor: 'help' }} />
              </Tooltip>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Button icon={<TableOutlined />} onClick={() => setMatrixModalOpen(true)}>Bảng Excel</Button>
              <Button icon={<FileExcelOutlined />} type="primary" onClick={handleExport}>Xuất báo cáo</Button>
            </Space>
          </Col>
        </Row>

      {/* 2. Filter & Toolbar Bar */}
      <Row gutter={[16, 16]} align="middle" style={{marginBottom: 16}}>
        <Col>
          <Select 
            value={filters.viewType} 
            onChange={(val) => setFilters(f => ({ ...f, viewType: val }))}
            style={{ width: 130 }}
            options={[{ label: 'Theo tuần', value: 'week' }, { label: 'Khoảng ngày', value: 'range' }]}
          />
        </Col>

        {filters.viewType === 'week' ? (
          <Col>
            <Space>
              <Button type="text" size="small" icon={<LeftOutlined />} onClick={() => changeWeek(-1)} />
              <DatePicker 
            picker="week" 
            value={filters.week} 
            onChange={(val) => val && setFilters(f => ({ ...f, week: val }))}
            format="[Tuần] ww, YYYY"
            allowClear={false}
            style={{ width: 160 }}
          />
              <Button type="text" size="small" icon={<RightOutlined />} onClick={() => changeWeek(1)} />
            </Space>
          </Col>
        ) : (
          <Col>
            <RangePicker 
              value={filters.dateRange} 
              onChange={(val) => val && setFilters(f => ({ ...f, dateRange: [val[0], val[1]] }))} 
            />
          </Col>
        )}

        <Col>
          <Select 
            style={{ width: 160 }} 
            placeholder="Ban / Đơn vị"
            allowClear
            value={filters.departmentId}
            options={departments.map(d => ({ label: d.name, value: d.id }))}
            onChange={(val) => setFilters(f => ({ ...f, departmentId: val }))}
          />
        </Col>

        <Col>
          <Select 
            style={{ width: 180 }} 
            placeholder="Khóa / Thế hệ"
            allowClear
            value={filters.generationId}
            options={[{ label: 'Các khóa đang hoạt động', value: 'active' }, ...generations.map(g => ({ label: g.name, value: g.id }))]}
            onChange={(val) => setFilters(f => ({ ...f, generationId: val }))}
          />
        </Col>

        <Col flex="auto">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              danger 
              type="primary"
              icon={<SendOutlined />} 
              onClick={handleNotifyAbsentees}
              disabled={stats?.summary?.warningCount === 0}
              style={{ borderRadius: 6 }}
            >
              Nhắc nhở thiếu kíp ({stats?.summary?.warningCount || 0})
            </Button>
            <Button icon={<SettingOutlined />} onClick={handleOpenSettings} type="default">
              Cấu hình định mức
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={17}>
          {(() => {
            const filteredData = (stats?.details || []).filter((item: any) => {
              if (!searchText) return true;
              const search = searchText.toLowerCase();
              return (
                item.name?.toLowerCase().includes(search) ||
                item.studentId?.toLowerCase().includes(search)
              );
            });
            
            return (
              <DataTable 
                columns={columns} 
                data={filteredData} 
                rowKey="userId"
                loading={loading}
                pagination={{ ...tableParams.pagination, total: filteredData.length }}
                onPaginationChange={handleTableChange}
                onRefresh={fetchData}
                searchable={true}
                onSearch={setSearchText}
                searchPlaceholder="Tìm tên hoặc MSV..."
                extra={null} // Moving button to a better place
                customActions={(record) => (
                  <Space>
                    <Tooltip title="Nhận xét & Nhắc nhở">
                      <Button type="text" size="small" icon={<CommentOutlined />} onClick={() => setCommentModal({ open: true, user: record, comment: '' })} />
                    </Tooltip>
                    <Tooltip title="Xem chi tiết">
                      <Button type="text" size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailModal({ open: true, user: record })} />
                    </Tooltip>
                  </Space>
                )}
              />
            );
          })()}
        </Col>
        <Col span={7}>
          <StatisticsCard
            rowGutter={8}
            containerStyle={{ marginBottom: 16 }}
            colSpan={{ xs: 12, sm: 12, md: 12, lg: 12 }}
            loading={loading}
            data={[
              { title: "Tổng kíp", value: stats?.summary?.totalKips || 0, valueColor: "#52c41a", icon: <CheckCircleOutlined /> },
              { title: "Thiếu kíp", value: stats?.summary?.warningCount || 0, valueColor: "#ff4d4f", icon: <WarningOutlined /> },
              { title: "Số lỗi", value: stats?.summary?.totalViolations || 0, valueColor: "#faad14", icon: <CloseCircleOutlined /> },
              { title: "Tạm tính", value: `${(stats?.summary?.totalPayout / 1000).toLocaleString()}k`, valueColor: "#1890ff", icon: <FileExcelOutlined /> }
            ]}
          />

          <Card title="Phân tích & Thống kê" style={{ borderRadius: 8 }}>
            {/* 1. Tiến độ định mức (Thu gọn lên đầu) */}
            <div style={{ marginBottom: 20 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={4}>
                    <Text strong>Tiến độ định mức</Text>
                    <Tooltip title="Tỷ lệ nhân sự đã hoàn thành đủ số kíp trực tối thiểu (định mức) so với tổng số nhân sự đang xem.">
                      <QuestionCircleOutlined style={{ color: '#bfbfbf', fontSize: 12, cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {stats?.details?.length > 0 ? Math.round(((stats.details.length - stats.summary.warningCount) / stats.details.length) * 100) : 0}% nhân sự đạt
                  </Text>
                </div>
                <Progress 
                  percent={stats?.details?.length > 0 ? Math.round(((stats.details.length - stats.summary.warningCount) / stats.details.length) * 100) : 0} 
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                  size="small"
                  showInfo={false}
                />
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 2. Theo Ban */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Phân bổ theo Ban</Text>
              <div style={{ height: 180 }}>
                {stats?.details?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getChartData()} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {getChartData().map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 3. Theo Vai trò */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Cơ cấu Thành viên & CTV</Text>
              <div style={{ height: 160 }}>
                {stats?.details?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getRoleChartData()} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        <Cell fill="#1890ff" />
                        <Cell fill="#fa8c16" />
                      </Pie>
                      <ChartTooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Deep Settings Modal Component */}
      <QuotaSettingsModal 
        open={settingsModal.open}
        initialData={settingsModal.data}
        onCancel={() => setSettingsModal({ open: false, data: null })}
        onSave={handleSaveSettings}
        departments={departments}
      />

      {/* Modal: Điều chỉnh nhanh */}
      <Modal
        title={`Điều chỉnh định mức: ${adjustmentModal.user?.name}`}
        open={adjustmentModal.open}
        onCancel={() => setAdjustmentModal({ open: false, user: null, newQuota: 0 })}
        onOk={handleApplyAdjustment}
        okText="Cập nhật tạm thời"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Định mức mới (số kíp):</Text>
          <InputNumber min={0} max={50} step={0.5} value={adjustmentModal.newQuota} onChange={(val) => setAdjustmentModal({ ...adjustmentModal, newQuota: val || 0 })} style={{ width: '100%' }} />
        </Space>
      </Modal>

      {/* Modal: Nhận xét & Thông báo */}
      <Modal
        title={`Gửi thông báo: ${commentModal.user?.name}`}
        open={commentModal.open}
        onCancel={() => setCommentModal({ ...commentModal, open: false })}
        onOk={() => handleNotify(commentModal.user)}
        okText="Gửi"
      >
        <TextArea rows={4} placeholder="Nội dung nhắc nhở..." value={commentModal.comment} onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })} />
      </Modal>

      {/* Modal: Chi tiết */}
      <Modal
        title="Chi tiết cá nhân"
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
                <Text type="secondary">{detailModal.user.studentId} | {detailModal.user.department}</Text>
              </div>
            </div>
            <StatisticsCard 
              hideCard
              rowGutter={12}
              colSpan={{ xs: 12, sm: 12 }}
              data={[
                { 
                  title: (
                    <Space size={4}>
                      <span>Định mức</span>
                      <Tooltip title="Số kíp tối thiểu thành viên cần hoàn thành theo quy định của hệ thống.">
                        <QuestionCircleOutlined style={{ fontSize: 12, color: '#bfbfbf', cursor: 'help' }} />
                      </Tooltip>
                    </Space>
                  ), 
                  value: detailModal.user.userQuota + ' kíp', 
                  icon: <InfoCircleOutlined />, 
                  valueColor: '#1890ff' 
                },
                { title: "Đã trực", value: detailModal.user.totalKips + ' kíp', icon: <CheckCircleOutlined />, valueColor: detailModal.user.isWarning ? '#cf1322' : '#52c41a' },
                { title: "Số lỗi", value: detailModal.user.violationCount + ' lỗi', icon: <WarningOutlined />, valueColor: '#ff4d4f' },
                { title: "Tạm tính", value: `${(detailModal.user.totalEarnings / 1000).toLocaleString()}k`, icon: <FileExcelOutlined />, valueColor: '#1890ff' }
              ]}
            />
            <Divider />
            
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ fontSize: 14, marginBottom: 12 }}>Lịch sử nhắc nhở & Nhận xét</Title>
              {loadingRemarks ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}><Spin size="small" /></div>
              ) : userRemarks.length > 0 ? (
                <List
                  size="small"
                  dataSource={userRemarks}
                  renderItem={(item: any) => {
                    const isWarning = item.type === 'warning' || item.category === 'violation';
                    const isSwap = item.type === 'swap' || item.category === 'swap';
                    const isApproval = item.category === 'approval' || item.category === 'duty';
                    
                    let icon = <SendOutlined />;
                    let color = '#1890ff';
                    let bgColor = '#e6f7ff';

                    if (isWarning) {
                      icon = <WarningOutlined />;
                      color = '#f5222d';
                      bgColor = '#fff1f0';
                    } else if (isSwap) {
                      icon = <SyncOutlined />;
                      color = '#722ed1';
                      bgColor = '#f9f0ff';
                    } else if (isApproval) {
                      icon = <CheckCircleOutlined />;
                      color = '#52c41a';
                      bgColor = '#f6ffed';
                    }

                    return (
                      <List.Item style={{ padding: '8px 0' }}>
                        <List.Item.Meta
                          avatar={<Avatar size="small" icon={icon} style={{ backgroundColor: bgColor, color: color }} />}
                          title={
                            <Space>
                              <Text strong style={{ fontSize: 12 }}>{item.title || (isWarning ? 'Cảnh báo' : 'Thông báo')}</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Paragraph style={{ margin: 0, fontSize: 12, color: '#595959' }}>{item.message || item.content}</Paragraph>
                              {item.performer && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>Thực hiện bởi:</Text>
                                  <Avatar size={14} src={item.performer.avatar} icon={<UserOutlined />} />
                                  <Text strong style={{ fontSize: 10, color: '#8c8c8c' }}>{item.performer.name}</Text>
                                </div>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                  style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 8 }}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary" style={{ fontSize: 12 }}>Chưa có lịch sử nhắc nhở</Text>} />
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" icon={<UserOutlined />} onClick={() => handleShowFullProfile(detailModal.user)}>Xem hồ sơ đầy đủ</Button>
            </div>
          </div>
        )}
      </Modal>

      <UsersDetailModal 
        open={fullProfileModal.open} 
        user={fullProfileModal.user} 
        onCancel={() => setFullProfileModal({ open: false, user: null })} 
        avatarFallback={`data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>')}`}
        formatDateTime={(val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '--'}
      />

      <MatrixViewModal 
        open={matrixModalOpen}
        onCancel={() => setMatrixModalOpen(false)}
        stats={stats}
        filters={filters}
        onFilterChange={setFilters}
        dateRangeText={
          filters.viewType === 'week' 
            ? `Tuần ${filters.week.isoWeek()}, ${filters.week.year()} (${filters.week.startOf('isoWeek').format('DD/MM')} - ${filters.week.endOf('isoWeek').format('DD/MM')})`
            : filters.dateRange[0] && filters.dateRange[1]
              ? `${filters.dateRange[0].format('MM/YYYY')} (${filters.dateRange[0].format('DD/MM')} - ${filters.dateRange[1].format('DD/MM')})`
              : 'Tháng hiện tại'
        }
      />
    </div>
  );
};

export default StatisticsPage;
