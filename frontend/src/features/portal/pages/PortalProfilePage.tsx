import { useEffect, useRef, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import { validatePassword } from '../../../utils/validation';

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
    if (!formData) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const response = await portalApi.patch('/v2/portal/profile', payload);
      setFormData(unwrapApiData(response.data));
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
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      const message = `${passwordError}.`;
      setSecurityStatusMessage(message);
      showError(message);
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-white"
                    >
                      Upload Photo
                    </button>
                    {formData.profile_picture && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profile_picture: null })}
                        className="ml-2 rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Remove
                      </button>
                    )}
                    <p className="mt-2 text-xs text-app-text-muted">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </section>

              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-lg border border-app-border bg-app-surface p-6">
                  <h3 className="text-base font-semibold text-app-text">Personal Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">
                        First Name
                      </label>
                      <input
                        name="first_name"
                        value={formData.first_name || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">
                        Last Name
                      </label>
                      <input
                        name="last_name"
                        value={formData.last_name || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">Phone</label>
                      <input
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">
                        Mobile Phone
                      </label>
                      <input
                        name="mobile_phone"
                        value={formData.mobile_phone || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">
                        Personal Health Number (PHN)
                      </label>
                      <input
                        name="phn"
                        value={formData.phn || ''}
                        onChange={handleChange}
                        placeholder="10 digits"
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                      {phnError && <p className="mt-1 text-xs text-app-accent">{phnError}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-app-text">
                        Pronouns
                      </label>
                      <input
                        name="pronouns"
                        value={formData.pronouns || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-app-border bg-app-surface p-6">
                  <h3 className="text-base font-semibold text-app-text">Address</h3>
                  <div className="mt-4 space-y-4">
                    <input
                      name="address_line1"
                      placeholder="Address Line 1"
                      value={formData.address_line1 || ''}
                      onChange={handleChange}
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                    <input
                      name="address_line2"
                      placeholder="Address Line 2"
                      value={formData.address_line2 || ''}
                      onChange={handleChange}
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <input
                        name="city"
                        placeholder="City"
                        value={formData.city || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                      <input
                        name="state_province"
                        placeholder="State/Province"
                        value={formData.state_province || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                      <input
                        name="postal_code"
                        placeholder="Postal Code"
                        value={formData.postal_code || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <input
                      name="country"
                      placeholder="Country"
                      value={formData.country || ''}
                      onChange={handleChange}
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-app-accent px-6 py-2 font-medium text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-app-text">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-app-text">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                    required
                  />
                  <p className="mt-1 text-xs text-app-text-muted">
                    Must be at least 8 characters with uppercase, lowercase, and number.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-app-text">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-md bg-app-accent px-6 py-2 font-medium text-white disabled:opacity-50"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </PortalPageShell>
  );
}
