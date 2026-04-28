import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, DatePicker, Select, 
  Space, Typography, message, 
  Tooltip, Empty, Modal, Input,
  Avatar, Progress, InputNumber, Alert, Badge, Statistic
} from 'antd';
import { 
  FileExcelOutlined, 
  BellOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  SettingOutlined,
  SearchOutlined,
  TeamOutlined,
  DollarOutlined,
  FilterOutlined,
  UserOutlined
} from '@ant-design/icons';
import { dutyService } from '@/services/duty.service';
import { userService } from '@/services/user.service';
import { generationService } from '@/services/generation.service';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Button, DataTable } from '@/components/common';
import { 
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import UserDetailModal from './components/UserDetailModal';
import './index.css';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  
  const [filters, setFilters] = useState<{
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    departmentId?: string;
    generationId?: number;
    viewType: 'range' | 'week' | 'month';
    week: dayjs.Dayjs;
    month: dayjs.Dayjs;
  }>({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
    departmentId: undefined,
    generationId: undefined,
    viewType: 'week',
    week: dayjs(),
    month: dayjs()
  });

  const [detailModal, setDetailModal] = useState<{ open: boolean; user?: any }>({
    open: false,
    user: null
  });

  const [globalQuotaModal, setGlobalQuotaModal] = useState({ open: false, quota: 2.5 });
  const [isNotifying, setIsNotifying] = useState(false);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (filters.viewType === 'week') {
        startDate = filters.week.startOf('isoWeek').toISOString();
        endDate = filters.week.endOf('isoWeek').toISOString();
      } else if (filters.viewType === 'month') {
        startDate = filters.month.startOf('month').toISOString();
        endDate = filters.month.endOf('month').toISOString();
      } else {
        startDate = filters.dateRange[0]?.toISOString();
        endDate = filters.dateRange[1]?.toISOString();
      }

      const res = await dutyService.getComprehensiveStats({
        startDate,
        endDate,
        departmentId: filters.departmentId,
        generationId: filters.generationId
      });

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
      // Just to trigger metadata or similar, no longer keeping userRes/genRes state here if not used
      await Promise.all([
        userService.getAll({ _limit: 1 }), 
        generationService.getAll()
      ]);
      // Note: departments usually come from existing users or a separate service

    } catch (err) {
      console.error('Metadata load error', err);
    }
  };

  useEffect(() => { loadMetadata(); }, []);
  useEffect(() => { fetchData(); }, [filters]);

  // --- Computed Data ---
  const filteredDetails = useMemo(() => {
    if (!stats?.details) return [];
    
    // Extract unique departments from stats
    const depts = Array.from(new Set(stats.details.map((s: any) => s.department).filter(Boolean))) as string[];
    if (departments.length === 0 && depts.length > 0) {
      setDepartments(depts.map(d => ({ id: d, name: d })));
    }

    return stats.details.filter((item: any) => {
      const search = searchText.toLowerCase().trim();
      const matchSearch = !search || 
        item.name.toLowerCase().includes(search) ||
        (item.studentId && item.studentId.toLowerCase().includes(search));
      
      return matchSearch;
    });
  }, [stats, searchText]);

  const deptChartData = useMemo(() => {
    if (!stats?.details) return [];
    const groups: any = {};
    stats.details.forEach((s: any) => {
      const dept = s.department || 'Khác';
      if (!groups[dept]) groups[dept] = { name: dept, kips: 0, members: 0 };
      groups[dept].kips += s.totalKips;
      groups[dept].members += 1;
    });
    return Object.values(groups).sort((a: any, b: any) => b.kips - a.kips);
  }, [stats]);

  const violationPieData = useMemo(() => {
    if (!stats?.summary?.violationTypes) return [];
    return Object.entries(stats.summary.violationTypes).map(([name, value]) => ({ name, value }));
  }, [stats]);

  // --- Handlers ---
  const handleExport = () => {
    message.loading('Đang chuẩn bị file Excel...');
    // Real implementation would call a backend endpoint
    dutyService.exportStats({
      ...filters,
      startDate: filters.viewType === 'week' ? filters.week.startOf('isoWeek').toISOString() : 
                 filters.viewType === 'month' ? filters.month.startOf('month').toISOString() :
                 filters.dateRange[0]?.toISOString(),
      endDate: filters.viewType === 'week' ? filters.week.endOf('isoWeek').toISOString() :
               filters.viewType === 'month' ? filters.month.endOf('month').toISOString() :
               filters.dateRange[1]?.toISOString(),
    }).then((res: any) => {
      if (res.success && res.data && res.data.url) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
        const serverUrl = baseUrl.replace('/api', '');
        window.open(serverUrl + res.data.url);
      } else if (res.url) { // fallback
        window.open(res.url);
      } else {
        message.error('Không thể xuất file');
      }
    }).catch(() => {
      message.error('Lỗi khi xuất file Excel');
    });
  };

  const handleNotifyAll = async () => {
    const warningUsers = stats.details.filter((s: any) => s.isWarning);
    if (warningUsers.length === 0) {
      message.info('Không có ai thiếu kíp để nhắc nhở.');
      return;
    }

    setIsNotifying(true);
    try {
      await dutyService.notifyAbsentees(warningUsers);
      message.success(`Đã gửi thông báo cho ${warningUsers.length} thành viên.`);
    } catch (err) {
      message.error('Gửi thông báo thất bại');
    } finally {
      setIsNotifying(false);
    }
  };

  // --- Table Columns ---
  const columns: any[] = [
    {
      title: 'Thành viên',
      key: 'user',
      fixed: 'left',
      width: 250,
      render: (_: any, record: any) => (
        <Space size={12} style={{ cursor: 'pointer' }} onClick={() => setDetailModal({ open: true, user: record })}>
          <Badge dot={record.isWarning} status="error" offset={[-2, 32]}>
            <Avatar size={40} src={record.avatar} icon={<UserOutlined />} style={{ border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          </Badge>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ display: 'block', marginBottom: -4 }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.studentId}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Ban chuyên môn',
      dataIndex: 'department',
      key: 'department',
      width: 150,
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
      title: 'Số kíp',
      key: 'totalKips',
      align: 'center',
      width: 100,
      sorter: (a: any, b: any) => a.totalKips - b.totalKips,
      render: (record: any) => (
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: 16, color: record.isWarning ? '#ff4d4f' : '#52c41a' }}>{record.totalKips}</Text>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>/{record.deficiency + record.totalKips}</div>
        </div>
      )
    },
    {
      title: 'Vi phạm',
      key: 'violations',
      align: 'center',
      width: 100,
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: record.violationCount > 0 ? '#ff4d4f' : '#8c8c8c' }}>{record.violationCount}</Text>
          {record.penaltyCoefficient > 0 && <Text type="danger" style={{ fontSize: 10 }}>(-{record.penaltyCoefficient})</Text>}
        </Space>
      )
    },
    {
      title: 'Cần bổ sung',
      key: 'deficiency',
      width: 120,
      align: 'center',
      render: (record: any) => (
        record.isWarning ? (
          <span className="status-tag error">Thiếu {record.deficiency.toFixed(1)}</span>
        ) : (
          <span className="status-tag success">Đã đạt</span>
        )
      )
    },
    {
      title: 'Tạm tính',
      key: 'finalAmount',
      align: 'right',
      width: 150,
      sorter: (a: any, b: any) => a.finalAmount - b.finalAmount,
      render: (val: number) => (
        <Text strong style={{ color: '#10b981' }}>{val.toLocaleString()}₫</Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (record: any) => (
        <Tooltip title="Nhắc nhở riêng">
          <Button 
            variant="ghost" 
            icon={<BellOutlined style={{ color: record.isWarning ? '#ff4d4f' : '#1890ff' }} />} 
            onClick={(e) => { e.stopPropagation(); dutyService.notifyAbsentees([record]); }}
            buttonSize="small"
          />
        </Tooltip>
      )
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ padding: '24px' }}
    >
      {/* --- Header Section --- */}
      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 32 }}>
        <Col flex="auto">
          <Space direction="vertical" size={0}>
            <Title level={2} className="page-title">
              Trung tâm Thống kê & Báo cáo
            </Title>
            <Text type="secondary">Phân tích hiệu suất, quản lý định mức và tối ưu hóa nhân sự trực ca</Text>
          </Space>
        </Col>
        <Col>
          <Space size={12}>
            <Button 
              icon={<BellOutlined />} 
              variant="danger" 
              onClick={handleNotifyAll}
              loading={isNotifying}
              disabled={!stats?.summary?.warningCount}
            >
              Nhắc nhở ({stats?.summary?.warningCount || 0})
            </Button>
            <Button 
              icon={<FileExcelOutlined />} 
              variant="primary" 
              onClick={handleExport}
              disabled={loading || !stats}
            >
              Xuất Báo cáo Excel
            </Button>
          </Space>
        </Col>
      </Row>

      {/* --- Filter Bar --- */}
      <Card className="glass-card" style={{ marginBottom: 24 }} bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={[24, 16]} align="middle">
          <Col>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> Chế độ</Text>
              <Select 
                value={filters.viewType} 
                onChange={(val) => setFilters(f => ({ ...f, viewType: val }))}
                style={{ width: 120 }}
                variant="borderless"
                options={[
                  { label: 'Tuần trực', value: 'week' },
                  { label: 'Tháng này', value: 'month' },
                  { label: 'Tự chọn', value: 'range' }
                ]}
              />
            </Space>
          </Col>

          {filters.viewType === 'week' ? (
            <Col>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}><CalendarOutlined /> Chọn Tuần</Text>
                <DatePicker 
                  picker="week" 
                  value={filters.week} 
                  onChange={(val) => val && setFilters(f => ({ ...f, week: val }))}
                  format="[Tuần] ww, YYYY"
                  allowClear={false}
                  variant="borderless"
                />
              </Space>
            </Col>
          ) : filters.viewType === 'month' ? (
            <Col>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}><CalendarOutlined /> Chọn Tháng</Text>
                <DatePicker 
                  picker="month" 
                  value={filters.month} 
                  onChange={(val) => val && setFilters(f => ({ ...f, month: val }))}
                  format="MM/YYYY"
                  allowClear={false}
                  variant="borderless"
                />
              </Space>
            </Col>
          ) : (
            <Col>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}><CalendarOutlined /> Khoảng ngày</Text>
                <RangePicker 
                  value={filters.dateRange} 
                  onChange={(val) => val && setFilters(f => ({ ...f, dateRange: [val[0], val[1]] }))} 
                  variant="borderless"
                />
              </Space>
            </Col>
          )}

          <Col>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}><TeamOutlined /> Ban chuyên môn</Text>
              <Select 
                style={{ width: 180 }} 
                placeholder="Tất cả các ban"
                allowClear
                variant="borderless"
                value={filters.departmentId}
                options={departments.map(d => ({ label: d.name, value: d.id }))}
                onChange={(val) => setFilters(f => ({ ...f, departmentId: val }))}
              />
            </Space>
          </Col>

          <Col>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}><SearchOutlined /> Tìm kiếm</Text>
              <Input 
                placeholder="Tên, MSV..." 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)}
                variant="borderless"
                style={{ width: 180 }}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              />
            </Space>
          </Col>
          
          <Col flex="auto" />
          
          <Col>
            <Button 
              icon={<SettingOutlined />} 
              variant="outline" 
              onClick={() => setGlobalQuotaModal({ ...globalQuotaModal, open: true })}
            >
              Định mức
            </Button>
          </Col>
        </Row>
      </Card>

      {/* --- Summary Cards --- */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card" bodyStyle={{ padding: 24 }}>
            <div className="gradient-icon blue-purple">
              <CheckCircleOutlined />
            </div>
            <Statistic 
              title="Tổng số kíp trực"
              value={stats?.summary?.totalKips || 0}
              suffix="Kíp"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card" bodyStyle={{ padding: 24 }}>
            <div className="gradient-icon orange-red">
              <WarningOutlined />
            </div>
            <Statistic 
              title="Thiếu định mức"
              value={stats?.summary?.warningCount || 0}
              suffix="Người"
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card" bodyStyle={{ padding: 24 }}>
            <div className="gradient-icon red-dark">
              <CloseCircleOutlined />
            </div>
            <Statistic 
              title="Tổng lỗi vi phạm"
              value={stats?.summary?.totalViolations || 0}
              suffix="Lỗi"
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card" bodyStyle={{ padding: 24 }}>
            <div className="gradient-icon green-emerald">
              <DollarOutlined />
            </div>
            <Statistic 
              title="Tạm tính quỹ"
              value={(stats?.summary?.totalPayout || 0).toLocaleString()}
              suffix="₫"
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
      </Row>

      {/* --- Charts & Data Table Section --- */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card className="glass-card" title="Danh sách hiệu suất thành viên" bodyStyle={{ padding: 0 }}>
            <DataTable 
              columns={columns} 
              data={filteredDetails} 
              loading={loading}
              rowKey="userId"
              pagination={{ pageSize: 10 }}
              hideCard
              rowClassName={(record: any) => record.isWarning ? 'warning-row' : ''}
              style={{ padding: '12px' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card className="glass-card" title="Tỷ lệ đạt định mức">
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Progress 
                  type="dashboard" 
                  percent={stats ? Math.round(((stats.details.length - stats.summary.warningCount) / stats.details.length) * 100) : 0} 
                  strokeColor={{ '0%': '#6366f1', '100%': '#10b981' }}
                  strokeWidth={10}
                  size={180}
                />
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 24 }}>{stats ? stats.details.length - stats.summary.warningCount : 0}</Text>
                  <Text type="secondary"> / {stats?.details?.length || 0} thành viên đã đạt</Text>
                </div>
              </div>
            </Card>

            <Card className="glass-card" title="Phân bổ Kíp theo Ban">
              <div style={{ height: 280, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} style={{ fontSize: 12 }} />
                    <ChartTooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="kips" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="glass-card" title="Phân loại Vi phạm">
              <div style={{ height: 280 }}>
                {violationPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={violationPieData} 
                        cx="50%" cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {violationPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có vi phạm" />}
              </div>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* --- Modals --- */}
      <Modal
        title="Cấu hình Định mức trực ca"
        open={globalQuotaModal.open}
        onCancel={() => setGlobalQuotaModal({ ...globalQuotaModal, open: false })}
        footer={null}
        width={400}
        centered
      >
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Alert 
            message="Thiết lập này sẽ được dùng để tính toán cảnh báo thiếu kíp." 
            type="info" 
            showIcon 
          />
          <div>
            <div style={{ marginBottom: 12 }}><Text strong>Định mức mặc định (Kíp/Tuần):</Text></div>
            <InputNumber 
              min={0} 
              step={0.5} 
              value={globalQuotaModal.quota} 
              onChange={(val) => setGlobalQuotaModal({ ...globalQuotaModal, quota: val || 0 })}
              style={{ width: '100%' }}
              size="large"
            />
          </div>
          <Button 
            variant="primary" 
            block 
            onClick={() => {
              // In reality, this would call settings update
              message.success('Đã cập nhật cấu hình định mức');
              setGlobalQuotaModal({ ...globalQuotaModal, open: false });
            }}
          >
            Lưu thay đổi
          </Button>
        </Space>
      </Modal>

      <UserDetailModal 
        open={detailModal.open}
        user={detailModal.user}
        onCancel={() => setDetailModal({ open: false, user: null })}
      />
    </motion.div>
  );
};

export default StatisticsPage;
