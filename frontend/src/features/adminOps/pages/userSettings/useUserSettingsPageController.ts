import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { updateUser } from '../../../auth/state';
import LoopApiService from '../../../../services/LoopApiService';
import { useApiError } from '../../../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import {
  buildUserProfile,
  MAX_FILE_SIZE,
  MAX_IMAGE_DIMENSION,
  resizeImage,
  serializeUserProfile,
} from './helpers';
import type { NotificationSettings, UserProfile } from './types';
import useUserSecuritySettings from './useUserSecuritySettings';

export function useUserSettingsPageController() {
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
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [profileLoadState, setProfileLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const {
    error: errorMessage,
    setFromError: setErrorMessageFromError,
    clear: clearErrorMessage,
  } = useApiError();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'basic' | 'advanced'>('basic');
  const [activeSection, setActiveSection] = useState<string>('profile-section');
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({
    firstName: true,
    lastName: true,
    displayName: true,
    alternativeName: true,
    title: true,
    cellPhone: true,
  });

  const toggleFieldVisibility = (field: string) => {
    setFieldVisibility((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const security = useUserSecuritySettings();
  const profileSnapshot = serializeUserProfile(profile, customPronouns);
  const isProfileDataReady = profileLoadState === 'ready';
  const isProfileDirty =
    isProfileDataReady && savedProfileSnapshot !== '' && profileSnapshot !== savedProfileSnapshot;

  useUnsavedChangesGuard({
    hasUnsavedChanges: isProfileDirty && !isSaving && !isProcessingImage,
  });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setSaveStatus('idle');
    setProfileLoadError(null);
    clearErrorMessage();

    try {
      const data = await LoopApiService.getUserProfile();
      const normalized = buildUserProfile(data, user ?? undefined);
      setProfile(normalized.profile);
      setCustomPronouns(normalized.customPronouns);
      setPreviewImage(normalized.previewImage);
      setSavedProfileSnapshot(serializeUserProfile(normalized.profile, normalized.customPronouns));
      setProfileLoadState('ready');
    } catch {
      const normalized = buildUserProfile(null, user ?? undefined);
      setProfile(normalized.profile);
      setCustomPronouns(normalized.customPronouns);
      setPreviewImage(normalized.previewImage);
      setSavedProfileSnapshot('');
      setProfileLoadState('error');
      setProfileLoadError('Unable to load your saved profile data. Saving is disabled until you retry.');
    } finally {
      setIsLoading(false);
    }
  }, [clearErrorMessage, user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile((previous) => ({ ...previous, [field]: value }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setProfile((previous) => ({
      ...previous,
      notifications: { ...previous.notifications, [field]: value },
    }));
  };

  const processImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessageFromError(
          new Error('Please upload an image file (JPG, PNG, GIF)'),
          'Please upload an image file (JPG, PNG, GIF)'
        );
        setSaveStatus('error');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessageFromError(
          new Error('Image must be less than 20MB'),
          'Image must be less than 20MB'
        );
        setSaveStatus('error');
        return;
      }

      setIsProcessingImage(true);
      setSaveStatus('idle');
      clearErrorMessage();

      try {
        const resizedBase64 = await resizeImage(file, MAX_IMAGE_DIMENSION);
        setPreviewImage(resizedBase64);
        setProfile((previous) => ({ ...previous, profilePicture: resizedBase64 }));
      } catch (error) {
        setErrorMessageFromError(
          new Error('Failed to process image. Please try another file.'),
          'Failed to process image. Please try another file.'
        );
        setSaveStatus('error');
        console.error('Image processing error:', error);
      } finally {
        setIsProcessingImage(false);
      }
    },
    [clearErrorMessage, setErrorMessageFromError]
  );

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void processImage(file);
    }
  };

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        void processImage(file);
      }
    },
    [processImage]
  );

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setProfile((previous) => ({ ...previous, profilePicture: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!isProfileDataReady) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    clearErrorMessage();

    try {
      const pronounsToSave = profile.pronouns === 'custom' ? customPronouns : profile.pronouns;
      const payload = {
        ...profile,
        pronouns: pronounsToSave,
      };

      const savedProfile = await LoopApiService.updateUserProfile(payload);
      const normalized = buildUserProfile(savedProfile, user ?? undefined);
      setProfile(normalized.profile);
      setCustomPronouns(normalized.customPronouns);
      setPreviewImage(normalized.previewImage);

      dispatch(
        updateUser({
          firstName: normalized.profile.firstName,
          lastName: normalized.profile.lastName,
          email: normalized.profile.email,
          profilePicture: normalized.profile.profilePicture,
        })
      );

      setSavedProfileSnapshot(serializeUserProfile(normalized.profile, normalized.customPronouns));
      setLastSavedAt(new Date());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: unknown) {
      setSaveStatus('error');
      setErrorMessageFromError(error, 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    setActiveSection(sectionId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const retryLoadProfile = useCallback(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const sectionIds =
      settingsMode === 'advanced'
        ? [
            'profile-section',
            'bio-section',
            'contact-section',
            'notifications-section',
            'security-section',
          ]
        : ['profile-section', 'bio-section', 'contact-section', 'notifications-section'];

    if (!sectionIds.includes(activeSection)) {
      setActiveSection('profile-section');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      { root: null, rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] }
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, [activeSection, settingsMode]);

  return {
    fileInputRef,
    dropZoneRef,
    profile,
    customPronouns,
    setCustomPronouns,
    isLoading,
    isSaving,
    saveStatus,
    lastSavedAt,
    errorMessage,
    profileLoadState,
    profileLoadError,
    previewImage,
    isDragging,
    isProcessingImage,
    settingsMode,
    setSettingsMode,
    activeSection,
    fieldVisibility,
    toggleFieldVisibility,
    security,
    isProfileDirty,
    handleChange,
    handleNotificationChange,
    handleImageUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveImage,
    handleSave,
    retryLoadProfile,
    scrollToSection,
    isProfileDataReady,
  };
}

export type UserSettingsPageController = ReturnType<typeof useUserSettingsPageController>;
