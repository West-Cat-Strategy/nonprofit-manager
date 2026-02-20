export interface OrganizationConfig {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  timezone: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;
  measurementSystem: 'metric' | 'imperial';
  phoneFormat: 'canadian' | 'us' | 'international';
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
  created_at: string;
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

export type SaveStatus = 'idle' | 'success' | 'error';
