import apiClient from '@/config/axios.config';
import type { BaseApiResponse } from '@/types';
import type { ReportOverview } from '@/types/report.types';
import { logger } from '@/utils/logger.utils';

class ReportService {
    private readonly endpoint = '/reports';

    async getOverview(): Promise<BaseApiResponse<ReportOverview>> {
        try {
            const response = await apiClient.get<BaseApiResponse<ReportOverview>>(
                `${this.endpoint}/overview`
            );
            return {
                success: response.success ?? true,
                data: response.data,
            };
        } catch (error) {
            logger.error('[Report] getOverview error:', error);
            throw error;
        }
    }

    async exportOverview(format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
        try {
            const response = await apiClient.get(`${this.endpoint}/export`, {
                params: { format },
                responseType: 'blob',
            });
            return response as unknown as Blob;
        } catch (error) {
            logger.error('[Report] export error:', error);
            throw error;
        }
    }
}

export const reportService = new ReportService();
export default reportService;
