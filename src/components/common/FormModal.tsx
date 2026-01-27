import React from 'react';
import { Modal, Button } from 'antd';

interface FormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  title: string;
  children: React.ReactNode;
}

const FormModal: React.FC<FormModalProps> = ({ visible, onCancel, onOk, title, children }) => {
  return (
    <Modal
      open={visible}
      title={title}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={onOk}>Save</Button>
      ]}
    >
        {children}
    </Modal>
  );
};

export default FormModal;
