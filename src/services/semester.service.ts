import BaseService from './base.service';

export interface Semester {
  id: number;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  note?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

class SemesterService extends BaseService<Semester> {
  constructor() {
    super('/semesters');
  }

  async setCurrent(id: number) {
    return await this.patchRequest(`${id}/set-current`, {});
  }
}

export default new SemesterService();
