import { useEffect, useState } from 'react';
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
import { useToast } from '../contexts/useToast';
import { useQuickLookup } from './dashboard';
import type { SearchResult } from './dashboard';
import type { CaseWithDetails, CreateCaseDTO, UpdateCaseDTO } from '../types/case';

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
  const { showSuccess, showError } = useToast();
  const { caseTypes, loading, error } = useAppSelector((state) => state.cases);

  const isEditMode = Boolean(caseId);

  // Form state
  const [formData, setFormData] = useState<CreateCaseDTO & Partial<UpdateCaseDTO>>({
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
    outcome: (initialData as any)?.outcome || undefined,
    outcome_notes: (initialData as any)?.outcome_notes || '',
    closure_reason: (initialData as any)?.closure_reason || '',
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const lookup = useQuickLookup({ debounceMs: 250 });

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
        lookup.selectResult(
          `${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`
        );
      } catch {
        setSelectedContact(null);
      }
    };

    if (formData.contact_id && !selectedContact) {
      loadSelectedContact(formData.contact_id);
    }
  }, [formData.contact_id, selectedContact, lookup]);

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

  const handleContactQueryChange = (value: string) => {
    lookup.handleSearchChange(value);
    setSelectedContact(null);
    setFormData((prev) => ({ ...prev, contact_id: '' }));
  };

  const handleSelectContact = (contact: SearchResult) => {
    setSelectedContact(contact as Contact);
    lookup.selectResult(
      `${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`
    );
    setFormData((prev) => ({ ...prev, contact_id: contact.contact_id }));
  };

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
      showError('Please fill in all required fields');
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
        showSuccess('Case updated successfully');
      } else {
        const createdCase = await dispatch(createCase(formData)).unwrap();
        if (onCreated) {
          onCreated(createdCase);
        }
        showSuccess('Case created successfully');
      }

      if (onSuccess) {
        onSuccess();
      } else if (!onCreated) {
        navigate('/cases');
      }
    } catch (err) {
      console.error('Failed to save case:', err);
      showError(isEditMode ? 'Failed to update case. Please try again.' : 'Failed to create case. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Contact Selection */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">
          Client <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            ref={lookup.inputRef}
            type="text"
            name="contact_lookup"
            value={lookup.searchTerm}
            onChange={(e) => handleContactQueryChange(e.target.value)}
            onFocus={lookup.handleFocus}
            placeholder="Search by name, email, or phone..."
            disabled={isEditMode || (disableContactSelection && Boolean(formData.contact_id))}
            className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent disabled:bg-app-surface-muted"
          />
          {lookup.isLoading && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-app-input-border border-t-app-accent" />
            </div>
          )}
          {lookup.isOpen && lookup.results.length > 0 && !isEditMode && (
            <div
              ref={lookup.dropdownRef}
              className="menu-surface-opaque absolute z-10 mt-1 w-full rounded-lg border border-app-border shadow-lg max-h-64 overflow-y-auto"
            >
              {lookup.results.map((contact) => (
                <button
                  type="button"
                  key={contact.contact_id}
                  onClick={() => handleSelectContact(contact)}
                  className="w-full text-left px-4 py-2 hover:bg-app-accent-soft focus:bg-app-accent-soft focus:outline-none"
                >
                  <div className="text-sm font-medium text-app-text">
                    {contact.first_name} {contact.last_name}
                  </div>
                  <div className="text-xs text-app-text-muted">
                    {contact.email || contact.phone || contact.mobile_phone || 'No contact info'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <input type="hidden" name="contact_id" value={formData.contact_id} />
        {isEditMode && (
          <p className="mt-1 text-sm text-app-text-muted">Client cannot be changed after case creation</p>
        )}
      </div>

      {/* Case Type */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">
          Case Type <span className="text-red-500">*</span>
        </label>
        <select
          name="case_type_id"
          value={formData.case_type_id}
          onChange={handleChange}
          required
          disabled={isEditMode}
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent disabled:bg-app-surface-muted"
        >
          <option value="">Select a case type...</option>
          {caseTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {isEditMode && (
          <p className="mt-1 text-sm text-app-text-muted">
            Case type cannot be changed after case creation
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Brief description of the case"
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Detailed description of the case..."
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
        />
      </div>

      {/* Priority and Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-app-text-label mb-2">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-app-text-label mb-2">Source</label>
          <select
            name="source"
            value={formData.source || ''}
            onChange={handleChange}
            disabled={isEditMode}
            className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent disabled:bg-app-surface-muted"
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
          <label className="block text-sm font-medium text-app-text-label mb-2">Referral Source</label>
          <input
            type="text"
            name="referral_source"
            value={formData.referral_source}
            onChange={handleChange}
            placeholder="Name of organization or person who referred"
            className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
          />
        </div>
      )}

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">Due Date</label>
        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
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
            className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
          />
          <span className="text-sm font-medium text-app-text-label">Mark as urgent</span>
        </label>
        <p className="mt-1 text-sm text-app-text-muted">
          Urgent cases are highlighted and prioritized in the case list
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-app-surface-muted text-app-text-muted rounded-lg hover:bg-app-surface-muted transition"
          >
            Add
          </button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-app-accent-soft text-app-accent-text text-sm rounded-full flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-app-accent hover:text-app-accent-hover"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-app-border">
        <button
          type="button"
          onClick={() => navigate('/cases')}
          className="px-6 py-2 border border-app-input-border rounded-lg hover:bg-app-hover transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Saving...' : isEditMode ? 'Update Case' : 'Create Case'}
        </button>
      </div>

      {isEditMode && (
        <div className="mt-8 pt-8 border-t border-app-border">
          <h3 className="text-lg font-bold mb-4 uppercase">Case Outcome / Closure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-2">Outcome</label>
              <select
                name="outcome"
                value={formData.outcome || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                <option value="">Select outcome...</option>
                <option value="successful">Successful</option>
                <option value="unsuccessful">Unsuccessful</option>
                <option value="referred">Referred</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-2">Closure Reason</label>
              <input
                type="text"
                name="closure_reason"
                value={formData.closure_reason || ''}
                onChange={handleChange}
                placeholder="e.g., Client reached goal"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-app-text-label mb-2">Outcome Notes</label>
            <textarea
              name="outcome_notes"
              value={formData.outcome_notes || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Final notes on the case outcome..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>
        </div>
      )}
    </form>
  );
};

export default CaseForm;
