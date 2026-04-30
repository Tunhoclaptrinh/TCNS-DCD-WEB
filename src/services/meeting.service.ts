import { User } from '@/types';
import BaseService from './base.service';

export interface MeetingConfirmation {
  userId: number;
  status: 'pending' | 'accepted' | 'declined' | 'present' | 'late' | 'absent';
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
  attendanceUpdates?: Record<number, string>; // Temporary field for batch attendance sync
  presentIds?: number[]; // For minutes sync
  absentIds?: number[]; // For minutes sync
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
  async rsvp(id: number, payload: { status: 'accepted' | 'declined'; reason?: string }) {
    return this.post(`/${id}/rsvp`, payload);
  }

  /**
   * Điểm danh cuộc họp
   */
  async markAttendance(data: { meetingId: number; userId: number; status: string; reason?: string }) {
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
