import type { CreateContactRelationshipDTO, RelationshipType } from '../../../types/contact';
import type { ContactRelationship } from '../../../types/contact';
import type { ContactRecord } from '../types';
import { RELATIONSHIP_TYPES } from '../../../types/contact';

interface RelationshipsSectionProps {
  mode: 'create' | 'edit';
  firstName: string;
  relationshipsLoading: boolean;
  relationships: ContactRelationship[];
  contacts: ContactRecord[];
  isAddingRelationship: boolean;
  relationshipSearch: string;
  relationshipData: CreateContactRelationshipDTO;
  filteredContacts: ContactRecord[];
  onRelationshipSearchChange: (value: string) => void;
  onSelectRelationshipContact: (contact: ContactRecord) => void;
  onRelationshipTypeChange: (type: RelationshipType) => void;
  onRelationshipLabelChange: (label: string) => void;
  onSubmitRelationship: (event: React.FormEvent) => void;
  onCancelRelationship: () => void;
  onStartRelationship: () => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onNavigateToContact: (contactId: string) => void;
  onCreateNewContact: (searchText: string) => void;
}

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

export default function RelationshipsSection({
  mode,
  firstName,
  relationshipsLoading,
  relationships,
  contacts: _contacts,
  isAddingRelationship,
  relationshipSearch,
  relationshipData,
  filteredContacts,
  onRelationshipSearchChange,
  onSelectRelationshipContact,
  onRelationshipTypeChange,
  onRelationshipLabelChange,
  onSubmitRelationship,
  onCancelRelationship,
  onStartRelationship,
  onDeleteRelationship,
  onNavigateToContact,
  onCreateNewContact,
}: RelationshipsSectionProps) {
  return (
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">
        {firstName ? `${firstName}'s People` : 'Associated People'}
      </h2>

      {mode === 'create' ? (
        <div className="text-center py-6 bg-app-surface-muted rounded-lg">
          <div className="text-app-text-subtle text-2xl mb-2">👥</div>
          <p className="text-app-text-muted text-sm">
            Save this person first, then you can add relationships.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relationshipsLoading && relationships.length === 0 ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent mx-auto"></div>
            </div>
          ) : relationships.length === 0 && !isAddingRelationship ? (
            <div className="text-center py-6 bg-app-surface-muted rounded-lg">
              <div className="text-app-text-subtle text-2xl mb-1">👥</div>
              <p className="text-app-text-muted text-sm">No associated people yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-app-surface-muted border-app-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getRelationshipIcon(rel.relationship_type)}</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => onNavigateToContact(rel.related_contact_id)}
                        className="font-medium text-app-text hover:text-app-accent"
                      >
                        {rel.related_contact_first_name} {rel.related_contact_last_name}
                      </button>
                      <div className="text-sm text-app-text-muted">
                        {rel.relationship_label || getRelationshipLabel(rel.relationship_type)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRelationship(rel.id)}
                    className="p-1 text-app-text-subtle hover:text-red-500 transition"
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

          {isAddingRelationship ? (
            <form
              onSubmit={onSubmitRelationship}
              className="bg-app-accent-soft rounded-lg p-4 border border-app-accent-soft"
            >
              <h4 className="font-medium mb-3">Add Person</h4>

              <div className="mb-3">
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Find Person
                </label>
                <input
                  type="text"
                  value={relationshipSearch}
                  onChange={(e) => onRelationshipSearchChange(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
                />
                {relationshipSearch && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-app-border rounded-lg bg-app-surface">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.slice(0, 10).map((contact) => (
                        <button
                          key={contact.contact_id}
                          type="button"
                          onClick={() => onSelectRelationshipContact(contact)}
                          className={`w-full text-left px-3 py-2 hover:bg-app-surface-muted ${
                            relationshipData.related_contact_id === contact.contact_id
                              ? 'bg-app-accent-soft'
                              : ''
                          }`}
                        >
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.email && <div className="text-sm text-app-text-muted">{contact.email}</div>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center">
                        <p className="text-sm text-app-text-muted mb-2">No matching people found</p>
                        <button
                          type="button"
                          onClick={() => onCreateNewContact(relationshipSearch)}
                          className="text-sm text-app-accent hover:text-app-accent-text font-medium"
                        >
                          + Create "{relationshipSearch}" as new person
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="relationship_type" className="block text-sm font-medium text-app-text-muted mb-1">
                  Relationship
                </label>
                <select
                  id="relationship_type"
                  value={relationshipData.relationship_type}
                  onChange={(e) => onRelationshipTypeChange(e.target.value as RelationshipType)}
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
                >
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Custom Label (optional)
                </label>
                <input
                  type="text"
                  value={relationshipData.relationship_label || ''}
                  onChange={(e) => onRelationshipLabelChange(e.target.value)}
                  placeholder="e.g., Mother, Case Worker, etc."
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={onCancelRelationship}
                  className="px-3 py-1.5 text-sm border border-app-input-border rounded-lg hover:bg-app-surface-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!relationshipData.related_contact_id}
                  className="px-3 py-1.5 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
                >
                  Add
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={onStartRelationship}
              className="w-full px-3 py-2 text-sm text-app-accent border border-dashed border-app-accent rounded-lg hover:bg-app-accent-soft transition"
            >
              + Add Person
            </button>
          )}
        </div>
      )}
    </div>
  );
}
