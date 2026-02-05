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

export type SaveStatus = 'idle' | 'success' | 'error';
