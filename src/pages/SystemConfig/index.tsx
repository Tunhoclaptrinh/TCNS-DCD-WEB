import { useState } from 'react';
import { Form, Tag, Space, Tooltip, message, Modal, Typography } from 'antd';
import { StarOutlined, StarFilled, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useCRUD } from '../../hooks/useCRUD';
import DataTable from '../../components/common/DataTable';
import { DataTableColumn, FilterConfig } from '../../components/common/DataTable/types';
import generationService, { Generation } from '../../services/generation.service';
import GenerationForm from './components/Form';
import { Button } from '@/components/common';
const { Text } = Typography;

const GenerationPage = () => {
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
    } = useCRUD(generationService, {
        autoFetch: true,
    });

    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewingRecord, setViewingRecord] = useState<Generation | null>(null);

    const handleSetCurrent = async (record: Generation) => {
        try {
            await generationService.setCurrent(record.id);
            message.success(`Đã đặt '${record.name}' làm Khóa hiện tại`);
            await fetchAll();
        } catch (error) {
            console.error('Failed to set current generation:', error);
        }
    };

    const columns: DataTableColumn<Generation>[] = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 80,
            sortable: true,
        },
        {
            title: "Tên Khóa/Thế hệ",
            dataIndex: "name",
            key: "name",
            width: 250,
            searchable: true,
            render: (name: string, record) => (
                <Space>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    {record.isCurrent && <Tag color="gold" icon={<StarFilled />}>Hiện tại</Tag>}
                </Space>
            )
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
            width: 300,
            ellipsis: true,
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 120,
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'HOẠT ĐỘNG' : 'KHÓA'}
                </Tag>
            )
        },
        {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '--',
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 150,
            fixed: 'right',
            align: 'center',
            render: (_: any, record: Generation) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            style={{ color: '#1890ff' }} 
                            onClick={() => {
                                setViewingRecord(record);
                                setIsDetailVisible(true);
                            }}
                        >
                            <EyeOutlined />
                        </Button>
                    </Tooltip>
                    {!record.isCurrent && (
                        <Tooltip title="Đặt làm hiện tại">
                            <Button 
                                variant="ghost" 
                                buttonSize="small" 
                                style={{ color: '#faad14' }} 
                                onClick={() => handleSetCurrent(record)}
                            >
                                <StarOutlined />
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Chỉnh sửa">
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            style={{ color: 'var(--primary-color)' }} 
                            onClick={() => openEdit(record)}
                        >
                            <EditOutlined />
                        </Button>
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Button 
                            variant="ghost" 
                            buttonSize="small" 
                            danger 
                            onClick={() => handleDelete(record.id)}
                        >
                            <DeleteOutlined />
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const filters: FilterConfig[] = [
        {
            key: "isActive",
            label: "Trạng thái",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Hoạt động", value: true },
                { label: "Khóa", value: false },
            ],
        },
        {
            key: "isCurrent",
            label: "Khóa hiện tại",
            type: "select" as const,
            operators: ['eq'],
            options: [
                { label: "Đúng", value: true },
                { label: "Sai", value: false },
            ],
        },
    ];

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, isCurrent: false });
        setIsModalVisible(true);
    };

    const openEdit = (record: Generation) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        const record = data.find((g: Generation) => g.id === id);
        const isCurrent = record?.isCurrent;

        Modal.confirm({
            title: 'Xác nhận xóa',
            content: (
                <div>
                    <p>Bạn có chắc chắn muốn xóa Khóa/Thế hệ <strong>{record?.name}</strong>?</p>
                    {isCurrent && <p style={{ color: '#faad14' }}>⚠️ Lưu ý: Đây là Khóa đang được đặt làm <strong>Hiện tại</strong>.</p>}
                    <p style={{ color: '#ff4d4f', fontSize: '12px' }}>* Thành viên thuộc Khóa này sẽ không còn hiển thị tên Khóa trong danh sách.</p>
                </div>
            ),
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: () => remove(id)
        });
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
                title="Danh sách Thế hệ/Khóa"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onPaginationChange={handleTableChange}
                onAdd={openCreate}
                onRefresh={() => fetchAll()}
                onView={(record) => {
                    setViewingRecord(record);
                    setIsDetailVisible(true);
                }}
                searchable={true}
                searchValue={searchTerm}
                onSearch={search}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={(key, value) => updateFilters({ [key]: value })}
                onClearFilters={clearFilters}
            />

            <GenerationForm
                open={isModalVisible}
                editingId={editingId}
                form={form}
                onOk={onOk}
                onCancel={() => setIsModalVisible(false)}
            />

            <Modal
                title={
                    <div style={{ textAlign: 'left', width: '100%' }}>
                        <Space>
                            <EyeOutlined style={{ color: 'var(--primary-color)' }} />
                            <Text strong style={{ fontSize: 18 }}>Chi tiết Khóa/Thế hệ</Text>
                        </Space>
                    </div>
                }
                open={isDetailVisible}
                onCancel={() => setIsDetailVisible(false)}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsDetailVisible(false)}
                            style={{ minWidth: 100, color: '#8b1d1d', borderColor: '#8b1d1d' }}
                        >
                            Đóng
                        </Button>
                    </div>
                }
                width={500}
                centered
                destroyOnClose
            >
                {viewingRecord && (
                    <div className="generation-detail">
                        <p><strong>Tên Khóa:</strong> {viewingRecord.name}</p>
                        <p><strong>Mô tả:</strong> {viewingRecord.description || 'Không có mô tả'}</p>
                        <p><strong>Trạng thái hiện tại:</strong> {viewingRecord.isCurrent ? <Tag color="gold">Khóa hiện tại</Tag> : 'Bình thường'}</p>
                        <p><strong>Trạng thái hoạt động:</strong> <Tag color={viewingRecord.isActive ? 'green' : 'red'}>{viewingRecord.isActive ? 'Đang hoạt động' : 'Đã khóa'}</Tag></p>
                        <p><strong>Ngày tạo:</strong> {viewingRecord.createdAt ? new Date(viewingRecord.createdAt).toLocaleString('vi-VN') : '--'}</p>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default GenerationPage;
