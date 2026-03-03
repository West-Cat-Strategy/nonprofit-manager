import type {
  AssignmentFilters,
  PaginatedVolunteers,
  PaginationParams,
  Volunteer,
  VolunteerAssignment,
  VolunteerFilters,
} from '@app-types/volunteer';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { VolunteerCatalogPort } from '../types/ports';

export class VolunteerCatalogUseCase {
  constructor(private readonly repository: VolunteerCatalogPort) {}

  list(
    filters: VolunteerFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedVolunteers> {
    return this.repository.getVolunteers(filters, pagination, scope);
  }

  getById(volunteerId: string, scope?: DataScopeFilter): Promise<Volunteer | null> {
    return this.repository.getVolunteerById(volunteerId, scope);
  }

  findBySkills(requiredSkills: string[]): Promise<Volunteer[]> {
    return this.repository.findVolunteersBySkills(requiredSkills);
  }

  listAssignments(filters: AssignmentFilters): Promise<VolunteerAssignment[]> {
    return this.repository.getVolunteerAssignments(filters);
  }
}
