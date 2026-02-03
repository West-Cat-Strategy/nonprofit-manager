/**
 * User Settings Page - SMB3 "Backstage" Aesthetic
 * Dark background, vibrant props, heavy shadows
 * 
 * Phase 1: Uses LoopApiService for profile management
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EyeIcon, EyeSlashIcon, TrashIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import LoopApiService from '../services/LoopApiService';
import NeoBrutalistLayout from '../components/neo-brutalist/NeoBrutalistLayout';
import { useTheme } from '../contexts/ThemeContext';

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

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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

  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [customPronouns, setCustomPronouns] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [newAltEmail, setNewAltEmail] = useState({ email: '', label: '' });
  const { isDarkMode, toggleDarkMode } = useTheme();

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

  const handleChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setProfile((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const handlePasswordChange = (field: keyof PasswordChange, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (JPG, PNG, GIF)');
      setSaveStatus('error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Image must be less than 20MB');
      setSaveStatus('error');
      return;
    }

    setIsProcessingImage(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      // Always resize to optimize storage and performance
      const resizedBase64 = await resizeImage(file, MAX_IMAGE_DIMENSION);
      setPreviewImage(resizedBase64);
      setProfile(prev => ({ ...prev, profilePicture: resizedBase64 }));
    } catch (err) {
      setErrorMessage('Failed to process image. Please try another file.');
      setSaveStatus('error');
      console.error('Image processing error:', err);
    } finally {
      setIsProcessingImage(false);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
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

  const addAlternativeEmail = () => {
    if (!newAltEmail.email || !newAltEmail.email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setSaveStatus('error');
      return;
    }

    setProfile(prev => ({
      ...prev,
      alternativeEmails: [
        ...prev.alternativeEmails,
        { ...newAltEmail, isVerified: false },
      ],
    }));
    setNewAltEmail({ email: '', label: '' });
  };

  const removeAlternativeEmail = (index: number) => {
    setProfile(prev => ({
      ...prev,
      alternativeEmails: prev.alternativeEmails.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

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
      const error = err as { response?: { data?: { error?: string } } };
      setErrorMessage(error.response?.data?.error || 'Failed to save profile');
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
    } catch (err: unknown) {
      setPasswordStatus('error');
      const error = err as { response?: { data?: { error?: string } } };
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  */


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
          <div className="flex justify-end sticky top-4 z-20">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-[#000] text-white font-black uppercase tracking-wider text-xl
                border-4 border-white shadow-[6px_6px_0px_0px_var(--shadow-color)] 
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#FFF]
                active:translate-x-[6px] active:translate-y-[6px] active:shadow-none
                transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
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

          {/* Dark Mode Toggle */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)] p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black uppercase">Dark Mode</h3>
              <p className="text-sm text-gray-600">Override whitespace with dark gray.</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-10 w-20 items-center rounded-full border-4 border-black transition-colors focus:outline-none shadow-[4px_4px_0px_0px_var(--shadow-color)] ${isDarkMode ? 'bg-black' : 'bg-white'
                }`}
            >
              <div
                className={`${isDarkMode ? 'translate-x-[42px] bg-[#FFD700]' : 'translate-x-[4px] bg-white'
                  } flex h-8 w-8 items-center justify-center transform rounded-full border-2 border-black transition-transform duration-200`}
              >
                {isDarkMode ? (
                  <SunIcon className="w-5 h-5 text-black" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-black" />
                )}
              </div>
            </button>
          </div>

        </div>
      </div>
    </NeoBrutalistLayout >
  );
}
