import React from 'react';
import { Col, Form, Input, Row, Select, Divider } from 'antd';
import type { FormInstance } from 'antd';
import { GiftOutlined, UserOutlined } from '@ant-design/icons';
import FormModal from '../../../components/common/FormModal';

interface RewardPenaltyFormProps {
    open: boolean;
    form: FormInstance;
    onOk: () => void;
    onCancel: () => void;
    loading?: boolean;
}

const RewardPenaltyForm: React.FC<RewardPenaltyFormProps> = ({
    open,
    form,
    onOk,
    onCancel,
    loading = false,
}) => {
    return (
        <FormModal
            open={open}
            title="Thêm thưởng / phạt"
            onCancel={onCancel}
            onOk={onOk}
            form={form}
            width={520}
            loading={loading}
        >
            <Divider orientation="left">
                <UserOutlined /> Thông tin thành viên
            </Divider>
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item
                        name="user_id"
                        label="ID Thành viên"
                        rules={[{ required: true, message: 'Vui lòng nhập ID thành viên' }]}
                    >
                        <Input type="number" min={1} placeholder="Nhập ID thành viên" />
                    </Form.Item>
                </Col>
            </Row>

            <Divider orientation="left">
                <GiftOutlined /> Thông tin thưởng/phạt
            </Divider>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name="type"
                        label="Loại"
                        rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
                    >
                        <Select
                            options={[
                                { value: 'reward', label: '🎁 Thưởng' },
                                { value: 'penalty', label: '⚠️ Phạt' },
                            ]}
                            placeholder="Chọn loại"
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name="amount"
                        label="Số tiền (VND)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số tiền' },
                            {
                                validator: (_, value) =>
                                    value > 0
                                        ? Promise.resolve()
                                        : Promise.reject('Số tiền phải lớn hơn 0'),
                            },
                        ]}
                    >
                        <Input
                            type="number"
                            min={1000}
                            step={1000}
                            placeholder="Ví dụ: 50000"
                            suffix="đ"
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                name="reason"
                label="Lý do"
                rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
            >
                <Input.TextArea
                    rows={3}
                    placeholder="Mô tả lý do thưởng/phạt"
                    maxLength={500}
                    showCount
                />
            </Form.Item>
        </FormModal>
    );
};

export default RewardPenaltyForm;
