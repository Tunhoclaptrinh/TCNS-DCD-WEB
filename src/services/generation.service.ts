import BaseService from './base.service';
import apiClient from '@/config/axios.config';
import type { BaseApiResponse } from '@/types';

export interface Generation {
  id: number;
  name: string;
  description?: string;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GenerationCreateDTO = Pick<Generation, 'name' | 'description' | 'isCurrent' | 'isActive'>;
export type GenerationUpdateDTO = Partial<GenerationCreateDTO>;

class GenerationService extends BaseService<Generation, GenerationCreateDTO, GenerationUpdateDTO> {
  constructor() {
    super('/generations');
  }

  async setCurrent(id: number | string): Promise<BaseApiResponse<Generation>> {
    const response = await apiClient.patch<BaseApiResponse<Generation>>(`${this.endpoint}/${id}/set-current`);
    return response;
  }
}

export const generationService = new GenerationService();
export default generationService;
