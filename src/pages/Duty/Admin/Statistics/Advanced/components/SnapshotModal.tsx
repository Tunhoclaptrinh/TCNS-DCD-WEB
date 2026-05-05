import React, { useState } from 'react';
import { Form, Input, Alert, Typography, Space, Divider, Tag } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import FormModal from '@/components/common/FormModal';


const { Text } = Typography;

interface SnapshotModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (values: any) => Promise<void>;
  simulatedData: any;
  params: any;
}

const SnapshotModal: React.FC<SnapshotModalProps> = ({ open, onCancel, onSave, simulatedData, params }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async (values: any) => {
    try {
      setLoading(true);
      const snapshotPayload = {
        name: values.name,
        note: values.note,
        startDate: simulatedData.meta.startDate,
        endDate: simulatedData.meta.endDate,
        config: params,
        data: simulatedData.details,
        summary: simulatedData.insights
      };
      await onSave(snapshotPayload);
      form.resetFields();
    } catch (err) {
      console.error('Failed to save snapshot', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      title={
        <Space>
          <SaveOutlined />
          <span>Lưu Snapshot Quyết toán</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      form={form}
      loading={loading}
      okText="Xác nhận lưu"
    >
      <Alert
        message="Về việc lưu Snapshot"
        description="Snapshot sẽ đóng băng toàn bộ kết quả tính toán hiện tại (bao gồm cả các tham số giả lập và định mức riêng). Bạn có thể tra cứu lại dữ liệu này bất cứ lúc nào trong mục Lịch sử."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Form.Item 
        label="Tên Snapshot" 
        name="name" 
        initialValue={`Quyết toán ${simulatedData?.meta?.periodText}`}
        rules={[{ required: true, message: 'Vui lòng nhập tên snapshot' }]}
      >
        <Input placeholder="Ví dụ: Quyết toán tháng 4 - Đợt 1" />
      </Form.Item>

      <Form.Item label="Ghi chú" name="note">
        <Input.TextArea rows={3} placeholder="Ghi chú thêm nếu cần..." />
      </Form.Item>

      <Divider />
      
      <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px' }}>
        <Space direction="vertical" size={4}>
          <Text type="secondary">Tóm tắt dữ liệu lưu trữ:</Text>
          <Space>
            <Tag color="blue">{simulatedData?.details?.length} nhân sự</Tag>
            <Tag color="green">Tổng chi: {(simulatedData?.insights?.totalBudget / 1000).toLocaleString()}k</Tag>
            <Tag color="orange">Đơn giá: {params.kipPrice.toLocaleString()}đ</Tag>
          </Space>
        </Space>
      </div>
    </FormModal>
  );
};

export default SnapshotModal;
