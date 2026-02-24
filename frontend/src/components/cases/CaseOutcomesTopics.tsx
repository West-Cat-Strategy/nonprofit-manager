import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import { useToast } from '../../contexts/useToast';
import type {
  CaseOutcomeEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
  CreateCaseOutcomeDTO,
  CreateCaseTopicEventDTO,
} from '../../types/case';

interface CaseOutcomesTopicsProps {
  caseId: string;
  onChanged?: () => void;
}

const emptyOutcomeDraft = (): CreateCaseOutcomeDTO => ({
  outcome_type: '',
  outcome_date: new Date().toISOString().slice(0, 10),
  notes: '',
  visible_to_client: false,
});

const emptyTopicDraft = (): CreateCaseTopicEventDTO => ({
  topic_definition_id: '',
  topic_name: '',
  discussed_at: new Date().toISOString(),
  notes: '',
});

const CaseOutcomesTopics = ({ caseId, onChanged }: CaseOutcomesTopicsProps) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outcomes, setOutcomes] = useState<CaseOutcomeEvent[]>([]);
  const [topicDefinitions, setTopicDefinitions] = useState<CaseTopicDefinition[]>([]);
  const [topicEvents, setTopicEvents] = useState<CaseTopicEvent[]>([]);
  const [outcomeDraft, setOutcomeDraft] = useState<CreateCaseOutcomeDTO>(emptyOutcomeDraft);
  const [topicDraft, setTopicDraft] = useState<CreateCaseTopicEventDTO>(emptyTopicDraft);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'visible' | 'internal'>('all');
  const [outcomeSort, setOutcomeSort] = useState<'desc' | 'asc'>('desc');
  const [topicSearch, setTopicSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [outcomeRows, topicDefinitionRows, topicEventRows] = await Promise.all([
        casesApiClient.listCaseOutcomes(caseId),
        casesApiClient.listCaseTopicDefinitions(caseId),
        casesApiClient.listCaseTopicEvents(caseId),
      ]);
      setOutcomes(outcomeRows || []);
      setTopicDefinitions(topicDefinitionRows || []);
      setTopicEvents(topicEventRows || []);
    } catch {
      showError('Failed to load outcomes/topics');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredOutcomes = useMemo(() => {
    const visibilityFiltered = outcomes.filter((item) => {
      if (outcomeFilter === 'visible') return item.visible_to_client;
      if (outcomeFilter === 'internal') return !item.visible_to_client;
      return true;
    });

    return [...visibilityFiltered].sort((a, b) => {
      const aTime = new Date(a.outcome_date || a.created_at).getTime();
      const bTime = new Date(b.outcome_date || b.created_at).getTime();
      return outcomeSort === 'desc' ? bTime - aTime : aTime - bTime;
    });
  }, [outcomes, outcomeFilter, outcomeSort]);

  const filteredTopicEvents = useMemo(() => {
    const query = topicSearch.trim().toLowerCase();
    if (!query) return topicEvents;
    return topicEvents.filter((event) =>
      `${event.topic_name || ''} ${event.notes || ''}`.toLowerCase().includes(query)
    );
  }, [topicEvents, topicSearch]);

  const createOutcome = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!outcomeDraft.outcome_type?.trim() && !outcomeDraft.notes?.trim()) {
      showError('Provide an outcome type or notes');
      return;
    }

    try {
      setSaving(true);
      await casesApiClient.createCaseOutcome(caseId, {
        outcome_type: outcomeDraft.outcome_type?.trim() || undefined,
        outcome_date: outcomeDraft.outcome_date || undefined,
        notes: outcomeDraft.notes?.trim() || undefined,
        visible_to_client: Boolean(outcomeDraft.visible_to_client),
      });
      setOutcomeDraft(emptyOutcomeDraft());
      await load();
      onChanged?.();
      showSuccess('Outcome recorded');
    } catch {
      showError('Failed to record outcome');
    } finally {
      setSaving(false);
    }
  };

  const toggleOutcomeVisibility = async (outcome: CaseOutcomeEvent) => {
    try {
      setSaving(true);
      await casesApiClient.updateCaseOutcome(outcome.id, {
        visible_to_client: !outcome.visible_to_client,
      });
      await load();
      onChanged?.();
    } catch {
      showError('Failed to update outcome visibility');
    } finally {
      setSaving(false);
    }
  };

  const deleteOutcome = async (outcomeId: string) => {
    if (!window.confirm('Delete this outcome?')) return;
    try {
      setSaving(true);
      await casesApiClient.deleteCaseOutcome(outcomeId);
      await load();
      onChanged?.();
      showSuccess('Outcome removed');
    } catch {
      showError('Failed to delete outcome');
    } finally {
      setSaving(false);
    }
  };

  const createTopicEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topicDraft.topic_definition_id && !topicDraft.topic_name?.trim()) {
      showError('Select a topic or create one by name');
      return;
    }

    try {
      setSaving(true);
      await casesApiClient.createCaseTopicEvent(caseId, {
        topic_definition_id: topicDraft.topic_definition_id || undefined,
        topic_name: topicDraft.topic_name?.trim() || undefined,
        discussed_at: topicDraft.discussed_at || undefined,
        notes: topicDraft.notes?.trim() || undefined,
      });
      setTopicDraft(emptyTopicDraft());
      await load();
      onChanged?.();
      showSuccess('Topic added');
    } catch {
      showError('Failed to add topic');
    } finally {
      setSaving(false);
    }
  };

  const createTopicDefinition = async () => {
    const name = topicDraft.topic_name?.trim();
    if (!name) {
      showError('Enter a topic name');
      return;
    }

    try {
      setSaving(true);
      const definition = await casesApiClient.createCaseTopicDefinition(caseId, { name });
      setTopicDefinitions((current) => [definition, ...current]);
      setTopicDraft((current) => ({
        ...current,
        topic_definition_id: definition.id,
      }));
      showSuccess('Topic definition created');
    } catch {
      showError('Failed to create topic definition');
    } finally {
      setSaving(false);
    }
  };

  const deleteTopicEvent = async (topicEventId: string) => {
    if (!window.confirm('Remove this topic from the case?')) return;
    try {
      setSaving(true);
      await casesApiClient.deleteCaseTopicEvent(topicEventId);
      await load();
      onChanged?.();
      showSuccess('Topic removed');
    } catch {
      showError('Failed to remove topic');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-app-text-muted">Loading outcomes and topics...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <form onSubmit={createOutcome} className="rounded-lg border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-base font-semibold text-app-text">Record Outcome</h3>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Outcome Type</span>
            <input
              value={outcomeDraft.outcome_type || ''}
              onChange={(event) =>
                setOutcomeDraft((current) => ({ ...current, outcome_type: event.target.value }))
              }
              placeholder="e.g. housing_stabilized"
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Date</span>
            <input
              type="date"
              value={outcomeDraft.outcome_date || ''}
              onChange={(event) =>
                setOutcomeDraft((current) => ({ ...current, outcome_date: event.target.value }))
              }
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Notes</span>
            <textarea
              value={outcomeDraft.notes || ''}
              onChange={(event) => setOutcomeDraft((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
            <input
              type="checkbox"
              checked={Boolean(outcomeDraft.visible_to_client)}
              onChange={(event) =>
                setOutcomeDraft((current) => ({
                  ...current,
                  visible_to_client: event.target.checked,
                }))
              }
              className="rounded border-app-input-border"
            />
            Visible to client
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-app-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add Outcome'}
            </button>
          </div>
        </form>

        <form onSubmit={createTopicEvent} className="rounded-lg border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-base font-semibold text-app-text">Tag Topic</h3>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Existing Topic</span>
            <select
              value={topicDraft.topic_definition_id || ''}
              onChange={(event) =>
                setTopicDraft((current) => ({
                  ...current,
                  topic_definition_id: event.target.value,
                }))
              }
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="">Select topic</option>
              {topicDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Or New Topic Name</span>
            <div className="flex gap-2">
              <input
                value={topicDraft.topic_name || ''}
                onChange={(event) =>
                  setTopicDraft((current) => ({ ...current, topic_name: event.target.value }))
                }
                placeholder="e.g. Employment planning"
                className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void createTopicDefinition()}
                disabled={saving}
                className="rounded border border-app-input-border px-3 py-2 text-xs"
              >
                Create
              </button>
            </div>
          </label>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Discussed At</span>
            <input
              type="datetime-local"
              value={(topicDraft.discussed_at || '').slice(0, 16)}
              onChange={(event) =>
                setTopicDraft((current) => ({
                  ...current,
                  discussed_at: event.target.value ? new Date(event.target.value).toISOString() : '',
                }))
              }
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-2 block text-sm">
            <span className="mb-1 block text-app-text-muted">Notes</span>
            <textarea
              value={topicDraft.notes || ''}
              onChange={(event) => setTopicDraft((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-app-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-app-text">Outcomes</h3>
          <div className="flex gap-2">
            <select
              value={outcomeFilter}
              onChange={(event) => setOutcomeFilter(event.target.value as 'all' | 'visible' | 'internal')}
              className="rounded border border-app-input-border px-2 py-1 text-xs"
            >
              <option value="all">All</option>
              <option value="visible">Client visible</option>
              <option value="internal">Internal</option>
            </select>
            <select
              value={outcomeSort}
              onChange={(event) => setOutcomeSort(event.target.value as 'desc' | 'asc')}
              className="rounded border border-app-input-border px-2 py-1 text-xs"
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
          </div>
        </div>
        {filteredOutcomes.length === 0 ? (
          <p className="text-sm text-app-text-muted">No outcomes recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredOutcomes.map((outcome) => (
              <div key={outcome.id} className="flex items-start justify-between rounded border border-app-border p-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {outcome.outcome_type || 'Outcome'} ·{' '}
                    {new Date(outcome.outcome_date || outcome.created_at).toLocaleDateString()}
                  </p>
                  {outcome.notes && <p className="mt-1 text-sm text-app-text">{outcome.notes}</p>}
                  <span
                    className={`mt-1 inline-flex rounded px-2 py-0.5 text-xs ${
                      outcome.visible_to_client
                        ? 'bg-green-100 text-green-800'
                        : 'bg-app-surface-muted text-app-text-muted'
                    }`}
                  >
                    {outcome.visible_to_client ? 'Client visible' : 'Internal'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-app-input-border px-2 py-1 text-xs"
                    onClick={() => void toggleOutcomeVisibility(outcome)}
                  >
                    Toggle visibility
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                    onClick={() => void deleteOutcome(outcome.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-app-text">Topics Discussed</h3>
          <input
            value={topicSearch}
            onChange={(event) => setTopicSearch(event.target.value)}
            placeholder="Filter topics"
            className="rounded border border-app-input-border px-2 py-1 text-xs"
          />
        </div>
        {filteredTopicEvents.length === 0 ? (
          <p className="text-sm text-app-text-muted">No topics tagged yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredTopicEvents.map((topicEvent) => (
              <div key={topicEvent.id} className="flex items-start justify-between rounded border border-app-border p-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">{topicEvent.topic_name || 'Topic'}</p>
                  <p className="text-xs text-app-text-muted">
                    {new Date(topicEvent.discussed_at || topicEvent.created_at).toLocaleString()}
                  </p>
                  {topicEvent.notes && <p className="mt-1 text-sm text-app-text">{topicEvent.notes}</p>}
                </div>
                <button
                  type="button"
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                  onClick={() => void deleteTopicEvent(topicEvent.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseOutcomesTopics;

