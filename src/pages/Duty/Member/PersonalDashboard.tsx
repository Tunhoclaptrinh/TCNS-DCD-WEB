import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Tag, Empty, Progress, Divider, Calendar, Alert, Avatar } from 'antd';
import { 
  ClockCircleOutlined,
  CheckCircleOutlined,
  NotificationOutlined,
  ThunderboltOutlined,
  ScheduleOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  BellOutlined,
  WarningOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/vi';
import { useNavigate } from 'react-router-dom';
import { Button, StatisticsCard, Loading } from '@/components/common';

dayjs.extend(relativeTime);
dayjs.extend(isoWeek);
dayjs.locale('vi');

const { Title, Text, Paragraph } = Typography;

const PersonalDashboard: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(dayjs().startOf('isoWeek'));
    const [upcomingSlots, setUpcomingSlots] = useState<any[]>([]);
    const [showWarning, setShowWarning] = useState(true);
    const [stats, setStats] = useState<any>({
        totalHours: 0,
        attendedCount: 0,
        points: 0,
        pendingRequests: 0,
        upcomingCount: 0,
        recentLogs: []
    });

    const fetchData = async (weekToFetch = selectedWeek) => {
        if (!user) return;
        setLoading(true);
        try {
            const statsRes = await dutyService.getPersonalStats();
            if (statsRes.success) setStats(statsRes.data);

            const weekStart = weekToFetch.startOf('isoWeek').format('YYYY-MM-DD');
            const scheduleRes = await dutyService.getWeeklySchedule(weekStart);
            
            // SHOW ALL SLOTS, don't filter. Just sort them.
            const allSlots = (scheduleRes.data?.slots || [])
                .sort((a: any, b: any) => {
                    const dateA = dayjs(`${dayjs(a.shiftDate).format('YYYY-MM-DD')} ${a.startTime}`);
                    const dateB = dayjs(`${dayjs(b.shiftDate).format('YYYY-MM-DD')} ${b.startTime}`);
                    return dateA.diff(dateB);
                });
            
            setUpcomingSlots(allSlots);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, selectedWeek]);

    const handlePrevWeek = () => {
        const newWeek = selectedWeek.subtract(1, 'week').startOf('isoWeek');
        setSelectedWeek(newWeek);
    };
    
    const handleNextWeek = () => {
        const newWeek = selectedWeek.add(1, 'week').startOf('isoWeek');
        setSelectedWeek(newWeek);
    };
    
    const handleToday = () => {
        const today = dayjs().startOf('isoWeek');
        setSelectedWeek(today);
    };

    const displayName = user?.firstName || user?.name?.split('@')[0] || user?.name || 'Thành viên';
    const weekLabel = `Tuần ${selectedWeek.isoWeek()} (${selectedWeek.format('DD/MM')} - ${selectedWeek.endOf('isoWeek').format('DD/MM')})`;

    return (
        <div className="personal-dashboard">
            {/* Header: Greeting & Quick Stats Combined */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={24}>
                    <Card bordered={false} className="welcome-card" style={{ borderRadius: 8 }}>
                        <Row gutter={24} align="middle">
                            <Col flex="auto">
                                <Title level={3} style={{ margin: 0 }}>Chào buổi chiều, {displayName}! 👋</Title>
                                <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                                    Hôm nay bạn có <Text strong>{upcomingSlots.length}</Text> ca trực sắp tới. Chúc bạn một ngày làm việc hiệu quả.
                                </Paragraph>
                            </Col>
                            <Col>
                                <Space size={12}>
                                    <Button variant="ghost" icon={<ScheduleOutlined />} onClick={() => navigate('/duty/calendar')}>Xem lịch</Button>
                                    <Button variant="primary" icon={<ThunderboltOutlined />} onClick={() => navigate('/duty/calendar')}>Đăng ký kíp</Button>
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Warning Message */}
            {showWarning && (
                <Alert
                    message="THÔNG BÁO QUAN TRỌNG"
                    description="Các kíp trực đã khóa sẽ không thể thay đổi. Vui lòng liên hệ quản lý nếu cần hỗ trợ gấp."
                    type="warning"
                    showIcon
                    closable
                    onClose={() => setShowWarning(false)}
                    style={{ marginBottom: 32, borderRadius: 12, padding: '16px 24px' }}
                />
            )}

            {/* Core Statistics Card - Relying on its own internal styling */}
            <StatisticsCard
                hideCard
                rowGutter={24}
                containerStyle={{ marginBottom: 24 }}
                colSpan={{ xs: 24, sm: 12, lg: 6 }}
                data={[
                    { 
                        title: "TỔNG KÍP", 
                        value: `${stats.totalKips || 0}`, 
                        valueColor: stats.isWarning ? "#cf1322" : "#3f8600", 
                        icon: <CheckCircleOutlined /> 
                    },
                    { 
                        title: "ĐỊNH MỨC THIẾU", 
                        value: stats.deficiency || 0, 
                        valueColor: stats.isWarning ? "#faad14" : "#10b981", 
                        icon: <WarningOutlined /> 
                    },
                    { 
                        title: "VI PHẠM", 
                        value: stats.violationCount || 0, 
                        valueColor: (stats.violationCount || 0) > 0 ? "#cf1322" : "#8c8c8c", 
                        icon: <CloseCircleOutlined /> 
                    },
                    { 
                        title: "YÊU CẦU MỚI", 
                        value: stats.pendingRequests, 
                        valueColor: "#3b82f6", 
                        icon: <NotificationOutlined /> 
                    }
                ]}
            />

            <Row gutter={[24, 24]}>
                {/* Main Schedule Column */}
                <Col xs={24} xl={16}>
                    <Card 
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
                                <Title level={4} style={{ margin: 0 }}>LỊCH TRỰC TUẦN NÀY</Title>
                                <Space size={8}>
                                    <Button variant="ghost" buttonSize="small" icon={<LeftOutlined />} onClick={handlePrevWeek} />
                                    <Text strong style={{ minWidth: 100, textAlign: 'center' }}>{weekLabel}</Text>
                                    <Button variant="ghost" buttonSize="small" icon={<RightOutlined />} onClick={handleNextWeek} />
                                    <Button variant="ghost" buttonSize="small" onClick={handleToday} style={{ marginLeft: 8 }}>Tuần này</Button>
                                </Space>
                            </div>
                        }
                        bordered={false}
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        styles={{ body: { padding: 0 } }}
                    >
                        {loading ? (
                            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                <Loading />
                            </div>
                        ) : (
                            <div style={{ width: '100%' }}>
                                {upcomingSlots.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                        {upcomingSlots.map((slot, index) => {
                                            const date = dayjs(slot.shiftDate);
                                            const isToday = date.isSame(dayjs(), 'day');
                                            const isMine = slot.assignedUserIds?.includes(user?.id);

                                            return (
                                                <div 
                                                    key={slot.id}
                                                    style={{ 
                                                        padding: '16px 0', 
                                                        borderBottom: index === upcomingSlots.length - 1 ? 'none' : '1px solid #f0f0f0',
                                                        background: isMine ? (isToday ? 'rgba(139, 29, 29, 0.05)' : 'rgba(59, 130, 246, 0.02)') : '#fff',
                                                        transition: 'all 0.2s ease',
                                                        cursor: 'pointer',
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        borderLeft: isMine ? '4px solid #8b1d1d' : 'none'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = isMine ? 'rgba(139, 29, 29, 0.08)' : '#fafafa'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = isMine ? (isToday ? 'rgba(139, 29, 29, 0.05)' : 'rgba(59, 130, 246, 0.02)') : '#fff'}
                                                    onClick={() => navigate('/duty/calendar')}
                                                >
                                                    {/* Left Column: Date - NO PADDING ON LEFT */}
                                                    <div style={{ 
                                                        width: 90, 
                                                        textAlign: 'center', 
                                                        borderRight: '1px solid #f0f0f0',
                                                        flexShrink: 0
                                                    }}>
                                                        <Text strong style={{ display: 'block', fontSize: 11, color: isToday ? '#8b1d1d' : '#8c8c8c', textTransform: 'uppercase' }}>
                                                            {date.day() === 0 ? 'CN' : `Th ${date.day() + 1}`}
                                                        </Text>
                                                        <Title level={3} style={{ margin: 0, color: isToday ? '#8b1d1d' : 'inherit' }}>{date.format('DD')}</Title>
                                                    </div>

                                                    {/* Center Column: Content */}
                                                    <div style={{ flex: 1, padding: '0 24px' }}>
                                                        <Space direction="vertical" size={2}>
                                                            <Space wrap>
                                                                <Text strong style={{ fontSize: 17, color: '#262626' }}>{slot.shiftLabel}</Text>
                                                                {isMine && <Tag color="error" style={{ borderRadius: 4, fontWeight: 800, fontSize: 10, border: 'none' }}>KÍP CỦA TÔI</Tag>}
                                                                {isToday && !isMine && <Tag color="default" style={{ borderRadius: 4, fontWeight: 700, fontSize: 10, border: 'none' }}>HÔM NAY</Tag>}
                                                                {slot.status === 'locked' && <Tag style={{ borderRadius: 4, fontSize: 10 }}>ĐÃ KHÓA</Tag>}
                                                            </Space>
                                                            <div style={{ color: '#8c8c8c', fontSize: 13, display: 'flex', gap: 20 }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined /> {slot.startTime} - {slot.endTime}</span>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TeamOutlined /> {slot.assignedUserIds?.length || 0}/{slot.capacity || 0} thành viên</span>
                                                            </div>
                                                        </Space>
                                                    </div>

                                                    {/* Right Column: Action - NO PADDING ON RIGHT */}
                                                    <div style={{ paddingRight: 24, flexShrink: 0 }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            buttonSize="small" 
                                                            style={{ color: '#8b1d1d', fontWeight: 700 }}
                                                        >
                                                            CHI TIẾT <RightOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                        <Empty description="Không có ca trực nào trong tuần này" />
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Sidebar Column */}
                <Col xs={24} xl={8}>
                    <Space direction="vertical" size={24} style={{ width: '100%' }}>
                        {/* Monthly Progress */}
                        <Card title="Hiệu suất chuyên cần" bordered={false} style={{ borderRadius: 8 }}>
                            <div style={{ textAlign: 'center' }}>
                                <Progress 
                                    type="circle" 
                                    percent={Math.round((stats.attendedCount / (stats.attendedCount + stats.upcomingCount || 1)) * 100)} 
                                    strokeColor="#8b1d1d" 
                                />
                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around' }}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Đã trực</Text>
                                        <Text strong>{stats.attendedCount} kíp</Text>
                                    </Space>
                                    <Divider type="vertical" style={{ height: 32 }} />
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Sắp tới</Text>
                                        <Text strong>{upcomingSlots.length} kíp</Text>
                                    </Space>
                                </div>
                            </div>
                        </Card>

                        {/* Mini Calendar */}
                        <Card title="Lịch trực cá nhân" bordered={false} style={{ borderRadius: 8 }}>
                            <Calendar 
                                fullscreen={false} 
                                headerRender={({ value, onChange }) => (
                                    <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Button variant="ghost" buttonSize="small" icon={<LeftOutlined />} onClick={() => onChange(value.subtract(1, 'month'))} />
                                        <Text strong>{value.format('MM / YYYY')}</Text>
                                        <Button variant="ghost" buttonSize="small" icon={<RightOutlined />} onClick={() => onChange(value.add(1, 'month'))} />
                                    </div>
                                )}
                                fullCellRender={(date) => {
                                    const hasDuty = upcomingSlots.some(s => dayjs(s.shiftDate).isSame(date, 'day'));
                                    const isToday = date.isSame(dayjs(), 'day');
                                    return (
                                        <div style={{ 
                                            height: 32, 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            borderRadius: 4,
                                            background: isToday ? '#fff1f0' : 'transparent',
                                            border: isToday ? '1px solid #8b1d1d' : 'none'
                                        }}>
                                            <Text style={{ fontSize: 12, color: isToday ? '#8b1d1d' : 'inherit' }}>{date.date()}</Text>
                                            {hasDuty && <div style={{ width: 4, height: 4, borderRadius: '2', background: '#8b1d1d', marginTop: 2 }} />}
                                        </div>
                                    );
                                }}
                            />
                        </Card>

                        {/* Activity Feed */}
                        <Card title="Hoạt động gần đây" bordered={false} style={{ borderRadius: 8 }}>
                            {stats.recentLogs && stats.recentLogs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {stats.recentLogs.slice(0, 3).map((log: any, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', gap: 12 }}>
                                            <Avatar size="small" icon={<BellOutlined />} style={{ background: '#f0f0f0', color: '#8b1d1d' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13 }}>{log.details}</div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(log.createdAt).fromNow()}</Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Card>
                    </Space>
                </Col>
            </Row>
        </div>
    );
};

export default PersonalDashboard;
