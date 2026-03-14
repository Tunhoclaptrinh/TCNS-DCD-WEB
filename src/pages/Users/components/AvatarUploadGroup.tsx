import { useState } from 'react';
import { Input, Upload, Avatar, message, Radio, ConfigProvider } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import { UserOutlined, UploadOutlined, LoadingOutlined, PictureOutlined } from '@ant-design/icons';
import userService from '../../../services/user.service';

interface AvatarUploadGroupProps {
  value?: string;
  onChange?: (val: string) => void;
}

const AvatarUploadGroup: React.FC<AvatarUploadGroupProps> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'url' | 'upload'>('url');

  // Xử lý local state nếu onChange (từ Form.Item) không được truyền
  const [localUrl, setLocalUrl] = useState<string>('');
  const currentUrl = value !== undefined ? value : localUrl;

  const handleChange = (newUrl: string) => {
    if (onChange) {
      onChange(newUrl);
    } else {
      setLocalUrl(newUrl);
    }
  };

  const handleUploadAvatar = async (file: RcFile): Promise<false> => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được tải lên file ảnh (JPG, PNG, GIF, WEBP...)');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB!');
      return false;
    }

    setUploading(true);
    try {
      const res = await userService.uploadAvatar(file);
      const url = res.data?.url;
      if (url) {
        handleChange(url);
        message.success('Tải ảnh đại diện thành công!');
      } else {
        message.error('Không lấy được URL ảnh sau khi upload.');
      }
    } catch (err: any) {
      message.error(err?.message || 'Tải ảnh thất bại, vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ConfigProvider
        theme={{
          components: {
            Radio: {
              colorPrimary: '#8b1d1d',
            },
          },
        }}
      >
        <Radio.Group 
          value={avatarMode} 
          onChange={e => setAvatarMode(e.target.value)}
        >
          <Radio value="url">Gắn link ảnh</Radio>
          <Radio value="upload">Tải ảnh lên</Radio>
        </Radio.Group>
      </ConfigProvider>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Input area based on mode */}
        <div>
          {avatarMode === 'url' ? (
            <Input
              value={currentUrl}
              onChange={e => handleChange(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              prefix={<PictureOutlined style={{ color: '#bfbfbf' }} />}
              allowClear
              style={{ width: 280 }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Upload
                name="image"
                showUploadList={false}
                beforeUpload={handleUploadAvatar}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                disabled={uploading}
              >
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    background: '#fafafa',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                    color: '#555',
                    opacity: uploading ? 0.65 : 1,
                    padding: 0,
                  }}
                  title="Tải ảnh lên"
                >
                  {uploading ? <LoadingOutlined /> : <UploadOutlined />}
                </button>
              </Upload>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {currentUrl && avatarMode === 'upload'
                  ? <span style={{ color: '#52c41a' }}>✓ Tải ảnh thành công</span>
                  : 'Tối đa 5MB'}
              </div>
            </div>
          )}
        </div>

        {/* Preview avatar */}
        <Avatar
          size={64}
          src={currentUrl || undefined}
          icon={!currentUrl ? <UserOutlined /> : undefined}
          style={{ flexShrink: 0, border: '1px solid #f0f0f0', background: !currentUrl ? '#f0f0f0' : undefined }}
        />
      </div>
    </div>
  );
};

export default AvatarUploadGroup;
