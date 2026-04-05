import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createCase,
  updateCase,
  fetchCaseTypes,
  fetchCaseStatuses,
} from '../features/cases/state';
import type { Contact } from '../features/contacts/state';
import { contactsApiClient } from '../features/contacts/api/contactsApiClient';
import { CASE_PRIORITY_OPTIONS } from '../features/cases/utils/casePriority';
import api from '../services/api';
import { useToast } from '../contexts/useToast';
import { useQuickLookup } from './dashboard';
import type { SearchResult } from './dashboard';
import type { CaseOutcome, CaseWithDetails, CreateCaseDTO, UpdateCaseDTO, CaseType } from '../types/case';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { CASE_OUTCOME_OPTIONS, formatCaseOutcomeLabel } from '../features/cases/utils/caseClassification';

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
}

interface CaseFormProps {
  caseId?: string;
  initialData?: Partial<CreateCaseDTO & UpdateCaseDTO>;
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

  const toggleSelection = <T extends string>(values: T[] | undefined, value: T): T[] => {
    const current = values || [];
    if (current.includes(value)) {
      return current.filter((item) => item !== value);
    }
    return [...current, value];
  };

  // Form state
  const [formData, setFormData] = useState<CreateCaseDTO & Partial<UpdateCaseDTO>>({
    contact_id: initialData?.contact_id || '',
    case_type_id: initialData?.case_type_id || '',
    case_type_ids: initialData?.case_type_ids?.length
      ? initialData.case_type_ids
      : initialData?.case_type_id
        ? [initialData.case_type_id]
        : [],
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    outcome: initialData?.outcome || undefined,
    source: initialData?.source || undefined,
    referral_source: initialData?.referral_source || '',
    assigned_to: initialData?.assigned_to || '',
    due_date: initialData?.due_date || '',
    is_urgent: initialData?.is_urgent || false,
    tags: initialData?.tags || [],
    case_outcome_values: initialData?.case_outcome_values?.length
      ? initialData.case_outcome_values
      : initialData?.outcome
        ? [initialData.outcome]
        : [],
    outcome_notes: initialData?.outcome_notes || '',
    closure_reason: initialData?.closure_reason || '',
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [canLoadAssignees, setCanLoadAssignees] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const lookup = useQuickLookup({ debounceMs: 250 });

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
  }, [dispatch]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty,
  });

  useEffect(() => {
    const loadSelectedContact = async (contactId: string) => {
      try {
        const contact = (await contactsApiClient.getContact(contactId)) as Contact;
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

  useEffect(() => {
    const loadAssignees = async () => {
      try {
        const response = await api.get('/users?is_active=true');
        const users = (response.data?.users || []) as AssigneeOption[];
        setAssignees(users);
      } catch {
        setCanLoadAssignees(false);
        setAssignees([]);
      }
    };

    loadAssignees();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContactQueryChange = (value: string) => {
    lookup.handleSearchChange(value);
    setSelectedContact(null);
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, contact_id: '' }));
  };

  const handleSelectContact = (contact: SearchResult) => {
    setSelectedContact(contact as Contact);
    setIsDirty(true);
    lookup.selectResult(
      `${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`
    );
    setFormData((prev) => ({ ...prev, contact_id: contact.contact_id }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setIsDirty(true);
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const selectedCaseTypeIds = formData.case_type_ids || [];
    const selectedCaseOutcomeValues = formData.case_outcome_values || [];

    if (!formData.contact_id || selectedCaseTypeIds.length === 0 || !formData.title) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      if (isEditMode && caseId) {
        const updateData: UpdateCaseDTO = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          case_type_id: selectedCaseTypeIds[0],
          case_type_ids: selectedCaseTypeIds,
          assigned_to: formData.assigned_to || undefined,
          due_date: formData.due_date || undefined,
          is_urgent: formData.is_urgent,
          tags: formData.tags,
          outcome: formData.outcome,
          case_outcome_values: selectedCaseOutcomeValues.length > 0 ? selectedCaseOutcomeValues : undefined,
          outcome_notes: formData.outcome_notes || undefined,
          closure_reason: formData.closure_reason || undefined,
        };
        await dispatch(updateCase({ id: caseId, data: updateData })).unwrap();
        setIsDirty(false);
        showSuccess('Case updated successfully');
      } else {
        const createData: CreateCaseDTO = {
          contact_id: formData.contact_id,
          case_type_id: selectedCaseTypeIds[0],
          case_type_ids: selectedCaseTypeIds,
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          outcome: formData.outcome,
          source: formData.source || undefined,
          referral_source: formData.referral_source || undefined,
          assigned_to: formData.assigned_to || undefined,
          due_date: formData.due_date || undefined,
          tags: formData.tags?.length ? formData.tags : undefined,
          is_urgent: formData.is_urgent,
          case_outcome_values: selectedCaseOutcomeValues.length > 0 ? selectedCaseOutcomeValues : undefined,
        };
        const createdCase = await dispatch(createCase(createData)).unwrap();
        setIsDirty(false);
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

  const hasSelectedAssignee = Boolean(
    formData.assigned_to && assignees.some((user) => user.id === formData.assigned_to)
  );
  const selectedCaseTypeIds = formData.case_type_ids || [];
  const selectedCaseTypeLabels = selectedCaseTypeIds
    .map((caseTypeId) => caseTypes.find((type: CaseType) => type.id === caseTypeId)?.name || caseTypeId)
    .filter((label): label is string => Boolean(label));
  const selectedCaseOutcomeValues = formData.case_outcome_values || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-app-accent-soft border border-app-border rounded-lg text-app-accent-text">{error}</div>
      )}

      {/* Contact Selection */}
      <div>
        <label htmlFor="case-contact-lookup" className="block text-sm font-medium text-app-text-label mb-2">
          Client <span className="text-app-accent">*</span>
        </label>
        <div className="relative">
          <input
            id="case-contact-lookup"
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

      {/* Case Types */}
      <div>
        <div className="mb-2">
          <label className="block text-sm font-medium text-app-text-label">
            Case Types <span className="text-app-accent">*</span>
          </label>
          <p className="text-xs text-app-text-muted">
            The first selected type remains the legacy primary type.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {caseTypes.map((type: CaseType) => {
            const checked = selectedCaseTypeIds.includes(type.id);
            return (
              <label
                key={type.id}
                className="flex items-start gap-3 rounded-lg border border-app-input-border bg-app-surface px-3 py-2 font-medium text-app-text"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setFormData((prev) => {
                      const nextCaseTypes = toggleSelection(prev.case_type_ids, type.id);
                      return {
                        ...prev,
                        case_type_ids: nextCaseTypes,
                        case_type_id: nextCaseTypes[0] || '',
                      };
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                />
                <span className="flex-1">
                  {type.name}
                  {type.description && (
                    <span className="mt-1 block text-xs text-app-text-muted">{type.description}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        {selectedCaseTypeLabels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCaseTypeLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className={`px-3 py-1 text-xs font-black uppercase border-2 border-black ${
                  index === 0 ? 'bg-[var(--loop-green)] text-black' : 'bg-app-surface-muted text-black'
                }`}
              >
                {label}
                {index === 0 && ' (Primary)'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="case-title" className="block text-sm font-medium text-app-text-label mb-2">
          Title <span className="text-app-accent">*</span>
        </label>
        <input
          id="case-title"
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
        <label htmlFor="case-description" className="block text-sm font-medium text-app-text-label mb-2">Description</label>
        <textarea
          id="case-description"
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
          <label htmlFor="case-priority" className="block text-sm font-medium text-app-text-label mb-2">Priority</label>
          <select
            id="case-priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
          >
            {CASE_PRIORITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="case-source" className="block text-sm font-medium text-app-text-label mb-2">Source</label>
          <select
            id="case-source"
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
          <label htmlFor="case-referral-source" className="block text-sm font-medium text-app-text-label mb-2">Referral Source</label>
          <input
            id="case-referral-source"
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
        <label htmlFor="case-due-date" className="block text-sm font-medium text-app-text-label mb-2">Due Date</label>
        <input
          id="case-due-date"
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
        />
      </div>

      {/* Assignment */}
      <div>
        <label htmlFor="case-assigned-to" className="block text-sm font-medium text-app-text-label mb-2">Assigned To</label>
        <select
          id="case-assigned-to"
          name="assigned_to"
          value={formData.assigned_to || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
        >
          <option value="">Unassigned</option>
          {formData.assigned_to && !hasSelectedAssignee && (
            <option value={formData.assigned_to}>Current assignee</option>
          )}
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </select>
        {!canLoadAssignees && (
          <p className="mt-1 text-sm text-app-text-muted">
            Assignee options are unavailable for your role; existing assignment will be preserved.
          </p>
        )}
      </div>

      {/* Urgent Checkbox */}
      <div>
        <label htmlFor="case-is-urgent" className="flex items-center gap-2">
          <input
            id="case-is-urgent"
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
        <label htmlFor="case-tag-input" className="block text-sm font-medium text-app-text-label mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            id="case-tag-input"
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
          aria-label={isEditMode ? 'Update Case' : 'Save Case'}
          data-testid="case-form-primary-submit"
          className="px-6 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Saving...' : isEditMode ? 'Update Case' : 'Save Case'}
        </button>
      </div>

      {isEditMode && (
        <div className="mt-8 pt-8 border-t border-app-border">
          <h3 className="text-lg font-bold mb-4 uppercase">Case Outcomes / Closure</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-app-text-label">Outcomes</label>
                <p className="text-xs text-app-text-muted">
                  Select every outcome that applies. The first selected value remains the legacy primary outcome.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {CASE_OUTCOME_OPTIONS.map((option) => {
                  const checked = selectedCaseOutcomeValues.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border border-app-input-border bg-app-surface px-3 py-2 font-medium text-app-text"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setFormData((prev) => {
                            const nextCaseOutcomes = toggleSelection(
                              prev.case_outcome_values as CaseOutcome[] | undefined,
                              option.value
                            );
                            return {
                              ...prev,
                              case_outcome_values: nextCaseOutcomes,
                              outcome: nextCaseOutcomes[0] || undefined,
                            };
                          })
                        }
                        className="h-4 w-4 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {selectedCaseOutcomeValues.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCaseOutcomeValues.map((value, index) => (
                    <span
                      key={`${value}-${index}`}
                      className={`px-3 py-1 text-xs font-black uppercase border-2 border-black ${
                        index === 0 ? 'bg-[var(--loop-green)] text-black' : 'bg-app-surface-muted text-black'
                      }`}
                    >
                      {formatCaseOutcomeLabel(value)}
                      {index === 0 && ' (Primary)'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="case-closure-reason" className="block text-sm font-medium text-app-text-label mb-2">Closure Reason</label>
                <input
                  id="case-closure-reason"
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
            <label htmlFor="case-outcome-notes" className="block text-sm font-medium text-app-text-label mb-2">Outcome Notes</label>
            <textarea
              id="case-outcome-notes"
              name="outcome_notes"
              value={formData.outcome_notes || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Final notes on the case outcome..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default CaseForm;
