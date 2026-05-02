import { Pool } from 'pg';
import { AccountService } from '@services/accountService';
import { CaseService } from '@services/caseService';
import { ContactRoleService } from '@services/contactRoleService';
import { ContactService } from '@services/contactService';
import { DonationService } from '@services/donationService';
import { DonationDesignationService } from '@modules/donations/services/donationDesignationService';
import { TaskService } from '@services/taskService';
import { VolunteerService } from '@services/volunteerService';
import { EventService } from '@modules/events/services/eventService';
import { TaxReceiptService } from '@modules/donations/services/taxReceiptService';
import { RecurringDonationService } from '@modules/recurringDonations/services/recurringDonationService';

export interface EngagementProviders {
  readonly donation: DonationService;
  readonly donationDesignation: DonationDesignationService;
  readonly taxReceipt: TaxReceiptService;
  readonly recurringDonation: RecurringDonationService;
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
  let donationDesignationService: DonationDesignationService | null = null;
  let taxReceiptService: TaxReceiptService | null = null;
  let recurringDonationService: RecurringDonationService | null = null;
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
    get donationDesignation() {
      if (!donationDesignationService) {
        donationDesignationService = new DonationDesignationService(dbPool);
      }
      return donationDesignationService;
    },
    get taxReceipt() {
      if (!taxReceiptService) {
        taxReceiptService = new TaxReceiptService(dbPool);
      }
      return taxReceiptService;
    },
    get recurringDonation() {
      if (!recurringDonationService) {
        recurringDonationService = new RecurringDonationService(dbPool);
      }
      return recurringDonationService;
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
