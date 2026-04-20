import { useEffect, useRef, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import {
  FormField,
  PrimaryButton,
  SecondaryButton,
} from '../../../components/ui';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { validatePassword } from '../../../utils/validation';
import { portalSessionSynced } from '../../portalAuth/state';
import { focusElement } from '../utils/formFocus';

interface PortalProfileData {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  phn: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  preferred_contact_method: string | null;
  pronouns: string | null;
  gender: string | null;
  profile_picture: string | null;
}

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

const toOptionalString = (value: string | null): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNullableString = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export default function PortalProfile() {
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);
  const [formData, setFormData] = useState<PortalProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [phnError, setPhnError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileStatusMessage, setProfileStatusMessage] = useState<string | null>(null);
  const [securityStatusMessage, setSecurityStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  const loadProfile = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/profile');
      setFormData(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load profile', loadError);
      setError('Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
    if (e.target.name === 'phn') {
      setPhnError(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      const message = 'Image must be less than 5MB';
      setProfileStatusMessage(message);
      showError(message);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => (prev ? { ...prev, profile_picture: base64 } : null));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const normalizedPhn = normalizeDigits(formData.phn || '');
    if (normalizedPhn.length > 0 && normalizedPhn.length !== 10) {
      const message = 'PHN must contain exactly 10 digits.';
      setPhnError(message);
      setProfileStatusMessage(message);
      showError(message);
      focusElement(document.getElementById('portal-profile-phn') as HTMLElement | null);
      return;
    }

    const updatePayload = {
      first_name: toOptionalString(formData.first_name),
      last_name: toOptionalString(formData.last_name),
      email: toOptionalString(formData.email),
      phone: toOptionalString(formData.phone),
      mobile_phone: toOptionalString(formData.mobile_phone),
      phn: normalizedPhn.length > 0 ? normalizedPhn : null,
      address_line1: toNullableString(formData.address_line1),
      address_line2: toNullableString(formData.address_line2),
      city: toNullableString(formData.city),
      state_province: toNullableString(formData.state_province),
      postal_code: toNullableString(formData.postal_code),
      country: toNullableString(formData.country),
      preferred_contact_method: toNullableString(formData.preferred_contact_method),
      pronouns: toNullableString(formData.pronouns),
      gender: toNullableString(formData.gender),
      profile_picture: formData.profile_picture ?? null,
    };

    const payload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    try {
      setSaving(true);
      const response = await portalApi.patch<ApiEnvelope<PortalProfileData>>('/v2/portal/profile', payload);
      const updatedProfile = unwrapApiData(response.data);
      setFormData(updatedProfile);
      if (portalUser) {
        dispatch(
          portalSessionSynced({
            ...portalUser,
            email: updatedProfile.email?.trim() || portalUser.email,
            contactId: updatedProfile.contact_id || portalUser.contactId,
          })
        );
      }
      setPhnError(null);
      const message = 'Profile updated successfully.';
      setProfileStatusMessage(message);
      showSuccess(message);
    } catch (submitError) {
      console.error('Failed to update profile', submitError);
      const message = 'Failed to update profile.';
      setProfileStatusMessage(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatusMessage(null);

    if (newPassword !== confirmPassword) {
      const message = 'Passwords do not match.';
      setSecurityStatusMessage(message);
      showError(message);
      focusElement(document.getElementById('portal-profile-confirm-password') as HTMLElement | null);
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      const message = `${passwordError}.`;
      setSecurityStatusMessage(message);
      showError(message);
      focusElement(document.getElementById('portal-profile-new-password') as HTMLElement | null);
      return;
    }

    try {
      setChangingPassword(true);
      await portalApi.post('/v2/portal/change-password', {
        currentPassword,
        newPassword,
      });
      const message = 'Password changed successfully.';
      setSecurityStatusMessage(message);
      showSuccess(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (passwordError: unknown) {
      const message =
        typeof passwordError === 'object' &&
        passwordError !== null &&
        'response' in passwordError &&
        typeof (passwordError as { response?: unknown }).response === 'object' &&
        (passwordError as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (passwordError as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : 'Failed to change password.';
      setSecurityStatusMessage(message ?? 'Failed to change password.');
      showError(message ?? 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <PortalPageShell
      title="Your Profile"
      description="Update your contact details and account security settings."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && !formData}
        loadingLabel="Loading profile..."
        emptyTitle="Unable to load profile."
        emptyDescription="Please retry in a moment."
        onRetry={loadProfile}
      />

      {!loading && !error && formData && (
        <div className="space-y-6">
          <div className="rounded-full border border-app-border bg-app-surface-elevated p-1 shadow-sm">
            <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'profile'
                    ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] shadow-sm'
                    : 'border-transparent text-app-text hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'security'
                    ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] shadow-sm'
                    : 'border-transparent text-app-text hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading'
                }`}
              >
                Security
              </button>
            </nav>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {profileStatusMessage || securityStatusMessage || ''}
          </p>

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <section className="rounded-lg border border-app-border bg-app-surface p-6">
                <h3 className="text-base font-semibold text-app-text">Profile Picture</h3>
                <div className="mt-4 flex items-center gap-6">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-app-border bg-app-surface-muted">
                    {formData.profile_picture ? (
                      <img
                        src={formData.profile_picture}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-app-text-muted">
                        {formData.first_name?.[0]}
                        {formData.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <SecondaryButton
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </SecondaryButton>
                    {formData.profile_picture && (
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          setFormData((prev) => (prev ? { ...prev, profile_picture: null } : prev))
                        }
                        className="ml-2"
                      >
                        Remove
                      </SecondaryButton>
                    )}
                    <p className="mt-2 text-xs text-app-text-muted">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </section>

              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-lg border border-app-border bg-app-surface p-6">
                  <h3 className="text-base font-semibold text-app-text">Personal Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      id="portal-profile-first-name"
                      name="first_name"
                      label="First Name"
                      value={formData.first_name || ''}
                      onChange={handleChange}
                    />
                    <FormField
                      id="portal-profile-last-name"
                      name="last_name"
                      label="Last Name"
                      value={formData.last_name || ''}
                      onChange={handleChange}
                    />
                    <FormField
                      id="portal-profile-email"
                      name="email"
                      type="email"
                      label="Email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                    <FormField
                      id="portal-profile-phone"
                      name="phone"
                      label="Phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                    <FormField
                      id="portal-profile-mobile-phone"
                      name="mobile_phone"
                      label="Mobile Phone"
                      value={formData.mobile_phone || ''}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                    <FormField
                      id="portal-profile-phn"
                      name="phn"
                      label="Personal Health Number (PHN)"
                      helperText="Optional. Enter exactly 10 digits."
                      error={phnError ?? undefined}
                      value={formData.phn || ''}
                      onChange={handleChange}
                      placeholder="10 digits"
                      inputMode="numeric"
                    />
                    <FormField
                      id="portal-profile-pronouns"
                      name="pronouns"
                      label="Pronouns"
                      helperText="Optional"
                      value={formData.pronouns || ''}
                      onChange={handleChange}
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-app-border bg-app-surface p-6">
                  <h3 className="text-base font-semibold text-app-text">Address</h3>
                  <div className="mt-4 space-y-4">
                    <FormField
                      id="portal-profile-address-line1"
                      name="address_line1"
                      label="Address Line 1"
                      value={formData.address_line1 || ''}
                      onChange={handleChange}
                    />
                    <FormField
                      id="portal-profile-address-line2"
                      name="address_line2"
                      label="Address Line 2"
                      helperText="Optional"
                      value={formData.address_line2 || ''}
                      onChange={handleChange}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField
                        id="portal-profile-city"
                        name="city"
                        label="City"
                        value={formData.city || ''}
                        onChange={handleChange}
                      />
                      <FormField
                        id="portal-profile-state-province"
                        name="state_province"
                        label="State / Province"
                        value={formData.state_province || ''}
                        onChange={handleChange}
                      />
                      <FormField
                        id="portal-profile-postal-code"
                        name="postal_code"
                        label="Postal Code"
                        value={formData.postal_code || ''}
                        onChange={handleChange}
                      />
                    </div>
                    <FormField
                      id="portal-profile-country"
                      name="country"
                      label="Country"
                      value={formData.country || ''}
                      onChange={handleChange}
                    />
                  </div>
                </section>

                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </PrimaryButton>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <form
              onSubmit={handlePasswordChange}
              className="rounded-lg border border-app-border bg-app-surface p-6"
            >
              <h3 className="text-base font-semibold text-app-text">Change Password</h3>
              <div className="mt-4 max-w-md space-y-4">
                <FormField
                  id="portal-profile-current-password"
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <FormField
                  id="portal-profile-new-password"
                  type="password"
                  label="New Password"
                  helperText="Must be at least 8 characters with uppercase, lowercase, and number."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <FormField
                  id="portal-profile-confirm-password"
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <PrimaryButton type="submit" disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </PrimaryButton>
              </div>
            </form>
          )}
        </div>
      )}
    </PortalPageShell>
  );
}
