/**
 * User Settings Page - SMB3 "Backstage" Aesthetic
 * Dark background, vibrant props, heavy shadows
 * 
 * Phase 1: Uses LoopApiService for profile management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateUser } from '../../store/slices/authSlice';
import api from '../../services/api';
import LoopApiService from '../../services/LoopApiService';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import ThemeSelector from '../../components/ThemeSelector';
import { useTheme } from '../../contexts/ThemeContext';
import ErrorBanner from '../../components/ErrorBanner';
import { useApiError } from '../../hooks/useApiError';

interface AlternativeEmail {
  email: string;
  label: string;
  isVerified: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  donationAlerts: boolean;
  caseUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

interface UserProfile {
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

interface PasskeyInfo {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface SecurityOverview {
  totpEnabled: boolean;
  passkeys: PasskeyInfo[];
}

const pronounOptions = [
  { value: '', label: 'Prefer not to say' },
  { value: 'he/him', label: 'He/Him' },
  { value: 'she/her', label: 'She/Her' },
  { value: 'they/them', label: 'They/Them' },
  { value: 'he/they', label: 'He/They' },
  { value: 'she/they', label: 'She/They' },
  { value: 'custom', label: 'Custom (specify below)' },
];

const MAX_IMAGE_DIMENSION = 400; // Maximum width/height for resized image
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB upload limit

/**
 * Resize an image to fit within max dimensions while maintaining aspect ratio
 */
