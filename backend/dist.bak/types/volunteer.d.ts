/**
 * Volunteer Type Definitions
 * Extends Contact entity with volunteer-specific fields
 */
export declare enum AvailabilityStatus {
    AVAILABLE = "available",
    UNAVAILABLE = "unavailable",
    LIMITED = "limited"
}
export declare enum BackgroundCheckStatus {
    NOT_REQUIRED = "not_required",
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    APPROVED = "approved",
    REJECTED = "rejected",
    EXPIRED = "expired"
}
export interface Volunteer {
    volunteer_id: string;
    contact_id: string;
    skills: string[];
    availability_status: AvailabilityStatus;
    availability_notes: string | null;
    background_check_status: BackgroundCheckStatus;
    background_check_date: Date | null;
    background_check_expiry: Date | null;
    preferred_roles: string[] | null;
    max_hours_per_week: number | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    volunteer_since: Date;
    total_hours_logged: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    created_by: string;
    modified_by: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    mobile_phone?: string;
}
export interface CreateVolunteerDTO {
    contact_id: string;
    skills?: string[];
    availability_status?: AvailabilityStatus;
    availability_notes?: string;
    background_check_status?: BackgroundCheckStatus;
    background_check_date?: Date;
    background_check_expiry?: Date;
    preferred_roles?: string[];
    max_hours_per_week?: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
}
export interface UpdateVolunteerDTO {
    skills?: string[];
    availability_status?: AvailabilityStatus;
    availability_notes?: string;
    background_check_status?: BackgroundCheckStatus;
    background_check_date?: Date;
    background_check_expiry?: Date;
    preferred_roles?: string[];
    max_hours_per_week?: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    is_active?: boolean;
}
export interface VolunteerFilters {
    search?: string;
    skills?: string[];
    availability_status?: AvailabilityStatus;
    background_check_status?: BackgroundCheckStatus;
    is_active?: boolean;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
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
export interface VolunteerAssignment {
    assignment_id: string;
    volunteer_id: string;
    event_id: string | null;
    task_id: string | null;
    assignment_type: 'event' | 'task' | 'general';
    role: string | null;
    start_time: Date;
    end_time: Date | null;
    hours_logged: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    created_by: string;
    modified_by: string;
    volunteer_name?: string;
    event_name?: string;
    task_name?: string;
}
export interface CreateAssignmentDTO {
    volunteer_id: string;
    event_id?: string;
    task_id?: string;
    assignment_type: 'event' | 'task' | 'general';
    role?: string;
    start_time: Date;
    end_time?: Date;
    notes?: string;
}
export interface UpdateAssignmentDTO {
    role?: string;
    start_time?: Date;
    end_time?: Date;
    hours_logged?: number;
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
}
export interface AssignmentFilters {
    volunteer_id?: string;
    event_id?: string;
    task_id?: string;
    assignment_type?: 'event' | 'task' | 'general';
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    start_date?: Date;
    end_date?: Date;
}
//# sourceMappingURL=volunteer.d.ts.map