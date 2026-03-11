export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type SlotStatus = 'open' | 'full' | 'locked' | 'cancelled';
export type SwapStatus = 'pending' | 'approved' | 'rejected';
export type SwapDecision = 'approved' | 'rejected';

export interface DutyUser {
    id: number;
    name: string;
    avatar?: string;
    studentId?: string;
}

export interface DutySlot {
    id: number;
    day?: DayOfWeek;
    shift: string;
    date: string;
    location?: string;
    capacity: number;
    assignedUsers: DutyUser[];
    status: SlotStatus;
    createdBy?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DutySwapRequest {
    id: number;
    slotId: number;
    slot?: DutySlot;
    requesterId: number;
    requester?: DutyUser;
    targetId: number;
    target?: DutyUser;
    reason?: string;
    status: SwapStatus;
    decidedBy?: number;
    decidedAt?: string;
    createdAt?: string;
}

export interface DutyStats {
    total: number;
    open: number;
    locked: number;
    totalAssigned: number;
}

export interface DutySlotCreateDTO {
    shift: string;
    date: string;
    location?: string;
    capacity: number;
    notes?: string;
}

export interface SwapRequestCreateDTO {
    slotId: number;
    targetId: number;
    reason?: string;
}
