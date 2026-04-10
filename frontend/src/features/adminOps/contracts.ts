import type { MessageSendState } from '../messaging/types';
import type { WorkspaceModuleSettings } from '../workspaceModules/catalog';

export interface OrganizationAddress {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface OrganizationTaxReceiptSettings {
  legalName: string;
  charitableRegistrationNumber: string;
  receiptingAddress: OrganizationAddress;
  receiptIssueLocation: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  contactEmail: string;
  contactPhone: string;
  advantageAmount: number;
}

export interface OrganizationConfig {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: OrganizationAddress;
  timezone: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;
  measurementSystem: 'metric' | 'imperial';
  phoneFormat: 'canadian' | 'us' | 'international';
  taxReceipt: OrganizationTaxReceiptSettings;
  workspaceModules: WorkspaceModuleSettings;
}

export interface OrganizationSettings {
  organizationId: string;
  config: OrganizationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserSecurityInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastPasswordChange: string | null;
  failedLoginAttempts: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  isRevoked: boolean;
  message: string | null;
  createdAt: string;
  createdByName?: string;
}

export interface PortalSignupRequest {
  id: string;
  email: string;
  status: string;
  requested_at: string;
  reviewed_at?: string | null;
  contact_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface PortalInvitation {
  id: string;
  email: string;
  contact_id?: string | null;
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
}

export interface PortalUser {
  id: string;
  email: string;
  status: string;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  contact_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface PortalActivity {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface PortalContactLookup {
  contact_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PortalConversationMessage {
  id: string;
  sender_type: 'portal' | 'staff' | 'system';
  sender_display_name: string | null;
  message_text: string;
  is_internal: boolean;
  client_message_id?: string | null;
  created_at: string;
  send_state?: MessageSendState;
  send_error?: string | null;
  optimistic?: boolean;
}

export interface PortalConversationThread {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_id: string | null;
  case_number: string | null;
  case_title: string | null;
  pointperson_user_id: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  portal_email: string | null;
  unread_count: number;
  last_message_at: string;
}

export interface PortalConversationDetail {
  thread: PortalConversationThread;
  messages: PortalConversationMessage[];
}

export interface PortalAppointmentSlot {
  id: string;
  pointperson_user_id: string;
  case_id: string | null;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_count: number;
  status: 'open' | 'closed' | 'cancelled';
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
}

export interface PortalAdminAppointmentInboxItem {
  id: string;
  contact_id: string;
  case_id: string | null;
  pointperson_user_id: string | null;
  slot_id: string | null;
  request_type: 'manual_request' | 'slot_booking';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  portal_user_id?: string | null;
  portal_email?: string | null;
  next_reminder_at?: string | null;
  pending_reminder_jobs?: number;
  last_reminder_sent_at?: string | null;
}

export interface PortalAdminAppointmentReminderJob {
  id: string;
  appointment_id: string;
  cadence_key: '24h' | '2h';
  channel: 'email' | 'sms';
  scheduled_for: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped' | 'cancelled';
  processing_started_at: string | null;
  attempt_count: number;
  last_error: string | null;
  cancelled_reason: string | null;
}

export interface PortalAdminAppointmentReminderDelivery {
  id: string;
  appointment_id: string;
  job_id: string | null;
  channel: 'email' | 'sms';
  trigger_type: 'manual' | 'automated';
  recipient: string;
  delivery_status: 'sent' | 'failed' | 'skipped';
  error_message: string | null;
  message_preview: string | null;
  sent_by: string | null;
  sent_at: string;
}

export interface PortalAdminAppointmentReminderHistory {
  jobs: PortalAdminAppointmentReminderJob[];
  deliveries: PortalAdminAppointmentReminderDelivery[];
}

export type SaveStatus = 'idle' | 'success' | 'error';
