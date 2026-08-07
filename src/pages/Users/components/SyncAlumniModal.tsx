import { Modal, Tag } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { DataTable } from '@/components/common';
import { User } from '@/types';
import { Generation } from '@/services/generation.service';

interface SyncAlumniModalProps {
    open: boolean;
    onOk: () => void;
    onCancel: () => void;
    syncingAlumni: boolean;
    potentialAlumni: User[];
    alumniSelectedIds: number[];
    setAlumniSelectedIds: (keys: number[]) => void;
    generationList: Generation[];
    getFullName: (u: User) => string;
}

const SyncAlumniModal = ({
    open,
    onOk,
    onCancel,
    syncingAlumni,
    potentialAlumni,
    alumniSelectedIds,
    setAlumniSelectedIds,
    generationList,
    getFullName,
}: SyncAlumniModalProps) => {
    return (
        <Modal
            title="Chốt danh sách Cựu thành viên"
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            width={800}
            confirmLoading={syncingAlumni}
            okText="Xác nhận chuyển thành Cựu"
            cancelText="Hủy"
        >
            <div style={{ marginBottom: 16 }}>
                Dưới đây là danh sách các thành viên thuộc những Khóa đã ngưng hoạt động. 
                Mặc định tất cả sẽ được chuyển sang trạng thái <strong>"Không hoạt động"</strong>. 
                Bạn hãy bỏ tích những người vẫn còn đang hoạt động.
            </div>
            <DataTable
                hideCard
                dataSource={potentialAlumni}
                columns={[
                    {
                        title: 'Tên thành viên',
                        key: 'fullName',
                        dataIndex: 'name',
                        searchable: true,
                        render: (_, record) => getFullName(record as User),
                        sorter: (a, b) => getFullName(a as User).localeCompare(getFullName(b as User)),
                        onFilter: (value, record) => getFullName(record as User).toLowerCase().includes(String(value).toLowerCase()),
                    },
                    {
                        title: 'Mã SV',
                        dataIndex: 'studentId',
                        searchable: true,
                        sorter: true,
                    },
                    {
                        title: 'Khóa',
                        key: 'generation',
                        render: (_, record) => {
                            const genName = generationList.find(g => g.id === (record as User).generationId)?.name;
                            return genName ? <Tag color="geekblue">{genName}</Tag> : <span style={{ color: '#bfbfbf' }}>--</span>;
                        },
                        sorter: (a, b) => ((a as User).generationId ?? 0) - ((b as User).generationId ?? 0),
                        filters: generationList.map(g => ({ text: g.name, value: g.id })),
                        onFilter: (value, record) => (record as User).generationId === value,
                    }
                ]}
                selectedRowKeys={alumniSelectedIds}
                onSelectChange={(keys) => setAlumniSelectedIds(keys as number[])}
                batchOperations={true}
                batchActions={[
                    {
                        key: 'confirm-alumni',
                        label: 'Xác nhận chuyển thành Cựu',
                        icon: <CheckCircleOutlined />,
                        onClick: onOk
                    },
                    {
                        key: 'deselect-all',
                        label: 'Bỏ chọn tất cả',
                        icon: <StopOutlined />,
                        onClick: () => setAlumniSelectedIds([])
                    }
                ]}
                searchable={true}
                searchPlaceholder="Tìm kiếm thành viên..."
                pagination={false}
                scroll={{ y: 400 }}
            />
        </Modal>
    );
};

export default SyncAlumniModal;
