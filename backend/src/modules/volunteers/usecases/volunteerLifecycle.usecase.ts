import type {
  CreateAssignmentDTO,
  CreateVolunteerDTO,
  UpdateAssignmentDTO,
  UpdateVolunteerDTO,
  Volunteer,
  VolunteerAssignment,
} from '@app-types/volunteer';
import type { VolunteerLifecyclePort } from '../types/ports';

export class VolunteerLifecycleUseCase {
  constructor(private readonly repository: VolunteerLifecyclePort) {}

  create(payload: CreateVolunteerDTO, userId: string): Promise<Volunteer> {
    return this.repository.createVolunteer(payload, userId);
  }

  update(
    volunteerId: string,
    payload: UpdateVolunteerDTO,
    userId: string
  ): Promise<Volunteer | null> {
    return this.repository.updateVolunteer(volunteerId, payload, userId);
  }

  delete(volunteerId: string, userId: string): Promise<boolean> {
    return this.repository.deleteVolunteer(volunteerId, userId);
  }

  createAssignment(payload: CreateAssignmentDTO, userId: string): Promise<VolunteerAssignment> {
    return this.repository.createAssignment(payload, userId);
  }

  updateAssignment(
    assignmentId: string,
    payload: UpdateAssignmentDTO,
    userId: string
  ): Promise<VolunteerAssignment | null> {
    return this.repository.updateAssignment(assignmentId, payload, userId);
  }
}
