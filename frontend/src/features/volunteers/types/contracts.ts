export interface Volunteer {
  volunteer_id: string;
  contact_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  skills: string[];
  availability_status: 'available' | 'unavailable' | 'limited';
  availability_notes: string | null;
  background_check_status:
    | 'not_required'
    | 'pending'
    | 'in_progress'
    | 'approved'
    | 'rejected'
    | 'expired';
  background_check_date: string | null;
  background_check_expiry: string | null;
  preferred_roles: string[] | null;
  max_hours_per_week: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  volunteer_since: string;
  total_hours_logged: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerAssignment {
  assignment_id: string;
  volunteer_id: string;
  event_id: string | null;
  task_id: string | null;
  assignment_type: 'event' | 'task' | 'general';
  role: string | null;
  start_time: string;
  end_time: string | null;
  hours_logged: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  volunteer_name?: string;
  event_name?: string;
  task_name?: string;
}

export interface VolunteersListQuery {
  page?: number;
  limit?: number;
  search?: string;
  skills?: string[];
  availability_status?: string;
  background_check_status?: string;
  is_active?: boolean;
}

export interface PaginatedVolunteers {
  data: Volunteer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export type VolunteerMutationInput = Partial<Volunteer>;
export type AssignmentMutationInput = Partial<VolunteerAssignment>;

export interface VolunteersCatalogPort {
  listVolunteers(query?: VolunteersListQuery): Promise<PaginatedVolunteers>;
  getVolunteerById(volunteerId: string): Promise<Volunteer>;
  findVolunteersBySkills(skills: string[]): Promise<Volunteer[]>;
  listAssignments(volunteerId: string): Promise<VolunteerAssignment[]>;
}

export interface VolunteersMutationPort {
  createVolunteer(payload: VolunteerMutationInput): Promise<Volunteer>;
  updateVolunteer(volunteerId: string, payload: VolunteerMutationInput): Promise<Volunteer>;
  deleteVolunteer(volunteerId: string): Promise<void>;
  createAssignment(payload: AssignmentMutationInput): Promise<VolunteerAssignment>;
  updateAssignment(assignmentId: string, payload: AssignmentMutationInput): Promise<VolunteerAssignment>;
}
