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

export interface PortalInvitation {
  id: string;
  email: string;
  contact_id?: string | null;
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
}
