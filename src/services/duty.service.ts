import apiClient from "@/config/axios.config";
import type { BaseApiResponse } from "@/types";

export interface DutyTemplate {
  id: number;
  name: string;
  isDefault: boolean;
  description?: string;
}

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
  templateId?: number;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
  description?: string;
  daysOfWeek?: number[];
  kips: DutyKip[];
}

export interface DutySlot {
  id: number;
  weekStart: string;
  shiftDate: string;
  kipId?: number;
  shiftId?: number;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  assignedUserIds: number[];
  assignedUsers?: any[];
  kip?: DutyKip;
  note?: string;
  status: 'open' | 'locked';
  order?: number;
  endPeriod?: number;
  capacity?: number;
  attendedUserIds?: number[];
  dayId?: number;
}

export interface DutyDay {
  id: number;
  date: string;
  note?: string;
  status: 'open' | 'locked';
  shiftTemplateIds?: number[];
}

class DutyService {
  /**
   * Get weekly schedule
   */
  async getWeeklySchedule(weekStart?: string): Promise<BaseApiResponse<{ slots: DutySlot[], days: DutyDay[], assignments: any[], templates?: DutyShift[] }>> {
    const response = await apiClient.get<BaseApiResponse<{ slots: DutySlot[], days: DutyDay[], assignments: any[], templates?: DutyShift[] }>>("/duty/week", {
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
    const response = await apiClient.delete(`/duty/slots/${id}`);
    return response;
  }

  // Attendance & Leave
  async markAttendance(slotId: number, attendedUserIds: number[]) {
    const response = await apiClient.post(`/duty/slots/${slotId}/attendance`, { ids: attendedUserIds });
    return response;
  }

  async requestLeave(slotId: number, reason: string) {
    const response = await apiClient.post(`/duty/leave-request`, { slotId, reason });
    return response;
  }

  async getLeaveRequests(params: any = {}) {
    const response = await apiClient.get(`/duty/leave-requests`, { params });
    return response;
  }

  async resolveLeaveRequest(requestId: number, status: 'approved' | 'rejected', rejectionReason?: string) {
    const response = await apiClient.patch(`/duty/leave-requests/${requestId}/resolve`, { status, rejectionReason });
    return response;
  }

  // Swap Requests
  async requestSwap(slotId: number, targetUserId: number) {
    const response = await apiClient.post(`/duty/swaps`, { slotId, targetUserId });
    return response;
  }

  async getSwapRequests(params: any = {}) {
    const response = await apiClient.get(`/duty/swaps`, { params });
    return response;
  }

  async decideSwap(requestId: number, status: 'approved' | 'rejected') {
    const response = await apiClient.patch(`/duty/swaps/${requestId}/decision`, { status });
    return response;
  }

  /**
   * Get all background template groups (Winter/Summer etc)
   */
  async getTemplateGroups(): Promise<BaseApiResponse<DutyTemplate[]>> {
    const response = await apiClient.get<BaseApiResponse<DutyTemplate[]>>("/duty/templates/groups");
    return response;
  }

  async createTemplateGroup(data: Partial<DutyTemplate>): Promise<BaseApiResponse<DutyTemplate>> {
    const response = await apiClient.post<BaseApiResponse<DutyTemplate>>("/duty/templates/groups", data);
    return response;
  }

  async updateTemplateGroup(id: number, data: Partial<DutyTemplate>): Promise<BaseApiResponse<DutyTemplate>> {
    const response = await apiClient.put<BaseApiResponse<DutyTemplate>>(`/duty/templates/groups/${id}`, data);
    return response;
  }

  async deleteTemplateGroup(id: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>(`/duty/templates/groups/${id}`);
    return response;
  }

  /**
   * Get all shift and kip templates for a group
   */
  async getShiftTemplates(templateId?: number | null): Promise<BaseApiResponse<DutyShift[]>> {
    const response = await apiClient.get<BaseApiResponse<DutyShift[]>>("/duty/templates", {
      params: { templateId }
    });
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
   * Generate slots for a specific range from templates
   */
  async generateRangeSlots(startDate: string, endDate: string, templateId?: number, mode: string = 'kips'): Promise<BaseApiResponse<any>> {
    const response = await apiClient.post<BaseApiResponse<any>>('/duty/generate-range', { startDate, endDate, templateId, mode });
    return response;
  }

  /**
   * Delete slots for a specific range
   */
  async deleteRangeSlots(startDate: string, endDate: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>("/duty/slots-range", {
      data: { startDate, endDate }
    });
    return response;
  }

  /**
   * Copy slots from one week to another
   */
  async copyWeekSchedule(sourceWeek: string, targetWeek: string): Promise<BaseApiResponse<any>> {
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
  async deleteWeeklySlots(weekStart: string): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>("/duty/slots-week", {
      data: { weekStart }
    });
    return response;
  }

  /**
   * Delete all slots for a specific shift on a specific day
   */
  async deleteShiftSlots(date: string, shiftId: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>("/duty/slots-shift", {
      data: { date, shiftId }
    });
    return response;
  }

  async addShiftToDay(date: string, shiftId: number, overrides?: any, mode: string = 'kips'): Promise<any> {
    const response = await apiClient.post('/duty/template-shifts-day', { date, shiftId, overrides, mode });
    return response;
  }

  async removeShiftFromDay(date: string, shiftId: number): Promise<any> {
    const response = await apiClient.delete('/duty/template-shifts-day', { data: { date, shiftId } });
    return response;
  }

  async getTemplateAssignments(): Promise<BaseApiResponse<any[]>> {
    const response = await apiClient.get<BaseApiResponse<any[]>>("/duty/assignment");
    return response;
  }

  async createTemplateAssignment(data: { templateId: any, startDate: string, endDate: string, mode?: string, note?: string }): Promise<BaseApiResponse<any>> {
    const response = await apiClient.post<BaseApiResponse<any>>("/duty/assignment", data);
    return response;
  }

  async updateTemplateAssignment(id: number, data: any): Promise<BaseApiResponse<any>> {
    const response = await apiClient.put<BaseApiResponse<any>>(`/duty/assignment/${id}`, data);
    return response;
  }

  async deleteTemplateAssignment(id: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>(`/duty/assignment/${id}`);
    return response;
  }
}

export const dutyService = new DutyService();
export default dutyService;
