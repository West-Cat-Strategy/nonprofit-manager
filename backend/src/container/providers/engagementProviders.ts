import { Pool } from 'pg';
import {
  AccountService,
  CaseService,
  ContactRoleService,
  ContactService,
  DonationService,
  EventService,
  TaskService,
  VolunteerService,
} from '@services/domains/engagement';

export interface EngagementProviders {
  readonly donation: DonationService;
  readonly task: TaskService;
  readonly case: CaseService;
  readonly event: EventService;
  readonly account: AccountService;
  readonly contact: ContactService;
  readonly volunteer: VolunteerService;
  readonly contactRole: ContactRoleService;
}

export function createEngagementProviders(dbPool: Pool): EngagementProviders {
  let donationService: DonationService | null = null;
  let taskService: TaskService | null = null;
  let caseService: CaseService | null = null;
  let eventService: EventService | null = null;
  let accountService: AccountService | null = null;
  let contactService: ContactService | null = null;
  let volunteerService: VolunteerService | null = null;
  let contactRoleService: ContactRoleService | null = null;

  return {
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
