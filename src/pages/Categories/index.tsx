import { useState } from 'react';
import { Form, Input } from 'antd';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import categoryService from '../../services/category.service';

const CategoryPage = () => {
    const {
        data,
        loading,
        pagination,
        fetchAll,
        remove,
        create,
        update,
        setPagination
    } = useCRUD(categoryService);

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
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
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

    const openEdit = (record: any) => {
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
                title="Category Management"
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
                title={editingId ? "Edit Category" : "Create Category"}
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
                    <Form.Item name="description" label="Description">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </FormModal>
        </>
    );
};

export default CategoryPage;
