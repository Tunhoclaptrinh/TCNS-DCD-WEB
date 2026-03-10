import React from "react";
import { Avatar, Tabs, Upload, message } from "antd";
import { UserOutlined, CameraOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import apiClient from "@config/axios.config";
import userService from "@services/user.service";
import { getMe } from "@store/slices/authSlice";
import { AppDispatch } from "@/store";
import "./styles.less";

interface ProfileHeaderProps {
    user: any;
    activeTab?: string;
    onTabChange?: (key: string) => void;
    showTabs?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, activeTab, onTabChange, showTabs = true }) => {
    const dispatch = useDispatch<AppDispatch>();

    const handleAvatarUpload = async (file: File, onSuccess: any, onError: any) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res: any = await apiClient.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onSuccess && onSuccess(res);
            const url = res?.url || res?.data?.url || (res?.data && res.data[0] && res.data[0].url);
            if (url) {
                await userService.updateProfile({ ...user, avatar: url } as any);
                dispatch(getMe());
                message.success("Đã cập nhật ảnh đại diện");
            }
        } catch (err: any) {
            onError && onError(err);
            message.error("Upload thất bại");
        }
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
                                    <span className="user-role-badge">
                                        {user?.role === "admin" ? "🛡️ Quản trị viên" : "Thành viên"}
                                    </span>
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
        </div>
    );
};

export default ProfileHeader;
