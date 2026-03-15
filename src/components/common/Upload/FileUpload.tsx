import React, { useState, useEffect } from "react";
import { Upload, message, Modal, Avatar, Image, Button } from "antd";
import { 
  PlusOutlined, 
  LoadingOutlined, 
  UserOutlined, 
  UploadOutlined,
} from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload/interface";
import { API_BASE_URL } from "@/config/axios.config";
import uploadService from "@/services/upload.service";

export type UploadType = "avatar" | "general" | "custom";

interface FileUploadProps extends Omit<UploadProps, 'onChange' | 'type'> {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  type?: UploadType;
  mode?: "image" | "avatar" | "file";
  folder?: string;
  showList?: boolean;
  /** Maximum file size in MB. Default is 5MB. */
  maxSize?: number;
  /** List of allowed MIME types. Examples: ['image/jpeg', 'image/png'] */
  allowedTypes?: string[];
  /** Whether to show automatic size/type hints. Default is true. */
  showHint?: boolean;
}

const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

/**
 * Clean and robust File Upload Component
 */
const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  type = "general",
  mode = "image",
  showList = true,
  maxSize = 5,
  allowedTypes,
  showHint = true,
  ...restProps
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Base URL for image paths that aren't absolute
  const apiHost = API_BASE_URL?.replace(/\/api$/, "") || "";

  // Sync fileList with value prop
  useEffect(() => {
    const isUploading = fileList.some((file) => file.status === "uploading");
    if (isUploading) return;

    const urls = Array.isArray(value) ? value : value ? [value] : [];
    
    const newFileList: UploadFile[] = urls.map((url, index) => {
      const fullUrl = url.startsWith("http") ? url : `${apiHost}${url}`;
      return {
        uid: `-${index}`,
        name: url.split('/').pop() || `file-${index}`,
        status: "done",
        url: fullUrl,
        thumbUrl: fullUrl,
      };
    });

    // Simple deep comparison to avoid unnecessary updates
    const currentPaths = fileList.map((f) => f.url?.replace(apiHost, "")).filter(Boolean);
    const newPaths = urls.filter(Boolean);

    if (JSON.stringify(currentPaths) !== JSON.stringify(newPaths)) {
      setFileList(newFileList);
    }
  }, [value, apiHost]);

  const handleCancel = () => setPreviewOpen(false);

  const beforeUpload = (file: RcFile) => {
    // 1. Check file size
    const isLtSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtSize) {
      message.error(`Tệp tin phải nhỏ hơn ${maxSize}MB!`);
      return Upload.LIST_IGNORE;
    }

    // 2. Check file type
    if (allowedTypes && allowedTypes.length > 0) {
      const isAllowed = allowedTypes.includes(file.type);
      if (!isAllowed) {
        message.error(`Định dạng tệp tin không hợp lệ. Chỉ chấp nhận: ${allowedTypes.join(", ")}`);
        return Upload.LIST_IGNORE;
      }
    }

    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    if (mode === "file") return; // No preview for generic files

    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as RcFile);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // If a file was removed
    if (newFileList.length < fileList.length) {
      const paths = newFileList
        .filter(f => f.status === "done")
        .map(f => f.url?.replace(apiHost, "") || "")
        .filter(Boolean);
      
      const maxCount = restProps.maxCount || 1;
      if (maxCount === 1) {
        onChange?.(paths[0] || "");
      } else {
        onChange?.(paths);
      }
    }
  };

  const customRequest = async (options: any) => {
    const { onSuccess, onError, file, onProgress } = options;

    setLoading(true);
    try {
      let response;
      if (type === "avatar") {
        response = await uploadService.uploadAvatar(file, onProgress);
      } else {
        response = await uploadService.uploadGeneral(file, onProgress);
      }

      if (response.success && response.data) {
        const url = response.data.url;
        onSuccess(response, file);
        
        // Update parent with the relative URL(s)
        const maxCount = restProps.maxCount || 1;
        if (maxCount === 1) {
          onChange?.(url);
        } else {
          // Get existing resolved paths from fileList (those that were 'done' before this upload)
          const existingPaths = fileList
            .filter(f => f.status === "done" && f.uid !== (file as RcFile).uid)
            .map(f => f.url?.replace(apiHost, "") || "")
            .filter(Boolean);
          
          onChange?.([...existingPaths, url]);
        }
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      onError(err);
      message.error(err.message || "Tải lên thất bại");
    } finally {
      setLoading(false);
    }
  };

  const isAvatarMode = mode === "avatar";
  const isFileMode = mode === "file";

  const renderHint = () => {
    if (!showHint) return null;

    const hints: string[] = [];
    
    // 1. Resolve extensions/types from allowedTypes or accept
    const source = allowedTypes || (restProps.accept ? restProps.accept.split(',') : []);
    if (source.length > 0) {
      const extensions = source
        .map(t => {
          if (t.includes('/')) return t.split('/')[1].toUpperCase();
          if (t.startsWith('.')) return t.substring(1).toUpperCase();
          return t.toUpperCase();
        })
        .filter((v, i, a) => a.indexOf(v) === i); // Unique

      hints.push(`Hỗ trợ ${extensions.join(', ')}`);
    }

    // 2. Add size hint
    hints.push(`Tối đa ${maxSize}MB`);

    return (
      <div style={{ 
        fontSize: 11, 
        color: '#8c8c8c', 
        marginTop: 4,
        lineHeight: '1.5',
        textAlign: isAvatarMode && (restProps.maxCount || 1) === 1 ? 'left' : 'center'
      }}>
        {hints.join('. ')}
      </div>
    );
  };

  return (
    <div className={`file-upload-container ${isAvatarMode ? 'is-avatar' : ''}`}>
      {isAvatarMode && (restProps.maxCount || 1) === 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 4, 
            overflow: 'hidden', 
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {fileList[0]?.url ? (
              <Image
                width={36}
                height={36}
                src={fileList[0]?.url}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <UserOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />
            )}
          </div>
          <Upload
            showUploadList={false}
            customRequest={customRequest}
            beforeUpload={beforeUpload}
            {...restProps}
            accept={restProps.accept || "image/*"}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Button 
                disabled={restProps.disabled || loading}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: 12,
                  borderRadius: 6
                }}
              >
                {loading ? <LoadingOutlined /> : <UploadOutlined />}
                {fileList[0]?.url ? 'Đổi ảnh' : 'Tải ảnh'}
              </Button>
              {renderHint()}
            </div>
          </Upload>
        </div>
      ) : (
        <Upload
          listType={isFileMode ? "text" : "picture-card"}
          fileList={fileList}
          onPreview={handlePreview}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          customRequest={customRequest}
          showUploadList={showList}
          accept={restProps.accept || (isFileMode ? undefined : "image/*")}
          {...restProps}
        >
          {fileList.length >= (restProps.maxCount || 1) && showList ? null : (
            isFileMode ? (
              <Button 
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {loading ? <LoadingOutlined /> : <PlusOutlined />} 
                {isFileMode && fileList.length > 0 ? 'Chọn file khác' : 'Chọn file'}
              </Button>
            ) : (
              <div>
                {loading ? <LoadingOutlined /> : <PlusOutlined />}
                <div style={{ marginTop: 4, fontSize: 12 }}>Tải lên</div>
              </div>
            )
          )}
        </Upload>
      )}
      {!isAvatarMode && renderHint()}

      <Modal
        open={previewOpen}
        title="Xem trước"
        footer={null}
        onCancel={handleCancel}
        centered
      >
        <img alt="Preview" style={{ width: "100%" }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default FileUpload;
