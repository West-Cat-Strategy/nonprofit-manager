import { useEffect, useState } from 'react';
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
}

export default function PortalProfile() {
  const [formData, setFormData] = useState<PortalProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      const response = await portalApi.patch('/portal/profile', formData);
      setFormData(response.data);
      setMessage('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile', error);
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-app-text-muted">Loading profile...</p>;
  }

  if (!formData) {
    return <p className="text-sm text-red-600">Unable to load profile.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Your Profile</h2>
      {message && <p className="text-sm mt-2 text-app-text-muted">{message}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-app-text-muted">First Name</label>
            <input
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Last Name</label>
            <input
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Phone</label>
            <input
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Mobile Phone</label>
            <input
              name="mobile_phone"
              value={formData.mobile_phone || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Preferred Contact Method</label>
            <input
              name="preferred_contact_method"
              value={formData.preferred_contact_method || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Pronouns</label>
            <input
              name="pronouns"
              value={formData.pronouns || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Gender</label>
            <input
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-app-text-muted">Address Line 1</label>
          <input
            name="address_line1"
            value={formData.address_line1 || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-app-text-muted">Address Line 2</label>
          <input
            name="address_line2"
            value={formData.address_line2 || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            name="city"
            placeholder="City"
            value={formData.city || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
          <input
            name="state_province"
            placeholder="State"
            value={formData.state_province || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
          <input
            name="postal_code"
            placeholder="Postal Code"
            value={formData.postal_code || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-app-text-muted">Country</label>
          <input
            name="country"
            value={formData.country || ''}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
