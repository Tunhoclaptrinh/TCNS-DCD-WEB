import { useState } from 'react';
import { Form, Image, Switch, Tag } from 'antd';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import { DataTableColumn } from '../../components/common/DataTable/types';
import userService from '../../services/user.service';
import { User } from '../../types';
import { useAccess } from '../../hooks';
import UsersForm from './components/Form';

const UserPage = () => {
    const avatarFallback = `data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#f0f0f0"/><circle cx="20" cy="15" r="6" fill="#bfbfbf"/><path d="M8 33c2.5-5 7-8 12-8s9.5 3 12 8" fill="#bfbfbf"/></svg>'
    )}`;

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

    const handleToggleStatus = async (record: User) => {
        try {
            setEditingId(record.id);
            await userService.toggleStatus(record.id);
            await fetchAll();
        } finally {
            setEditingId(null);
        }
    };

    const columns: DataTableColumn<User>[] = [
        {
            title: "Avatar",
            dataIndex: "avatar",
            key: "avatar",
            width: 80,
            render: (avatar: string) => (
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#f0f0f0',
                        display: 'inline-block',
                    }}
                >
                    <Image
                        src={avatar || avatarFallback}
                        alt="avatar"
                        width={40}
                        height={40}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(event) => {
                            const target = event.currentTarget;
                            if (target.src !== avatarFallback) {
                                target.src = avatarFallback;
                            }
                        }}
                    />
                </div>
            ),
        },
        {
            title: "Tên người dùng",
            maxWidth: 300,
            dataIndex: "name",
            key: "name",
            minWidth: 210,
            width: 220,
            resizable: true,
            searchable: true,
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            width: 260,
            resizable: true,
            searchable: true,
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            width: 140,
            resizable: true,
            render: (role: string) => {
                const color = role === 'admin' ? 'volcano' : role === 'staff' ? 'blue' : 'gold';
                return <Tag color={color}>{role.toUpperCase()}</Tag>;
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 150,
            resizable: true,
            render: (isActive: boolean, record: User) => (
                <Switch
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    checked={isActive}
                    onChange={() => handleToggleStatus(record)}
                    disabled={!hasPermission('users:manage_status')}
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
                { label: "Staff", value: "staff" },
                { label: "Customer", value: "customer" },
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
        form.setFieldsValue({ isActive: true, role: 'customer' });
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
                tableLayout="fixed"
                saveColumnWidths
                columnResizeKey="users-table"
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

            <UsersForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
            />
        </>
    );
};

export default UserPage;
