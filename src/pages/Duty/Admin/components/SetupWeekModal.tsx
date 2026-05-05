import React, { useEffect, useState } from 'react';
import { Modal, Form, Space, Select, Divider, message, InputNumber, Row, Col, Input, Collapse, Typography, Badge, Popconfirm } from 'antd';
import Button from '@/components/common/Button';
import { 
  SettingOutlined, CopyOutlined, ClearOutlined, 
  DeleteOutlined, PlusOutlined, SolutionOutlined,
  ExclamationCircleOutlined, FieldTimeOutlined,
  DollarOutlined, PercentageOutlined, FileTextOutlined
} from '@ant-design/icons';
const { Text } = Typography;
import dutyService from '@/services/duty.service';
import { DEPARTMENTS } from '../constants';
import dayjs from 'dayjs';

interface SetupWeekModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentWeek: dayjs.Dayjs;
  templateGroups: any[];
}

const SetupWeekModal: React.FC<SetupWeekModalProps> = ({
  open,
  onCancel,
  onSuccess,
  currentWeek,
  templateGroups
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCurrentConfig();
    }
  }, [open, currentWeek]);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');
      const res = await dutyService.getPeriodConfig(start, end);
      
      if (res.success && res.data) {
        setIsInitialized(!!res.data.isInitialized);
        form.setFieldsValue({
          ...res.data,
          templateId: res.data.templateId || templateGroups.find(g => g.isDefault)?.id
        });
      }
    } catch (err) {
      console.error('Lỗi nạp cấu hình tuần:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateScheduleFromTemplates = async (force: boolean = false) => {
    try {
      const values = await form.validateFields();
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');

      setLoading(true);
      
      // 1. Save period configuration first
      await dutyService.updatePeriodConfig({
        ...values,
        startDate: start,
        endDate: end
      });

      // 2. Generate slots
      const res = await dutyService.generateRangeSlots(start, end, values.templateId, values.mode);
      if (res.success) {
        message.success('Đã cấu hình định mức và khởi tạo lịch trực thành công');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      if (err.errorFields) return;
      const errorMsg = err.response?.data?.message || err.message || '';
      if ((errorMsg.includes('already has slots') || errorMsg.includes('already exists')) && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và khởi tạo lại theo bản mẫu không?',
          okText: 'Xóa và Khởi tạo',
          okType: 'danger',
          onOk: () => generateScheduleFromTemplates(true)
        });
      } else {
        message.error('Lỗi khi khởi tạo: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfigOnly = async () => {
    try {
      const values = await form.validateFields();
      const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
      const end = currentWeek.endOf('isoWeek' as any).format('YYYY-MM-DD');

      setLoading(true);
      const res = await dutyService.updatePeriodConfig({
        ...values,
        startDate: start,
        endDate: end
      });

      if (res.success) {
        message.success('Đã cập nhật cấu hình định mức cho tuần này');
        setIsInitialized(true);
        onSuccess(); // Refresh parent stats
      }
    } catch (err: any) {
      if (err.errorFields) return;
      message.error('Lỗi khi cập nhật cấu hình: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };


  const handleCopyWeek = async (force: boolean = false) => {
    try {
      setLoading(true);
      const prevWeekStart = currentWeek.subtract(1, 'week').startOf('isoWeek' as any).format('YYYY-MM-DD');
      const targetStart = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');

      const res = await dutyService.copyWeekSchedule(prevWeekStart, targetStart);
      if (res.success) {
        message.success('Đã sao chép lịch tuần trước');
        onSuccess();
        onCancel();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg === 'Target week already has slots' && !force) {
        Modal.confirm({
          title: 'Tuần này đã có lịch trực',
          content: 'Bạn có muốn XÓA TOÀN BỘ lịch hiện tại của tuần này và sao chép lại từ tuần trước không?',
          okText: 'Xóa và Sao chép',
          okType: 'danger',
          onOk: async () => {
            const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
            await dutyService.deleteWeeklySlots(start);
            return handleCopyWeek(true);
          }
        });
      } else {
        message.error('Lỗi khi sao chép: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearWeek = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa sạch lịch tuần này?',
      okText: 'Xóa sạch',
      okType: 'danger',
      onOk: async () => {
        try {
          const start = currentWeek.startOf('isoWeek' as any).format('YYYY-MM-DD');
          const res = await dutyService.deleteWeeklySlots(start);
          if (res.success) {
            message.success('Đã xóa lịch tuần');
            onSuccess();
            onCancel();
          }
        } catch (err) {
          message.error('Lỗi khi xóa lịch');
        }
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Thiết lập lịch trình nhanh</span>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>Tuần: {currentWeek.startOf('isoWeek' as any).format('DD/MM')} - {currentWeek.endOf('isoWeek' as any).format('DD/MM/YYYY')}</Text>
          </div>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
      style={{ top: 40 }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <Form form={form} layout="vertical" initialValues={{ mode: 'kips' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={20}>
          {/* Section: Initialization Config */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <SettingOutlined style={{ color: '#3b82f6' }} />
              <Text strong style={{ fontSize: 14 }}>Cấu hình Khởi tạo</Text>
              {isInitialized && <Badge status="success" text={<Text type="secondary" style={{ fontSize: 11 }}>Đã khởi tạo</Text>} style={{ marginLeft: 'auto' }} />}
            </div>
            <Row gutter={16}>
              <Col span={14}>
                <Form.Item name="templateId" label={<span style={{ fontSize: 12, fontWeight: 500 }}>Chọn Bản mẫu</span>} rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                  <Select 
                    placeholder="Chọn nhóm bản mẫu" 
                    options={templateGroups.map(g => ({ label: g.name, value: g.id }))} 
                    onChange={(id) => {
                      const selected = templateGroups.find(g => g.id === id);
                      if (selected) {
                        form.setFieldsValue({
                          defaultQuota: selected.defaultQuota,
                          kipPrice: selected.kipPrice,
                          violationPenaltyRate: selected.violationPenaltyRate,
                          quotaRules: selected.quotaRules
                        });
                      }
                    }}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="mode" label={<span style={{ fontSize: 12, fontWeight: 500 }}>Chế độ</span>} rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                  <Select options={[
                    { label: 'Chi tiết Kíp', value: 'kips' },
                    { label: 'Chỉ Ca', value: 'shifts' },
                    { label: 'Toàn bộ', value: 'all' }
                  ]} style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Section: Quota & Rules (Collapsible but better designed) */}
          <Collapse 
            ghost 
            expandIconPosition="end"
            defaultActiveKey={['quota']}
            style={{ 
              background: '#ffffff', 
              borderRadius: 12, 
              border: '1px solid #f1f5f9',
              overflow: 'hidden'
            }}
            items={[{
              key: 'quota',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SolutionOutlined style={{ fontSize: 12 }} />
                  </div>
                  <Text strong style={{ fontSize: 13 }}>Định mức & Quy tắc tuần</Text>
                </div>
              ),
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 12, color: '#64748b' }}><FieldTimeOutlined /> Định mức kíp</span>} name="defaultQuota" style={{ marginBottom: 12 }}>
                        <InputNumber 
                          min={0} step={0.5} 
                          style={{ width: '100%', borderRadius: 8 }} 
                          addonAfter="kíp"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 12, color: '#64748b' }}><DollarOutlined /> Đơn giá kíp</span>} name="kipPrice" style={{ marginBottom: 12 }}>
                        <InputNumber 
                          min={0} step={1000} 
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          style={{ width: '100%', borderRadius: 8 }} 
                          addonAfter="đ"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label={<span style={{ fontSize: 12, color: '#64748b' }}><PercentageOutlined /> Tỷ lệ phạt vi phạm</span>} name="violationPenaltyRate" style={{ marginBottom: 0 }}>
                        <InputNumber 
                          min={0} step={0.1}
                          placeholder="Mặc định là 0 (Không phạt)"
                          style={{ width: '100%', borderRadius: 8 }} 
                          addonAfter="x Đơn giá"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider style={{ margin: '16px 0', borderStyle: 'dashed' }} />
                  
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 12 }}>Quy tắc riêng cho đối tượng:</Text>
                    <Button 
                      variant="ghost" 
                      buttonSize="small"
                      onClick={() => form.setFieldValue('quotaRules', [])}
                      style={{ fontSize: 11, color: '#ef4444' }}
                    >Xóa hết</Button>
                  </div>

                  <Form.List name="quotaRules">
                    {(fields, { add, remove }) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {fields.map(({ key, name, ...restField }) => (
                          <div key={key} style={{ 
                            padding: '16px', 
                            background: '#f8fafc', 
                            borderRadius: 12, 
                            border: '1px solid #e2e8f0',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}>
                              <Popconfirm
                                title="Xóa quy tắc này?"
                                onConfirm={() => remove(name)}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true, size: 'small' }}
                                cancelButtonProps={{ size: 'small' }}
                              >
                                <Button 
                                  variant="ghost" 
                                  style={{ padding: 0, width: 28, height: 28, color: '#94a3b8' }}
                                  icon={<DeleteOutlined style={{ fontSize: 14 }} />} 
                                />
                              </Popconfirm>
                            </div>
                            
                            <Row gutter={[12, 12]}>
                              <Col span={14}>
                                <Form.Item {...restField} name={[name, 'type']} label={<span style={{ fontSize: 11, color: '#64748b' }}>Loại đối tượng</span>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                  <Select size="small" placeholder="Đối tượng" style={{ borderRadius: 6 }} options={[
                                    { label: 'Cá nhân (MSV)', value: 'user' },
                                    { label: 'Đội trưởng', value: 'dt' },
                                    { label: 'Trưởng ban', value: 'tb' },
                                    { label: 'Phó ban', value: 'pb' },
                                    { label: 'Thành viên', value: 'member_all' },
                                    { label: 'CTV', value: 'ctv' },
                                  ]} />
                                </Form.Item>
                              </Col>
                              <Col span={10}>
                                <Form.Item {...restField} name={[name, 'quota']} label={<span style={{ fontSize: 11, color: '#64748b' }}>Định mức</span>} style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" step={0.5} min={0} placeholder="Mặc định" style={{ width: '100%', borderRadius: 6 }} addonAfter="kíp" />
                                </Form.Item>
                              </Col>
                              <Col span={24}>
                                <Form.Item noStyle shouldUpdate>
                                  {({ getFieldValue }) => {
                                    const type = getFieldValue(['quotaRules', name, 'type']);
                                    return (
                                      <Form.Item {...restField} name={[name, 'target']} label={<span style={{ fontSize: 11, color: '#64748b' }}>{type === 'user' ? 'Mã sinh viên' : 'Áp dụng cho Ban'}</span>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                        {type === 'user' ? (
                                          <Input size="small" placeholder="Nhập mã sinh viên..." style={{ borderRadius: 6 }} />
                                        ) : (
                                          <Select size="small" placeholder="Tất cả các ban" style={{ borderRadius: 6 }}>
                                            <Select.Option value="all">Tất cả các ban</Select.Option>
                                            {DEPARTMENTS.map(dept => (
                                              <Select.Option key={dept.id} value={dept.id}>{dept.name}</Select.Option>
                                            ))}
                                          </Select>
                                        )}
                                      </Form.Item>
                                    );
                                  }}
                                </Form.Item>
                              </Col>

                              <Col span={24}>
                                <div style={{ marginTop: 4, padding: '10px', background: '#fff', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Ghi đè thông số (Tùy chọn)
                                  </Text>
                                  <Row gutter={[10, 10]}>
                                    <Col span={12}>
                                      <Form.Item {...restField} name={[name, 'kipPrice']} label={<span style={{ fontSize: 10 }}>Đơn giá kíp</span>} style={{ marginBottom: 0 }}>
                                        <InputNumber size="small" step={1000} placeholder="Mặc định" style={{ width: '100%', borderRadius: 4 }} addonAfter="đ" />
                                      </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                      <Form.Item {...restField} name={[name, 'violationPenaltyRate']} label={<span style={{ fontSize: 10 }}>Tỷ lệ phạt</span>} style={{ marginBottom: 0 }}>
                                        <InputNumber size="small" step={0.1} min={0} placeholder="Mặc định" style={{ width: '100%', borderRadius: 4 }} addonAfter="x" />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'penaltyAbsentNoPermission']} label={<span style={{ fontSize: 10 }}>Vắng ko phép</span>} style={{ marginBottom: 0 }}>
                                        <InputNumber size="small" step={5000} placeholder="Hệ thống" style={{ width: '100%', borderRadius: 4 }} />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'penaltyAbsentWithPermissionLate']} label={<span style={{ fontSize: 10 }}>Vắng báo muộn</span>} style={{ marginBottom: 0 }}>
                                        <InputNumber size="small" step={5000} placeholder="Hệ thống" style={{ width: '100%', borderRadius: 4 }} />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'penaltyLate']} label={<span style={{ fontSize: 10 }}>Đi muộn</span>} style={{ marginBottom: 0 }}>
                                        <InputNumber size="small" step={5000} placeholder="Hệ thống" style={{ width: '100%', borderRadius: 4 }} />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                </div>
                              </Col>
                            </Row>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          buttonSize="small" 
                          onClick={() => add({ type: 'member_all', target: 'all' })} 
                          block 
                          icon={<PlusOutlined />}
                          style={{ borderRadius: 8, borderStyle: 'dashed', color: '#64748b', height: 38 }}
                        >
                          Thêm quy tắc ghi đè
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              )
            },
            {
              key: 'penalties',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ExclamationCircleOutlined style={{ fontSize: 12 }} />
                  </div>
                  <Text strong style={{ fontSize: 13 }}>Ghi chú & Phạt (Tuần này)</Text>
                </div>
              ),
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  <Form.Item label={<span style={{ fontSize: 12, color: '#64748b' }}><FileTextOutlined /> Ghi chú tuần</span>} name="note" style={{ marginBottom: 16 }}>
                    <Input.TextArea placeholder="Ví dụ: Tuần lễ hội, yêu cầu trực nghiêm túc..." rows={2} style={{ borderRadius: 8 }} />
                  </Form.Item>
                  
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 11 }}>Vắng không phép</span>} name="penaltyAbsentNoPermission" style={{ marginBottom: 12 }}>
                        <InputNumber min={0} step={5000} style={{ width: '100%', borderRadius: 6 }} addonAfter="đ" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontSize: 11 }}>Vắng báo muộn</span>} name="penaltyAbsentWithPermissionLate" style={{ marginBottom: 12 }}>
                        <InputNumber min={0} step={5000} style={{ width: '100%', borderRadius: 6 }} addonAfter="đ" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label={<span style={{ fontSize: 11 }}>Đi muộn</span>} name="penaltyLate" style={{ marginBottom: 0 }}>
                        <InputNumber min={0} step={5000} style={{ width: '100%', borderRadius: 6 }} addonAfter="đ" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                      * Để trống để sử dụng mức phạt mặc định của hệ thống.
                    </Text>
                  </div>
                </div>
              )
            }]}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <Button 
              buttonSize="medium" 
              fullWidth 
              variant="primary" 
              icon={<SettingOutlined />} 
              loading={loading}
              onClick={() => {
                Modal.confirm({
                  title: 'Xác nhận khởi tạo tuần trực?',
                  content: 'Hệ thống sẽ lưu cấu hình định mức và tạo các kíp trực dựa theo bản mẫu. Các ca đã có sẵn người đăng ký sẽ được giữ nguyên.',
                  onOk: generateScheduleFromTemplates,
                  okText: 'Bắt đầu khởi tạo',
                  cancelText: 'Hủy',
                  okButtonProps: { style: { borderRadius: 8 } },
                  cancelButtonProps: { style: { borderRadius: 8 } }
                });
              }}
              style={{ height: 38, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              Lưu & Khởi tạo từ Bản mẫu
            </Button>

            <Button 
              buttonSize="medium" 
              fullWidth 
              variant="outline" 
              icon={<FileTextOutlined />} 
              loading={loading}
              onClick={handleUpdateConfigOnly}
              style={{ height: 38, borderRadius: 8, fontWeight: 600, fontSize: 13, border: '1px solid #3b82f6', color: '#3b82f6' }}
            >
              Chỉ cập nhật Cấu hình Định mức
            </Button>

            <Row gutter={12}>
              <Col span={12}>
                <Button 
                  buttonSize="medium" 
                  fullWidth 
                  variant="outline" 
                  icon={<CopyOutlined />} 
                  loading={loading}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Xác nhận sao chép?',
                      content: 'Toàn bộ kíp trực từ tuần trước sẽ được nhân bản sang tuần này.',
                      onOk: handleCopyWeek,
                      okText: 'Sao chép',
                      cancelText: 'Hủy'
                    });
                  }}
                  style={{ height: 38, borderRadius: 8, fontSize: 13 }}
                >
                  Sao chép tuần trước
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  buttonSize="medium" 
                  fullWidth 
                  variant="danger" 
                  ghost 
                  icon={<ClearOutlined />} 
                  loading={loading}
                  onClick={handleClearWeek}
                  style={{ height: 38, borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}
                >
                  Xóa sạch lịch tuần
                </Button>
              </Col>
            </Row>
          </div>
        </Space>
      </Form>
    </Modal>
  );
};

export default SetupWeekModal;
