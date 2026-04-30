import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { Button } from '@/components/common';
import { MeetingMemberTable } from './MeetingMemberPicker';
import { User } from '@/types';

interface MemberSelectionModalProps {
    open: boolean;
    onCancel: () => void;
    onSelect: (userIds: number[]) => void;
    users: User[];
    selectedIds: number[];
    title: string;
}

const MemberSelectionModal: React.FC<MemberSelectionModalProps> = ({
    open,
    onCancel,
    onSelect,
    selectedIds,
    title
}) => {
    const [tempSelected, setTempSelected] = useState<number[]>([]);

    useEffect(() => {
        if (open) {
            setTempSelected(selectedIds);
        }
    }, [open, selectedIds]);

    const handleOk = () => {
        onSelect(tempSelected);
        onCancel();
    };

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            width={850}
            footer={[
                <Button key="cancel" variant="ghost" buttonSize="small" onClick={onCancel} style={{ borderRadius: 6 }}>Hủy</Button>,
                <Button key="ok" variant="primary" buttonSize="small" onClick={handleOk} style={{ borderRadius: 6, padding: '0 24px' }}>Xác nhận ({tempSelected.length})</Button>
            ]}
            centered
        >
            <div style={{ marginTop: -12, padding: '0 4px' }}>
                <MeetingMemberTable 
                    value={tempSelected} 
                    onChange={(keys) => setTempSelected(keys)} 
                />
            </div>
        </Modal>
    );
};

export default MemberSelectionModal;
