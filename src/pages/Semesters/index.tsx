import { useState } from 'react';
import { Form, Tag, Space, Tooltip, message, Modal, Typography } from 'antd';
import { StarOutlined, StarFilled, EditOutlined, DeleteOutlined, EyeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useCRUD } from '@/hooks/useCRUD';
import DataTable from '@/components/common/DataTable';
import { DataTableColumn } from '@/components/common/DataTable/types';
import semesterService, { Semester } from '@/services/semester.service';
import SemesterForm from './components/SemesterForm';
import { Button } from '@/components/common';
import dayjs from 'dayjs';

const { Text } = Typography;

const SemestersPage = () => {
  const {
    data,
    loading,
    pagination,
    fetchAll,
    remove,
    create,
    update,
    handleTableChange,
    search,
    searchTerm,
  } = useCRUD(semesterService, {
    autoFetch: true,
  });

  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Semester | null>(null);
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);

  const handleSetCurrent = async (record: Semester) => {
    try {
      await semesterService.setCurrent(record.id);
      message.success(`Đã đặt '${record.name}' làm Học kỳ hiện tại`);
      await fetchAll();
    } catch (error) {
      console.error('Failed to set current semester:', error);
    }
  };

  const columns: DataTableColumn<Semester>[] = [
    {
      title: "Tên Học kỳ",
      dataIndex: "name",
      key: "name",
      width: 180,
      searchable: true,
      render: (name: string, record: Semester) => (
        <Space>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {record.isCurrent && <Tag color="gold" icon={<StarFilled />}>Hiện tại</Tag>}
        </Space>
      )
    },
    {
      title: "Năm học",
      dataIndex: "academicYear",
      key: "academicYear",
      width: 120,
      searchable: true,
      render: (year: string) => <Tag color="blue">{year}</Tag>
    },
    {
      title: "Bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: "Kết thúc",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Semester) => (
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

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const openEdit = (record: Semester) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      startDate: dayjs(record.startDate),
      endDate: dayjs(record.endDate),
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    const record = data.find((s: Semester) => s.id === id);
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa học kỳ '${record?.name}'?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => remove(id)
    });
  };

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };

      let success;
      if (editingId) {
        success = await update(editingId, formattedValues);
      } else {
        success = await create(formattedValues);
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
        title="Quản lý Học kỳ"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onPaginationChange={handleTableChange}
        onAdd={openCreate}
        onRefresh={() => fetchAll()}
        onView={(record: Semester) => {
          setViewingRecord(record);
          setIsDetailVisible(true);
        }}
        searchable={true}
        searchValue={searchTerm}
        onSearch={search}
        extra={
          <Button 
            variant="ghost" 
            buttonSize="small" 
            icon={<QuestionCircleOutlined />} 
            onClick={() => setIsGuideModalVisible(true)} 
            style={{ 
              color: '#595959', 
              border: '1px solid #d9d9d9',
              height: 32 
            }}
          >
            Hướng dẫn
          </Button>
        }
      />

      <SemesterForm
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
              <Text strong style={{ fontSize: 18 }}>Chi tiết Học kỳ</Text>
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
          <div className="semester-detail">
            <p><strong>Tên Học kỳ:</strong> {viewingRecord.name}</p>
            <p><strong>Năm học:</strong> {viewingRecord.academicYear}</p>
            <p><strong>Ngày bắt đầu:</strong> {dayjs(viewingRecord.startDate).format('DD/MM/YYYY')}</p>
            <p><strong>Ngày kết thúc:</strong> {dayjs(viewingRecord.endDate).format('DD/MM/YYYY')}</p>
            <p><strong>Trạng thái:</strong> {viewingRecord.isCurrent ? <Tag color="gold">Học kỳ hiện tại</Tag> : 'Bình thường'}</p>
            <p><strong>Ghi chú:</strong> {viewingRecord.note || 'Không có ghi chú'}</p>
            <p><strong>Mô tả:</strong> {viewingRecord.description || 'Không có mô tả'}</p>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: 'var(--primary-color)' }} />
            <span>Hướng dẫn Quản lý Học kỳ</span>
          </Space>
        }
        open={isGuideModalVisible}
        onCancel={() => setIsGuideModalVisible(false)}
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Button key="close" variant="primary" onClick={() => setIsGuideModalVisible(false)} style={{ minWidth: 100 }}>Đã hiểu</Button>
          </div>
        ]}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <p>Trang này giúp bạn quản lý các Học kỳ trong năm học:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <b>Học kỳ hiện tại:</b> Sử dụng icon <StarOutlined /> để đặt học kỳ làm mặc định cho toàn hệ thống.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Chu kỳ thời gian:</b> Thiết lập chính xác ngày bắt đầu và kết thúc để hệ thống tính toán lịch trực và thống kê.
            </li>
            <li style={{ marginBottom: 8 }}>
              <b>Ghi chú & Mô tả:</b> Lưu lại các lưu ý đặc biệt cho từng học kỳ nếu có.
            </li>
          </ul>
        </div>
      </Modal>
    </>
  );
};

export default SemestersPage;
