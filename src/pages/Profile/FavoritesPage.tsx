import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Row,
    Col,
    Card,
    Tabs,
    Empty,
    Button,
    message,
    Tooltip,
    Tag,
    Spin,
    Pagination,
    Select,
    Space,
    Modal,
    Badge
} from 'antd';
import {
    HeartFilled,
    HomeOutlined,
    PictureOutlined,
    CalendarOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReadOutlined,
    FilterOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import favoriteService from '@/services/favorite.service';
import StatisticsCard from '@/components/common/StatisticsCard';
import ArticleCard from '@/components/common/cards/ArticleCard';
import FilterBuilder from '@/components/common/DataTable/FilterBuilder';
import { FilterConfig } from '@/components/common/DataTable/types';
import './styles.less';

const { Option } = Select;

// Simplified FavoritesPage
const FavoritesPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState<any[]>([]);
    
    // Pagination & Sort state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    
    // Stats state
    const [stats, setStats] = useState({
        total: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [page, pageSize, sortOrder]);

    const fetchStats = async () => {
        try {
            const res = await favoriteService.getStats();
            if (res.success && res.data) {
                setStats({
                    total: res.data.total,
                });
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const params: any = {
                page,
                limit: pageSize,
                sort: 'created_at',
                order: sortOrder
            };
            
            const response = await favoriteService.getAll(params);
            setFavorites(response.data || []);
        } catch (error) {
            message.error('Không thể tải danh sách yêu thích');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (type: string, id: number) => {
        try {
            await favoriteService.remove(type as any, id.toString());
            message.success('Đã xóa khỏi yêu thích');
            fetchFavorites(); // Reload list
            fetchStats(); // Reload stats
        } catch (error) {
            message.error('Không thể xóa khỏi yêu thích');
        }
    };

    return (
        <div className="favorites-page">
            <div className="page-header">
                <div>
                    <p className="page-description">
                        Quản lý các nội dung bạn đã lưu
                    </p>
                </div>
            </div>

            <div className="favorites-stats" style={{ marginBottom: 24 }}>
                <StatisticsCard
                    title="Thống Kê Tổng Quan"
                    loading={loading && favorites.length === 0}
                    colSpan={{ xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }}
                    data={[
                        {
                            title: "Tổng Yêu Thích",
                            value: stats.total,
                            icon: <HeartFilled />,
                            valueColor: "#cf1322",
                            colSpan: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }
                        }
                    ]}
                />
            </div>

            <Card className="favorites-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space>
                        <span style={{ color: '#888', marginLeft: 8 }}>Sắp xếp:</span>
                        <Select 
                            defaultValue="desc" 
                            value={sortOrder}
                            style={{ width: 140 }} 
                            onChange={(val) => setSortOrder(val as 'asc' | 'desc')}
                        >
                            <Option value="desc">Mới nhất</Option>
                            <Option value="asc">Cũ nhất</Option>
                        </Select>
                        
                        <Button icon={<ReloadOutlined />} onClick={fetchFavorites} />
                    </Space>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
                ) : favorites.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <h3>Không tìm thấy kết quả</h3>
                            </div>
                        }
                    />
                ) : (
                    <>
                        <Row gutter={[24, 24]} className="favorites-grid">
                            {favorites.map((favorite) => {
                                return (
                                    <Col xs={24} sm={12} lg={8} xl={6} key={favorite.id}>
                                        <ArticleCard 
                                            data={favorite.item} 
                                            type="history"
                                            variant="default"
                                            secondaryAction={
                                                <Tooltip title="Bỏ thích">
                                                    <Button 
                                                        type="text" 
                                                        danger 
                                                        shape="circle"
                                                        icon={<DeleteOutlined />} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFavorite(favorite.type, favorite.reference_id);
                                                        }}
                                                    />
                                                </Tooltip>
                                            }
                                        />
                                    </Col>
                                );
                            })}
                        </Row>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                            <Pagination
                                current={page}
                                pageSize={pageSize}
                                total={stats.total}
                                onChange={(p, ps) => {
                                    setPage(p);
                                    if (ps !== pageSize) setPageSize(ps);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                showSizeChanger
                                showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} mục`}
                            />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

export default FavoritesPage;
