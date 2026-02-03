import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createCase,
  updateCase,
  fetchCaseTypes,
  fetchCaseStatuses,
} from '../store/slices/casesSlice';
import type { Contact } from '../store/slices/contactsSlice';
import api from '../services/api';
import type { CaseWithDetails, CreateCaseDTO, UpdateCaseDTO } from '../types/case';
// import { useToast } from '../contexts/ToastContext';

interface CaseFormProps {
  caseId?: string;
  initialData?: Partial<CreateCaseDTO>;
  onSuccess?: () => void;
  onCreated?: (createdCase: CaseWithDetails) => void;
  disableContactSelection?: boolean;
}

const CaseForm = ({
  caseId,
  initialData,
  onSuccess,
  onCreated,
  disableContactSelection = false,
}: CaseFormProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // const { showSuccess, showError } = useToast();
  const { caseTypes, loading, error } = useAppSelector((state) => state.cases);

  const isEditMode = Boolean(caseId);

  // Form state
  const [formData, setFormData] = useState<CreateCaseDTO>({
    contact_id: initialData?.contact_id || '',
    case_type_id: initialData?.case_type_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    source: initialData?.source || undefined,
    referral_source: initialData?.referral_source || '',
    assigned_to: initialData?.assigned_to || '',
    due_date: initialData?.due_date || '',
    is_urgent: initialData?.is_urgent || false,
    tags: initialData?.tags || [],
  });

  const [tagInput, setTagInput] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const contactDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
  }, [dispatch]);

  useEffect(() => {
    const loadSelectedContact = async (contactId: string) => {
      try {
        const response = await api.get(`/contacts/${contactId}`);
        const contact = response.data as Contact;
        setSelectedContact(contact);
        setContactQuery(
          `${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`
        );
      } catch {
        setSelectedContact(null);
      }
    };

    if (formData.contact_id && !selectedContact) {
      loadSelectedContact(formData.contact_id);
    }
  }, [formData.contact_id, selectedContact]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contactDropdownRef.current &&
        !contactDropdownRef.current.contains(event.target as Node) &&
        contactInputRef.current &&
        !contactInputRef.current.contains(event.target as Node)
      ) {
        setContactOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (contactDebounceRef.current) {
        clearTimeout(contactDebounceRef.current);
      }
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContactSearch = (value: string) => {
    if (contactDebounceRef.current) {
      clearTimeout(contactDebounceRef.current);
    }

    if (value.trim().length < 2) {
      setContactResults([]);
      setContactOpen(false);
      return;
    }

    contactDebounceRef.current = setTimeout(async () => {
      setContactLoading(true);
      try {
        const response = await api.get('/contacts', {
          params: {
            search: value.trim(),
            limit: 8,
            is_active: true,
          },
        });
        setContactResults(response.data.contacts || []);
        setContactOpen(true);
      } catch {
        setContactResults([]);
        setContactOpen(false);
      } finally {
        setContactLoading(false);
      }
    }, 250);
  };

  const handleContactQueryChange = (value: string) => {
    setContactQuery(value);
    setSelectedContact(null);
    setFormData((prev) => ({ ...prev, contact_id: '' }));
    handleContactSearch(value);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactQuery(
      `${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`
    );
    setFormData((prev) => ({ ...prev, contact_id: contact.contact_id }));
    setContactResults([]);
    setContactOpen(false);
  };

  const visibleResults = useMemo(() => contactResults, [contactResults]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.contact_id || !formData.case_type_id || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (isEditMode && caseId) {
        const updateData: UpdateCaseDTO = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigned_to: formData.assigned_to || undefined,
          due_date: formData.due_date || undefined,
          is_urgent: formData.is_urgent,
          tags: formData.tags,
        };
        await dispatch(updateCase({ id: caseId, data: updateData })).unwrap();
        // showSuccess('Case updated successfully');
      } else {
        const createdCase = await dispatch(createCase(formData)).unwrap();
        if (onCreated) {
          onCreated(createdCase);
        }
        // showSuccess('Case created successfully');
      }

      if (onSuccess) {
        onSuccess();
      } else if (!onCreated) {
        navigate('/cases');
      }
    } catch (err) {
      console.error('Failed to save case:', err);
      // showError(isEditMode ? 'Failed to update case. Please try again.' : 'Failed to create case. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Contact Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            ref={contactInputRef}
            type="text"
            name="contact_lookup"
            value={contactQuery}
            onChange={(e) => handleContactQueryChange(e.target.value)}
            onFocus={() => contactQuery.trim().length >= 2 && setContactOpen(true)}
            placeholder="Search by name, email, or phone..."
            disabled={isEditMode || (disableContactSelection && Boolean(formData.contact_id))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          {contactLoading && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            </div>
          )}
          {contactOpen && visibleResults.length > 0 && !isEditMode && (
            <div
              ref={contactDropdownRef}
              className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto"
            >
              {visibleResults.map((contact) => (
                <button
                  type="button"
                  key={contact.contact_id}
                  onClick={() => handleSelectContact(contact)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {contact.first_name} {contact.last_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {contact.email || contact.phone || contact.mobile_phone || 'No contact info'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <input type="hidden" name="contact_id" value={formData.contact_id} />
        {isEditMode && (
          <p className="mt-1 text-sm text-gray-500">Client cannot be changed after case creation</p>
        )}
      </div>

      {/* Case Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Case Type <span className="text-red-500">*</span>
        </label>
        <select
          name="case_type_id"
          value={formData.case_type_id}
          onChange={handleChange}
          required
          disabled={isEditMode}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        >
          <option value="">Select a case type...</option>
          {caseTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {isEditMode && (
          <p className="mt-1 text-sm text-gray-500">
            Case type cannot be changed after case creation
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Brief description of the case"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Detailed description of the case..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Priority and Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
          <select
            name="source"
            value={formData.source || ''}
            onChange={handleChange}
            disabled={isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select source...</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="walk-in">Walk-in</option>
            <option value="referral">Referral</option>
            <option value="web">Web</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Referral Source (if source is referral) */}
      {formData.source === 'referral' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Referral Source</label>
          <input
            type="text"
            name="referral_source"
            value={formData.referral_source}
            onChange={handleChange}
            placeholder="Name of organization or person who referred"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Urgent Checkbox */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_urgent"
            checked={formData.is_urgent}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Mark as urgent</span>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          Urgent cases are highlighted and prioritized in the case list
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/cases')}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Saving...' : isEditMode ? 'Update Case' : 'Create Case'}
        </button>
      </div>
    </form>
  );
};

export default CaseForm;
