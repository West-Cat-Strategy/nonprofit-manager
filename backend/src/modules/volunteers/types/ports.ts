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

export interface VolunteerCatalogPort {
  getVolunteers(
    filters?: VolunteerFilters,
    pagination?: PaginationParams,
    scope?: DataScopeFilter
  ): Promise<PaginatedVolunteers>;
  getVolunteerById(volunteerId: string, scope?: DataScopeFilter): Promise<Volunteer | null>;
  findVolunteersBySkills(requiredSkills: string[]): Promise<Volunteer[]>;
  getVolunteerAssignments(filters: AssignmentFilters): Promise<VolunteerAssignment[]>;
}

export interface VolunteerLifecyclePort {
  createVolunteer(payload: CreateVolunteerDTO, userId: string): Promise<Volunteer>;
  updateVolunteer(
    volunteerId: string,
    payload: UpdateVolunteerDTO,
    userId: string
  ): Promise<Volunteer | null>;
  deleteVolunteer(volunteerId: string, userId: string): Promise<boolean>;
  createAssignment(payload: CreateAssignmentDTO, userId: string): Promise<VolunteerAssignment>;
  updateAssignment(
    assignmentId: string,
    payload: UpdateAssignmentDTO,
    userId: string
  ): Promise<VolunteerAssignment | null>;
}
