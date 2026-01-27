import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';

interface DataTableProps {
  columns: any[];
  dataSource: any[];
  loading: boolean;
  rowKey?: string;
  pagination?: any;
  onAdd?: () => void;
  onEdit?: (record: any) => void;
  onDelete?: (id: any) => void;
  onRefresh?: () => void;
  onChange?: (pagination: any) => void;
  title?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  dataSource,
  loading,
  rowKey = 'id',
  pagination,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onChange,
  title
}) => {
  const tableColumns = [
    ...columns,
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {onEdit && (
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
          )}
          {onDelete && (
             <Popconfirm title="Sure to delete?" onConfirm={() => onDelete(record[rowKey])}>
               <Button icon={<DeleteOutlined />} size="small" danger />
             </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <Space>
           {onRefresh && <Button icon={<ReloadOutlined />} onClick={onRefresh}>Refresh</Button>}
           {onAdd && <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Add New</Button>}
        </Space>
      </div>
      <Table
        loading={loading}
        columns={tableColumns}
        dataSource={dataSource}
        rowKey={rowKey}
        pagination={pagination}
        onChange={onChange}
      />
    </div>
  );
};

export default DataTable;
