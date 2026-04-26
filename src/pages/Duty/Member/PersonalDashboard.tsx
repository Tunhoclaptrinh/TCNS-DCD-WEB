import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Spin, Tag, Button, Empty, Alert } from 'antd';
import { 
  HistoryOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dutyService from '@/services/duty.service';
import StatisticsCard from '@/components/common/StatisticsCard';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const PersonalDashboard: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [upcomingSlots, setUpcomingSlots] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        totalHours: 0,
        attendedCount: 0,
        points: 0,
        pendingRequests: 0,
        upcomingCount: 0
    });

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get personal stats
            const statsRes = await dutyService.getPersonalStats();
            if (statsRes.success) {
                setStats(statsRes.data);
            }

            // Get weekly schedule to find upcoming slots
            const scheduleRes = await dutyService.getWeeklySchedule();
            const allSlots = scheduleRes.data?.slots || [];
            
            const now = dayjs();
            const myUpcoming = allSlots
                .filter((s: any) => 
                    s.assignedUserIds?.includes(user.id) && 
                    dayjs(`${dayjs(s.shiftDate).format('YYYY-MM-DD')} ${s.startTime}`).isAfter(now)
                )
                .sort((a: any, b: any) => dayjs(a.shiftDate).unix() - dayjs(b.shiftDate).unix());
            
            setUpcomingSlots(myUpcoming);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    return (
        <div className="personal-dashboard" style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={4}>Xin chào, {user?.name}!</Title>
                <Text type="secondary">Chào mừng bạn quay lại. Dưới đây là tóm tắt lịch trực và hoạt động của bạn.</Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatisticsCard
                        hideCard
                        data={[{
                            title: "Số giờ đã trực",
                            value: stats.totalHours,
                            valueColor: "#1890ff",
                            icon: <HistoryOutlined />
                        }]}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <StatisticsCard
                      hideCard
                      data={[{
                          title: "Số ca đã hoàn thành",
                          value: stats.attendedCount,
                          valueColor: "#52c41a",
                          icon: <CheckCircleOutlined />
                      }]}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatisticsCard
                        hideCard
                        data={[{
                            title: "Điểm tích lũy",
                            value: stats.points,
                            valueColor: "#faad14",
                            icon: <CalendarOutlined />
                        }]}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatisticsCard
                        hideCard
                        data={[{
                            title: "Yêu cầu chờ duyệt",
                            value: stats.pendingRequests,
                            valueColor: "#722ed1",
                            icon: <ClockCircleOutlined />
                        }]}
                    />
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card 
                        title={<Title level={5} style={{ margin: 0 }}>Lịch trực tuần này của tôi</Title>}
                        extra={<Button type="link" onClick={() => navigate('/duty/calendar')}>Xem chi tiết <ArrowRightOutlined /></Button>}
                        style={{ height: '100%', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        bodyStyle={{ padding: '12px 24px' }}
                    >
                        <Spin spinning={loading}>
                            {upcomingSlots.length > 0 ? (
                                <div className="upcoming-list">
                                    {upcomingSlots.map((slot, index) => (
                                        <div 
                                            key={slot.id} 
                                            className="upcoming-item"
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                background: index === 0 ? 'rgba(24, 144, 255, 0.03)' : '#fff',
                                                border: index === 0 ? '1px solid rgba(24, 144, 255, 0.1)' : '1px solid #f1f5f9',
                                                marginBottom: 12,
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => navigate('/duty/calendar')}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <Space size="middle">
                                                <div style={{ 
                                                    width: 44, 
                                                    height: 44, 
                                                    borderRadius: 10, 
                                                    background: index === 0 ? '#1890ff' : '#f1f5f9', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    color: index === 0 ? '#fff' : '#64748b',
                                                    fontSize: '18px'
                                                }}>
                                                    <CalendarOutlined />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{slot.shiftLabel}</div>
                                                    <div style={{ fontSize: '13px', color: '#64748b' }}>{dayjs(slot.shiftDate).format('dddd, DD [Tháng] MM')}</div>
                                                </div>
                                            </Space>
                                            <div style={{ textAlign: 'right' }}>
                                                <Tag color={index === 0 ? "blue" : "default"} style={{ margin: 0, borderRadius: 6, fontWeight: 500 }}>
                                                    {slot.startTime} - {slot.endTime}
                                                </Tag>
                                                {index === 0 && <div style={{ marginTop: 4, fontSize: '11px', color: '#1890ff', fontWeight: 600 }}>CA TRỰC TIẾP THEO</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '40px 0' }}>
                                    <Empty description="Bạn chưa đăng ký ca trực nào trong tuần này." />
                                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                                        <Button type="primary" onClick={() => navigate('/duty/calendar')}>Đăng ký ngay</Button>
                                    </div>
                                </div>
                            )}
                        </Spin>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Card 
                            title={<Title level={5} style={{ margin: 0 }}>Ghi chú & Quy định</Title>} 
                            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        >
                            <Alert 
                                message="Đơn xin nghỉ" 
                                description="Gửi trước 24h để được duyệt."
                                type="info"
                                showIcon
                                style={{ marginBottom: 12, borderRadius: 10 }}
                            />
                            <Alert 
                                message="Đổi ca" 
                                description="Tự thỏa thuận và gửi yêu cầu xác nhận."
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16, borderRadius: 10 }}
                            />
                            <Button block type="primary" ghost size="large" style={{ borderRadius: 10 }} onClick={() => navigate('/duty/calendar')}>
                                Xem lịch tuần <ArrowRightOutlined />
                            </Button>
                        </Card>

                        <Card 
                             bodyStyle={{ padding: 20, background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', borderRadius: 16 }}
                             style={{ border: 'none', borderRadius: 16, color: '#fff' }}
                        >
                            <Title level={5} style={{ margin: 0, color: '#fff' }}>Bạn cần hỗ trợ?</Title>
                            <Text style={{ color: 'rgba(255,255,255,0.85)', display: 'block', margin: '8px 0 16px' }}>Liên hệ ngay với Ban Chỉ huy Đội nếu gặp sự cố trong quá trình trực.</Text>
                            <Button block style={{ borderRadius: 8, fontWeight: 600 }}>Liên hệ Admin</Button>
                        </Card>
                    </Space>
                </Col>
            </Row>
        </div>
    );
};

export default PersonalDashboard;
