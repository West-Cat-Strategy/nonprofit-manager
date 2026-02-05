import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createContact,
  updateContact,
  fetchContactRelationships,
  createContactRelationship,
  deleteContactRelationship,
  fetchContacts,
} from '../store/slices/contactsSlice';
import type { Contact as StoreContact } from '../store/slices/contactsSlice';
import type { ContactRole, CreateContactRelationshipDTO, RelationshipType } from '../types/contact';
import { RELATIONSHIP_TYPES } from '../types/contact';
import { useToast } from '../contexts/useToast';
import api from '../services/api';
import { validatePostalCode } from '../utils/validation';

type ContactFormValues = {
  contact_id?: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  salutation?: string | null;
  suffix?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  job_title?: string | null;
  department?: string | null;
  preferred_contact_method?: string | null;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  notes?: string | null;
  is_active?: boolean;
  roles?: string[];
};

const PRONOUNS_OPTIONS = [
  { value: '', label: 'Select pronouns...' },
  { value: 'he/him', label: 'He/Him' },
  { value: 'she/her', label: 'She/Her' },
  { value: 'they/them', label: 'They/Them' },
  { value: 'he/they', label: 'He/They' },
  { value: 'she/they', label: 'She/They' },
  { value: 'ze/hir', label: 'Ze/Hir' },
  { value: 'other', label: 'Other' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender...' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Genderqueer', label: 'Genderqueer' },
  { value: 'Genderfluid', label: 'Genderfluid' },
  { value: 'Agender', label: 'Agender' },
  { value: 'Two-Spirit', label: 'Two-Spirit' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
  { value: 'Other', label: 'Other' },
];

interface ContactFormProps {
  contact?: StoreContact;
  mode: 'create' | 'edit';
  onCreated?: (contact: StoreContact) => void;
  onCancel?: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, mode, onCreated, onCancel }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { relationships, relationshipsLoading, contacts } = useAppSelector((state) => state.contacts);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Pre-fill from URL params when creating (e.g., from relationship "Create New Person")
  const urlFirstName = searchParams.get('first_name') || '';
  const urlLastName = searchParams.get('last_name') || '';
  const returnToContactId = searchParams.get('return_to');

  const [formData, setFormData] = useState<ContactFormValues>({
    first_name: mode === 'create' ? urlFirstName : '',
    last_name: mode === 'create' ? urlLastName : '',
    middle_name: '',
    salutation: '',
    suffix: '',
    birth_date: '',
    gender: '',
    pronouns: '',
    email: '',
    phone: '',
    mobile_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    job_title: '',
    department: '',
    preferred_contact_method: 'email',
    do_not_email: false,
    do_not_phone: false,
    notes: '',
    is_active: true,
    roles: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Relationship form state
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [relationshipData, setRelationshipData] = useState<CreateContactRelationshipDTO>({
    related_contact_id: '',
    relationship_type: 'contact_person',
    relationship_label: '',
    is_bidirectional: true, // Always create reverse relationship
    notes: '',
  });

  useEffect(() => {
    // Load relationships and contacts for edit mode
    if (mode === 'edit' && contact?.contact_id) {
      dispatch(fetchContactRelationships(contact.contact_id));
    }
  }, [dispatch, mode, contact?.contact_id]);

  useEffect(() => {
    // Load contacts for relationship search
    if (isAddingRelationship && contacts.length === 0) {
      dispatch(fetchContacts({ limit: 100 }));
    }
  }, [dispatch, isAddingRelationship, contacts.length]);

  useEffect(() => {
    if (contact && mode === 'edit') {
      setFormData({
        ...contact,
        roles: contact.roles || [],
      });
    }
  }, [contact, mode]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const response = await api.get('/contacts/roles');
        setAvailableRoles(response.data.roles || []);
      } catch (error) {
        console.error('Failed to load contact roles:', error);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s+() -]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.mobile_phone && !/^[\d\s+() -]+$/.test(formData.mobile_phone)) {
      newErrors.mobile_phone = 'Invalid mobile phone number format';
    }

    // Postal code validation
    if (formData.postal_code) {
      const postalError = validatePostalCode(formData.postal_code, formData.country);
      if (postalError) {
        newErrors.postal_code = postalError;
      }
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
      // Clean up the data - remove empty strings and convert to undefined for optional fields
      const cleanedData = {
        ...formData,
        middle_name: formData.middle_name || undefined,
        salutation: formData.salutation || undefined,
        suffix: formData.suffix || undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
        pronouns: formData.pronouns || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        mobile_phone: formData.mobile_phone || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        state_province: formData.state_province || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        job_title: formData.job_title || undefined,
        department: formData.department || undefined,
        preferred_contact_method: formData.preferred_contact_method || undefined,
        notes: formData.notes || undefined,
        roles: formData.roles || [],
      };

      if (mode === 'create') {
        const result = await dispatch(createContact(cleanedData)).unwrap();
        if (result.staffInvitation?.inviteUrl) {
          showSuccess(
            `Staff invitation created for ${result.staffInvitation.role}. Share this link: ${result.staffInvitation.inviteUrl}`
          );
        }
        showSuccess('Contact created successfully');
        if (onCreated) {
          onCreated(result);
          return;
        }
        // If we came from adding a relationship, go back to that contact's edit page
        if (returnToContactId) {
          navigate(`/contacts/${returnToContactId}/edit`);
        } else {
          // Otherwise go to the newly created contact
          navigate(`/contacts/${result.contact_id}`);
        }
      } else if (mode === 'edit' && contact?.contact_id) {
        const result = await dispatch(
          updateContact({
            contactId: contact.contact_id,
            data: cleanedData,
          })
        ).unwrap();
        if (result.staffInvitation?.inviteUrl) {
          showSuccess(
            `Staff invitation created for ${result.staffInvitation.role}. Share this link: ${result.staffInvitation.inviteUrl}`
          );
        }
        showSuccess('Contact updated successfully');
        navigate(`/contacts/${contact.contact_id}`);
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      setErrors({ submit: 'Failed to save contact. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === 'edit' && contact?.contact_id) {
      navigate(`/contacts/${contact.contact_id}`);
    } else {
      navigate('/contacts');
    }
  };

  // Relationship handlers
  const resetRelationshipForm = () => {
    setRelationshipData({
      related_contact_id: '',
      relationship_type: 'contact_person',
      relationship_label: '',
      is_bidirectional: true, // Always create reverse relationship
      notes: '',
    });
    setRelationshipSearch('');
    setIsAddingRelationship(false);
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationshipData.related_contact_id || !contact?.contact_id) {
      showError('Please select a person');
      return;
    }

    try {
      await dispatch(
        createContactRelationship({ contactId: contact.contact_id, data: relationshipData })
      ).unwrap();
      showSuccess('Relationship added successfully');
      resetRelationshipForm();
    } catch (error: any) {
      showError(error.message || 'Failed to add relationship');
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!confirm('Remove this relationship?')) return;
    try {
      await dispatch(deleteContactRelationship(relationshipId)).unwrap();
    } catch (error) {
      console.error('Failed to delete relationship:', error);
    }
  };

  const getRelationshipLabel = (type: RelationshipType) => {
    return RELATIONSHIP_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getRelationshipIcon = (type: RelationshipType) => {
    const icons: Record<string, string> = {
      contact_person: '👤',
      spouse: '💑',
      parent: '👨‍👧',
      child: '👶',
      sibling: '👫',
      family_member: '👨‍👩‍👧‍👦',
      emergency_contact: '🚨',
      social_worker: '📋',
      caregiver: '💝',
      advocate: '⚖️',
      support_person: '🤝',
      roommate: '🏠',
      friend: '🤗',
      colleague: '💼',
      other: '🔗',
    };
    return icons[type] || '🔗';
  };

  // Filter contacts for relationship search (exclude current contact)
  const filteredContacts = contacts.filter(
    (c) =>
      c.contact_id !== contact?.contact_id &&
      (relationshipSearch === '' ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(relationshipSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(relationshipSearch.toLowerCase()))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* People / Relationships */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {formData.first_name ? `${formData.first_name}'s People` : 'Associated People'}
        </h2>

        {mode === 'create' ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-2xl mb-2">👥</div>
            <p className="text-gray-500 text-sm">
              Save this person first, then you can add relationships.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing Relationships */}
            {relationshipsLoading && relationships.length === 0 ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : relationships.length === 0 && !isAddingRelationship ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-2xl mb-1">👥</div>
                <p className="text-gray-500 text-sm">No associated people yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getRelationshipIcon(rel.relationship_type)}</span>
                      <div>
                        <button
                          type="button"
                          onClick={() => navigate(`/contacts/${rel.related_contact_id}`)}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {rel.related_contact_first_name} {rel.related_contact_last_name}
                        </button>
                        <div className="text-sm text-gray-500">
                          {rel.relationship_label || getRelationshipLabel(rel.relationship_type)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRelationship(rel.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Relationship Form */}
            {isAddingRelationship ? (
              <form
                onSubmit={handleAddRelationship}
                className="bg-blue-50 rounded-lg p-4 border border-blue-200"
              >
                <h4 className="font-medium mb-3">Add Person</h4>

                {/* Person Search */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Find Person
                  </label>
                  <input
                    type="text"
                    value={relationshipSearch}
                    onChange={(e) => setRelationshipSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {relationshipSearch && (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.slice(0, 10).map((c) => (
                          <button
                            key={c.contact_id}
                            type="button"
                            onClick={() => {
                              setRelationshipData((prev) => ({
                                ...prev,
                                related_contact_id: c.contact_id,
                              }));
                              setRelationshipSearch(`${c.first_name} ${c.last_name}`);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                              relationshipData.related_contact_id === c.contact_id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="font-medium">
                              {c.first_name} {c.last_name}
                            </div>
                            {c.email && <div className="text-sm text-gray-500">{c.email}</div>}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-center">
                          <p className="text-sm text-gray-500 mb-2">No matching people found</p>
                          <button
                            type="button"
                            onClick={() => {
                              // Open new contact form in new tab, pre-filling name from search
                              const nameParts = relationshipSearch.trim().split(' ');
                              const firstName = nameParts[0] || '';
                              const lastName = nameParts.slice(1).join(' ') || '';
                              const params = new URLSearchParams();
                              if (firstName) params.set('first_name', firstName);
                              if (lastName) params.set('last_name', lastName);
                              if (contact?.contact_id) params.set('return_to', contact.contact_id);
                              window.open(`/contacts/new?${params.toString()}`, '_blank');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + Create "{relationshipSearch}" as new person
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Relationship Type */}
                <div className="mb-3">
                  <label htmlFor="relationship_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    id="relationship_type"
                    value={relationshipData.relationship_type}
                    onChange={(e) =>
                      setRelationshipData((prev) => ({
                        ...prev,
                        relationship_type: e.target.value as RelationshipType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {RELATIONSHIP_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Label */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Label (optional)
                  </label>
                  <input
                    type="text"
                    value={relationshipData.relationship_label || ''}
                    onChange={(e) =>
                      setRelationshipData((prev) => ({
                        ...prev,
                        relationship_label: e.target.value,
                      }))
                    }
                    placeholder="e.g., Mother, Case Worker, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={resetRelationshipForm}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!relationshipData.related_contact_id}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingRelationship(true)}
                className="w-full px-3 py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition"
              >
                + Add Person
              </button>
            )}
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="salutation" className="block text-sm font-medium text-gray-700">
              Salutation
            </label>
            <input
              type="text"
              name="salutation"
              id="salutation"
              placeholder="Mr., Ms., Dr., etc."
              value={formData.salutation ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div></div>

          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.first_name ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
          </div>

          <div>
            <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700">
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              id="middle_name"
              value={formData.middle_name ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.last_name ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
          </div>

          <div>
            <label htmlFor="suffix" className="block text-sm font-medium text-gray-700">
              Suffix
            </label>
            <input
              type="text"
              name="suffix"
              id="suffix"
              placeholder="Jr., Sr., III, etc."
              value={formData.suffix ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              name="job_title"
              id="job_title"
              value={formData.job_title ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <input
              type="text"
              name="department"
              id="department"
              value={formData.department ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="birth_date"
              id="birth_date"
              value={formData.birth_date ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              name="gender"
              id="gender"
              value={formData.gender ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700">
              Pronouns
            </label>
            <select
              name="pronouns"
              id="pronouns"
              value={formData.pronouns ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {PRONOUNS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Roles</h2>
        {rolesLoading ? (
          <div className="text-sm text-gray-500">Loading roles...</div>
        ) : availableRoles.length === 0 ? (
          <div className="text-sm text-gray-500">No roles available.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableRoles.map((role) => {
              const isSelected = (formData.roles || []).includes(role.name);
              return (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setFormData((prev) => {
                        const roles = prev.roles || [];
                        return {
                          ...prev,
                          roles: roles.includes(role.name)
                            ? roles.filter((r) => r !== role.name)
                            : [...roles, role.name],
                        };
                      });
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label
              htmlFor="preferred_contact_method"
              className="block text-sm font-medium text-gray-700"
            >
              Preferred Contact Method
            </label>
            <select
              name="preferred_contact_method"
              id="preferred_contact_method"
              value={formData.preferred_contact_method ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="mobile">Mobile</option>
              <option value="mail">Mail</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={formData.phone ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="mobile_phone" className="block text-sm font-medium text-gray-700">
              Mobile Phone
            </label>
            <input
              type="text"
              name="mobile_phone"
              id="mobile_phone"
              value={formData.mobile_phone ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.mobile_phone ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.mobile_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.mobile_phone}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="do_not_email"
                  id="do_not_email"
                  checked={formData.do_not_email}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="do_not_email" className="ml-2 block text-sm text-gray-900">
                  Do Not Email
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="do_not_phone"
                  id="do_not_phone"
                  checked={formData.do_not_phone}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="do_not_phone" className="ml-2 block text-sm text-gray-900">
                  Do Not Phone
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Address</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
              Address Line 1
            </label>
            <input
              type="text"
              name="address_line1"
              id="address_line1"
              value={formData.address_line1 ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
              Address Line 2
            </label>
            <input
              type="text"
              name="address_line2"
              id="address_line2"
              value={formData.address_line2 ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={formData.city ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="state_province" className="block text-sm font-medium text-gray-700">
              State/Province
            </label>
            <input
              type="text"
              name="state_province"
              id="state_province"
              value={formData.state_province ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              name="postal_code"
              id="postal_code"
              value={formData.postal_code ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.postal_code ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.postal_code && <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              name="country"
              id="country"
              value={formData.country ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Initial Notes</h2>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes ?? ''}
            onChange={handleChange}
            placeholder="Add any initial notes about this contact..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-2 text-sm text-gray-500">
            For detailed notes with timestamps, use the Notes section on the contact detail page.
          </p>
        </div>

        {mode === 'edit' && (
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active Contact
            </label>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Contact' : 'Update Contact'}
        </button>
      </div>
    </form>
  );
};
