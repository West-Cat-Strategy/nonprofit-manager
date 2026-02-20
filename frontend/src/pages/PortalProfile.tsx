import { useEffect, useState, useRef } from 'react';
import portalApi from '../services/portalApi';

interface PortalProfileData {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
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

export default function PortalProfile() {
  const [formData, setFormData] = useState<PortalProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await portalApi.get('/portal/profile');
        setFormData(response.data);
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!formData) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => prev ? { ...prev, profile_picture: base64 } : null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      const response = await portalApi.patch('/portal/profile', formData);
      setFormData(response.data);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile', error);
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage('Password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      await portalApi.post('/portal/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 3000);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to change password';
      setPasswordMessage(message ?? 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-app-text-muted">Loading profile...</p>;
  }

  if (!formData) {
    return <p className="text-sm text-red-600">Unable to load profile.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-app-text mb-6">Your Profile</h2>

      {/* Tabs */}
      <div className="mb-6 border-b border-app-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text hover:border-app-border'
              }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'security'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text hover:border-app-border'
              }`}
          >
            Security
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div>
          {message && (
            <div className={`mb-4 p-3 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Avatar Section */}
          <div className="mb-6 bg-app-surface border border-app-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-app-text mb-4">Profile Picture</h3>
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-app-surface-muted border-2 border-app-border">
                {formData.profile_picture ? (
                  <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-app-text-muted">
                    {formData.first_name?.[0]}{formData.last_name?.[0]}
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
                  className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover text-sm font-medium"
                >
                  Upload Photo
                </button>
                {formData.profile_picture && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profile_picture: null })}
                    className="ml-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
                <p className="mt-2 text-xs text-app-text-muted">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-app-surface border border-app-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-app-text mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">First Name</label>
                  <input
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Last Name</label>
                  <input
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Phone</label>
                  <input
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Mobile Phone</label>
                  <input
                    name="mobile_phone"
                    value={formData.mobile_phone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Pronouns</label>
                  <input
                    name="pronouns"
                    value={formData.pronouns || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-app-surface border border-app-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-app-text mb-4">Address</h3>
              <div className="space-y-4">
                <input
                  name="address_line1"
                  placeholder="Address Line 1"
                  value={formData.address_line1 || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
                <input
                  name="address_line2"
                  placeholder="Address Line 2"
                  value={formData.address_line2 || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    name="city"
                    placeholder="City"
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                  <input
                    name="state_province"
                    placeholder="State/Province"
                    value={formData.state_province || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                  <input
                    name="postal_code"
                    placeholder="Postal Code"
                    value={formData.postal_code || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <input
                  name="country"
                  placeholder="Country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div>
          {passwordMessage && (
            <div className={`mb-4 p-3 rounded-md ${passwordMessage.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {passwordMessage}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="bg-app-surface border border-app-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-app-text mb-4">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  required
                />
                <p className="mt-1 text-xs text-app-text-muted">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-app-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-app-accent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover font-medium disabled:opacity-50"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
