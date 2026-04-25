import React from 'react';
import { Modal, Typography, Space } from 'antd';
import { Button } from '@/components/common';
import { BulbOutlined, UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface GuideModalProps {
  visible: boolean;
  onCancel: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ visible, onCancel }) => {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'left', width: '100%' }}>
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Text strong style={{ fontSize: 18 }}>Mẹo quản trị hệ thống</Text>
          </Space>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Button 
            variant="primary" 
            buttonSize="small" 
            onClick={onCancel}
            style={{ minWidth: 120, background: '#8b1d1d', borderColor: '#8b1d1d' }}
          >
            Đã hiểu
          </Button>
        </div>
      }
      centered
      width={500}
    >
      <div style={{ padding: '8px 0' }}>
        <ul style={{ paddingLeft: 20, lineHeight: '2.2' }}>
          <li>
            <Text>Bạn có thể tạo thêm <Text strong>Vai trò mới</Text> trong mục "Quản lý Vai trò" và các cột sẽ tự động hiển thị tại ma trận.</Text>
          </li>
          <li>
            <Text>Nhấn vào biểu tượng <Text strong><UserOutlined /></Text> ở từng Module để xem danh sách chi tiết những ai đang có quyền trong module đó.</Text>
          </li>
          <li>
            <Text>Sử dụng tính năng <Text strong>Tạo nhanh CRUD</Text> để tự động sinh ra 5 hành động cơ bản cho một module mới.</Text>
          </li>
          <li>
            <Text>Bạn có thể <Text strong>Phân quyền riêng lẻ</Text> cho từng thành viên (ngoài vai trò mặc định) trong tab "Kiểm tra người dùng".</Text>
          </li>
        </ul>
      </div>
    </Modal>
  );
};

export default GuideModal;
