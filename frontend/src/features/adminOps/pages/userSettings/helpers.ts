import type { UserProfile, UserProfileFallback } from './types';

export const pronounOptions = [
  { value: '', label: 'Prefer not to say' },
  { value: 'he/him', label: 'He/Him' },
  { value: 'she/her', label: 'She/Her' },
  { value: 'they/them', label: 'They/Them' },
  { value: 'he/they', label: 'He/They' },
  { value: 'she/they', label: 'She/They' },
  { value: 'custom', label: 'Custom (specify below)' },
];

export const MAX_IMAGE_DIMENSION = 400;
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const serializeUserProfile = (profile: UserProfile, customPronouns: string): string =>
  JSON.stringify({
    ...profile,
    pronouns: profile.pronouns === 'custom' ? customPronouns : profile.pronouns,
  });

export const buildUserProfile = (
  data: Partial<UserProfile> | null | undefined,
  fallbackUser?: UserProfileFallback
): {
  profile: UserProfile;
  customPronouns: string;
  previewImage: string | null;
} => {
  const pronouns = data?.pronouns || '';
  const customPronouns =
    pronouns && !pronounOptions.find((option) => option.value === pronouns) ? pronouns : '';
  const normalizedPronouns = customPronouns ? 'custom' : pronouns;
  const profilePicture = data?.profilePicture || null;

  return {
    profile: {
      firstName: data?.firstName || fallbackUser?.firstName || '',
      lastName: data?.lastName || fallbackUser?.lastName || '',
      email: data?.email || fallbackUser?.email || '',
      emailSharedWithClients: data?.emailSharedWithClients || false,
      emailSharedWithUsers: data?.emailSharedWithUsers !== false,
      alternativeEmails: data?.alternativeEmails || [],
      displayName: data?.displayName || '',
      alternativeName: data?.alternativeName || '',
      pronouns: normalizedPronouns,
      title: data?.title || '',
      cellPhone: data?.cellPhone || '',
      contactNumber: data?.contactNumber || '',
      profilePicture,
      notifications: data?.notifications || {
        emailNotifications: true,
        taskReminders: true,
        eventReminders: true,
        donationAlerts: true,
        caseUpdates: true,
        weeklyDigest: false,
        marketingEmails: false,
      },
    },
    customPronouns,
    previewImage: profilePicture,
  };
};

export const resizeImage = (file: File, maxDimension: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
