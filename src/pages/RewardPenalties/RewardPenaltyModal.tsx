import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import rewardPenaltyService, { RewardPenaltyEntry } from '@/services/reward-penalty.service';
import userService from '@/services/user.service';
import { FormModal } from '@/components/common';

interface RewardPenaltyModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: RewardPenaltyEntry | null;
}

const RewardPenaltyModal: React.FC<RewardPenaltyModalProps> = ({
  open,
  onCancel,
  onSuccess,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll({ limit: 1000 });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          eventDate: initialValues.eventDate ? dayjs(initialValues.eventDate) : dayjs(),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ eventDate: dayjs(), type: 'penalty' });
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        eventDate: values.eventDate.toISOString(),
      };

      if (initialValues?.id) {
        await rewardPenaltyService.update(initialValues.id, payload);
        message.success('Cập nhật thành công');
      } else {
        await rewardPenaltyService.create(payload);
        message.success('Thêm mới thành công');
      }

      onSuccess();
      onCancel();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      title={initialValues ? 'Chỉnh sửa bản ghi' : 'Thêm bản ghi thưởng/phạt'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      loading={loading}
      form={form}
      width={500}
    >
      <Form.Item
        name="userId"
        label="Thành viên"
        rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}
      >
        <Select
          showSearch
          placeholder="Chọn thành viên"
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={users.map((u) => ({ label: u.name, value: u.id }))}
        />
      </Form.Item>

      <Form.Item
        name="type"
        label="Loại"
        rules={[{ required: true }]}
      >
        <Select options={[
          { label: 'Thưởng', value: 'reward' },
          { label: 'Phạt', value: 'penalty' },
        ]} />
      </Form.Item>

      <Form.Item
        name="amount"
        label="Số tiền (VNĐ)"
        rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
          min={0}
          step={1000}
        />
      </Form.Item>

      <Form.Item
        name="eventDate"
        label="Ngày ghi nhận"
        rules={[{ required: true }]}
      >
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>

      <Form.Item
        name="reason"
        label="Lý do"
        rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
      >
        <Input.TextArea rows={3} placeholder="Ví dụ: Vắng trực không phép, Hoàn thành xuất sắc nhiệm vụ..." />
      </Form.Item>

      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea rows={2} />
      </Form.Item>
    </FormModal>
  );
};

export default RewardPenaltyModal;
