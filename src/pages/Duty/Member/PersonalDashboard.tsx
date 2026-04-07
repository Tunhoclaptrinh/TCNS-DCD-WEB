import React, { useState, useEffect, useMemo } from 'react';
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

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
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

    const myStats = useMemo(() => {
        // In a real app, these would come from a dedicated personal stats endpoint
        return {
            totalHours: 24, // Mock
            attendedCount: 12, // Mock
            points: 120, // Mock
            pendingRequests: 2 // Mock
        };
    }, []);

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
                            value: myStats.totalHours,
                            valueColor: "#1890ff",
                            icon: <HistoryOutlined />
                        }]}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <StatisticsCard
                      hideCard
                      data={[{
                          title: "Tỷ lệ chuyên cần",
                          value: 100,
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
                            value: myStats.points,
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
                            value: myStats.pendingRequests,
                            valueColor: "#722ed1",
                            icon: <ClockCircleOutlined />
                        }]}
                    />
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card 
                        title={<Title level={5} style={{ margin: 0 }}>Ca trực sắp tới của tôi</Title>}
                        extra={<Button type="link" onClick={() => navigate('/duty/calendar')}>Xem toàn bộ</Button>}
                        style={{ height: '100%' }}
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
                                                padding: '16px',
                                                borderRadius: '12px',
                                                background: index === 0 ? '#fafafa' : 'transparent',
                                                border: index === 0 ? '1px solid #f0f0f0' : '1px solid transparent',
                                                marginBottom: 12
                                            }}
                                        >
                                            <Space size="middle">
                                                <div style={{ 
                                                    width: 48, 
                                                    height: 48, 
                                                    borderRadius: 12, 
                                                    background: '#e6f7ff', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    color: '#1890ff',
                                                    fontSize: '20px'
                                                }}>
                                                    <CalendarOutlined />
                                                </div>
                                                <div>
                                                    <Title level={5} style={{ margin: 0 }}>{slot.shiftLabel}</Title>
                                                    <Text type="secondary">{dayjs(slot.shiftDate).format('dddd, DD/MM/YYYY')}</Text>
                                                </div>
                                            </Space>
                                            <div style={{ textAlign: 'right' }}>
                                                <Tag color="blue" icon={<ClockCircleOutlined />}>
                                                    {slot.startTime} - {slot.endTime}
                                                </Tag>
                                                <div style={{ marginTop: 4 }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {index === 0 ? <Text type="success">Sắp diễn ra</Text> : 'Đã lên lịch'}
                                                    </Text>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty description="Bạn không có ca trực nào sắp tới." />
                            )}
                        </Spin>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Thông báo & Ghi chú</Title>} style={{ height: '100%' }}>
                        <Alert 
                            message="Quy định nghỉ phép" 
                            description="Vui lòng gửi đơn xin nghỉ trước ít nhất 24h để được xét duyệt kịp thời."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <Alert 
                            message="Ca trực cuối tuần" 
                            description="Bạn có kíp trực vào Chủ nhật tới. Hãy chuẩn bị nhé!"
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                         <div style={{ marginTop: 16 }}>
                            <Button block type="primary" size="large" onClick={() => navigate('/duty/calendar')}>
                                Đăng ký thêm ca trực <ArrowRightOutlined />
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PersonalDashboard;
