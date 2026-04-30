import { User } from '@/types';
import BaseService from './base.service';

export interface MeetingConfirmation {
  userId: number;
  rsvpStatus: 'pending' | 'accepted' | 'declined';
  attendanceStatus: 'none' | 'present' | 'late' | 'absent';
  reason?: string;
  respondedAt?: string;
}

export interface Meeting {
  id: number;
  title: string;
  location: string;
  meetingAt: string;
  endAt?: string;
  agenda?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  participantIds: number[];
  participants?: User[];
  isAllParticipants?: boolean;
  confirmations: MeetingConfirmation[];
  note?: string;
  createdBy: number;
  updatedBy?: number;
  // Minutes fields
  minutesContent?: string;
  chairpersonId?: number;
  secretaryId?: number;
  opinions?: string;
  proposals?: string;
  minutesStatus?: 'none' | 'draft' | 'submitted';
  
  // Sync fields
  attendanceUpdates?: Record<number, string>;
  presentIds?: number[];
  absentIds?: number[];
  
  createdAt: string;
  updatedAt: string;
}

class MeetingService extends BaseService<Meeting> {
  constructor() {
    super('meetings');
  }

  /**
   * Phản hồi lời mời họp (RSVP)
   */
  async rsvp(id: number, payload: { rsvpStatus: 'accepted' | 'declined'; reason?: string }) {
    return this.post(`/${id}/rsvp`, payload);
  }

  /**
   * Điểm danh cuộc họp
   */
  async markAttendance(data: { meetingId: number; userId: number; attendanceStatus: string; reason?: string }) {
    return this.post(`/attendance`, data);
  }

  /**
   * Cập nhật trạng thái cuộc họp
   */
  async setStatus(id: number, status: 'scheduled' | 'completed' | 'cancelled') {
    return this.patch(id, { status });
  }
}

export default new MeetingService();
