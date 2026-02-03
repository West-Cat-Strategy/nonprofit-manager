/**
 * User Settings Page
 * Personal settings and profile management for the logged-in user
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import api from '../services/api';

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/profile');
        const data = response.data;
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

      await api.put('/auth/profile', payload);

      // Update the auth state with new user info
      dispatch(updateUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Settings</h1>
              <p className="mt-2 text-gray-600">
                Manage your personal profile and account settings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
          {saveStatus === 'success' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile saved successfully
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {errorMessage || 'Failed to save profile'}
            </div>
          )}
        </div>

        {/* Profile Picture Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a photo to personalize your account</p>
          </div>

          <div className="p-6">
            <div className="flex items-start space-x-6">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-200">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </div>
                )}
                {isProcessingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Drag and Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG or GIF up to 20MB (will be resized automatically)
                  </p>
                </div>

                {previewImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="mt-3 px-4 py-2 text-red-600 font-medium rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <p className="text-sm text-gray-500 mt-1">Your basic profile information</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="How you want to be addressed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">This is how your name will appear to others</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative Name
              </label>
              <input
                type="text"
                value={profile.alternativeName}
                onChange={(e) => handleChange('alternativeName', e.target.value)}
                placeholder="Nickname, maiden name, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pronouns <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={profile.pronouns}
                  onChange={(e) => handleChange('pronouns', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {pronounOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {profile.pronouns === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Pronouns
                  </label>
                  <input
                    type="text"
                    value={customPronouns}
                    onChange={(e) => setCustomPronouns(e.target.value)}
                    placeholder="e.g., ze/zir"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position / Title
              </label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Program Director, Volunteer Coordinator"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            <p className="text-sm text-gray-500 mt-1">How others can reach you</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Primary Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">This is also your login username</p>
            </div>

            {/* Email Sharing Options */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Email Visibility</p>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.emailSharedWithUsers}
                  onChange={(e) => handleChange('emailSharedWithUsers', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Share email with other staff members</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.emailSharedWithClients}
                  onChange={(e) => handleChange('emailSharedWithClients', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Share email with clients and contacts</span>
              </label>
            </div>

            {/* Alternative Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternative Email Addresses
              </label>

              {profile.alternativeEmails.length > 0 && (
                <div className="space-y-2 mb-3">
                  {profile.alternativeEmails.map((altEmail, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">{altEmail.email}</span>
                        {altEmail.label && (
                          <span className="ml-2 text-xs text-gray-500">({altEmail.label})</span>
                        )}
                        {!altEmail.isVerified && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            Unverified
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAlternativeEmail(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        aria-label="Remove email"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={newAltEmail.email}
                  onChange={(e) => setNewAltEmail(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={newAltEmail.label}
                  onChange={(e) => setNewAltEmail(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Label (optional)"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addAlternativeEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Phone Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cell Phone
                </label>
                <input
                  type="tel"
                  value={profile.cellPhone}
                  onChange={(e) => handleChange('cellPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={profile.contactNumber}
                  onChange={(e) => handleChange('contactNumber', e.target.value)}
                  placeholder="Office or alternative phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">Manage how you receive notifications</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <button
                type="button"
                aria-label="Toggle email notifications"
                onClick={() => handleNotificationChange('emailNotifications', !profile.notifications.emailNotifications)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  profile.notifications.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {profile.notifications.emailNotifications && (
              <div className="space-y-3">
                {/* Task Reminders */}
                <label className="flex items-center justify-between cursor-pointer py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Task Reminders</p>
                    <p className="text-xs text-gray-500">Get notified about upcoming and overdue tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.taskReminders}
                    onChange={(e) => handleNotificationChange('taskReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                {/* Event Reminders */}
                <label className="flex items-center justify-between cursor-pointer py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Event Reminders</p>
                    <p className="text-xs text-gray-500">Receive reminders before events you&apos;re involved in</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.eventReminders}
                    onChange={(e) => handleNotificationChange('eventReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                {/* Donation Alerts */}
                <label className="flex items-center justify-between cursor-pointer py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Donation Alerts</p>
                    <p className="text-xs text-gray-500">Get notified when new donations are received</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.donationAlerts}
                    onChange={(e) => handleNotificationChange('donationAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                {/* Case Updates */}
                <label className="flex items-center justify-between cursor-pointer py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Case Updates</p>
                    <p className="text-xs text-gray-500">Receive updates on cases assigned to you</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.caseUpdates}
                    onChange={(e) => handleNotificationChange('caseUpdates', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                {/* Weekly Digest */}
                <label className="flex items-center justify-between cursor-pointer py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Weekly Digest</p>
                    <p className="text-xs text-gray-500">Receive a weekly summary of activity</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.weeklyDigest}
                    onChange={(e) => handleNotificationChange('weeklyDigest', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>

                {/* Marketing Emails */}
                <label className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Marketing & Updates</p>
                    <p className="text-xs text-gray-500">Receive product updates and tips</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.marketingEmails}
                    onChange={(e) => handleNotificationChange('marketingEmails', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your password and account security</p>
          </div>

          <div className="p-6">
            {!showPasswordSection ? (
              <button
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
                </p>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {passwordError}
                  </div>
                )}

                {passwordStatus === 'success' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Password changed successfully
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                    className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <p className="text-sm text-gray-500 mt-1">Your account details</p>
          </div>

          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{user?.role || 'User'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Other Settings Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Other Settings</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            <li>
              <Link
                to="/settings/navigation"
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-900">Navigation</span>
                    <p className="text-sm text-gray-500">Customize menu items and order</p>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
            {user?.role === 'admin' && (
              <li>
                <Link
                  to="/settings/admin"
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900">Admin Settings</span>
                      <p className="text-sm text-gray-500">Organization settings, user management</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                      Admin
                    </span>
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
