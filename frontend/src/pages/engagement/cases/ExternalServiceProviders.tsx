import { useEffect, useMemo, useState } from 'react';
import { NeoBrutalistLayout, BrutalCard, BrutalButton, BrutalBadge } from '../../../components/neo-brutalist';
import api from '../../../services/api';
import type { ExternalServiceProvider, ExternalServiceProvidersResponse } from '../../../types/case';

const PROVIDER_TYPES = [
  'social_worker',
  'legal',
  'medical',
  'massage',
  'counselling',
  'chiropractic',
  'housing',
  'education',
  'financial',
  'other',
];

const ExternalServiceProviders = () => {
  const [providers, setProviders] = useState<ExternalServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState('other');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const totalAttachedCases = useMemo(
    () => providers.reduce((sum, provider) => sum + (provider.attached_cases_count || 0), 0),
    [providers]
  );

  const loadProviders = async (searchTerm = search) => {
    try {
      setLoading(true);
      const response = await api.get<ExternalServiceProvidersResponse>('/external-service-providers', {
        params: { search: searchTerm || undefined, include_inactive: true, limit: 250 },
      });
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load external service providers:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setProviderName('');
    setProviderType('other');
    setNotes('');
    setIsActive(true);
  };

  const handleEdit = (provider: ExternalServiceProvider) => {
    setEditingId(provider.id);
    setProviderName(provider.provider_name);
    setProviderType(provider.provider_type || 'other');
    setNotes(provider.notes || '');
    setIsActive(provider.is_active);
  };

  const handleSubmit = async () => {
    const trimmedName = providerName.trim();
    if (!trimmedName) return;

    try {
      setSaving(true);
      const payload = {
        provider_name: trimmedName,
        provider_type: providerType || null,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      if (editingId) {
        await api.put(`/external-service-providers/${editingId}`, payload);
      } else {
        await api.post('/external-service-providers', payload);
      }

      resetForm();
      await loadProviders();
    } catch (error) {
      console.error('Failed to save external service provider:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this provider? Existing case records stay linked.')) return;

    try {
      await api.delete(`/external-service-providers/${id}`);
      await loadProviders();
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to archive provider:', error);
    }
  };

  return (
    <NeoBrutalistLayout pageTitle="External Service Providers">
      <div className="p-6 space-y-6">
        <BrutalCard color="yellow" className="p-6">
          <h1 className="text-3xl font-black uppercase text-black">External Service Providers</h1>
          <p className="mt-2 font-bold text-black/70">
            Central directory for providers used across case service records.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            <BrutalBadge color="blue">{providers.length} Providers</BrutalBadge>
            <BrutalBadge color="green">{totalAttachedCases} Case Attachments</BrutalBadge>
          </div>
        </BrutalCard>

        <BrutalCard color="white" className="p-6 space-y-4">
          <h2 className="text-lg font-black uppercase text-black">
            {editingId ? 'Edit Provider' : 'Add Provider'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1">Provider Name *</label>
              <input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                placeholder="Organization or Individual"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Provider Type/Specialty</label>
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
                className="w-full p-2 border-2 border-black bg-white font-bold focus:outline-none"
              >
                {PROVIDER_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border-2 border-black font-bold focus:outline-none"
              placeholder="Optional notes about this provider"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-black uppercase">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            Active
          </label>
          <div className="flex gap-2">
            <BrutalButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!providerName.trim() || saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update Provider' : 'Create Provider'}
            </BrutalButton>
            {editingId && (
              <BrutalButton variant="secondary" size="sm" onClick={resetForm}>
                Cancel Edit
              </BrutalButton>
            )}
          </div>
        </BrutalCard>

        <BrutalCard color="white" className="p-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase mb-1">Search Providers</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                placeholder="Search by provider name"
              />
            </div>
            <BrutalButton variant="secondary" size="sm" onClick={() => loadProviders(search)}>
              Search
            </BrutalButton>
            <BrutalButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                loadProviders('');
              }}
            >
              Clear
            </BrutalButton>
          </div>

          {loading ? (
            <div className="py-8 text-center font-black uppercase text-black/60">Loading providers...</div>
          ) : providers.length === 0 ? (
            <div className="py-8 text-center font-black uppercase text-black/60">No providers found.</div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div key={provider.id} className="border-2 border-black p-4 bg-app-surface">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black uppercase text-black">{provider.provider_name}</h3>
                        <BrutalBadge color={provider.is_active ? 'green' : 'gray'}>
                          {provider.is_active ? 'Active' : 'Archived'}
                        </BrutalBadge>
                        {provider.provider_type && (
                          <BrutalBadge color="purple">{provider.provider_type}</BrutalBadge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-black/60 uppercase">
                        Attached to {provider.attached_cases_count || 0} case(s) / {provider.attached_services_count || 0} service log(s)
                      </p>
                      {provider.notes && (
                        <p className="mt-1 text-sm font-medium text-black/80">{provider.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <BrutalButton size="sm" variant="secondary" onClick={() => handleEdit(provider)}>
                        Edit
                      </BrutalButton>
                      {provider.is_active && (
                        <BrutalButton size="sm" variant="danger" onClick={() => handleArchive(provider.id)}>
                          Archive
                        </BrutalButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BrutalCard>
      </div>
    </NeoBrutalistLayout>
  );
};

export default ExternalServiceProviders;
