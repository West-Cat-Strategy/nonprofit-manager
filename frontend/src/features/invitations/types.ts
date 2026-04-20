export interface StaffInvitation {
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

export interface InvitationEmailDelivery {
  requested: boolean;
  sent: boolean;
  reason?: string;
}
