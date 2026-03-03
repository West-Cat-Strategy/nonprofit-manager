import api from '../../../services/api';
import type {
  AssignmentMutationInput,
  PaginatedVolunteers,
  Volunteer,
  VolunteerAssignment,
  VolunteerMutationInput,
  VolunteersCatalogPort,
  VolunteersListQuery,
  VolunteersMutationPort,
} from '../types/contracts';

export class VolunteersApiClient implements VolunteersCatalogPort, VolunteersMutationPort {
  async listVolunteers(query: VolunteersListQuery = {}): Promise<PaginatedVolunteers> {
    const params: Record<string, string | number | boolean | undefined> = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      availability_status: query.availability_status,
      background_check_status: query.background_check_status,
      is_active: query.is_active,
    };

    if (query.skills && query.skills.length > 0) {
      params.skills = query.skills.join(',');
    }

    const response = await api.get<PaginatedVolunteers>('/v2/volunteers', { params });
    return response.data;
  }

  async getVolunteerById(volunteerId: string): Promise<Volunteer> {
    const response = await api.get<Volunteer>(`/v2/volunteers/${volunteerId}`);
    return response.data;
  }

  async findVolunteersBySkills(skills: string[]): Promise<Volunteer[]> {
    const response = await api.get<Volunteer[]>('/v2/volunteers/search/skills', {
      params: { skills: skills.join(',') },
    });
    return response.data;
  }

  async createVolunteer(payload: VolunteerMutationInput): Promise<Volunteer> {
    const response = await api.post<Volunteer>('/v2/volunteers', payload);
    return response.data;
  }

  async updateVolunteer(volunteerId: string, payload: VolunteerMutationInput): Promise<Volunteer> {
    const response = await api.put<Volunteer>(`/v2/volunteers/${volunteerId}`, payload);
    return response.data;
  }

  async deleteVolunteer(volunteerId: string): Promise<void> {
    await api.delete(`/v2/volunteers/${volunteerId}`);
  }

  async listAssignments(volunteerId: string): Promise<VolunteerAssignment[]> {
    const response = await api.get<VolunteerAssignment[]>(`/v2/volunteers/${volunteerId}/assignments`);
    return response.data;
  }

  async createAssignment(payload: AssignmentMutationInput): Promise<VolunteerAssignment> {
    const response = await api.post<VolunteerAssignment>('/v2/volunteers/assignments', payload);
    return response.data;
  }

  async updateAssignment(
    assignmentId: string,
    payload: AssignmentMutationInput
  ): Promise<VolunteerAssignment> {
    const response = await api.put<VolunteerAssignment>(`/v2/volunteers/assignments/${assignmentId}`, payload);
    return response.data;
  }
}

export const volunteersApiClient = new VolunteersApiClient();
