import { useState } from 'react';
import { Form, Input } from 'antd';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import userService from '../../services/user.service';
import { User } from '../../types';

const UserPage = () => {
    const {
        data,
        loading,
        pagination,
        fetchAll,
        remove,
        create,
        update,
        setPagination
    } = useCRUD(userService);

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
        }
    ];

    const handleDelete = (id: number) => {
        remove(id);
    };

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
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
                title="User Management"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onChange={(p) => setPagination(p)}
                onAdd={openCreate}
                onRefresh={() => fetchAll()}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <FormModal
                visible={isModalVisible}
                title={editingId ? "Edit User" : "Create User"}
                onCancel={() => setIsModalVisible(false)}
                onOk={onOk}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: !editingId }]}>
                        <Input.Password />
                    </Form.Item>
                </Form>
            </FormModal>
        </>
    );
};

export default UserPage;
