import { Descriptions, Image, Modal, Tag, Space, Divider } from 'antd';
import { RiseOutlined, StopOutlined } from '@ant-design/icons';
import Button from '../../../components/common/Button';
import { User } from '../../../types';

interface UsersDetailModalProps {
  open: boolean;
  user: User | null;
  avatarFallback: string;
  onCancel: () => void;
  formatDateTime: (value?: string) => string;
  onPromote?: (user: User) => void;
  onDismiss?: (user: User) => void;
}

const UsersDetailModal: React.FC<UsersDetailModalProps> = ({
  open,
  user,
  avatarFallback,
  onCancel,
  formatDateTime,
  onPromote,
  onDismiss,
}) => {
  return (
    <Modal
      open={open}
      title="Chi tiết thành viên"
      onCancel={onCancel}
      width={760}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%', padding: '12px 0' }}>
          <Button 
            key="close" 
            variant="outline" 
            buttonSize="small" 
            onClick={onCancel}
            style={{ minWidth: 88 }}
          >
            Đóng
          </Button>
          {user && onPromote && (
            <Button 
              key="promote" 
              variant="primary" 
              buttonSize="small"
              icon={<RiseOutlined />} 
              onClick={() => onPromote(user)}
              disabled={user.position === 'dt'}
              style={{ minWidth: 88 }}
            >
              Nâng hạng
            </Button>
          )}
          {user && onDismiss && user.status !== 'dismissed' && (
            <Button 
              key="dismiss" 
              variant="danger" 
              buttonSize="small"
              icon={<StopOutlined />} 
              onClick={() => onDismiss(user)}
              style={{ minWidth: 88 }}
            >
              Khai trừ
            </Button>
          )}
        </div>
      }
    >
      {user && (
        <div className="user-detail-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <Image
              src={user.avatar || avatarFallback}
              alt="avatar"
              width={80}
              height={80}
              style={{ borderRadius: '8px', objectFit: 'cover', border: '1px solid #f0f0f0' }}
            />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#262626' }}>
                {user.lastName || user.firstName ? `${user.lastName || ''} ${user.firstName || ''}`.trim() : user.name || '--'}
              </div>
              <Space direction="vertical" size={0}>
                 <div style={{ color: '#8c8c8c' }}>{user.email || '--'}</div>
                 <Tag color="blue" style={{ marginTop: 4 }}>{String(user.role || '').toUpperCase()}</Tag>
              </Space>
            </div>
          </div>

          <Divider orientation="left">Thông tin cơ bản</Divider>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Mã SV">{user.studentId || '--'}</Descriptions.Item>
            <Descriptions.Item label="Mã lớp">{user.classId || '--'}</Descriptions.Item>
            <Descriptions.Item label="Họ tên đệm">{user.lastName || '--'}</Descriptions.Item>
            <Descriptions.Item label="Tên">{user.firstName || '--'}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{user.dob || '--'}</Descriptions.Item>
            <Descriptions.Item label="Quê quán">{user.hometown || '--'}</Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">Tổ chức & Thao tác</Divider>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Hạng/Chức vụ">
              <Space>
                {user.position ? (
                  <Tag color="cyan" style={{ fontWeight: 600 }}>
                    {user.position.toUpperCase()}
                  </Tag>
                ) : '--'}
                {user.department && <span style={{ color: '#595959' }}>({user.department})</span>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={user.status === 'dismissed' ? 'magenta' : user.isActive ? 'green' : 'red'}>
                {user.status === 'dismissed' ? 'KHAI TRỪ' : user.isActive ? 'HOẠT ĐỘNG' : 'TẮT'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{user.phone || '--'}</Descriptions.Item>
            <Descriptions.Item label="Đăng nhập">{formatDateTime(user.lastLogin)}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {user.bio || '--'}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16, textAlign: 'right', fontSize: 12, color: '#bfbfbf' }}>
            ID: {user.id} • Tạo ngày: {formatDateTime(user.createdAt)}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UsersDetailModal;
