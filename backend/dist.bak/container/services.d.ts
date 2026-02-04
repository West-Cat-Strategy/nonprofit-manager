/**
 * Service Container
 * Centralized dependency injection container for all services
 *
 * This provides a single location for service instantiation, making it easy to:
 * 1. Swap implementations for testing
 * 2. Manage service lifecycles
 * 3. Share database connections
 */
import { Pool } from 'pg';
import { DonationService } from '../services/donationService';
import { TaskService } from '../services/taskService';
import { CaseService } from '../services/caseService';
import { EventService } from '../services/eventService';
import { AccountService } from '../services/accountService';
import { ContactService } from '../services/contactService';
import { VolunteerService } from '../services/volunteerService';
import { ContactRoleService } from '../services/contactRoleService';
/**
 * Service container interface
 */
export interface ServiceContainer {
    readonly pool: Pool;
    readonly donation: DonationService;
    readonly task: TaskService;
    readonly case: CaseService;
    readonly event: EventService;
    readonly account: AccountService;
    readonly contact: ContactService;
    readonly volunteer: VolunteerService;
    readonly contactRole: ContactRoleService;
}
/**
 * Create a service container with the given database pool
 * This allows for easy testing by injecting a mock pool
 */
export declare function createServiceContainer(dbPool?: Pool): ServiceContainer;
/**
 * Default service container instance
 * Use this for production code
 */
export declare const services: ServiceContainer;
/**
 * Type helper for getting service types
 */
export type Services = typeof services;
//# sourceMappingURL=services.d.ts.map