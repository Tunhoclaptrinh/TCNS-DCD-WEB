import { Descriptions, Image, Modal, Tag, Space, Typography, Divider } from 'antd';
import { RiseOutlined, StopOutlined } from '@ant-design/icons';
import Button from '../../../components/common/Button';
import { User } from '../../../types';
import { formatDate } from '../../../utils/formatters';

const { Text, Link } = Typography;

interface UsersDetailModalProps {
  open: boolean;
  user: User | null;
  avatarFallback: string;
  onCancel: () => void;
  formatDateTime: (value?: string) => string;
  onPromote?: (user: User) => void;
  onDismiss?: (user: User) => void;
  currentUser?: User | null;
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
  if (!user) return null;

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
          {user && onPromote && user.position !== 'ctc' && (
            <Button 
              key="promote" 
              variant="primary" 
              buttonSize="small"
              icon={<RiseOutlined />} 
              onClick={() => onPromote(user)}
              style={{ minWidth: 88, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
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
      <div className="user-detail-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <Image
            src={user.avatar || avatarFallback}
            alt="avatar"
            width={80}
            height={80}
            style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #f0f0f0' }}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#262626' }}>
              {user.lastName || user.firstName ? `${user.lastName || ''} ${user.firstName || ''}`.trim() : user.name || '--'}
            </div>
            <Space direction="vertical" size={0}>
               <Typography.Text copyable={{ text: user.email }}>
                 <Link href={`mailto:${user.email}`} style={{ color: 'inherit' }}>
                   {user.email || '--'}
                 </Link>
               </Typography.Text>
               <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
                 {((user as any).roles || []).length > 0 ? (
                   (user as any).roles.map((r: any) => {
                     const color = r.key === 'admin' ? 'volcano' : r.key === 'staff' ? 'blue' : 'gold';
                     return <Tag key={r.id} color={color} style={{ fontSize: '10px' }}>{r.name.toUpperCase()}</Tag>;
                   })
                 ) : (
                   <Tag color="blue">{String(user.role || '').toUpperCase()}</Tag>
                 )}
               </Space>
            </Space>
          </div>
        </div>

        <Divider orientation="left" style={{ fontSize: 14 }}>Thông tin cơ bản</Divider>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Mã SV">{user.studentId || '--'}</Descriptions.Item>
          <Descriptions.Item label="Mã lớp">{user.classId || '--'}</Descriptions.Item>
          <Descriptions.Item label="Khóa/Thế hệ">
            {user.generation?.name ? <Tag color="geekblue">{user.generation.name}</Tag> : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{formatDate(user.dob) || '--'}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">
            {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
          </Descriptions.Item>
          <Descriptions.Item label="Quê quán">{user.hometown || '--'}</Descriptions.Item>
        </Descriptions>

        <Divider orientation="left" style={{ fontSize: 14 }}>Liên hệ & Tổ chức</Divider>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Hạng/Chức vụ">
            <Space>
              <Tag color="cyan" style={{ fontWeight: 600 }}>{(user.position || '').toUpperCase()}</Tag>
              {user.department && <span style={{ color: '#595959' }}>({user.department})</span>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={user.status === 'dismissed' ? 'magenta' : user.isActive ? 'green' : 'red'}>
              {user.status === 'dismissed' ? 'KHAI TRỪ' : user.isActive ? 'HOẠT ĐỘNG' : 'TẮT'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">
            <Text copyable>{user.phone || '--'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Facebook">
            {user.facebook ? <Link href={user.facebook} target="_blank">Link Facebook</Link> : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày vào Đội">{formatDate((user as any).joinDate) || '--'}</Descriptions.Item>
          <Descriptions.Item label="Đăng nhập">{formatDateTime(user.lastLogin)}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>
            {user.bio || '--'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16, textAlign: 'right', fontSize: 11, color: '#bfbfbf' }}>
          ID: {user.id} • Tạo ngày: {formatDateTime(user.createdAt)}
        </div>
      </div>
    </Modal>
  );
};

export default UsersDetailModal;
