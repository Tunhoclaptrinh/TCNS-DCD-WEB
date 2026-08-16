import React from 'react';
import { Tag, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined, 
  MinusCircleOutlined 
} from '@ant-design/icons';

export type AttendanceState = 'present' | 'excused' | 'absent' | 'pending';

export const getAttendanceState = (user: any, slot: any): AttendanceState => {
  if (!user || !slot) return 'pending';

  const uid = String(user.id || user.userId || user._id || user);
  
  // Check explicit status on user object if available
  if (user.attendanceStatus) {
    const s = String(user.attendanceStatus).toLowerCase();
    if (s === 'present' || s === 'attended') return 'present';
    if (s === 'excused' || s === 'leave' || s === 'permission') return 'excused';
    if (s === 'absent' || s === 'unexcused') return 'absent';
  }

  // Check attendedUserIds
  const attendedIds = (slot.attendedUserIds || slot.attendedUsers || []).map((u: any) => 
    String(u.id || u.userId || u._id || u)
  );
  const isAttended = attendedIds.includes(uid) || user.isAttended === true;

  if (isAttended) return 'present';

  // Check leave requests
  const leaveRequests = slot.leaveRequests || [];
  const hasApprovedLeave = leaveRequests.some((lr: any) => {
    const lrUid = String(lr.userId || lr.user?.id || lr.user);
    return lrUid === uid && (lr.status === 'approved' || lr.isApproved === true);
  });

  if (hasApprovedLeave) return 'excused';

  // Check past/completed slot absent status
  const isPast = slot.isPast || slot.status === 'completed' || (slot.shiftDate && new Date(`${slot.shiftDate}T${slot.endTime || '23:59'}`) < new Date());
  const assignedIds = (slot.assignedUserIds || slot.assignedUsers || []).map((u: any) => 
    String(u.id || u.userId || u._id || u)
  );
  const isAssigned = assignedIds.includes(uid) || user.isAssigned === true;

  if (isPast && isAssigned && !isAttended) return 'absent';

  return 'pending';
};

export const ATTENDANCE_STATE_CONFIG: Record<AttendanceState, { 
  label: string; 
  shortLabel: string; 
  color: string; 
  textColor: string;
  bg: string; 
  border: string;
  icon: React.ReactNode; 
}> = {
  present: {
    label: 'Có mặt',
    shortLabel: 'Có mặt',
    color: 'success',
    textColor: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
  },
  excused: {
    label: 'Vắng có lý do',
    shortLabel: 'Nghỉ P',
    color: 'warning',
    textColor: '#d97706',
    bg: '#fffbeb',
    border: '#fef3c7',
    icon: <ClockCircleOutlined style={{ color: '#d97706' }} />,
  },
  absent: {
    label: 'Vắng không lý do',
    shortLabel: 'Vắng KP',
    color: 'error',
    textColor: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: <CloseCircleOutlined style={{ color: '#dc2626' }} />,
  },
  pending: {
    label: 'Chưa điểm danh',
    shortLabel: 'Chờ DD',
    color: 'default',
    textColor: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: <MinusCircleOutlined style={{ color: '#94a3b8' }} />,
  },
};

interface AttendanceStatusTagProps {
  status?: AttendanceState;
  user?: any;
  slot?: any;
  showText?: boolean;
  shortText?: boolean;
  size?: 'small' | 'middle';
  bordered?: boolean;
}

export const AttendanceStatusTag: React.FC<AttendanceStatusTagProps> = ({
  status,
  user,
  slot,
  showText = true,
  shortText = false,
  bordered = true,
}) => {
  const resolvedStatus = status || getAttendanceState(user, slot);
  const cfg = ATTENDANCE_STATE_CONFIG[resolvedStatus] || ATTENDANCE_STATE_CONFIG.pending;

  if (!showText) {
    return (
      <Tooltip title={cfg.label}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {cfg.icon}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tag 
      color={cfg.color} 
      icon={cfg.icon} 
      style={{ 
        margin: 0, 
        fontWeight: 600,
        borderRadius: 6,
        padding: '1px 8px',
        backgroundColor: bordered ? undefined : cfg.bg,
        borderColor: bordered ? undefined : cfg.border,
      }}
    >
      {shortText ? cfg.shortLabel : cfg.label}
    </Tag>
  );
};

export default AttendanceStatusTag;
