import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Statistic, Button, Select, message, Typography,
    Divider, Spin, Tag,
} from 'antd';
import {
    DownloadOutlined, BarChartOutlined, TeamOutlined,
    CalendarOutlined, DollarOutlined, ReloadOutlined, SwapOutlined,
} from '@ant-design/icons';
import StatisticsCard from '../../components/common/StatisticsCard';
import reportService from '../../services/report.service';
import { useAccess } from '../../hooks';
import type { ReportOverview } from '../../types/report.types';

const formatCurrency = (val?: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const ROLE_LABELS: Record<string, string> = {
    admin: 'Quản trị viên',
    staff: 'Nhân viên',
    customer: 'Thành viên',
    researcher: 'Nghiên cứu',
    curator: 'Biên tập',
};

const POSITION_LABELS: Record<string, string> = {
    ctc: 'Cộng tác viên',
    tv: 'Thành viên',
    tvb: 'TV Ban',
    pb: 'Phó ban',
    tb: 'Trưởng ban',
    dt: 'Đội trưởng',
};

const ReportsPage = () => {
    const { hasPermission } = useAccess();
    const [overview, setOverview] = useState<ReportOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
    const [exporting, setExporting] = useState(false);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await reportService.getOverview();
            setOverview(res.data as ReportOverview);
        } catch {
            message.error('Không thể tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await reportService.exportOverview(exportFormat);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bao-cao-tong-quan.${exportFormat}`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('Xuất báo cáo thành công');
        } catch {
            message.error('Xuất báo cáo thất bại');
        } finally {
            setExporting(false);
        }
    };

    const topStats = [
        {
            title: 'Tổng thành viên',
            value: overview?.users?.total ?? 0,
            icon: <TeamOutlined />,
            valueColor: 'var(--primary-color)',
        },
        {
            title: 'Đang hoạt động',
            value: overview?.users?.active ?? 0,
            icon: <TeamOutlined />,
            valueColor: '#52c41a',
        },
        {
            title: 'Tổng ca trực',
            value: overview?.duty?.totalSlots ?? 0,
            icon: <CalendarOutlined />,
            valueColor: '#722ed1',
        },
        {
            title: 'Đổi ca chờ duyệt',
            value: overview?.duty?.pendingSwaps ?? 0,
            icon: <SwapOutlined />,
            valueColor: '#faad14',
        },
    ];

    return (
        <>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <Typography.Title level={3} style={{ margin: 0 }}>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    Báo cáo quản trị
                </Typography.Title>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchOverview}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                    {hasPermission('reports:export') && (
                        <>
                            <Select
                                value={exportFormat}
                                onChange={(v) => setExportFormat(v)}
                                options={[
                                    { value: 'xlsx', label: 'Excel (.xlsx)' },
                                    { value: 'csv', label: 'CSV (.csv)' },
                                ]}
                                style={{ width: 130 }}
                            />
                            <Button
                                type="primary"
                                loading={exporting}
                                onClick={handleExport}
                                icon={<DownloadOutlined />}
                            >
                                Xuất báo cáo
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Spin spinning={loading}>
                {/* Top stats */}
                <StatisticsCard
                    hideCard
                    data={topStats}
                    colSpan={{ xs: 24, sm: 12, md: 6 }}
                    rowGutter={12}
                    statShadow={false}
                    containerStyle={{ marginBottom: 24 }}
                />

                {/* Detail cards */}
                <Row gutter={[16, 16]}>
                    {/* Users detail */}
                    <Col xs={24} lg={8}>
                        <Card
                            title={
                                <span>
                                    <TeamOutlined style={{ marginRight: 8 }} />
                                    Thành viên
                                </span>
                            }
                            style={{ height: '100%' }}
                        >
                            <Statistic
                                title="Tổng số thành viên"
                                value={overview?.users?.total ?? 0}
                                valueStyle={{ color: 'var(--primary-color)' }}
                            />
                            <Divider />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#8c8c8c' }}>Đang hoạt động</span>
                                <span style={{ color: '#52c41a', fontWeight: 600 }}>
                                    {overview?.users?.active ?? 0}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#8c8c8c' }}>Không hoạt động</span>
                                <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                                    {overview?.users?.inactive ?? 0}
                                </span>
                            </div>

                            {overview?.users?.byRole &&
                                Object.keys(overview.users.byRole).length > 0 && (
                                    <>
                                        <Divider>Theo vai trò</Divider>
                                        {Object.entries(overview.users.byRole).map(([role, count]) => (
                                            <div
                                                key={role}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <Tag>{ROLE_LABELS[role] || role}</Tag>
                                                <span>{count}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                            {overview?.users?.byPosition &&
                                Object.keys(overview.users.byPosition).length > 0 && (
                                    <>
                                        <Divider>Theo chức vụ</Divider>
                                        {Object.entries(overview.users.byPosition).map(
                                            ([pos, count]) => (
                                                <div
                                                    key={pos}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    <Tag color="cyan">
                                                        {POSITION_LABELS[pos] || pos}
                                                    </Tag>
                                                    <span>{count}</span>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                        </Card>
                    </Col>

                    {/* Duty detail */}
                    <Col xs={24} lg={8}>
                        <Card
                            title={
                                <span>
                                    <CalendarOutlined style={{ marginRight: 8 }} />
                                    Hoạt động trực
                                </span>
                            }
                            style={{ height: '100%' }}
                        >
                            <Statistic
                                title="Tổng ca trực"
                                value={overview?.duty?.totalSlots ?? 0}
                                valueStyle={{ color: '#722ed1' }}
                            />
                            <Divider />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <span style={{ color: '#8c8c8c' }}>Tổng lượt đăng ký</span>
                                <span style={{ fontWeight: 600 }}>
                                    {overview?.duty?.totalRegistrations ?? 0}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <span style={{ color: '#8c8c8c' }}>Ca đang mở</span>
                                <span style={{ color: '#52c41a', fontWeight: 600 }}>
                                    {overview?.duty?.openSlots ?? 0}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <span style={{ color: '#8c8c8c' }}>Ca đã khóa</span>
                                <span style={{ color: '#8c8c8c', fontWeight: 600 }}>
                                    {overview?.duty?.lockedSlots ?? 0}
                                </span>
                            </div>
                            <Divider />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span style={{ color: '#8c8c8c' }}>Yêu cầu đổi ca chờ duyệt</span>
                                <Tag color="warning">{overview?.duty?.pendingSwaps ?? 0}</Tag>
                            </div>
                        </Card>
                    </Col>

                    {/* Financial detail */}
                    <Col xs={24} lg={8}>
                        <Card
                            title={
                                <span>
                                    <DollarOutlined style={{ marginRight: 8 }} />
                                    Tài chính
                                </span>
                            }
                            style={{ height: '100%' }}
                        >
                            <Statistic
                                title="Tổng thưởng"
                                value={formatCurrency(overview?.rewardPenalty?.totalReward)}
                                valueStyle={{ color: '#52c41a', fontSize: 18 }}
                            />
                            <Divider />
                            <Statistic
                                title="Tổng phạt"
                                value={formatCurrency(overview?.rewardPenalty?.totalPenalty)}
                                valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                            />
                            <Divider />
                            <Statistic
                                title="Số dư ròng"
                                value={formatCurrency(overview?.rewardPenalty?.netBalance)}
                                valueStyle={{
                                    color:
                                        (overview?.rewardPenalty?.netBalance ?? 0) >= 0
                                            ? '#1890ff'
                                            : '#ff4d4f',
                                    fontWeight: 700,
                                    fontSize: 20,
                                }}
                            />
                        </Card>
                    </Col>
                </Row>

                {overview?.generatedAt && (
                    <Typography.Text
                        type="secondary"
                        style={{ display: 'block', textAlign: 'right', marginTop: 12 }}
                    >
                        Cập nhật lúc: {new Date(overview.generatedAt).toLocaleString('vi-VN')}
                    </Typography.Text>
                )}
            </Spin>
        </>
    );
};

export default ReportsPage;
