export interface ReportUserStats {
    total: number;
    active: number;
    inactive: number;
    byRole?: Record<string, number>;
    byPosition?: Record<string, number>;
    byDepartment?: Record<string, number>;
}

export interface ReportDutyStats {
    totalSlots: number;
    totalRegistrations: number;
    pendingSwaps: number;
    openSlots?: number;
    lockedSlots?: number;
}

export interface ReportRewardPenaltyStats {
    totalReward: number;
    totalPenalty: number;
    netBalance: number;
}

export interface ReportOverview {
    users: ReportUserStats;
    duty: ReportDutyStats;
    rewardPenalty: ReportRewardPenaltyStats;
    generatedAt?: string;
}
