/**
 * Volunteer Service
 * Handles business logic and database operations for volunteers
 */
import { Pool } from 'pg';
import { Volunteer, CreateVolunteerDTO, UpdateVolunteerDTO, VolunteerFilters, PaginationParams, PaginatedVolunteers, VolunteerAssignment, CreateAssignmentDTO, UpdateAssignmentDTO, AssignmentFilters } from '../types/volunteer';
import type { DataScopeFilter } from '../types/dataScope';
export declare class VolunteerService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all volunteers with filtering and pagination
     */
    getVolunteers(filters?: VolunteerFilters, pagination?: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedVolunteers>;
    /**
     * Get volunteer by ID
     */
    getVolunteerById(volunteerId: string, scope?: DataScopeFilter): Promise<Volunteer | null>;
    /**
     * Create new volunteer
     */
    createVolunteer(data: CreateVolunteerDTO, userId: string): Promise<Volunteer>;
    /**
     * Update volunteer
     */
    updateVolunteer(volunteerId: string, data: UpdateVolunteerDTO, userId: string): Promise<Volunteer | null>;
    /**
     * Soft delete volunteer
     */
    deleteVolunteer(volunteerId: string, userId: string): Promise<boolean>;
    /**
     * Find volunteers by skills (skill matching algorithm)
     */
    findVolunteersBySkills(requiredSkills: string[]): Promise<Volunteer[]>;
    /**
     * Get volunteer assignments
     */
    getVolunteerAssignments(filters?: AssignmentFilters): Promise<VolunteerAssignment[]>;
    /**
     * Create volunteer assignment
     */
    createAssignment(data: CreateAssignmentDTO, userId: string): Promise<VolunteerAssignment>;
    /**
     * Update assignment (including logging hours)
     */
    updateAssignment(assignmentId: string, data: UpdateAssignmentDTO, userId: string): Promise<VolunteerAssignment | null>;
}
//# sourceMappingURL=volunteerService.d.ts.map