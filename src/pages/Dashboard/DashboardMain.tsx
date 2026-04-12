import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Divider,
  Space,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  StopOutlined,
  SafetyOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  UserDeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import StatisticsCard from "@/components/common/StatisticsCard";
import Access from "@/components/common/Access";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { userService } from "@/services/user.service";
import type { UserStats } from "@/types";

const { Title, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<UserStats>({
    global: {
      total: 0,
      active: 0,
      inactive: 0,
      dismissed: 0,
      ctv: 0,
      official: 0,
      management: 0,
      recentSignups: 0,
      byRole: {},
      byPosition: {},
    },
    byDepartment: {},
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await userService.getStats();
        const statsData = response.data || (response as any);

        if (statsData) {
          setStats(statsData);
        }
      } catch (error) {
        console.error("Failed to fetch user stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2}>Bảng Quản Trị Hệ Thống</Title>
        <Paragraph>
          Chào mừng quay trở lại, <strong>{user?.name}</strong>! Đây là tổng quan về hệ thống hiện tại.
        </Paragraph>
      </div>

      <Access permission="dashboard:view">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <StatisticsCard
            title="Sức khỏe hệ thống & Nhân sự"
            loading={loading}
            data={[
              {
                title: "Tổng nhân sự",
                value: stats.global?.total || 0,
                icon: <TeamOutlined />,
                valueColor: "var(--primary-color)",
              },
              {
                title: "Đang hoạt động",
                value: stats.global?.active || 0,
                icon: <CheckCircleOutlined />,
                valueColor: "#52c41a",
              },
              {
                title: "Đang bị khóa",
                value: stats.global?.inactive || 0,
                icon: <StopOutlined />,
                valueColor: "#da2a2aff",
              },
              {
                title: 'Đã khai trừ',
                value: stats.global?.dismissed || 0,
                icon: <UserDeleteOutlined />,
                valueColor: '#ff4d4f',
              },
              {
                title: "Đăng ký mới (7 ngày)",
                value: stats.global?.recentSignups || 0,
                icon: <RiseOutlined />,
                valueColor: "#722ed1",
              },
            ]}
            colSpan={{ xs: 24, sm: 12, md: 8, lg: 6 }}
            statShadow
          />

          <StatisticsCard
            title="Cấu trúc tổ chức"
            loading={loading}
            data={[
              {
                title: 'Thành viên chính thức',
                value: stats.global?.official || 0,
                icon: <CheckCircleOutlined />,
                valueColor: '#1890ff',
              },
              {
                title: 'Cộng tác viên',
                value: stats.global?.ctv || 0,
                icon: <TeamOutlined />,
                valueColor: '#fa8c16',
              },
              {
                title: 'Ban điều hành (Lãnh đạo)',
                value: stats.global?.management || 0,
                icon: <SafetyOutlined />,
                valueColor: '#eb2f96',
              },
              {
                title: 'Đội trưởng',
                value: stats.global?.byPosition?.dt || 0,
                icon: <SafetyOutlined />,
                valueColor: '#722ed1',
              },
              {
                title: 'Trưởng ban',
                value: stats.global?.byPosition?.tb || 0,
                icon: <SafetyOutlined />,
                valueColor: '#f5222d',
              },
              {
                title: 'Phó ban',
                value: stats.global?.byPosition?.pb || 0,
                icon: <SafetyOutlined />,
                valueColor: '#fa541c',
              },
              {
                title: 'Thành viên ban',
                value: stats.global?.byPosition?.tvb || 0,
                icon: <UserOutlined />,
                valueColor: '#13c2c2',
              },
              {
                title: 'Thành viên thường',
                value: stats.global?.byPosition?.tv || 0,
                icon: <UserOutlined />,
                valueColor: '#52c41a',
              },
              {
                title: 'Vị trí khác',
                value: Math.max(0, (stats.global?.total || 0) -
                  (['dt', 'tb', 'pb', 'tvb', 'tv', 'ctc'].reduce((sum, p) => sum + (stats.global?.byPosition?.[p] || 0), 0))),
                icon: <UserOutlined />,
                valueColor: '#bfbfbf',
              },
            ]}
            colSpan={{ xs: 24, sm: 12, md: 8, lg: 6 }}
            statShadow
          />

          <StatisticsCard
            title="Phân quyền & Vai trò hệ thống"
            loading={loading}
            data={[
              {
                title: "Admin (Quản trị viên)",
                value: stats.global?.byRole?.admin || 0,
                icon: <SafetyOutlined />,
                valueColor: "#f5222d",
              },
              {
                title: "Staff (Nhân viên)",
                value: stats.global?.byRole?.staff || 0,
                icon: <UserOutlined />,
                valueColor: "#1677ff",
              },
              {
                title: "Customer (Khách hàng)",
                value: stats.global?.byRole?.customer || 0,
                icon: <UserOutlined />,
                valueColor: "#faad14",
              },
              {
                title: "Researcher (Nghiên cứu)",
                value: stats.global?.byRole?.researcher || 0,
                icon: <ProjectOutlined />,
                valueColor: "#722ed1",
              },
              {
                title: "Curator (Biên tập)",
                value: stats.global?.byRole?.curator || 0,
                icon: <EditOutlined />,
                valueColor: "#13c2c2",
              },
              {
                title: "Vai trò khác",
                value: (stats.global?.total || 0) -
                  (['admin', 'staff', 'customer', 'researcher', 'curator'].reduce((sum, r) => sum + (stats.global?.byRole?.[r] || 0), 0)),
                icon: <UserOutlined />,
                valueColor: "#bfbfbf",
              },
            ]}
            colSpan={{ xs: 24, sm: 12, md: 8, lg: 6 }}
            statShadow
          />
        </Space>
      </Access>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={<Title level={4} style={{ margin: 0 }}>Về Hệ Thống Base</Title>}
            bordered={false}
          >
            <Paragraph>
              <strong>Base Web Boilerplate</strong> là một giải pháp nền tảng toàn diện, được thiết kế để chuẩn hóa và tăng tốc quy trình phát triển các ứng dụng quản trị.
            </Paragraph>

            <Row gutter={[32, 16]}>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5}><ProjectOutlined /> Cấu Trúc Modular</Title>
                  <Paragraph>
                    Hệ thống được xây dựng trên kiến trúc module hóa, cho phép tách biệt rõ ràng giữa Business Logic, Components và Services.
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5}><CheckCircleOutlined /> Quản Trị Toàn Diện</Title>
                  <Paragraph>
                    Hệ thống Hook `useCRUD` và component `DataTable` thông minh giúp xử lý mọi tác vụ quản lý dữ liệu hiệu quả.
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5}><UserOutlined /> Trải Nghiệm Thành Viên</Title>
                  <Paragraph>
                    Tận dụng Ant Design mang lại giao diện nhất quán, tinh tế và hỗ trợ Responsive hoàn hảo.
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5}><RiseOutlined /> Bảo Mật & Hiệu Năng</Title>
                  <Paragraph>
                    Tối ưu hóa với Redux Toolkit và hệ thống bảo mật đa lớp với JWT.
                  </Paragraph>
                </div>
              </Col>
            </Row>

            <Divider dashed />
            <Paragraph type="secondary" style={{ fontStyle: 'italic', textAlign: 'center' }}>
              Mục tiêu của Base là lập trung tối đa vào việc giải quyết các bài toán nghiệp vụ cốt lõi.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
