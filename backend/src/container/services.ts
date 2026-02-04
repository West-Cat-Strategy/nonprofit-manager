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
import pool from '../config/database';

// Service imports
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
export function createServiceContainer(dbPool: Pool = pool): ServiceContainer {
  // Cache service instances for reuse
  let donationService: DonationService | null = null;
  let taskService: TaskService | null = null;
  let caseService: CaseService | null = null;
  let eventService: EventService | null = null;
  let accountService: AccountService | null = null;
  let contactService: ContactService | null = null;
  let volunteerService: VolunteerService | null = null;
  let contactRoleService: ContactRoleService | null = null;

  return {
    get pool() {
      return dbPool;
    },

    get donation() {
      if (!donationService) {
        donationService = new DonationService(dbPool);
      }
      return donationService;
    },

    get task() {
      if (!taskService) {
        taskService = new TaskService(dbPool);
      }
      return taskService;
    },

    get case() {
      if (!caseService) {
        caseService = new CaseService(dbPool);
      }
      return caseService;
    },

    get event() {
      if (!eventService) {
        eventService = new EventService(dbPool);
      }
      return eventService;
    },

    get account() {
      if (!accountService) {
        accountService = new AccountService(dbPool);
      }
      return accountService;
    },

    get contact() {
      if (!contactService) {
        contactService = new ContactService(dbPool);
      }
      return contactService;
    },

    get volunteer() {
      if (!volunteerService) {
        volunteerService = new VolunteerService(dbPool);
      }
      return volunteerService;
    },

    get contactRole() {
      if (!contactRoleService) {
        contactRoleService = new ContactRoleService(dbPool);
      }
      return contactRoleService;
    },
  };
}

/**
 * Default service container instance
 * Use this for production code
 */
export const services = createServiceContainer();

/**
 * Type helper for getting service types
 */
export type Services = typeof services;
