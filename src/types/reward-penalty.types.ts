export type RewardPenaltyType = 'reward' | 'penalty';

export interface RewardPenaltyUser {
    id: number;
    name: string;
    studentId?: string;
    avatar?: string;
}

export interface RewardPenaltyEntry {
    id: number;
    user_id: number;
    user?: RewardPenaltyUser;
    type: RewardPenaltyType;
    amount: number;
    reason: string;
    createdBy?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface RewardPenaltyCreateDTO {
    user_id: number;
    type: RewardPenaltyType;
    amount: number;
    reason: string;
}

export interface MonthlyFinancial {
    month: string;
    reward: number;
    penalty: number;
    net: number;
}

export interface FinancialStats {
    totalReward: number;
    totalPenalty: number;
    netBalance: number;
    byMonth: MonthlyFinancial[];
}
