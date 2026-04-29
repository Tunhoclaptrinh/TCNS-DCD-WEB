import apiClient from '@/config/axios.config';
import { BaseApiResponse } from '@/types';

export interface RewardPenaltyEntry {
  id: number;
  userId: number;
  type: 'reward' | 'penalty';
  amount: number;
  reason: string;
  eventDate?: string;
  note?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    name: string;
    avatar?: string;
    position?: string;
  };
}

export interface FinancialStats {
  totalItems: number;
  totalReward: number;
  totalPenalty: number;
  netBalance: number;
  byMonth: Record<string, {
    reward: number;
    penalty: number;
    net: number;
  }>;
}

const endpoint = '/reward-penalties';

const rewardPenaltyService = {
  getAll: (params: any = {}): Promise<BaseApiResponse<RewardPenaltyEntry[]>> => {
    return apiClient.get(endpoint, { params });
  },

  getById: (id: number | string): Promise<BaseApiResponse<RewardPenaltyEntry>> => {
    return apiClient.get(`${endpoint}/${id}`);
  },

  getFinancialStats: (params: any = {}): Promise<BaseApiResponse<FinancialStats>> => {
    return apiClient.get(`${endpoint}/stats/financial`, { params });
  },

  create: (data: Partial<RewardPenaltyEntry>): Promise<BaseApiResponse<RewardPenaltyEntry>> => {
    return apiClient.post(endpoint, data);
  },

  update: (id: number | string, data: Partial<RewardPenaltyEntry>): Promise<BaseApiResponse<RewardPenaltyEntry>> => {
    return apiClient.put(`${endpoint}/${id}`, data);
  },

  delete: (id: number | string): Promise<BaseApiResponse<void>> => {
    return apiClient.delete(`${endpoint}/${id}`);
  }
};

export default rewardPenaltyService;
