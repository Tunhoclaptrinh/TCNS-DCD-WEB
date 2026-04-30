import React from 'react';
import { Select, Avatar, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { User } from '@/types';

const { Text } = Typography;

interface UserSelectProps {
    users: User[];
    value?: number | number[];
    onChange?: (value: any) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    allowClear?: boolean;
    disabled?: boolean;
    mode?: 'multiple' | 'tags';
    maxTagCount?: number | 'responsive';
}

const UserSelect: React.FC<UserSelectProps> = ({ 
    users, 
    value, 
    onChange, 
    placeholder = "Chọn thành viên...", 
    style, 
    allowClear = true,
    disabled,
    mode,
    maxTagCount
}) => {
    return (
        <Select
            showSearch
            mode={mode}
            maxTagCount={maxTagCount}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{ width: '100%', ...style }}
            disabled={disabled}
            optionFilterProp="label"
            optionLabelProp="label"
            filterOption={(input, option) =>
                (String(option?.label || '')).toLowerCase().includes(input.toLowerCase()) ||
                (String((option as any)?.studentId || '')).toLowerCase().includes(input.toLowerCase())
            }
            allowClear={allowClear}
            options={users.map(u => ({
                value: u.id,
                label: u.name,
                studentId: u.studentId,
                avatar: u.avatar
            }))}
            labelRender={(props) => {
                const user = users.find(u => String(u.id) === String(props.value));
                if (!user) return props.label || `Thành viên #${props.value}`;
                return (
                    <Space size={6}>
                        <Avatar size={18} src={user.avatar} icon={<UserOutlined />} />
                        <Text style={{ fontSize: 13 }}>{user.name}</Text>
                        {user.studentId && <Text type="secondary" style={{ fontSize: 11 }}>({user.studentId})</Text>}
                    </Space>
                );
            }}
            optionRender={(option) => (
                <Space>
                    <Avatar size="small" src={(option.data as any).avatar} icon={<UserOutlined />} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                        <Text style={{ fontSize: 13 }}>{(option.data as any).label}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{(option.data as any).studentId}</Text>
                    </div>
                </Space>
            )}
        />
    );
};

export default UserSelect;
