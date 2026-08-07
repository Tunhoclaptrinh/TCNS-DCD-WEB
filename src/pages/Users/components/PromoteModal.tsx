import { Modal, Select, AutoComplete } from 'antd';
import { POSITION_LEVELS, POSITION_LABELS } from '@/constants/user.constants';
import { User, UserStats } from '@/types';

interface PromoteModalProps {
    open: boolean;
    onOk: () => void;
    onCancel: () => void;
    promotingUser: User | null;
    targetPosition: string;
    setTargetPosition: (val: string) => void;
    targetDepartment: string;
    setTargetDepartment: (val: string) => void;
    stats: UserStats | null;
}

const PromoteModal = ({
    open,
    onOk,
    onCancel,
    promotingUser,
    targetPosition,
    setTargetPosition,
    targetDepartment,
    setTargetDepartment,
    stats,
}: PromoteModalProps) => {
    return (
        <Modal
            title="Cập nhật chức vụ"
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            width={360}
            centered
            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: 12 }}>
                    Chọn chức vụ mới cho <strong>{promotingUser?.lastName || promotingUser?.firstName ? `${promotingUser?.lastName || ''} ${promotingUser?.firstName || ''}`.trim() : promotingUser?.name}</strong>:
                </div>
                <Select
                    style={{ width: '100%', marginBottom: 12 }}
                    value={targetPosition}
                    onChange={setTargetPosition}
                    options={POSITION_LEVELS.map(val => ({
                        label: POSITION_LABELS[val as keyof typeof POSITION_LABELS],
                        value: val
                    }))}
                />
                {['tvb', 'pb', 'tb'].includes(targetPosition) && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ marginBottom: 4 }}>Chọn hoặc nhập tên ban:</div>
                        <AutoComplete
                            style={{ width: '100%' }}
                            placeholder="Chọn hoặc nhập ban mới..."
                            value={targetDepartment}
                            onChange={setTargetDepartment}
                            options={Object.keys(stats?.byDepartment || {})
                                .filter(d => d !== '__unassigned__')
                                .map(d => ({ value: d }))}
                            filterOption={(inputValue, option) =>
                                String(option?.value || '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PromoteModal;
