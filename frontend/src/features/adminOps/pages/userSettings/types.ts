export interface AlternativeEmail {
  email: string;
  label: string;
  isVerified: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  donationAlerts: boolean;
  caseUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  emailSharedWithClients: boolean;
  emailSharedWithUsers: boolean;
  alternativeEmails: AlternativeEmail[];
  displayName: string;
  alternativeName: string;
  pronouns: string;
  title: string;
  cellPhone: string;
  contactNumber: string;
  profilePicture: string | null;
  notifications: NotificationSettings;
}

export interface PasskeyInfo {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface SecurityOverview {
  totpEnabled: boolean;
  passkeys: PasskeyInfo[];
}

export interface UserProfileFallback {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}
