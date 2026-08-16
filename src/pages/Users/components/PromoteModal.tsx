import React from 'react';
import { Modal, Select, AutoComplete } from 'antd';
import { POSITION_LABELS } from '@/constants/user.constants';
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
    departmentConfigs?: any[];
    positionConfigs?: any[];
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
    departmentConfigs = [],
    positionConfigs = []
}: PromoteModalProps) => {
    const selectedPosConfig = React.useMemo(() => {
        if (!targetPosition) return null;
        return (positionConfigs || []).find((p: any) => p.id === targetPosition);
    }, [targetPosition, positionConfigs]);

    // Check if position strictly does NOT need a department (dt, sp, admin or custom noDeptAllowed rule)
    const isNoDept = React.useMemo(() => {
        if (selectedPosConfig && typeof selectedPosConfig.noDeptAllowed === 'boolean') {
            return selectedPosConfig.noDeptAllowed;
        }
        return ['dt', 'sp', 'admin', 'super'].some(p => (targetPosition || '').toLowerCase().startsWith(p));
    }, [targetPosition, selectedPosConfig]);

    const positionOptions = React.useMemo(() => {
        const baseOptions = Object.entries(POSITION_LABELS).map(([val, label]) => ({ label, value: val }));
        const baseKeys = new Set(Object.keys(POSITION_LABELS));

        const customPosOptions = (positionConfigs || [])
            .filter((p: any) => p.id && !baseKeys.has(p.id))
            .map((p: any) => ({
                label: p.name ? `${p.name} (${p.id})` : p.id,
                value: p.id,
            }));

        return [...baseOptions, ...customPosOptions];
    }, [positionConfigs]);

    const departmentOptions = React.useMemo(() => {
        const coreDepts = ['Ban Nhân sự', 'Ban Truyền thông', 'Ban Tài chính', 'Ban Chuyên môn', 'Nhân sự', 'Truyền thông', 'Tài chính', 'Khác'];
        const configuredDepts = (departmentConfigs || []).map((d: any) => d.name || d.id).filter(Boolean);
        const statDepts = Object.keys(stats?.byDepartment || {}).filter(d => d !== '__unassigned__');

        const merged = Array.from(new Set([...coreDepts, ...configuredDepts, ...statDepts]));
        return merged.map(d => ({ value: d }));
    }, [departmentConfigs, stats]);

    return (
        <Modal
            title="Cập nhật chức vụ & nâng hạng"
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            width={400}

            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: 12 }}>
                    Chọn chức vụ mới cho <strong>{promotingUser?.lastName || promotingUser?.firstName ? `${promotingUser?.lastName || ''} ${promotingUser?.firstName || ''}`.trim() : promotingUser?.name}</strong>:
                </div>
                
                <div style={{ marginBottom: 4, fontWeight: 500 }}>Chức vụ:</div>
                <Select
                    style={{ width: '100%', marginBottom: 16 }}
                    value={targetPosition}
                    onChange={setTargetPosition}
                    options={positionOptions}
                />

                {!isNoDept && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 4, fontWeight: 500 }}>Ban chuyên môn (tùy chọn/bắt buộc theo chức vụ):</div>
                        <AutoComplete
                            style={{ width: '100%' }}
                            placeholder="Chọn hoặc nhập tên ban..."
                            value={targetDepartment}
                            onChange={setTargetDepartment}
                            options={departmentOptions}
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
