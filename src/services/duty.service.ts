import apiClient from "@/config/axios.config";
import type { BaseApiResponse } from "@/types";

export interface DutyKip {
  id: number;
  shiftId: number;
  name: string;
  coefficient: number;
  capacity: number;
  startTime?: string;
  endTime?: string;
  duration?: string;
  order: number;
  endPeriod?: number;
  daysOfWeek?: number[];
}

export interface DutyShift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  description?: string;
  kips: DutyKip[];
}

export interface DutySlot {
  id: number;
  weekStart: string;
  shiftDate: string;
  kipId?: number;
  shiftLabel: string;
  startTime?: string;
  endTime?: string;
  capacity: number;
  assignedUserIds: number[];
  assignedUsers?: any[];
  status: 'open' | 'locked';
  note?: string;
  order?: number;
  endPeriod?: number;
  shiftId?: number;
  attendedUserIds?: number[];
}

class DutyService {
  /**
   * Get weekly schedule
   */
  async getWeeklySchedule(weekStart?: string): Promise<BaseApiResponse<DutySlot[]>> {
    const response = await apiClient.get<BaseApiResponse<DutySlot[]>>("/duty/week", {
      params: { weekStart }
    });
    return response;
  }

  /**
   * Register to a duty slot
   */
  async registerToSlot(slotId: number): Promise<BaseApiResponse<DutySlot>> {
    const response = await apiClient.patch<BaseApiResponse<DutySlot>>(`/duty/slots/${slotId}/register`);
    return response;
  }

  /**
   * Cancel duty registration
   */
  async cancelRegistration(slotId: number): Promise<BaseApiResponse<DutySlot>> {
    const response = await apiClient.patch<BaseApiResponse<DutySlot>>(`/duty/slots/${slotId}/cancel`);
    return response;
  }

  /**
   * Update duty slot (Lock/Unlock etc)
   */
  async updateSlot(slotId: number, data: Partial<DutySlot>): Promise<BaseApiResponse<DutySlot>> {
    const response = await apiClient.put<BaseApiResponse<DutySlot>>(`/duty/slots/${slotId}`, data);
    return response;
  }

  /**
   * Delete duty slot
   */
  async deleteSlot(id: number) {
    const res = await apiClient.delete(`/duty/slots-week`, { data: { id } });
    return res.data;
  }

  // Attendance & Leave
  async markAttendance(slotId: number, attendedUserIds: number[]) {
    const res = await apiClient.post(`/duty/slots/${slotId}/attendance`, { ids: attendedUserIds });
    return res.data;
  }

  async requestLeave(slotId: number, reason: string) {
    const res = await apiClient.post(`/duty/leave-request`, { slotId, reason });
    return res.data;
  }

  async getLeaveRequests(params: any = {}) {
    const res = await apiClient.get(`/duty/leave-requests`, { params });
    return res.data;
  }

  async resolveLeaveRequest(requestId: number, status: 'approved' | 'rejected', rejectionReason?: string) {
    const res = await apiClient.patch(`/duty/leave-requests/${requestId}/resolve`, { status, rejectionReason });
    return res.data;
  }

  /**
   * Get all shift and kip templates
   */
  async getTemplates(): Promise<BaseApiResponse<DutyShift[]>> {
    const response = await apiClient.get<BaseApiResponse<DutyShift[]>>("/duty/templates");
    return response;
  }

  /**
   * Create a new shift template
   */
  async createShiftTemplate(data: Partial<DutyShift>): Promise<BaseApiResponse<DutyShift>> {
    const response = await apiClient.post<BaseApiResponse<DutyShift>>("/duty/templates/shifts", data);
    return response;
  }

  /**
   * Update a shift template
   */
  async updateShiftTemplate(id: number, data: Partial<DutyShift>): Promise<BaseApiResponse<DutyShift>> {
    const response = await apiClient.put<BaseApiResponse<DutyShift>>(`/duty/templates/shifts/${id}`, data);
    return response;
  }

  /**
   * Delete a shift template
   */
  async deleteShiftTemplate(id: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>(`/duty/templates/shifts/${id}`);
    return response;
  }

  /**
   * Create a new kip template
   */
  async createKipTemplate(data: Partial<DutyKip>): Promise<BaseApiResponse<DutyKip>> {
    const response = await apiClient.post<BaseApiResponse<DutyKip>>("/duty/templates/kips", data);
    return response;
  }

  /**
   * Update a kip template
   */
  async updateKipTemplate(id: number, data: Partial<DutyKip>): Promise<BaseApiResponse<DutyKip>> {
    const response = await apiClient.put<BaseApiResponse<DutyKip>>(`/duty/templates/kips/${id}`, data);
    return response;
  }

  /**
   * Delete a kip template
   */
  async deleteKipTemplate(id: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>(`/duty/templates/kips/${id}`);
    return response;
  }

  /**
   * Generate slots for a specific week
   */
  async generateWeekSlots(weekStart: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.post<BaseApiResponse<any>>("/duty/generate", { weekStart });
    return response;
  }

  /**
   * Generate slots for a specific day from templates
   */
  async generateDaySlots(date: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.post<BaseApiResponse<any>>("/duty/generate-day", { date });
    return response;
  }

  /**
   * Copy slots from one week to another
   */
  async copyWeek(sourceWeek: string, targetWeek: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.post<BaseApiResponse<any>>("/duty/templates/copy", { sourceWeek, targetWeek });
    return response;
  }

  /**
   * Create a new duty slot (ad-hoc)
   */
  async createSlot(data: Partial<DutySlot>): Promise<BaseApiResponse<DutySlot>> {
    const response = await apiClient.post<BaseApiResponse<DutySlot>>("/duty/slots", data);
    return response;
  }

  /**
   * Clear all slots for a specific week
   */
  async clearWeek(weekStart: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>("/duty/slots-week", {
      data: { weekStart }
    });
    return response;
  }
}

export const dutyService = new DutyService();
export default dutyService;
