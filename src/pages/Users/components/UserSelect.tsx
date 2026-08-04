import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Select, Spin, Avatar, Space, Typography, SelectProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import userService from '@/services/user.service';
import type { User } from '@/types';

const { Text } = Typography;

export interface UserSelectProps extends Omit<SelectProps<any>, 'options' | 'children'> {
  mode?: 'multiple' | 'tags';
  value?: any;
  onChange?: (value: any, option: any) => void;
  debounceTimeout?: number;
  activeOnly?: boolean;
  /** Pass an initial user or list of users to display correctly before fetching */
  initialUsers?: User | User[];
  /** Additional filters to apply to the API call */
  filterParams?: Record<string, any>;
}

const UserSelect: React.FC<UserSelectProps> = ({ 
  debounceTimeout = 500, 
  activeOnly = true,
  initialUsers,
  allowClear = true,
  mode,
  filterParams = {},
  ...props 
}) => {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<User[]>([]);
  const fetchRef = useRef(0);

  // Load initial options
  useEffect(() => {
    // Fetch default list when mounted
    fetchUsers('');
  }, []);

  const fetchUsers = useMemo(() => {
    const loadUsers = async (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      
      setOptions([]);
      setFetching(true);

      try {
        const params: any = { limit: 50, ...filterParams };
        if (value) {
          params.q = value;
        }
        if (activeOnly) {
          params.status = 'active';
        }

        const res = await userService.getAll(params);
        if (fetchId !== fetchRef.current) {
          // A newer fetch is in progress
          return;
        }

        const userData = res.data || res;
        const usersArray = Array.isArray(userData) ? userData : (userData?.data || []);
        
        // Merge with initialUsers if any are selected but not in the search results
        // We'll let Select handle displaying values that are not in options if needed,
        // but it's better to keep options populated.
        let initialArr: User[] = [];
        if (initialUsers) {
          initialArr = Array.isArray(initialUsers) ? initialUsers : [initialUsers];
        }
        
        const merged = [...usersArray];
        initialArr.forEach(initialU => {
          if (!merged.find(u => u.id === initialU.id)) {
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
  }, [activeOnly, initialUsers, debounceTimeout]);

  return (
    <Select
      mode={mode}
      allowClear={allowClear}
      showSearch
      labelInValue={false}
      filterOption={false}
      onSearch={fetchUsers}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      placeholder={mode === 'multiple' ? "Chọn các thành viên..." : "Tìm kiếm thành viên..."}
      optionLabelProp="label"
      options={options.map(u => ({
        label: u.name,
        value: u.id,
        'data-search': `${u.studentId || ''} ${u.email || ''}`,
        render: (
          <Space>
            <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 13 }}>{u.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{u.studentId || u.email}</Text>
            </Space>
          </Space>
        )
      }))}
      optionRender={(option) => option.data.render}
      {...props}
    />
  );
};

export default UserSelect;
