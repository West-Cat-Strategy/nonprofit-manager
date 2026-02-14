import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContactRelationships,
  createContactRelationship,
  deleteContactRelationship,
  fetchContacts,
} from '../store/slices/contactsSlice';
import type { CreateContactRelationshipDTO, RelationshipType } from '../types/contact';
import { RELATIONSHIP_TYPES } from '../types/contact';

interface ContactRelationshipsProps {
  contactId: string;
}

const ContactRelationships = ({ contactId }: ContactRelationshipsProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { relationships, relationshipsLoading, contacts } = useAppSelector(
    (state) => state.contacts
  );
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateContactRelationshipDTO>({
    related_contact_id: '',
    relationship_type: 'contact_person',
    relationship_label: '',
    is_bidirectional: true, // Always create reverse relationship
    inverse_relationship_type: undefined,
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchContactRelationships(contactId));
  }, [dispatch, contactId]);

  // Load contacts for search
  useEffect(() => {
    if (isAdding && contacts.length === 0) {
      dispatch(fetchContacts({ limit: 100 }));
    }
  }, [dispatch, isAdding, contacts.length]);

  const resetForm = () => {
    setFormData({
      related_contact_id: '',
      relationship_type: 'contact_person',
      relationship_label: '',
      is_bidirectional: true, // Always create reverse relationship
      inverse_relationship_type: undefined,
      notes: '',
    });
    setSearchTerm('');
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.related_contact_id) {
      alert('Please select a contact');
      return;
    }

    try {
      await dispatch(createContactRelationship({ contactId, data: formData })).unwrap();
      resetForm();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to create relationship'));
    }
  };

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) return;

    try {
      await dispatch(deleteContactRelationship(relationshipId)).unwrap();
    } catch (error) {
      console.error('Failed to delete relationship:', error);
    }
  };

  const getRelationshipLabel = (type: RelationshipType) => {
    const found = RELATIONSHIP_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const getRelationshipIcon = (type: RelationshipType) => {
    const icons: Record<RelationshipType, string> = {
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

  // Filter contacts for search (exclude current contact)
  const filteredContacts = contacts.filter(
    (c) =>
      c.contact_id !== contactId &&
      (searchTerm === '' ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Relationships List */}
      {relationshipsLoading && relationships.length === 0 ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent mx-auto"></div>
        </div>
      ) : relationships.length === 0 && !isAdding ? (
        <div className="text-center py-6 bg-app-surface-muted rounded-lg">
          <div className="text-app-text-subtle text-2xl mb-1">🔗</div>
          <p className="text-app-text-muted text-sm">No associated contacts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-app-surface border-app-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getRelationshipIcon(rel.relationship_type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/contacts/${rel.related_contact_id}`)}
                      className="font-medium text-app-text hover:text-app-accent"
                    >
                      {rel.related_contact_first_name} {rel.related_contact_last_name}
                    </button>
                  </div>
                  <div className="text-sm text-app-text-muted">
                    {rel.relationship_label || getRelationshipLabel(rel.relationship_type)}
                    {rel.is_bidirectional && (
                      <span className="ml-2 text-xs text-app-text-subtle">(bidirectional)</span>
                    )}
                  </div>
                  {rel.notes && <div className="text-xs text-app-text-subtle mt-1">{rel.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/contacts/${rel.related_contact_id}`)}
                  className="p-1 text-app-text-subtle hover:text-app-accent transition"
                  title="View contact"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(rel.id)}
                  className="p-1 text-app-text-subtle hover:text-red-500 transition"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-app-surface-muted rounded-lg p-4 border border-app-border">
          <h4 className="font-medium mb-3">Add Associated Contact</h4>

          {/* Contact Search */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-app-text-muted mb-1">Search Contact</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
            {searchTerm && (
              <div className="mt-1 max-h-40 overflow-y-auto border border-app-border rounded-lg bg-app-surface">
                {filteredContacts.length > 0 ? (
                  filteredContacts.slice(0, 10).map((c) => (
                    <button
                      key={c.contact_id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, related_contact_id: c.contact_id }));
                        setSearchTerm(`${c.first_name} ${c.last_name}`);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-app-surface-muted ${
                        formData.related_contact_id === c.contact_id ? 'bg-app-accent-soft' : ''
                      }`}
                    >
                      <div className="font-medium">
                        {c.first_name} {c.last_name}
                      </div>
                      {c.email && <div className="text-sm text-app-text-muted">{c.email}</div>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-center">
                    <p className="text-sm text-app-text-muted mb-2">No matching people found</p>
                    <button
                      type="button"
                      onClick={() => {
                        const nameParts = searchTerm.trim().split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const params = new URLSearchParams();
                        if (firstName) params.set('first_name', firstName);
                        if (lastName) params.set('last_name', lastName);
                        params.set('return_to', contactId);
                        window.open(`/contacts/new?${params.toString()}`, '_blank');
                      }}
                      className="text-sm text-app-accent hover:text-app-accent-text font-medium"
                    >
                      + Create "{searchTerm}" as new person
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relationship Type */}
          <div className="mb-3">
            <label htmlFor="rel_relationship_type" className="block text-sm font-medium text-app-text-muted mb-1">Relationship Type</label>
            <select
              id="rel_relationship_type"
              value={formData.relationship_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  relationship_type: e.target.value as RelationshipType,
                }))
              }
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
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
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Custom Label (optional)
            </label>
            <input
              type="text"
              value={formData.relationship_label || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, relationship_label: e.target.value }))
              }
              placeholder="e.g., Mother, Case Worker, etc."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-app-text-muted mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Additional information about this relationship..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-sm border border-app-input-border rounded-lg hover:bg-app-surface-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.related_contact_id}
              className="px-3 py-1.5 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
            >
              Add Relationship
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 text-sm text-app-accent border border-dashed border-app-accent rounded-lg hover:bg-app-accent-soft transition"
        >
          + Add Associated Contact
        </button>
      )}
    </div>
  );
};

export default ContactRelationships;
