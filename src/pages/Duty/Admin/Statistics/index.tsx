
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, DatePicker, Select, 
  Space, Tag, Typography, message, 
  Tooltip, Empty, Divider, Modal, Input, List,
  Avatar, Progress, Tabs, InputNumber, Button, Form
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
  CalendarOutlined,
  SendOutlined,
  CommentOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  TableOutlined
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
  const [positions, setPositions] = useState<string[]>([]);
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
    viewType: 'week', // Default to week view as requested
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
  const [adjustmentModal, setAdjustmentModal] = useState<{ open: boolean; user?: any; newQuota: number }>({
    open: false,
    user: null,
    newQuota: 0
  });
  
  const [tableParams, setTableParams] = useState<any>({
    pagination: { current: 1, pageSize: 10 }
  });
  const [settingsModal, setSettingsModal] = useState({ open: false });
  const [form] = Form.useForm();

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
        setSettingsModal({ open: true });
        const quotaRules = (res.data?.quotaRules || []).map((r: any) => ({
          ...r,
          dateRange: r.startDate && r.endDate ? [dayjs(r.startDate), dayjs(r.endDate)] : undefined
        }));
        form.setFieldsValue({
          defaultQuota: res.data?.defaultQuota,
          kipPrice: res.data?.kipPrice,
          violationPenaltyRate: res.data?.violationPenaltyRate,
          quotaRules,
        });
      }
    } catch (err) {
      message.error('Lỗi khi tải cấu hình');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields();
      if (values.quotaRules) {
        values.quotaRules = values.quotaRules.map((r: any) => {
          const rule = { ...r };
          if (r.dateRange && r.dateRange.length === 2) {
            rule.startDate = r.dateRange[0].startOf('day').toISOString();
            rule.endDate = r.dateRange[1].endOf('day').toISOString();
          } else {
            rule.startDate = null;
            rule.endDate = null;
          }
          delete rule.dateRange;
          return rule;
        });
      }
      await dutyService.updateSettings(values);
      message.success('Đã lưu cấu hình');
      setSettingsModal({ open: false });
      fetchData(); // Tải lại để áp dụng định mức mới
    } catch (err) {
      message.error('Vui lòng kiểm tra lại thông tin cấu hình');
    }
  };

  const loadMetadata = async () => {
    try {
      const genRes = await generationService.getAll();
      if (genRes.success) {
        setGenerations(genRes.data || []);
      }
      
      // Standard departments as used in User Management
      const DEPARTMENT_OPTIONS = ['Nhân sự', 'Tài chính', 'Truyền thông', 'Sự kiện'];
      setDepartments(DEPARTMENT_OPTIONS.map(d => ({ id: d, name: d })));
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
      console.log('[Statistics] Fetching with params:', params);
      const res = await dutyService.getComprehensiveStats(params);
      if (res.success && res.data) {
        setStats(res.data);
        // Sync metadata from response if available
        const meta = res.data.meta;
        if (meta) {
          if (meta.departments) {
            setDepartments(meta.departments.map((d: string) => ({ id: d, name: d })));
          }
          if (meta.generations) {
            setGenerations(meta.generations);
          }
          if (meta.positions) {
            setPositions(meta.positions);
          }
        }
      }
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    console.log('[Statistics] Filters changed:', filters);
    fetchData(); 
  }, [filters]);

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

  const handleNotifyAbsentees = async () => {
    const absentees = stats.details.filter((s: any) => s.isWarning);
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

  const handleExport = () => {
    if (!stats || !stats.details) return;
    const headers = ['MSV', 'Họ tên', 'Ban', 'Chức vụ', 'Tổng kíp', 'Định mức', 'Thiếu', 'Số lỗi', 'HS Phạt', 'Tổng nhận (VNĐ)'];
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
        s.penaltyCoefficient,
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
    setFilters(f => ({
      ...f,
      week: f.week.add(direction, 'week')
    }));
  };

  const handleApplyAdjustment = () => {
    if (!adjustmentModal.user) return;
    
    // Simulate updating local state for preview
    // In a real app, this might save an override to the DB
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

    // Recalculate summary
    const warningCount = newDetails.filter((s: any) => s.isWarning).length;
    
    setStats({
      ...stats,
      summary: { ...stats.summary, warningCount },
      details: newDetails
    });
    setAdjustmentModal({ open: false, user: null, newQuota: 0 });
    message.success('Đã cập nhật định mức tạm thời cho nhân sự');
  };

  const columns: any[] = [
    {
      title: 'Tên thành viên',
      key: 'user',
      fixed: 'left' as const,
      width: 220,
      searchable: true,
      dataIndex: 'name', // Needed for DataTable search
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
    {
      title: 'Đơn vị',
      dataIndex: 'department',
      key: 'department',
      width: 140,
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (val: string) => {
        const POSITION_MAP: Record<string, string> = {
          'ctv': 'Cộng tác viên',
          'tv': 'Thành viên',
          'tvb': 'Thành viên ban',
          'pb': 'Phó ban',
          'tb': 'Trưởng ban',
          'ctc': 'Cựu thành viên',
          'dt': 'Đội trưởng'
        };
        return POSITION_MAP[val] || val || 'N/A';
      }
    },
    {
      title: 'Tổng kíp',
      dataIndex: 'totalKips',
      key: 'totalKips',
      width: 100,
      align: 'center',
      sorter: (a: any, b: any) => a.totalKips - b.totalKips,
      render: (val: number, record: any) => (
        <Text strong style={{ color: record.isWarning ? '#cf1322' : '#3f8600' }}>{val}</Text>
      )
    },
    {
      title: 'Định mức',
      key: 'quota',
      width: 120,
      align: 'center',
      render: (_: any, record: any) => (
        <Space>
          <Text>{record.userQuota}</Text>
          <Tooltip title="Sửa riêng">
            <EditOutlined 
              style={{ color: '#1890ff', cursor: 'pointer', fontSize: 12 }} 
              onClick={(e) => {
                e.stopPropagation();
                setAdjustmentModal({ open: true, user: record, newQuota: record.userQuota });
              }}
            />
          </Tooltip>
        </Space>
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
      title: 'Tiến độ',
      key: 'progress',
      width: 160,
      render: (_: any, record: any) => (
        <Progress 
          percent={Math.min(100, Math.round((record.totalKips / record.userQuota) * 100))} 
          size="small" 
          status={record.isWarning ? "exception" : "success"}
          strokeColor={record.isWarning ? '#cf1322' : '#52c41a'}
        />
      )
    },
    {
      title: 'Số lỗi',
      dataIndex: 'violationCount',
      key: 'violationCount',
      width: 80,
      align: 'center',
      sorter: (a: any, b: any) => a.violationCount - b.violationCount,
      render: (count: number) => count > 0 ? <Tag color="red">{count}</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Tạm tính (VNĐ)',
      dataIndex: 'totalEarnings',
      key: 'totalEarnings',
      width: 130,
      align: 'right',
      sorter: (a: any, b: any) => a.totalEarnings - b.totalEarnings,
      render: (val: number) => <Text strong>{val?.toLocaleString()} ₫</Text>
    },
  ];

  const getChartData = () => {
    if (!stats) return [];
    const groups: any = {};
    stats.details.forEach((s: any) => {
      const dept = s.department || 'Chưa xếp đơn vị';
      groups[dept] = (groups[dept] || 0) + s.totalKips;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  return (
    <div style={{ padding: '0px' }}>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Space size={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Title level={3} style={{ margin: 0 }}>Báo cáo & Thống kê Trực ca</Title>
            <Select 
                style={{ width: 240 }} 
                placeholder="Lọc theo Khóa / Thế hệ"
                allowClear
                value={filters.generationId}
                options={[
                  { label: 'Các khóa đang hoạt động', value: 'active' },
                  ...generations.map(g => ({ label: g.name, value: g.id }))
                ]}
                onChange={(val) => setFilters(f => ({ ...f, generationId: val }))}
              />
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<SettingOutlined />} onClick={handleOpenSettings}>
              Cấu hình chung
            </Button>
            <Button icon={<TableOutlined />} onClick={() => {
              console.log('[Statistics] Opening Matrix View with stats:', stats);
              setMatrixModalOpen(true);
            }}>
              Dạng bảng Excel
            </Button>
            <Button icon={<FileExcelOutlined />} type="primary" onClick={handleExport}>
              Xuất dữ liệu
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="bottom">
          <Col>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Chế độ xem</Text>
              <Select 
                value={filters.viewType} 
                onChange={(val) => setFilters(f => ({ ...f, viewType: val }))}
                style={{ width: 140 }}
                options={[
                  { label: 'Theo tuần', value: 'week' },
                  { label: 'Khoảng ngày', value: 'range' }
                ]}
              />
            </Space>
          </Col>

          {filters.viewType === 'week' ? (
            <Col>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>Chọn tuần trực</Text>
                <Space>
                  <Button type="default" size="small" icon={<LeftOutlined />} onClick={() => changeWeek(-1)} />
                  <DatePicker 
                    picker="week" 
                    value={filters.week} 
                    onChange={(val) => val && setFilters(f => ({ ...f, week: val }))}
                    format="[Tuần] ww, YYYY"
                    allowClear={false}
                  />
                  <Button type="default" size="small" icon={<RightOutlined />} onClick={() => changeWeek(1)} />
                </Space>
              </Space>
            </Col>
          ) : (
            <Col>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>Khoảng thời gian</Text>
                <RangePicker 
                  value={filters.dateRange} 
                  onChange={(val) => {
                    if (val) setFilters(f => ({ ...f, dateRange: [val[0], val[1]] }));
                  }} 
                />
              </Space>
            </Col>
          )}

          <Col>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Ban / Đơn vị</Text>
              <Select 
                style={{ width: 180 }} 
                placeholder="Tất cả các Ban"
                allowClear
                value={filters.departmentId}
                options={departments.map(d => ({ label: d.name, value: d.id }))}
                onChange={(val) => setFilters(f => ({ ...f, departmentId: val }))}
              />
            </Space>
          </Col>

        </Row>
        
        {filters.viewType === 'week' && (
          <div style={{ marginTop: 12 }}>
            <Tag color="blue" icon={<CalendarOutlined />}>
              Thời gian: {filters.week.startOf('isoWeek').format('DD/MM/YYYY')} - {filters.week.endOf('isoWeek').format('DD/MM/YYYY')}
            </Tag>
          </div>
        )}
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
          <DataTable 
            columns={columns} 
            data={stats?.details || []} 
            rowKey="userId"
            loading={loading}
            pagination={{
              ...tableParams.pagination,
              total: stats?.details?.length || 0
            }}
            onPaginationChange={handleTableChange}
            onRefresh={fetchData}
            searchable={true}
            searchPlaceholder="Tìm tên hoặc mã sinh viên..."
            filters={[
              {
                key: 'department',
                label: 'Ban',
                type: 'select',
                options: departments.map(d => ({ label: d.name, value: d.id }))
              }
            ]}
            filterValues={{
              department: filters.departmentId,
              generationId: filters.generationId
            }}
            onFilterChange={(key, val) => {
              if (key === 'department') setFilters(f => ({ ...f, departmentId: val }));
              if (key === 'generationId') setFilters(f => ({ ...f, generationId: val }));
            }}
            onClearFilters={() => setFilters(f => ({ ...f, departmentId: undefined, generationId: undefined }))}
            exportable={true}
            onExport={handleExport}
            extra={
              <Space>
                <Button 
                  type="primary" danger
                  icon={<SendOutlined />} 
                  onClick={handleNotifyAbsentees}
                  disabled={stats?.summary?.warningCount === 0}
                >
                  Gửi nhắc nhở ({stats?.summary?.warningCount})
                </Button>
              </Space>
            }
            customActions={(record) => (
              <Space>
                <Tooltip title="Nhận xét & Nhắc nhở">
                  <Button 
                    type="text"
                    size="small" 
                    icon={<CommentOutlined />} 
                    onClick={() => setCommentModal({ open: true, user: record, comment: '' })}
                  />
                </Tooltip>
                <Tooltip title="Xem chi tiết">
                  <Button 
                    type="text"
                    size="small" 
                    icon={<InfoCircleOutlined />} 
                    onClick={() => setDetailModal({ open: true, user: record })}
                  />
                </Tooltip>
              </Space>
            )}
          />
        </Col>
        <Col span={7}>
          <Card title="Phân bổ theo Đơn vị" style={{ height: '100%' }}>
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

      {/* Modal: Điều chỉnh định mức */}
      <Modal
        title={`Điều chỉnh định mức: ${adjustmentModal.user?.name}`}
        open={adjustmentModal.open}
        onCancel={() => setAdjustmentModal({ open: false, user: null, newQuota: 0 })}
        onOk={handleApplyAdjustment}
        okText="Áp dụng tạm thời"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Thay đổi này chỉ áp dụng cho thống kê hiện tại để bạn rà soát lỗi trước khi gửi thông báo.</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Định mức mới (số kíp):</Text>
          <InputNumber 
            min={0} 
            max={50} 
            step={0.5} 
            value={adjustmentModal.newQuota} 
            onChange={(val) => setAdjustmentModal({ ...adjustmentModal, newQuota: val || 0 })}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>

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
            
            <Tabs defaultActiveKey="stats" className="stats-tabs">
              <Tabs.TabPane tab="Tổng quan" key="stats">
                <StatisticsCard 
                  hideCard
                  rowGutter={12}
                  colSpan={{ xs: 24, sm: 8, md: 8 }}
                  containerStyle={{ marginBottom: 20 }}
                  data={[
                    { 
                      title: "Yêu cầu", 
                      value: `${detailModal.user.userQuota} kíp`, 
                      icon: <InfoCircleOutlined />,
                      valueColor: '#1890ff'
                    },
                    { 
                      title: "Đã trực", 
                      value: `${detailModal.user.totalKips} kíp`, 
                      icon: <CheckCircleOutlined />,
                      valueColor: detailModal.user.isWarning ? '#cf1322' : '#52c41a'
                    },
                    { 
                      title: "Số lỗi", 
                      value: detailModal.user.violationCount, 
                      icon: <WarningOutlined />,
                      valueColor: '#cf1322'
                    }
                  ]}
                />
                <div style={{ marginTop: 8, padding: '0 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong>Tỷ lệ hoàn thành định mức</Text>
                    <Text type="secondary">{Math.min(100, Math.round((detailModal.user.totalKips / detailModal.user.userQuota) * 100))}%</Text>
                  </div>
                  <Progress 
                    percent={Math.min(100, Math.round((detailModal.user.totalKips / detailModal.user.userQuota) * 100))} 
                    status={detailModal.user.isWarning ? "exception" : "success"}
                    strokeColor={detailModal.user.isWarning ? '#cf1322' : '#52c41a'}
                    strokeWidth={10}
                  />
                </div>
                <Divider />
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <Button 
                    type="primary" 
                    icon={<UserOutlined />} 
                    onClick={() => handleShowFullProfile(detailModal.user)}
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

      {/* Modal: Cấu hình chung */}
      <Modal
        title="Cấu hình hệ thống trực ca"
        open={settingsModal.open}
        onCancel={() => setSettingsModal({ open: false })}
        onOk={handleSaveSettings}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Định mức chung (Kíp)" name="defaultQuota">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá 1 kíp (VNĐ)" name="kipPrice">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Phạt vi phạm (VNĐ)" name="violationPenaltyRate">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Định mức theo chức vụ / người dùng</Divider>
          <Form.List name="quotaRules">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline" wrap>
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      rules={[{ required: true, message: 'Chọn loại' }]}
                    >
                      <Select style={{ width: 120 }}>
                        <Select.Option value="position">Chức vụ</Select.Option>
                        <Select.Option value="user">Theo MSV/ID</Select.Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) =>
                        prevValues.quotaRules?.[name]?.type !== currentValues.quotaRules?.[name]?.type
                      }
                    >
                      {({ getFieldValue }) => {
                        const type = getFieldValue(['quotaRules', name, 'type']);
                        return type === 'position' ? (
                          <Form.Item
                            {...restField}
                            name={[name, 'target']}
                            rules={[{ required: true, message: 'Chọn chức vụ' }]}
                          >
                            <Select style={{ width: 160 }} placeholder="Chọn chức vụ">
                              {positions.map(p => {
                                const POSITION_MAP: Record<string, string> = {
                                  'ctv': 'Cộng tác viên',
                                  'tv': 'Thành viên',
                                  'tvb': 'Thành viên ban',
                                  'pb': 'Phó ban',
                                  'tb': 'Trưởng ban',
                                  'ctc': 'Cựu thành viên',
                                  'dt': 'Đội trưởng'
                                };
                                return <Select.Option key={p} value={p}>{POSITION_MAP[p] || p}</Select.Option>;
                              })}
                            </Select>
                          </Form.Item>
                        ) : (
                          <Form.Item
                            {...restField}
                            name={[name, 'target']}
                            rules={[{ required: true, message: 'Nhập mã' }]}
                          >
                            <Input placeholder="VD: B21DCCN..." style={{ width: 160 }} />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'cycle']}
                      rules={[{ required: true, message: 'Chu kỳ' }]}
                      initialValue="week"
                    >
                      <Select style={{ width: 90 }}>
                        <Select.Option value="week">Tuần</Select.Option>
                        <Select.Option value="month">Tháng</Select.Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'dateRange']}
                    >
                      <RangePicker placeholder={['Từ ngày', 'Đến ngày']} style={{ width: 220 }} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'quota']}
                      rules={[{ required: true, message: 'Nhập kíp' }]}
                    >
                      <InputNumber placeholder="Số kíp" step={0.5} min={0} style={{ width: 80 }} />
                    </Form.Item>
                    
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ type: 'position', target: '', cycle: 'week', quota: 2.5 })} block icon={<PlusOutlined />}>
                    Thêm ngoại lệ định mức
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <UsersDetailModal 
        open={fullProfileModal.open}
        user={fullProfileModal.user}
        onCancel={() => setFullProfileModal({ open: false, user: null })}
        avatarFallback={`data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>'
        )}`}
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
