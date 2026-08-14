import React from 'react';
import { Modal, Form, Spin } from 'antd';
import { FormModalProps } from './types';
import Button from '../Button';

/**
 * Universal Form Modal Component
 * Reusable modal with form for create/edit operations
 */
const FormModal: React.FC<FormModalProps> = ({
  // Modal props
  open = false,
  onCancel,
  onOk,
  title = 'Form',
  width = 600,

  // Form props
  form,
  initialValues,
  loading = false,
  layout = 'vertical',

  // Children (form fields)
  children,

  // Customization
  okText = 'Lưu lại',
  cancelText = 'Hủy',
  centered = false,
  destroyOnClose = true,
  maskClosable = false,
  preserve = true,

  // Footer
  footer,

  ...modalProps
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isSpinning = loading || internalLoading;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (onOk) {
        setInternalLoading(true);
        try {
          await onOk(values);
        } finally {
          setInternalLoading(false);
        }
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (onCancel) {
      onCancel();
    }
  };

  const defaultFooter = [
    <Button
      key="cancel"
      variant="outline"
      buttonSize="small"
      onClick={handleCancel}
      disabled={isSpinning}
      style={{ minWidth: 88 }}
    >
      {cancelText}
    </Button>,
    <Button
      key="ok"
      variant="primary"
      buttonSize="small"
      onClick={handleOk}
      loading={isSpinning}
      style={{ minWidth: 88 }}
    >
      {okText}
    </Button>
  ];

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      width={width}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={isSpinning}
      centered={centered}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable}
      footer={footer === undefined ? defaultFooter : footer}
      {...modalProps}
    >
      <Spin spinning={isSpinning}>
        <Form
          form={form}
          layout={layout}
          initialValues={initialValues}
          preserve={preserve}
          onValuesChange={modalProps.onValuesChange}
          size={modalProps.size}
        >
          {children}
        </Form>
      </Spin>
    </Modal>
  );
};

export default FormModal;
