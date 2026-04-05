import { useEffect, useMemo, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { RELATIONSHIP_TYPES } from '../../../types/contact';
import { useToast } from '../../../contexts/useToast';
import PortalPageState from '../../../components/portal/PortalPageState';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';

interface PortalRelationship {
  id: string;
  relationship_type: string;
  relationship_label: string | null;
  notes: string | null;
  related_contact_first_name: string | null;
  related_contact_last_name: string | null;
  related_contact_email: string | null;
  related_contact_phone: string | null;
}

export default function PortalPeople() {
  const [relationships, setRelationships] = useState<PortalRelationship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    relationship_type: 'contact_person',
    relationship_label: '',
    notes: '',
  });

  const visibleRelationships = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...relationships].sort((a, b) => {
      const aName = `${a.related_contact_first_name || ''} ${a.related_contact_last_name || ''}`.trim().toLowerCase();
      const bName = `${b.related_contact_first_name || ''} ${b.related_contact_last_name || ''}`.trim().toLowerCase();
      if (aName === bName) {
        return 0;
      }
      return sortOrder === 'az' ? (aName < bName ? -1 : 1) : aName > bName ? -1 : 1;
    });

    return sorted.filter((relationship) => {
      if (!needle) {
        return true;
      }

      const haystack = [
        relationship.related_contact_first_name,
        relationship.related_contact_last_name,
        relationship.related_contact_email,
        relationship.related_contact_phone,
        relationship.relationship_label,
        relationship.relationship_type,
        relationship.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [relationships, searchTerm, sortOrder]);

  const loadRelationships = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/relationships');
      setRelationships(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load relationships', loadError);
      setError('Unable to load associated people right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRelationships();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await portalApi.post('/v2/portal/relationships', {
        relationship_type: formData.relationship_type,
        relationship_label: formData.relationship_label || undefined,
        notes: formData.notes || undefined,
        related_contact: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        },
      });
      setRelationships((prev) => [unwrapApiData(response.data), ...prev]);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        relationship_type: 'contact_person',
        relationship_label: '',
        notes: '',
      });
      showSuccess('Person added.');
    } catch (submitError) {
      console.error('Failed to add person', submitError);
      showError('Could not add person.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    const confirmed = await confirm({
      title: 'Remove person',
      message: 'Are you sure you want to remove this person from your portal list?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;

    const previous = relationships;
    setRemovingId(id);
    setRelationships((prev) => prev.filter((relationship) => relationship.id !== id));
    try {
      await portalApi.delete(`/v2/portal/relationships/${id}`);
      showSuccess('Person removed.');
    } catch (removeError) {
      console.error('Failed to remove relationship', removeError);
      setRelationships(previous);
      showError('Could not remove person.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <PortalPageShell
      title="Associated People"
      description="Add and manage family members or support contacts connected to your account."
    >
      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <h3 className="text-base font-semibold text-app-text">Add Person</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              name="first_name"
              aria-label="First name"
              placeholder="First name"
              value={formData.first_name}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
              required
            />
            <input
              name="last_name"
              aria-label="Last name"
              placeholder="Last name"
              value={formData.last_name}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              name="email"
              aria-label="Email address"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
            />
            <input
              name="phone"
              aria-label="Phone number"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              name="relationship_type"
              aria-label="Relationship type"
              value={formData.relationship_type}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              name="relationship_label"
              aria-label="Custom relationship label"
              placeholder="Custom label"
              value={formData.relationship_label}
              onChange={handleChange}
              className="rounded-md border border-app-input-border px-3 py-2"
            />
          </div>
          <textarea
            name="notes"
            aria-label="Relationship notes"
            placeholder="Notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full rounded-md border border-app-input-border px-3 py-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Person'}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-app-text">Current People</h3>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Search people"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search people"
              className="rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
            <select
              aria-label="Sort people"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'az' | 'za')}
              className="rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="az">A to Z</option>
              <option value="za">Z to A</option>
            </select>
          </div>
        </div>
        <PortalPageState
          loading={loading}
          error={error}
          empty={!loading && !error && visibleRelationships.length === 0}
          loadingLabel="Loading associated people..."
          emptyTitle={searchTerm ? 'No matching people.' : 'No associated people yet.'}
          emptyDescription={
            searchTerm
              ? 'Try a different search term.'
              : 'Add family members or important contacts above.'
          }
          onRetry={loadRelationships}
        />
        {!loading && !error && visibleRelationships.length > 0 && (
          <ul className="space-y-3">
            {visibleRelationships.map((rel) => (
              <li key={rel.id}>
                <PortalListCard
                  title={`${rel.related_contact_first_name || ''} ${rel.related_contact_last_name || ''}`.trim() || 'Unnamed contact'}
                  subtitle={rel.relationship_label || rel.relationship_type}
                  meta={rel.related_contact_email || rel.related_contact_phone || undefined}
                  actions={
                    <button
                      onClick={() => void handleRemove(rel.id)}
                      disabled={removingId === rel.id}
                      className="rounded border border-app-border px-2 py-1 text-xs text-app-accent-text"
                    >
                      {removingId === rel.id ? 'Removing...' : 'Remove'}
                    </button>
                  }
                >
                  {rel.notes && <p className="text-sm text-app-text-muted">{rel.notes}</p>}
                </PortalListCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </PortalPageShell>
  );
}
