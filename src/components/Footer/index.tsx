import React from "react";
import { Layout, Typography } from "antd";

const { Footer } = Layout;
const { Text } = Typography;

const CustomFooter: React.FC = () => {
  return (
    <Footer style={{ textAlign: "center", padding: "24px 50px" }}>
      <Text type="secondary">
        © {new Date().getFullYear()} Tổ chức nhân sự Đội Cờ Đỏ PTIT. All rights reserved.
      </Text>
    </Footer>
  );
};

export default CustomFooter;
