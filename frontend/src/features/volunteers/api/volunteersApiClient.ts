import api from '../../../services/api';
import type {
  AssignmentMutationInput,
  PaginatedVolunteers,
  Volunteer,
  VolunteerBackgroundCheckApprovalInput,
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

    const response = await api.get<PaginatedVolunteers>('/volunteers', { params });
    return response.data;
  }

  async getVolunteerById(volunteerId: string): Promise<Volunteer> {
    const response = await api.get<Volunteer>(`/volunteers/${volunteerId}`);
    return response.data;
  }

  async findVolunteersBySkills(skills: string[]): Promise<Volunteer[]> {
    const response = await api.get<Volunteer[]>('/volunteers/search/skills', {
      params: { skills: skills.join(',') },
    });
    return response.data;
  }

  async createVolunteer(payload: VolunteerMutationInput): Promise<Volunteer> {
    const response = await api.post<Volunteer>('/volunteers', payload);
    return response.data;
  }

  async updateVolunteer(volunteerId: string, payload: VolunteerMutationInput): Promise<Volunteer> {
    const response = await api.put<Volunteer>(`/volunteers/${volunteerId}`, payload);
    return response.data;
  }

  async approveVolunteerBackgroundCheck(
    volunteerId: string,
    payload: VolunteerBackgroundCheckApprovalInput
  ): Promise<Volunteer> {
    const response = await api.post<Volunteer>(
      `/volunteers/${volunteerId}/background-check/approve`,
      payload
    );
    return response.data;
  }

  async deleteVolunteer(volunteerId: string): Promise<void> {
    await api.delete(`/volunteers/${volunteerId}`);
  }

  async listAssignments(volunteerId: string): Promise<VolunteerAssignment[]> {
    const response = await api.get<VolunteerAssignment[]>(`/volunteers/${volunteerId}/assignments`);
    return response.data;
  }

  async createAssignment(payload: AssignmentMutationInput): Promise<VolunteerAssignment> {
    const response = await api.post<VolunteerAssignment>('/volunteers/assignments', payload);
    return response.data;
  }

  async updateAssignment(
    assignmentId: string,
    payload: AssignmentMutationInput
  ): Promise<VolunteerAssignment> {
    const response = await api.put<VolunteerAssignment>(`/volunteers/assignments/${assignmentId}`, payload);
    return response.data;
  }
}

export const volunteersApiClient = new VolunteersApiClient();
