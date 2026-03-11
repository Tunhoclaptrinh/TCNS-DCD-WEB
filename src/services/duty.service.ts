import apiClient from '@/config/axios.config';
import BaseService from './base.service';
import type { BaseApiResponse, QueryParams } from '@/types';
import type {
    DutySlot,
    DutySlotCreateDTO,
    DutyStats,
    DutySwapRequest,
    SwapRequestCreateDTO,
    SwapDecision,
} from '@/types/duty.types';
import { logger } from '@/utils/logger.utils';

class DutyService extends BaseService<DutySlot, DutySlotCreateDTO, Partial<DutySlotCreateDTO>> {
    constructor() {
        super('/duty');
    }

    async getWeeklySchedule(weekStart?: string): Promise<BaseApiResponse<DutySlot[]>> {
        try {
            const params = weekStart ? `?weekStart=${weekStart}` : '';
            const response = await apiClient.get<BaseApiResponse<DutySlot[]>>(
                `${this.endpoint}/week${params}`
            );
            return {
                success: response.success ?? true,
                data: response.data,
            };
        } catch (error) {
            logger.error('[Duty] getWeeklySchedule error:', error);
            throw error;
        }
    }

    async createSlot(data: DutySlotCreateDTO): Promise<BaseApiResponse<DutySlot>> {
        try {
            const response = await apiClient.post<BaseApiResponse<DutySlot>>(
                `${this.endpoint}/slots`,
                data
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Tạo ca trực thành công',
            };
        } catch (error) {
            logger.error('[Duty] createSlot error:', error);
            throw error;
        }
    }

    async updateSlot(id: number | string, data: Partial<DutySlotCreateDTO>): Promise<BaseApiResponse<DutySlot>> {
        try {
            const response = await apiClient.put<BaseApiResponse<DutySlot>>(
                `${this.endpoint}/slots/${id}`,
                data
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Cập nhật ca trực thành công',
            };
        } catch (error) {
            logger.error('[Duty] updateSlot error:', error);
            throw error;
        }
    }

    async registerToSlot(id: number | string): Promise<BaseApiResponse<DutySlot>> {
        try {
            const response = await apiClient.patch<BaseApiResponse<DutySlot>>(
                `${this.endpoint}/slots/${id}/register`
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Đăng ký ca trực thành công',
            };
        } catch (error) {
            logger.error('[Duty] registerToSlot error:', error);
            throw error;
        }
    }

    async cancelRegistration(id: number | string): Promise<BaseApiResponse<DutySlot>> {
        try {
            const response = await apiClient.patch<BaseApiResponse<DutySlot>>(
                `${this.endpoint}/slots/${id}/cancel`
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Hủy đăng ký thành công',
            };
        } catch (error) {
            logger.error('[Duty] cancelRegistration error:', error);
            throw error;
        }
    }

    async requestSwap(data: SwapRequestCreateDTO): Promise<BaseApiResponse<DutySwapRequest>> {
        try {
            const response = await apiClient.post<BaseApiResponse<DutySwapRequest>>(
                `${this.endpoint}/swaps`,
                data
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Yêu cầu đổi ca đã được gửi',
            };
        } catch (error) {
            logger.error('[Duty] requestSwap error:', error);
            throw error;
        }
    }

    async getSwapRequests(params?: QueryParams): Promise<BaseApiResponse<DutySwapRequest[]>> {
        try {
            const queryString = params ? this.buildQueryString(params) : '';
            const url = queryString
                ? `${this.endpoint}/swaps?${queryString}`
                : `${this.endpoint}/swaps`;
            const response = await apiClient.get<BaseApiResponse<DutySwapRequest[]>>(url);
            return {
                success: response.success ?? true,
                data: response.data,
                pagination: response.pagination,
            };
        } catch (error) {
            logger.error('[Duty] getSwapRequests error:', error);
            throw error;
        }
    }

    async decideSwap(
        id: number | string,
        decision: SwapDecision,
        reason?: string
    ): Promise<BaseApiResponse<DutySwapRequest>> {
        try {
            const response = await apiClient.patch<BaseApiResponse<DutySwapRequest>>(
                `${this.endpoint}/swaps/${id}/decision`,
                { decision, reason }
            );
            return {
                success: response.success ?? true,
                data: response.data,
                message: response.message ?? 'Đã xử lý yêu cầu đổi ca',
            };
        } catch (error) {
            logger.error('[Duty] decideSwap error:', error);
            throw error;
        }
    }

    async getStats(): Promise<BaseApiResponse<DutyStats>> {
        try {
            const response = await apiClient.get<BaseApiResponse<DutyStats>>(
                `${this.endpoint}/stats/summary`
            );
            return {
                success: response.success ?? true,
                data: response.data,
            };
        } catch (error) {
            logger.error('[Duty] getStats error:', error);
            throw error;
        }
    }
}

export const dutyService = new DutyService();
export default dutyService;
