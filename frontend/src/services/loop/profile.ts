import type { UserProfile } from '../../types/schema';
import { delay, SIMULATED_LATENCY } from './latency';

export const getUserProfile = async (): Promise<UserProfile> => {
  await delay(SIMULATED_LATENCY);

  const mockProfile: UserProfile = {
    firstName: 'Sora',
    lastName: 'Keyblade',
    email: 'sora@destinyislands.org',
    emailSharedWithClients: false,
    emailSharedWithUsers: true,
    displayName: 'Sora K.',
    alternativeName: '',
    pronouns: 'he/him',
    title: 'Executive Director',
    cellPhone: '(555) 001-0001',
    profilePicture: null,
    notifications: {
      emailNotifications: true,
      taskReminders: true,
      weeklySummaries: true,
      newRegistrations: false,
      donationAlerts: true,
      marketingEmails: false,
    },
  };

  console.log('[LoopApiService] getUserProfile:', mockProfile);
  return mockProfile;
};

export const updateUserProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  await delay(SIMULATED_LATENCY);

  console.log('[LoopApiService] updateUserProfile:', data);

  return {
    ...(await getUserProfile()),
    ...data,
  };
};
