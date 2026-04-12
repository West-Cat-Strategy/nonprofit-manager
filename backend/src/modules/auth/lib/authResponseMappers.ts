<<<<<<< HEAD
import { normalizeRoleSlug } from '@utils/roleSlug';
=======
>>>>>>> origin/main
import type { NotificationSettings, ProfileRow } from './authQueries';

type AuthUserInput = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
};

export const mapAuthUser = (
  user: AuthUserInput,
  options?: { includeLegacyUserId?: boolean }
): {
  id: string;
  user_id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture: string | null;
} => {
  const response: {
    id: string;
    user_id?: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture: string | null;
  } = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
<<<<<<< HEAD
    role: normalizeRoleSlug(user.role) ?? user.role,
=======
    role: user.role,
>>>>>>> origin/main
    profilePicture: user.profile_picture || null,
  };

  if (options?.includeLegacyUserId) {
    response.user_id = user.id;
  }

  return response;
};

export const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  taskReminders: true,
  eventReminders: true,
  donationAlerts: true,
  caseUpdates: true,
  weeklyDigest: false,
  marketingEmails: false,
};

export const mapProfile = (user: ProfileRow) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
<<<<<<< HEAD
  role: normalizeRoleSlug(user.role) ?? user.role,
=======
  role: user.role,
>>>>>>> origin/main
  displayName: user.display_name || '',
  alternativeName: user.alternative_name || '',
  pronouns: user.pronouns || '',
  title: user.title || '',
  cellPhone: user.cell_phone || '',
  contactNumber: user.contact_number || '',
  profilePicture: user.profile_picture || null,
  emailSharedWithClients: user.email_shared_with_clients || false,
  emailSharedWithUsers: user.email_shared_with_users || false,
  alternativeEmails: user.alternative_emails || [],
  notifications: user.notifications || defaultNotificationSettings,
});
