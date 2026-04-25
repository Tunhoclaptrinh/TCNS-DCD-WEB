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
  daysOfWeek?: number[];
  slotStructure?: any[];
  config?: any;
  status?: string;
  fromTemplateKipId?: number;
  order?: number;
}



export interface DutyShift {
  id: number;
  templateId?: number;
  dayId?: number;
  date?: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
  daysOfWeek?: number[];
  isSpecialEvent: boolean;
  kips: DutyKip[];
  status?: string;
  fromTemplateShiftId?: number;
  order?: number;
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
  capacity?: number;
  attendedUserIds?: number[];
  isSpecialEvent?: boolean;
  config?: any;
  order?: number;
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

  async createLeaveManual(data: any) {
    const response = await apiClient.post(`/duty/leave-requests/manual`, data);
    return response;
  }

  async updateLeaveRequest(id: number, data: any) {
    const response = await apiClient.put(`/duty/leave-requests/${id}`, data);
    return response;
  }

  async deleteLeaveRequest(id: number) {
    const response = await apiClient.delete(`/duty/leave-requests/${id}`);
    return response;
  }

  // Swap/Transfer Requests
  async requestSwap(data: { slotId?: number, toSlotId?: number, fromSlotId?: number, targetUserId?: number }) {
    const response = await apiClient.post(`/duty/swaps`, data);
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

  async createSwapManual(data: any) {
    const response = await apiClient.post(`/duty/swaps/manual`, data);
    return response;
  }

  async updateSwapRequest(id: number, data: any) {
    const response = await apiClient.put(`/duty/swaps/${id}`, data);
    return response;
  }

  async deleteSwapRequest(id: number) {
    const response = await apiClient.delete(`/duty/swaps/${id}`);
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

  async createActualShift(data: { date: string, name: string, startTime: string, endTime: string, note?: string }): Promise<BaseApiResponse<DutyShift>> {
    const response = await apiClient.post<BaseApiResponse<DutyShift>>("/duty/shifts", data);
    return response;
  }

  async createActualKip(data: { shiftId: number, name: string, coefficient: number, capacity: number, startTime?: string, endTime?: string, note?: string }): Promise<BaseApiResponse<DutyKip>> {
    const response = await apiClient.post<BaseApiResponse<DutyKip>>("/duty/kips", data);
    return response;
  }

  async deleteActualKip(kipId: number): Promise<BaseApiResponse<any>> {
    const response = await apiClient.delete<BaseApiResponse<any>>(`/duty/kips/${kipId}`);
    return response;
  }

  async updateActualShift(shiftId: number, data: Partial<DutyShift>): Promise<BaseApiResponse<DutyShift>> {
    const response = await apiClient.put<BaseApiResponse<DutyShift>>(`/duty/shifts/${shiftId}`, data);
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

  async getSettings(): Promise<BaseApiResponse<{ id: any; weeklyKipLimit: number, allowUnregisterWhenFull: boolean, currentGeneration: string, generations: string[] }>> {
    const response = await apiClient.get<BaseApiResponse<{ id: any; weeklyKipLimit: number, allowUnregisterWhenFull: boolean, currentGeneration: string, generations: string[] }>>("/duty/settings");
    return response;
  }

  async updateSettings(data: { weeklyKipLimit: number, allowUnregisterWhenFull: boolean, currentGeneration?: string, generations?: string[] }): Promise<BaseApiResponse<any>> {
    const response = await apiClient.put<BaseApiResponse<any>>("/duty/settings", data);
    return response;
  }
  async getStats() {
    const response = await apiClient.get(`/duty/stats/summary`);
    return response;
  }
}

export const dutyService = new DutyService();
export default dutyService;
