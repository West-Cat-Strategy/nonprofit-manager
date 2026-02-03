import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createCase,
  updateCase,
  fetchCaseTypes,
  fetchCaseStatuses,
} from '../store/slices/casesSlice';
import { fetchContacts } from '../store/slices/contactsSlice';
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
  const { contacts } = useAppSelector((state) => state.contacts);

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

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
    dispatch(fetchContacts({ page: 1, limit: 100 }));
  }, [dispatch]);

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
        <select
          name="contact_id"
          value={formData.contact_id}
          onChange={handleChange}
          required
          disabled={isEditMode || (disableContactSelection && Boolean(formData.contact_id))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        >
          <option value="">Select a client...</option>
          {contacts.map((contact) => (
            <option key={contact.contact_id} value={contact.contact_id}>
              {contact.first_name} {contact.last_name} - {contact.email}
            </option>
          ))}
        </select>
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
