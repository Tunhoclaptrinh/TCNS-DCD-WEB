import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Select, Spin, Avatar, Space, Typography, SelectProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import userService from '@/services/user.service';
import { User } from '@/types';
import { getUserDisplayName } from '@/utils/formatters';

const { Text } = Typography;

export interface UserSelectProps extends Omit<SelectProps<any>, 'options' | 'children'> {
  mode?: 'multiple' | 'tags';
  value?: any;
  onChange?: (value: any, option?: any) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  maxTagCount?: number | 'responsive';
  debounceTimeout?: number;
  activeOnly?: boolean;
  /** Static list of users to use directly (skips async fetch if provided) */
  users?: User[];
  /** Pass an initial user or list of users to display correctly before fetching */
  initialUsers?: User | User[];
  /** Additional filters to apply to the API call */
  filterParams?: Record<string, any>;
}

const UserSelect: React.FC<UserSelectProps> = ({ 
  users: staticUsers,
  initialUsers,
  debounceTimeout = 500, 
  activeOnly = true,
  allowClear = true,
  disabled,
  mode,
  maxTagCount,
  placeholder = "Chọn thành viên...",
  style,
  filterParams = {},
  value,
  onChange,
  ...props 
}) => {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<User[]>([]);
  const fetchRef = useRef(0);

  // Sync with staticUsers or initialUsers
  useEffect(() => {
    if (staticUsers && staticUsers.length > 0) {
      setOptions(staticUsers);
    } else {
      fetchUsers('');
    }
  }, [staticUsers]);

  const fetchUsers = useMemo(() => {
    const loadUsers = async (searchTerm: string) => {
      // If staticUsers is provided and no active search, don't fetch
      if (staticUsers && staticUsers.length > 0 && !searchTerm) {
        setOptions(staticUsers);
        return;
      }

      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      
      setFetching(true);

      try {
        const params: any = { limit: 50, ...filterParams };
        if (searchTerm) {
          params.q = searchTerm;
        }
        if (activeOnly) {
          params.status = 'active';
        }

        const res = await userService.getAll(params);
        if (fetchId !== fetchRef.current) {
          return;
        }

        const userData = res.data || res;
        const usersArray: User[] = Array.isArray(userData) ? userData : (userData?.data || []);
        
        let initialArr: User[] = [];
        if (initialUsers) {
          initialArr = Array.isArray(initialUsers) ? initialUsers : [initialUsers];
        } else if (staticUsers) {
          initialArr = staticUsers;
        }
        
        const merged = [...usersArray];
        initialArr.forEach(initialU => {
          if (initialU && initialU.id && !merged.find(u => u.id === initialU.id)) {
            merged.push(initialU);
          }
        });
        
        setOptions(merged);
      } catch (err) {
        console.error('Lỗi khi tìm kiếm thành viên', err);
      } finally {
        if (fetchId === fetchRef.current) {
          setFetching(false);
        }
      }
    };

    return debounce(loadUsers, debounceTimeout);
  }, [staticUsers, activeOnly, initialUsers, filterParams, debounceTimeout]);

  const handleSearch = (val: string) => {
    if (staticUsers && staticUsers.length > 0) {
      const lower = val.toLowerCase();
      const filtered = staticUsers.filter(u => {
        const displayName = getUserDisplayName(u).toLowerCase();
        const studentId = (u.studentId || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return displayName.includes(lower) || studentId.includes(lower) || email.includes(lower);
      });
      setOptions(filtered);
    } else {
      fetchUsers(val);
    }
  };

  return (
    <Select
      mode={mode}
      maxTagCount={maxTagCount}
      value={value}
      onChange={onChange}
      disabled={disabled}
      allowClear={allowClear}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      placeholder={placeholder || (mode === 'multiple' ? "Chọn các thành viên..." : "Tìm kiếm thành viên...")}
      style={{ width: '100%', ...style }}
      optionLabelProp="label"
      options={options.map(u => {
        const displayName = getUserDisplayName(u);
        return {
          label: displayName,
          value: u.id,
          studentId: u.studentId,
          avatar: u.avatar,
          'data-search': `${u.studentId || ''} ${u.email || ''} ${displayName}`,
          render: (
            <Space>
              <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
              <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 13 }}>{displayName}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{u.studentId || u.email}</Text>
              </Space>
            </Space>
          )
        };
      })}
      labelRender={(props) => {
        const user = options.find(u => String(u.id) === String(props.value));
        if (!user) return props.label || `Thành viên #${props.value}`;
        const displayName = getUserDisplayName(user);
        return (
          <Space size={6}>
            <Avatar size={18} src={user.avatar} icon={<UserOutlined />} />
            <Text style={{ fontSize: 13 }}>{displayName}</Text>
            {user.studentId && <Text type="secondary" style={{ fontSize: 11 }}>({user.studentId})</Text>}
          </Space>
        );
      }}
      optionRender={(option) => option.data.render}
      {...props}
    />
  );
};

export default UserSelect;