const resizeImage = (file: File, maxDimension: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with quality optimization
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(resizedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function UserSettings() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    emailSharedWithClients: false,
    emailSharedWithUsers: true,
    alternativeEmails: [],
    displayName: '',
    alternativeName: '',
    pronouns: '',
    title: '',
    cellPhone: '',
    contactNumber: '',
    profilePicture: null,
    notifications: {
      emailNotifications: true,
      taskReminders: true,
      eventReminders: true,
      donationAlerts: true,
      caseUpdates: true,
      weeklyDigest: false,
      marketingEmails: false,
    },
  });

  const [customPronouns, setCustomPronouns] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const {
    error: errorMessage,
    setFromError: setErrorMessageFromError,
    clear: clearErrorMessage,
  } = useApiError();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  useTheme();

  // Visual-only state for field visibility (not persisted per instructions)
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({
    firstName: true,
    lastName: true,
    displayName: true,
    alternativeName: true,
    title: true,
    cellPhone: true
  });

  const toggleFieldVisibility = (field: string) => {
    setFieldVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const [security, setSecurity] = useState<SecurityOverview>({ totpEnabled: false, passkeys: [] });
  const [securityLoading, setSecurityLoading] = useState(true);
  const {
    error: securityError,
    details: securityDetails,
    setFromError: setSecurityErrorFromError,
    clear: clearSecurityError,
  } = useApiError();

  // TOTP setup timeout (5 minutes)
  const TOTP_SETUP_TIMEOUT_MS = 5 * 60 * 1000;

  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string | null;
  } | null>(null);
  const [totpSetupExpiresAt, setTotpSetupExpiresAt] = useState<number | null>(null);
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState<number>(0);
  const [totpEnableCode, setTotpEnableCode] = useState('');
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [securityActionLoading, setSecurityActionLoading] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');

  const refreshSecurity = useCallback(async () => {
    clearSecurityError();
    try {
      const response = await api.get<{ totpEnabled: boolean; passkeys: PasskeyInfo[] }>('/auth/security');
      setSecurity(response.data);
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to load security settings');
    } finally {
      setSecurityLoading(false);
    }
  }, [clearSecurityError, setSecurityErrorFromError]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Use LoopApiService to fetch profile
        const data = await LoopApiService.getUserProfile();
        setProfile({
          firstName: data.firstName || user?.firstName || '',
          lastName: data.lastName || user?.lastName || '',
          email: data.email || user?.email || '',
          emailSharedWithClients: data.emailSharedWithClients || false,
          emailSharedWithUsers: data.emailSharedWithUsers !== false,
          alternativeEmails: data.alternativeEmails || [],
          displayName: data.displayName || '',
          alternativeName: data.alternativeName || '',
          pronouns: data.pronouns || '',
          title: data.title || '',
          cellPhone: data.cellPhone || '',
          contactNumber: data.contactNumber || '',
          profilePicture: data.profilePicture || null,
          notifications: data.notifications || {
            emailNotifications: true,
            taskReminders: true,
            eventReminders: true,
            donationAlerts: true,
            caseUpdates: true,
            weeklyDigest: false,
            marketingEmails: false,
          },
        });
        if (data.pronouns && !pronounOptions.find(p => p.value === data.pronouns)) {
          setCustomPronouns(data.pronouns);
          setProfile(prev => ({ ...prev, pronouns: 'custom' }));
        }
        if (data.profilePicture) {
          setPreviewImage(data.profilePicture);
        }
      } catch {
        // Use defaults from auth state if fetch fails
        if (user) {
          setProfile(prev => ({
            ...prev,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
          }));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    refreshSecurity();
  }, [refreshSecurity]);

  // TOTP setup expiration countdown
  useEffect(() => {
    if (!totpSetupExpiresAt) {
      setTotpSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((totpSetupExpiresAt - Date.now()) / 1000));
      setTotpSecondsRemaining(remaining);

      if (remaining === 0) {
        // Auto-clear setup on expiry
        setTotpSetup(null);
        setTotpSetupExpiresAt(null);
        setTotpEnableCode('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [totpSetupExpiresAt]);

  const handleChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setProfile((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessageFromError(
        new Error('Please upload an image file (JPG, PNG, GIF)'),
        'Please upload an image file (JPG, PNG, GIF)'
      );
      setSaveStatus('error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessageFromError(new Error('Image must be less than 20MB'), 'Image must be less than 20MB');
      setSaveStatus('error');
      return;
    }

    setIsProcessingImage(true);
    setSaveStatus('idle');
    clearErrorMessage();

    try {
      // Always resize to optimize storage and performance
      const resizedBase64 = await resizeImage(file, MAX_IMAGE_DIMENSION);
      setPreviewImage(resizedBase64);
      setProfile(prev => ({ ...prev, profilePicture: resizedBase64 }));
    } catch (err) {
      setErrorMessageFromError(
        new Error('Failed to process image. Please try another file.'),
        'Failed to process image. Please try another file.'
      );
      setSaveStatus('error');
      console.error('Image processing error:', err);
    } finally {
      setIsProcessingImage(false);
    }
  }, [clearErrorMessage, setErrorMessageFromError]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setProfile(prev => ({ ...prev, profilePicture: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    clearErrorMessage();

    try {
      const pronounsToSave = profile.pronouns === 'custom' ? customPronouns : profile.pronouns;
      const payload = {
        ...profile,
        pronouns: pronounsToSave,
      };

      // Use LoopApiService instead of direct API call
      await LoopApiService.updateUserProfile(payload);

      // Update the auth state with new user info
      dispatch(updateUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        profilePicture: profile.profilePicture,
      }));

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setErrorMessageFromError(err, 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Password change functionality - Currently disabled in UI
  // TODO: Implement via LoopApiService in Phase 2
  /*
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus('idle');
    setPasswordError('');

    try {
      // TODO: Implement LoopApiService.updatePassword()
      await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordStatus('success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
      setTimeout(() => setPasswordStatus('idle'), 3000);
  */

  const handleStartTotpSetup = async () => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      const response = await api.post<{ secret: string; otpauthUrl: string }>('/auth/2fa/totp/enroll');
      const { secret, otpauthUrl } = response.data;
      const qrcode = await import('qrcode');
      const qrDataUrl = await qrcode.toDataURL(otpauthUrl, { margin: 1, width: 192 });
      setTotpSetup({ secret, otpauthUrl, qrDataUrl });
      setTotpSetupExpiresAt(Date.now() + TOTP_SETUP_TIMEOUT_MS);
      setTotpEnableCode('');
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to start 2FA setup');
    } finally {
      setSecurityActionLoading(false);
    }
  };

  const handleEnableTotp = async () => {
    if (!totpEnableCode.trim()) return;
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.post('/auth/2fa/totp/enable', { code: totpEnableCode.trim() });
      setTotpSetup(null);
      setTotpSetupExpiresAt(null);
      setTotpEnableCode('');
      await refreshSecurity();
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to enable 2FA');
    } finally {
      setSecurityActionLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!totpDisablePassword || !totpDisableCode.trim()) return;
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.post('/auth/2fa/totp/disable', {
        password: totpDisablePassword,
        code: totpDisableCode.trim(),
      });
      setTotpDisablePassword('');
      setTotpDisableCode('');
      await refreshSecurity();
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to disable 2FA');
    } finally {
      setSecurityActionLoading(false);
    }
  };

  const handleAddPasskey = async () => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const optionsResp = await api.post<{ challengeId: string; options: unknown }>(
        '/auth/passkeys/register/options'
      );
      const credential = await startRegistration(optionsResp.data.options as never);
      await api.post('/auth/passkeys/register/verify', {
        challengeId: optionsResp.data.challengeId,
        credential,
        name: newPasskeyName.trim() || null,
      });
      setNewPasskeyName('');
      await refreshSecurity();
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to add passkey');
    } finally {
      setSecurityActionLoading(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.delete(`/auth/passkeys/${id}`);
      await refreshSecurity();
    } catch (err: unknown) {
      setSecurityErrorFromError(err, 'Failed to delete passkey');
    } finally {
      setSecurityActionLoading(false);
    }
  };
  if (isLoading) {
    return (
      <NeoBrutalistLayout pageTitle="USER SETTINGS">
        <div className="min-h-full bg-[#202020] p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#FFD700]"></div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="USER SETTINGS">
      <div className="min-h-full bg-[#202020] p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Top Actions Pane */}
          <div className="flex justify-between items-start sticky top-4 z-20">
            {/* Theme Selector Moved to Bottom */}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-[#000] text-white font-black uppercase tracking-wider text-xl
                border-4 border-white shadow-[6px_6px_0px_0px_var(--shadow-color)] 
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#FFF]
                active:translate-x-[6px] active:translate-y-[6px] active:shadow-none
                transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shrink-0"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">⌛</span> SAVING...
                </>
              ) : (
                <>
                  <span>💾</span> SAVE ALL CHANGES
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {saveStatus === 'success' && (
            <div className="bg-[#90EE90] border-4 border-black p-4 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center gap-3 text-lg animate-slide-in">
              <span>✅</span> Profile saved successfully!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="bg-[#FF6B6B] border-4 border-black p-4 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center gap-3 text-lg animate-slide-in text-white">
              <span>⚠️</span> {errorMessage || 'Failed to save profile'}
            </div>
          )}

          {/* Profile Picture Card - CYAN Theme */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="bg-[var(--loop-cyan)] border-b-4 border-black p-4">
              <h2 className="text-2xl font-black uppercase">Profile</h2>
            </div>

            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-40 h-40 border-4 border-black shadow-[6px_6px_0px_0px_var(--shadow-color)] overflow-hidden bg-gray-100">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FFD700] text-4xl font-black">
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </div>
                  )}
                  {isProcessingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                      Loading...
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-3 -right-3 bg-black text-white p-2 border-2 border-white transform rotate-3">
                  EDIT
                </div>
                {previewImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="absolute -bottom-3 -left-3 bg-black text-white p-2 border-2 border-white transform -rotate-3 hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                    title="Remove Profile Picture"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-4 border-dashed rounded-none p-6 text-center cursor-pointer transition-all uppercase font-bold
                    ${isDragging
                      ? 'border-[#4DD0E1] bg-[#E0F7FA] text-black scale-[1.02]'
                      : 'border-gray-300 hover:border-black hover:bg-gray-50 text-gray-500 hover:text-black'
                    }`}
                >
                  <p className="text-lg">Click to Upload Avatar</p>
                  <p className="text-xs mt-2">JPG, PNG or GIF (Max 20MB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Card - PINK Theme */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="bg-[var(--loop-pink)] border-b-4 border-black p-4">
              <h2 className="text-2xl font-black uppercase">Bio</h2>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'First Name', field: 'firstName', req: true },
                { label: 'Last Name', field: 'lastName', req: true },
                { label: 'Display Name', field: 'displayName', placeholder: 'Included in credit roll' },
                { label: 'Alt Name', field: 'alternativeName', placeholder: 'Nickname' },
                { label: 'Title / Role', field: 'title', placeholder: 'e.g. Keyblade Master' },
              ].map((item) => (
                <div key={item.field} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block font-bold text-sm uppercase tracking-wide">
                      {item.label} {item.req && <span className="text-red-500">*</span>}
                    </label>
                    <button
                      onClick={() => toggleFieldVisibility(item.field)}
                      className="text-gray-500 hover:text-black transition-all border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] p-1 rounded-sm"
                      title="Toggle Public Visibility"
                    >
                      {fieldVisibility[item.field] ? (
                        <EyeIcon className="w-5 h-5" />
                      ) : (
                        <EyeSlashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={String(profile[item.field as keyof UserProfile] || '')}
                    onChange={(e) => handleChange(item.field as keyof UserProfile, e.target.value)}
                    placeholder={item.placeholder || ''}
                    className="w-full p-3 border-2 border-black font-medium focus:outline-none shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
                  />
                </div>
              ))}

              {/* Pronouns Selection */}
              <div className="space-y-2">
                <label className="block font-bold text-sm uppercase tracking-wide">Pronouns</label>
                <div className="flex gap-2">
                  <select
                    value={profile.pronouns}
                    onChange={(e) => handleChange('pronouns', e.target.value)}
                    className="w-full p-3 border-2 border-black font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
                  >
                    {pronounOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {profile.pronouns === 'custom' && (
                    <input
                      type="text"
                      value={customPronouns}
                      onChange={(e) => setCustomPronouns(e.target.value)}
                      placeholder="Specify"
                      className="w-1/2 p-3 border-2 border-black font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--shadow-color)]"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Card - GREEN Theme */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="bg-[var(--loop-green)] border-b-4 border-black p-4">
              <h2 className="text-2xl font-black uppercase">Contact Info</h2>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block font-bold text-sm uppercase tracking-wide">
                  Cell Phone
                </label>
                <div className="flex justify-between items-center mb-1">
                  <button
                    onClick={() => toggleFieldVisibility('cellPhone')}
                    className="text-gray-500 hover:text-black transition-colors ml-auto"
                    title="Toggle Public Visibility"
                  >
                    {fieldVisibility['cellPhone'] ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={profile.cellPhone}
                  onChange={(e) => handleChange('cellPhone', e.target.value)}
                  className="w-full p-3 border-2 border-black font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-sm uppercase tracking-wide">
                  Primary Frequency (Email) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full p-3 border-2 border-black bg-gray-100 font-mono text-gray-500 cursor-not-allowed"
                  disabled // Making email read-only typically good for primary ID, or changing it requires re-auth usually
                />
              </div>

              {/* Visibility Toggles */}
              <div className="border-2 border-black p-4 bg-gray-50 flex flex-col gap-3">
                <h3 className="font-bold text-sm uppercase">Visibility Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${profile.emailSharedWithUsers ? 'bg-black' : 'bg-white'}`}>
                    {profile.emailSharedWithUsers && <span className="text-white text-xs">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={profile.emailSharedWithUsers}
                    onChange={(e) => handleChange('emailSharedWithUsers', e.target.checked)}
                  />
                  <span className="font-medium group-hover:underline">Broadcast email to other staff</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${profile.emailSharedWithClients ? 'bg-black' : 'bg-white'}`}>
                    {profile.emailSharedWithClients && <span className="text-white text-xs">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={profile.emailSharedWithClients}
                    onChange={(e) => handleChange('emailSharedWithClients', e.target.checked)}
                  />
                  <span className="font-medium group-hover:underline">Broadcast email to external contacts</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notifications - PURPLE Theme */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="bg-[var(--loop-purple)] border-b-4 border-black p-4">
              <h2 className="text-2xl font-black uppercase">Notification Settings</h2>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between border-2 border-black p-3 bg-white hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                  <span className="font-bold uppercase text-sm">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange(key as keyof NotificationSettings, !value)}
                    className={`w-12 h-6 border-2 border-black rounded-full relative transition-colors shadow-[2px_2px_0px_0px_var(--shadow-color)] ${value ? 'bg-[#90EE90]' : 'bg-gray-200'
                      }`}
                  >
                    <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 bg-black border border-black rounded-full transition-all ${value ? 'right-1' : 'left-1'
                      }`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interface Theme - Moved to Bottom */}
          <div className="w-full">
            <ThemeSelector />
          </div>

          {/* Security */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="bg-[var(--loop-cyan)] border-b-4 border-black p-4">
              <h2 className="text-2xl font-black uppercase">Security</h2>
            </div>
            <div className="p-8">

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
              <p className="mt-1 text-sm text-gray-500">
                Use an authenticator app (TOTP) to protect your account.
              </p>

              {securityLoading ? (
                <div className="mt-3 text-sm text-gray-500">Loading security settings…</div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Status:{' '}
                    <span className={security.totpEnabled ? 'text-green-700 font-medium' : 'text-gray-700 font-medium'}>
                      {security.totpEnabled ? 'Enabled' : 'Not enabled'}
                    </span>
                  </div>
                  {!security.totpEnabled ? (
                    <button
                      type="button"
                      onClick={handleStartTotpSetup}
                      disabled={securityActionLoading}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {securityActionLoading ? 'Starting…' : 'Enable 2FA'}
                    </button>
                  ) : null}
                </div>
              )}

              <ErrorBanner
                message={securityError}
                correlationId={securityDetails?.correlationId}
                className="mt-3"
              />

              {!security.totpEnabled && totpSetup && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Timeout warning banner */}
                  {totpSecondsRemaining > 0 && (
                    <div className={`mb-4 p-3 rounded-lg border ${totpSecondsRemaining < 60 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                      <div className="flex items-center gap-2">
                        <span>{totpSecondsRemaining < 60 ? '⚠️' : '⏱️'}</span>
                        <span className="font-medium">
                          Setup expires in {Math.floor(totpSecondsRemaining / 60)}:{(totpSecondsRemaining % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      {totpSecondsRemaining < 60 && (
                        <p className="text-sm mt-1">Complete setup now or the secret will be cleared for security.</p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                    {totpSetup.qrDataUrl && (
                      <img
                        src={totpSetup.qrDataUrl}
                        alt="2FA QR code"
                        className="w-48 h-48 border border-gray-200 rounded bg-white"
                      />
                    )}
                    <div className="mt-4 md:mt-0 flex-1">
                      <p className="text-sm text-gray-700">
                        Scan this QR code with your authenticator app, or enter the secret manually.
                      </p>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Secret</label>
                        <div className="font-mono text-sm bg-white border border-gray-200 rounded px-3 py-2 break-all">
                          {totpSetup.secret}
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Enter 6-digit code to confirm
                        </label>
                        <input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={totpEnableCode}
                          onChange={(e) => setTotpEnableCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="mt-4 flex space-x-3">
                        <button
                          type="button"
                          onClick={handleEnableTotp}
                          disabled={securityActionLoading}
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {securityActionLoading ? 'Enabling…' : 'Confirm & Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTotpSetup(null);
                            setTotpSetupExpiresAt(null);
                            setTotpEnableCode('');
                          }}
                          className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {security.totpEnabled && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    To disable 2FA, confirm your password and a current authentication code.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                      <input
                        type="password"
                        value={totpDisablePassword}
                        onChange={(e) => setTotpDisablePassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">6-digit code</label>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={totpDisableCode}
                        onChange={(e) => setTotpDisableCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleDisableTotp}
                      disabled={securityActionLoading}
                      className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {securityActionLoading ? 'Disabling…' : 'Disable 2FA'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Passkeys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Use passkeys to sign in with your device biometrics or screen lock.
              </p>

              <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div className="w-full md:max-w-sm">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Passkey name (optional)
                  </label>
                  <input
                    value={newPasskeyName}
                    onChange={(e) => setNewPasskeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., MacBook Touch ID"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPasskey}
                  disabled={securityActionLoading}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {securityActionLoading ? 'Adding…' : 'Add passkey'}
                </button>
              </div>

              {security.passkeys.length === 0 ? (
                <div className="mt-4 text-sm text-gray-600">No passkeys registered.</div>
              ) : (
                <ul className="mt-4 divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white overflow-hidden">
                  {security.passkeys.map((pk) => (
                    <li key={pk.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pk.name || 'Passkey'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added {new Date(pk.createdAt).toLocaleString('en-CA')}
                          {pk.lastUsedAt ? ` • Last used ${new Date(pk.lastUsedAt).toLocaleString('en-CA')}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(pk.id)}
                        disabled={securityActionLoading}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  </NeoBrutalistLayout>
  );
}
