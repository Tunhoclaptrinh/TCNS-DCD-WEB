import { Descriptions, Image, Modal, Tag } from 'antd';
import { User } from '../../../types';

interface UsersDetailModalProps {
  open: boolean;
  user: User | null;
  avatarFallback: string;
  onCancel: () => void;
  formatDateTime: (value?: string) => string;
}

const UsersDetailModal: React.FC<UsersDetailModalProps> = ({
  open,
  user,
  avatarFallback,
  onCancel,
  formatDateTime,
}) => {
  return (
    <Modal
      open={open}
      title="Chi tiết người dùng"
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnClose
    >
      {user && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Image
              src={user.avatar || avatarFallback}
              alt="avatar"
              width={56}
              height={56}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
              preview={false}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{user.name || '--'}</div>
              <div style={{ color: '#8c8c8c' }}>{user.email || '--'}</div>
            </div>
          </div>

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Vai trò">
              <Tag color={user.role === 'admin' ? 'volcano' : user.role === 'staff' ? 'blue' : 'gold'}>
                {String(user.role || '--').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={user.isActive ? 'green' : 'red'}>
                {user.isActive ? 'Hoạt động' : 'Khóa'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{user.phone || '--'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{user.address || '--'}</Descriptions.Item>
            <Descriptions.Item label="Đăng nhập gần nhất">{formatDateTime(user.lastLogin)}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDateTime(user.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Cập nhật" span={2}>
              {formatDateTime((user as any).updatedAt || (user as any).updated_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiểu sử" span={2}>
              {user.bio || '--'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
};

export default UsersDetailModal;
