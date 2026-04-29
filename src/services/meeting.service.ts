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
  confirmations: MeetingConfirmation[];
  note?: string;
  createdBy: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

class MeetingService extends BaseService<Meeting> {
  constructor() {
    super('meetings');
  }

  async rsvp(id: number, payload: { status: 'accepted' | 'declined'; reason?: string }) {
    return this.postRequest(`${this.endpoint}/${id}/rsvp`, payload);
  }

  async setStatus(id: number, status: 'scheduled' | 'completed' | 'cancelled') {
    return this.patchRequest(`${this.endpoint}/${id}`, { status });
  }
}

export default new MeetingService();
