import { useState } from 'react';
import { Form, Input, Switch, Tag } from 'antd';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import userService from '../../services/user.service';
import { User } from '../../types';
import { useAccess } from '../../hooks';

const UserPage = () => {
    const {
        data,
        loading,
        pagination,
        fetchAll,
        remove,
        create,
        update,
        handleTableChange,
        updateFilters,
        clearFilters,
        search,
        searchTerm,
        filters: filterValues,
        selectedIds,
        setSelectedIds,
        batchDelete,
        importData,
        exportData,
        downloadTemplate,
    } = useCRUD(userService, {
        autoFetch: true,
    });

    const { hasPermission } = useAccess();

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const handleToggleStatus = async (checked: boolean, record: User) => {
        await update(record.id, { isActive: checked });
    };

    const columns = [
        {
            title: "Tên người dùng",
            dataIndex: "name",
            key: "name",
            searchable: true,
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            searchable: true,
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            render: (role: string) => {
                const color = role === 'admin' ? 'volcano' : role === 'staff' ? 'blue' : 'gray';
                return <Tag color={color}>{role.toUpperCase()}</Tag>;
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 150,
            render: (isActive: boolean, record: User) => (
                <Switch
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    checked={isActive}
                    onChange={(checked) => handleToggleStatus(checked, record)}
                    loading={loading && editingId === record.id}
                />
            ),
        },
    ];

    const filters = [
        {
            key: "role",
            label: "Vai trò",
            type: "select" as const,
            options: [
                { label: "Admin", value: "admin" },
                { label: "User", value: "user" },
                { label: "Staff", value: "staff" },
            ],
        },
        {
            key: "isActive",
            label: "Trạng thái",
            type: "select" as const,
            options: [
                { label: "Hoạt động", value: true },
                { label: "Khóa", value: false },
            ],
        },
    ];

    const handleDelete = (id: number) => {
        remove(id);
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, role: 'user' });
        setIsModalVisible(true);
    };

    const openEdit = (record: User) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const onOk = async () => {
        try {
            const values = await form.validateFields();
            let success;
            if (editingId) {
                success = await update(editingId, values);
            } else {
                success = await create(values);
            }

            if (success) {
                setIsModalVisible(false);
                form.resetFields();
            }
        } catch (error) {
            console.error("Validate Failed:", error);
        }
    };

    return (
        <>
            <DataTable
                title="Quản lý người dùng"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                onAdd={hasPermission('users:create') ? openCreate : undefined}
                onRefresh={() => fetchAll()}
                onEdit={hasPermission('users:update') ? openEdit : undefined}
                onDelete={hasPermission('users:delete') ? handleDelete : undefined}
                // Search & Filter
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={(key, value) => updateFilters({ [key]: value })}
                onClearFilters={clearFilters}
                // Batch Operations
                batchOperations={hasPermission('users:delete')}
                selectedRowKeys={selectedIds}
                onSelectChange={setSelectedIds}
                onBatchDelete={batchDelete}
                // Import/Export
                importable={hasPermission('users:import_export')}
                exportable={hasPermission('users:import_export')}
                onImport={importData}
                onExport={exportData}
                onDownloadTemplate={downloadTemplate}
            />

            <FormModal
                open={isModalVisible}
                title={editingId ? "Cập nhật người dùng" : "Thêm mới người dùng"}
                onCancel={() => setIsModalVisible(false)}
                onOk={onOk}
                form={form}
            >
                <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                    <Input placeholder="Nhập tên người dùng" />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ!' }]}>
                    <Input placeholder="example@domain.com" />
                </Form.Item>
                {!editingId && (
                    <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                        <Input.Password placeholder="Nhập mật khẩu" />
                    </Form.Item>
                )}
                <Form.Item name="role" label="Vai trò">
                    <Input placeholder="admin/user/staff" />
                </Form.Item>
                <Form.Item name="isActive" label="Trạng thái tài khoản" valuePropName="checked">
                    <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
                </Form.Item>
            </FormModal>
        </>
    );
};

export default UserPage;
