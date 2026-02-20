import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Divider,
} from "antd";
import {
  UserOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import StatisticsCard from "@/components/common/StatisticsCard";
import Access from "@/components/common/Access";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { userService } from "@/services/user.service";

const { Title, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await userService.getAll();
        setUserCount(response.data?.length || 0);
      } catch (error) {
        console.error("Failed to fetch user count:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserCount();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2}>Bảng Quản Trị Hệ Thống</Title>
        <Paragraph>
          Chào mừng quay trở lại, <strong>{user?.name}</strong>! Đây là tổng quan về hệ thống hiện tại.
        </Paragraph>
      </div>

      <Access permission="dashboard:view">
        <StatisticsCard
          loading={loading}
          data={[
            {
              title: "Tổng số người dùng",
              value: userCount,
              icon: <UserOutlined />,
              valueColor: "var(--primary-color)",
            },
          ]}
          colSpan={{ xs: 24, sm: 12, md: 8 }}
          statShadow
        />
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
                  <Title level={5}><UserOutlined /> Trải Nghiệm Người Dùng</Title>
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
              "Mục tiêu của Base là lập trung tối đa vào việc giải quyết các bài toán nghiệp vụ cốt lõi."
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
