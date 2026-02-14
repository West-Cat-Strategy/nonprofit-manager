import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createVolunteer, updateVolunteer } from '../store/slices/volunteersSlice';
import { fetchContacts } from '../store/slices/contactsSlice';

interface Volunteer {
  volunteer_id?: string;
  contact_id: string;
  skills: string[];
  availability_status: 'available' | 'unavailable' | 'limited';
  availability_notes?: string | null;
  background_check_status:
    | 'not_required'
    | 'pending'
    | 'in_progress'
    | 'approved'
    | 'rejected'
    | 'expired';
  background_check_date?: string | null;
  background_check_expiry?: string | null;
  preferred_roles?: string[] | null;
  max_hours_per_week?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  is_active?: boolean;
  first_name?: string;
  last_name?: string;
}

interface VolunteerFormProps {
  volunteer?: Volunteer;
  mode: 'create' | 'edit';
}

export const VolunteerForm: React.FC<VolunteerFormProps> = ({ volunteer, mode }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { contacts } = useAppSelector((state) => state.contacts);

  const [formData, setFormData] = useState<Volunteer>({
    contact_id: '',
    skills: [],
    availability_status: 'available',
    availability_notes: '',
    background_check_status: 'not_required',
    background_check_date: '',
    background_check_expiry: '',
    preferred_roles: [],
    max_hours_per_week: undefined,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    is_active: true,
  });

  const [skillInput, setSkillInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load contacts for the dropdown
    dispatch(fetchContacts({ page: 1, limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    if (volunteer && mode === 'edit') {
      setFormData({
        ...volunteer,
        background_check_date: volunteer.background_check_date
          ? new Date(volunteer.background_check_date).toISOString().split('T')[0]
          : '',
        background_check_expiry: volunteer.background_check_expiry
          ? new Date(volunteer.background_check_expiry).toISOString().split('T')[0]
          : '',
      });
    }
  }, [volunteer, mode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? value === ''
              ? undefined
              : Number(value)
            : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const skill = skillInput.trim();
      if (!formData.skills.includes(skill)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, skill],
        }));
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleAddRole = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && roleInput.trim()) {
      e.preventDefault();
      const role = roleInput.trim();
      if (!formData.preferred_roles?.includes(role)) {
        setFormData((prev) => ({
          ...prev,
          preferred_roles: [...(prev.preferred_roles || []), role],
        }));
      }
      setRoleInput('');
    }
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_roles: prev.preferred_roles?.filter((role) => role !== roleToRemove) || [],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === 'create' && !formData.contact_id) {
      newErrors.contact_id = 'Contact is required';
    }

    if (
      formData.emergency_contact_phone &&
      !/^[\d\s\-+()]+$/.test(formData.emergency_contact_phone)
    ) {
      newErrors.emergency_contact_phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up the data
      const cleanedData: Partial<Volunteer> = {
        ...formData,
        contact_id: formData.contact_id || undefined,
        availability_notes: formData.availability_notes || undefined,
        background_check_date: formData.background_check_date || undefined,
        background_check_expiry: formData.background_check_expiry || undefined,
        preferred_roles:
          formData.preferred_roles && formData.preferred_roles.length > 0
            ? formData.preferred_roles
            : undefined,
        max_hours_per_week: formData.max_hours_per_week || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        emergency_contact_relationship: formData.emergency_contact_relationship || undefined,
      };

      if (mode === 'create') {
        await dispatch(createVolunteer(cleanedData)).unwrap();
        navigate('/volunteers');
      } else if (mode === 'edit' && volunteer?.volunteer_id) {
        // For edit mode, we don't send contact_id
        delete cleanedData.contact_id;
        await dispatch(
          updateVolunteer({
            volunteerId: volunteer.volunteer_id,
            data: cleanedData,
          })
        ).unwrap();
        navigate(`/volunteers/${volunteer.volunteer_id}`);
      }
    } catch (error) {
      console.error('Failed to save volunteer:', error);
      setErrors({ submit: 'Failed to save volunteer. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && volunteer?.volunteer_id) {
      navigate(`/volunteers/${volunteer.volunteer_id}`);
    } else {
      navigate('/volunteers');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Contact Association (only for create mode) */}
      {mode === 'create' && (
        <div className="bg-app-surface shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-app-text-heading mb-4">Contact Information</h2>
          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium text-app-text-label">
              Select Contact *
            </label>
            <select
              name="contact_id"
              id="contact_id"
              value={formData.contact_id}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.contact_id ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            >
              <option value="">Select a contact...</option>
              {contacts.map((contact) => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.first_name} {contact.last_name}{' '}
                  {contact.email ? `(${contact.email})` : ''}
                </option>
              ))}
            </select>
            {errors.contact_id && <p className="mt-1 text-sm text-red-600">{errors.contact_id}</p>}
            <p className="mt-1 text-sm text-app-text-muted">
              Volunteers must be associated with an existing contact. Create a contact first if
              needed.
            </p>
          </div>
        </div>
      )}

      {/* Skills and Roles */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Skills and Roles</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-app-text-label mb-2">
              Skills
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-app-accent-soft text-app-accent-text"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-2 text-app-accent hover:text-app-accent-hover"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              id="skills"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              placeholder="Type a skill and press Enter"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
            <p className="mt-1 text-sm text-app-text-muted">
              Press Enter to add each skill (e.g., "Event Planning", "Photography", "Teaching")
            </p>
          </div>

          <div>
            <label
              htmlFor="preferred_roles"
              className="block text-sm font-medium text-app-text-label mb-2"
            >
              Preferred Roles
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.preferred_roles?.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={handleAddRole}
              placeholder="Type a role and press Enter"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
            <p className="mt-1 text-sm text-app-text-muted">
              Press Enter to add each preferred role (e.g., "Team Leader", "Event Coordinator")
            </p>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Availability</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="availability_status"
              className="block text-sm font-medium text-app-text-label"
            >
              Availability Status
            </label>
            <select
              name="availability_status"
              id="availability_status"
              value={formData.availability_status}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            >
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div>
            <label htmlFor="max_hours_per_week" className="block text-sm font-medium text-app-text-label">
              Max Hours Per Week
            </label>
            <input
              type="number"
              name="max_hours_per_week"
              id="max_hours_per_week"
              min="0"
              step="1"
              value={formData.max_hours_per_week || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="availability_notes" className="block text-sm font-medium text-app-text-label">
              Availability Notes
            </label>
            <textarea
              name="availability_notes"
              id="availability_notes"
              rows={3}
              value={formData.availability_notes ?? ''}
              onChange={handleChange}
              placeholder="e.g., Available weekends only, Not available during summer"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Background Check */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Background Check</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="background_check_status"
              className="block text-sm font-medium text-app-text-label"
            >
              Background Check Status
            </label>
            <select
              name="background_check_status"
              id="background_check_status"
              value={formData.background_check_status}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            >
              <option value="not_required">Not Required</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div></div>

          <div>
            <label
              htmlFor="background_check_date"
              className="block text-sm font-medium text-app-text-label"
            >
              Background Check Date
            </label>
            <input
              type="date"
              name="background_check_date"
              id="background_check_date"
              value={formData.background_check_date ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="background_check_expiry"
              className="block text-sm font-medium text-app-text-label"
            >
              Background Check Expiry
            </label>
            <input
              type="date"
              name="background_check_expiry"
              id="background_check_expiry"
              value={formData.background_check_expiry ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Emergency Contact</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="emergency_contact_name"
              className="block text-sm font-medium text-app-text-label"
            >
              Name
            </label>
            <input
              type="text"
              name="emergency_contact_name"
              id="emergency_contact_name"
              value={formData.emergency_contact_name ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="emergency_contact_relationship"
              className="block text-sm font-medium text-app-text-label"
            >
              Relationship
            </label>
            <input
              type="text"
              name="emergency_contact_relationship"
              id="emergency_contact_relationship"
              value={formData.emergency_contact_relationship ?? ''}
              onChange={handleChange}
              placeholder="e.g., Spouse, Parent, Sibling"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="emergency_contact_phone"
              className="block text-sm font-medium text-app-text-label"
            >
              Phone
            </label>
            <input
              type="text"
              name="emergency_contact_phone"
              id="emergency_contact_phone"
              value={formData.emergency_contact_phone ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.emergency_contact_phone ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.emergency_contact_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {mode === 'edit' && (
        <div className="bg-app-surface shadow rounded-lg p-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-app-accent focus:ring-app-accent border-app-input-border rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-app-text">
              Active Volunteer
            </label>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-app-surface py-2 px-4 border border-app-border rounded-md shadow-sm text-sm font-medium text-app-text-label hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-app-accent py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent disabled:bg-app-text-subtle disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Volunteer' : 'Update Volunteer'}
        </button>
      </div>
    </form>
  );
};
