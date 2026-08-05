import React, { useState } from "react";
import { Avatar, Tabs, Upload, message } from "antd";
import { UserOutlined, CameraOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import apiClient from "@config/axios.config";
import userService from "@services/user.service";
import { getMe } from "@store/slices/authSlice";
import { AppDispatch } from "@/store";
import AvatarCropModal from "@/components/common/AvatarCropModal";
import { POSITION_LABELS } from "@/constants/user.constants";
import "./styles.less";

interface ProfileHeaderProps {
    user: any;
    activeTab?: string;
    onTabChange?: (key: string) => void;
    showTabs?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, activeTab, onTabChange, showTabs = true }) => {
    const dispatch = useDispatch<AppDispatch>();

    // Crop modal state
    const [cropVisible, setCropVisible] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string>("");
    const [uploadedPublicId, setUploadedPublicId] = useState<string | undefined>(undefined);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Step 1: Upload raw file to Cloudinary, then open crop modal
    const handleAvatarUpload = async (file: File, onSuccess: any, onError: any) => {
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            const res: any = await apiClient.post("/upload/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onSuccess && onSuccess(res);
            const url = res?.url || res?.data?.url || (res?.data && res.data[0] && res.data[0].url);
            const publicId = res?.publicId || res?.data?.publicId || res?.data?.fileRecord?.idFile;
            if (url) {
                setCropImageSrc(url);
                setUploadedPublicId(publicId);
                setCropVisible(true);
            } else {
                message.error("Không lấy được URL ảnh từ server");
            }
        } catch (err: any) {
            onError && onError(err);
            message.error("Upload thất bại");
        }
    };

    // Step 2: User confirmed crop → upload cropped blob as new avatar, then update profile
    const handleCropConfirm = async (croppedBlob: Blob) => {
        setConfirmLoading(true);
        try {
            // Upload the cropped image as a new avatar
            const croppedFile = new File([croppedBlob], "avatar-cropped.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append("avatar", croppedFile);
            const res: any = await apiClient.post("/upload/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const finalUrl = res?.url || res?.data?.url || (res?.data && res.data[0] && res.data[0].url);
            if (finalUrl) {
                // Delete the original uncropped upload from Cloudinary
                if (uploadedPublicId) {
                    await apiClient.delete("/upload/file", { data: { publicId: uploadedPublicId } }).catch(() => null);
                }

                // Save final avatar URL to user profile
                await userService.updateProfile({ avatar: finalUrl } as any);
                dispatch(getMe());
                message.success("Đã cập nhật ảnh đại diện");
            }
        } catch {
            message.error("Lưu ảnh thất bại. Thử lại!");
        } finally {
            setConfirmLoading(false);
            setCropVisible(false);
            setCropImageSrc("");
            setUploadedPublicId(undefined);
        }
    };

    const handleCropCancel = () => {
        setCropVisible(false);
        setCropImageSrc("");
        setUploadedPublicId(undefined);
    };

    return (
        <div className="profile-header-section">
            <div className="profile-info-bar">
                <div className="cover-overlay" />
                <div className="profile-container">
                    <div className="profile-layout-row">
                        <div className="left-col-avatar">
                            <div className="avatar-wrapper">
                                <Avatar size={140} src={user?.avatar} icon={<UserOutlined />} className="profile-avatar" />
                                <Upload
                                    name="avatar"
                                    showUploadList={false}
                                    accept="image/*"
                                    customRequest={async ({ file, onSuccess, onError }) =>
                                        handleAvatarUpload(file as File, onSuccess, onError)
                                    }
                                >
                                    <div className="upload-trigger">
                                        <CameraOutlined />
                                    </div>
                                </Upload>
                            </div>
                        </div>

                        <div className="right-col-info">
                            <div className="user-main-info">
                                <div className="name-role-wrapper">
                                    <h1 className="user-name">{user?.name}</h1>
                                    <div className="user-badges">
                                        {user?.position && (
                                            <span className="user-role-badge position-badge">
                                                {POSITION_LABELS[user.position] || user.position}
                                            </span>
                                        )}
                                        {user?.department && (
                                            <span className="user-role-badge department-badge">
                                                📂 {user.department}
                                            </span>
                                        )}
                                        {!user?.position && !user?.department && (
                                            <span className="user-role-badge">
                                                {user?.role === "admin" ? "🛡️ Quản trị viên" : "Thành viên"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="join-date">
                                    Tham gia từ: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "Thành viên mới"}
                                </p>
                            </div>

                            {showTabs && (
                                <Tabs
                                    className="profile-header-tabs"
                                    activeKey={activeTab}
                                    onChange={(key) => {
                                        onTabChange && onTabChange(key);
                                    }}
                                    items={[
                                        { label: 'Hồ sơ', key: 'profile' },
                                        { label: 'Hoạt động', key: 'activity' },
                                        { label: 'Bảo mật', key: 'security' },
                                    ]}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Avatar Crop Modal */}
            <AvatarCropModal
                visible={cropVisible}
                imageSrc={cropImageSrc}
                uploadedPublicId={uploadedPublicId}
                onConfirm={handleCropConfirm}
                onCancel={handleCropCancel}
                loading={confirmLoading}
            />
        </div>
    );
};

export default ProfileHeader;
