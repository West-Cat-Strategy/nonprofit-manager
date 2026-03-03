import { services } from '@container/services';
import type {
  AssignmentFilters,
  CreateAssignmentDTO,
  CreateVolunteerDTO,
  PaginatedVolunteers,
  PaginationParams,
  UpdateAssignmentDTO,
  UpdateVolunteerDTO,
  Volunteer,
  VolunteerAssignment,
  VolunteerFilters,
} from '@app-types/volunteer';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { VolunteerCatalogPort, VolunteerLifecyclePort } from '../types/ports';

export class VolunteerRepository implements VolunteerCatalogPort, VolunteerLifecyclePort {
  getVolunteers(
    filters: VolunteerFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedVolunteers> {
    return services.volunteer.getVolunteers(filters, pagination, scope);
  }

  getVolunteerById(volunteerId: string, scope?: DataScopeFilter): Promise<Volunteer | null> {
    return services.volunteer.getVolunteerById(volunteerId, scope);
  }

  findVolunteersBySkills(requiredSkills: string[]): Promise<Volunteer[]> {
    return services.volunteer.findVolunteersBySkills(requiredSkills);
  }

  getVolunteerAssignments(filters: AssignmentFilters): Promise<VolunteerAssignment[]> {
    return services.volunteer.getVolunteerAssignments(filters);
  }

  createVolunteer(payload: CreateVolunteerDTO, userId: string): Promise<Volunteer> {
    return services.volunteer.createVolunteer(payload, userId);
  }

  updateVolunteer(
    volunteerId: string,
    payload: UpdateVolunteerDTO,
    userId: string
  ): Promise<Volunteer | null> {
    return services.volunteer.updateVolunteer(volunteerId, payload, userId);
  }

  deleteVolunteer(volunteerId: string, userId: string): Promise<boolean> {
    return services.volunteer.deleteVolunteer(volunteerId, userId);
  }

  createAssignment(payload: CreateAssignmentDTO, userId: string): Promise<VolunteerAssignment> {
    return services.volunteer.createAssignment(payload, userId);
  }

  updateAssignment(
    assignmentId: string,
    payload: UpdateAssignmentDTO,
    userId: string
  ): Promise<VolunteerAssignment | null> {
    return services.volunteer.updateAssignment(assignmentId, payload, userId);
  }
}
