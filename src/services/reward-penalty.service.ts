import apiClient from '@/config/axios.config';
import BaseService from './base.service';
import type { BaseApiResponse, QueryParams } from '@/types';
import type {
    RewardPenaltyEntry,
    RewardPenaltyCreateDTO,
    FinancialStats,
} from '@/types/reward-penalty.types';
import { logger } from '@/utils/logger.utils';

class RewardPenaltyService extends BaseService<
    RewardPenaltyEntry,
    RewardPenaltyCreateDTO,
    Partial<RewardPenaltyCreateDTO>
> {
    constructor() {
        super('/reward-penalties');
    }

    async createEntry(data: RewardPenaltyCreateDTO): Promise<BaseApiResponse<RewardPenaltyEntry>> {
        try {
            const response = await apiClient.post<BaseApiResponse<RewardPenaltyEntry>>(
                this.endpoint,
                data
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Đã thêm thưởng/phạt',
            };
        } catch (error) {
            logger.error('[RewardPenalty] createEntry error:', error);
            throw error;
        }
    }

    async getHistory(params: QueryParams = {}): Promise<BaseApiResponse<RewardPenaltyEntry[]>> {
        try {
            const queryString = this.buildQueryString(params);
            const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;
            const response = await apiClient.get<BaseApiResponse<RewardPenaltyEntry[]>>(url);
            return {
                success: response.success ?? true,
                data: response.data,
                pagination: response.pagination,
            };
        } catch (error) {
            logger.error('[RewardPenalty] getHistory error:', error);
            throw error;
        }
    }

    async getFinancialStats(params: QueryParams = {}): Promise<BaseApiResponse<FinancialStats>> {
        try {
            const queryString = this.buildQueryString(params);
            const url = queryString
                ? `${this.endpoint}/stats/financial?${queryString}`
                : `${this.endpoint}/stats/financial`;
            const response = await apiClient.get<BaseApiResponse<FinancialStats>>(url);
            return {
                success: response.success ?? true,
                data: response.data,
            };
        } catch (error) {
            logger.error('[RewardPenalty] getFinancialStats error:', error);
            throw error;
        }
    }
}

export const rewardPenaltyService = new RewardPenaltyService();
export default rewardPenaltyService;
