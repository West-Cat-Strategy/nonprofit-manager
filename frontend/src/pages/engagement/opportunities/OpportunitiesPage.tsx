import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  createOpportunity,
  createOpportunityStage,
  deleteOpportunity,
  fetchOpportunities,
  fetchOpportunityStages,
  fetchOpportunitySummary,
  moveOpportunityStage,
  reorderOpportunityStages,
  updateOpportunity,
} from '../../../store/slices/opportunitiesSlice';
import type {
  CreateOpportunityDTO,
  Opportunity,
  OpportunityStatus,
  UpdateOpportunityDTO,
} from '../../../types/opportunity';

const defaultOpportunityForm: CreateOpportunityDTO = {
  name: '',
  description: '',
  amount: undefined,
  currency: 'USD',
  status: 'open',
  source: '',
};

const stageColor = (index: number): string => {
  const colors = [
    'bg-[var(--loop-blue)]',
    'bg-[var(--loop-green)]',
    'bg-[var(--loop-cyan)]',
    'bg-[var(--loop-yellow)]',
    'bg-[var(--loop-pink)]',
  ];

  return colors[index % colors.length];
};

const formatMoney = (value?: string | null): string => {
  if (!value) return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return numeric.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
};

const opportunitiesForStage = (opportunities: Opportunity[], stageId: string): Opportunity[] =>
  opportunities
    .filter((opportunity) => opportunity.stage_id === stageId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

export default function OpportunitiesPage() {
  const dispatch = useAppDispatch();
  const { opportunities, stages, summary, loading, error } = useAppSelector((state) => state.opportunities);

  const [form, setForm] = useState<CreateOpportunityDTO>(defaultOpportunityForm);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [newStageName, setNewStageName] = useState('');

  useEffect(() => {
    dispatch(fetchOpportunityStages());
    dispatch(fetchOpportunities({ limit: 200 }));
    dispatch(fetchOpportunitySummary());
  }, [dispatch]);

  const stageOptions = useMemo(
    () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
    [stages]
  );

  const refresh = async () => {
    await dispatch(fetchOpportunityStages());
    await dispatch(fetchOpportunities({ limit: 200 }));
    await dispatch(fetchOpportunitySummary());
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name?.trim()) return;

    await dispatch(
      createOpportunity({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        source: form.source?.trim() || undefined,
        amount: form.amount,
        stage_id: form.stage_id,
      })
    );

    setForm(defaultOpportunityForm);
    setShowCreate(false);
    await refresh();
  };

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingOpportunity) return;

    const payload: UpdateOpportunityDTO = {
      name: editingOpportunity.name,
      description: editingOpportunity.description || null,
      status: editingOpportunity.status,
      source: editingOpportunity.source || null,
      loss_reason: editingOpportunity.loss_reason || null,
      stage_id: editingOpportunity.stage_id,
      amount: editingOpportunity.amount ? Number(editingOpportunity.amount) : null,
      currency: editingOpportunity.currency,
      expected_close_date: editingOpportunity.expected_close_date || null,
    };

    await dispatch(
      updateOpportunity({
        opportunityId: editingOpportunity.id,
        data: payload,
      })
    );

    setEditingOpportunity(null);
    await refresh();
  };

  const moveStage = async (opportunityId: string, stageId: string) => {
    await dispatch(moveOpportunityStage({ opportunityId, stageId }));
    await refresh();
  };

  const removeOpportunity = async (opportunityId: string) => {
    if (!window.confirm('Delete this opportunity?')) return;
    await dispatch(deleteOpportunity(opportunityId));
    await refresh();
  };

  const reorderStage = async (currentIndex: number, direction: -1 | 1) => {
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= stageOptions.length) return;

    const reordered = [...stageOptions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);

    await dispatch(reorderOpportunityStages(reordered.map((stage) => stage.id)));
    await refresh();
  };

  const addStage = async () => {
    const name = newStageName.trim();
    if (!name) return;

    await dispatch(
      createOpportunityStage({
        name,
      })
    );

    setNewStageName('');
    await refresh();
  };

  return (
    <NeoBrutalistLayout pageTitle="OPPORTUNITIES">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--app-text)]">Opportunities</h1>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Track pipeline stages, movement, and weighted revenue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-4 py-2 font-bold text-black shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            {showCreate ? 'Close' : 'New Opportunity'}
          </button>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="border-2 border-[var(--app-border)] bg-[var(--loop-blue)] p-3"><p className="text-xs font-bold uppercase">Total</p><p className="text-2xl font-black">{summary.total}</p></div>
            <div className="border-2 border-[var(--app-border)] bg-[var(--loop-green)] p-3"><p className="text-xs font-bold uppercase">Open</p><p className="text-2xl font-black">{summary.open}</p></div>
            <div className="border-2 border-[var(--app-border)] bg-[var(--loop-cyan)] p-3"><p className="text-xs font-bold uppercase">Won</p><p className="text-2xl font-black">{summary.won}</p></div>
            <div className="border-2 border-[var(--app-border)] bg-[var(--loop-pink)] p-3"><p className="text-xs font-bold uppercase">Lost</p><p className="text-2xl font-black">{summary.lost}</p></div>
            <div className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] p-3"><p className="text-xs font-bold uppercase">Weighted</p><p className="text-xl font-black">{summary.weighted_amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</p></div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
          <input
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value)}
            placeholder="New stage name"
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          />
          <button
            type="button"
            onClick={() => void addStage()}
            className="border-2 border-[var(--app-border)] bg-[var(--loop-cyan)] px-3 py-2 font-bold"
          >
            Add Stage
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={submitCreate}
            className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]"
          >
            <h2 className="mb-3 text-lg font-black">Create Opportunity</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col text-sm font-bold">
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Stage
                <select
                  value={form.stage_id || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, stage_id: event.target.value || undefined }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="">Default stage</option>
                  {stageOptions.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm font-bold">
                Amount
                <input
                  type="number"
                  min={0}
                  value={form.amount ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value ? Number(event.target.value) : undefined }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as OpportunityStatus }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="md:col-span-2 lg:col-span-4 flex flex-col text-sm font-bold">
                Description
                <textarea
                  value={form.description || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="border-2 border-[var(--app-border)] px-4 py-2 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border-2 border-[var(--app-border)] bg-[var(--loop-green)] px-4 py-2 font-bold"
              >
                Save Opportunity
              </button>
            </div>
          </form>
        )}

        {editingOpportunity && (
          <form
            onSubmit={submitUpdate}
            className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Edit Opportunity</h2>
              <button type="button" onClick={() => setEditingOpportunity(null)} className="border-2 border-[var(--app-border)] px-3 py-1 text-xs font-bold">Close</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col text-sm font-bold">
                Name
                <input
                  required
                  value={editingOpportunity.name}
                  onChange={(event) => setEditingOpportunity((prev) => prev ? ({ ...prev, name: event.target.value }) : prev)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Stage
                <select
                  value={editingOpportunity.stage_id}
                  onChange={(event) => setEditingOpportunity((prev) => prev ? ({ ...prev, stage_id: event.target.value }) : prev)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  {stageOptions.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm font-bold">
                Amount
                <input
                  type="number"
                  min={0}
                  value={editingOpportunity.amount || ''}
                  onChange={(event) => setEditingOpportunity((prev) => prev ? ({ ...prev, amount: event.target.value }) : prev)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Status
                <select
                  value={editingOpportunity.status}
                  onChange={(event) => setEditingOpportunity((prev) => prev ? ({ ...prev, status: event.target.value as OpportunityStatus }) : prev)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="md:col-span-2 lg:col-span-4 flex flex-col text-sm font-bold">
                Description
                <textarea
                  value={editingOpportunity.description || ''}
                  onChange={(event) => setEditingOpportunity((prev) => prev ? ({ ...prev, description: event.target.value }) : prev)}
                  rows={2}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingOpportunity(null)}
                className="border-2 border-[var(--app-border)] px-4 py-2 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-4 py-2 font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 border-2 border-red-600 bg-red-100 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-4">
          {stageOptions.map((stage, index) => {
            const stageItems = opportunitiesForStage(opportunities, stage.id);
            return (
              <div
                key={stage.id}
                className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]"
              >
                <div className={`border-b-2 border-[var(--app-border)] p-3 ${stageColor(index)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black uppercase">{stage.name}</h3>
                      <p className="text-xs font-bold">{stageItems.length} opportunities</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void reorderStage(index, -1)} className="border-2 border-[var(--app-border)] bg-white px-2 py-1 text-xs font-bold">↑</button>
                      <button type="button" onClick={() => void reorderStage(index, 1)} className="border-2 border-[var(--app-border)] bg-white px-2 py-1 text-xs font-bold">↓</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {loading ? (
                    <p className="text-sm text-[var(--app-text-muted)]">Loading...</p>
                  ) : stageItems.length === 0 ? (
                    <p className="text-sm text-[var(--app-text-muted)]">No opportunities.</p>
                  ) : (
                    stageItems.map((opportunity) => (
                      <div key={opportunity.id} className="border-2 border-[var(--app-border)] bg-[var(--app-surface-muted)] p-2">
                        <p className="font-bold">{opportunity.name}</p>
                        <p className="text-xs text-[var(--app-text-muted)]">{formatMoney(opportunity.amount)}</p>
                        <p className="text-xs uppercase font-bold">{opportunity.status}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <select
                            value={opportunity.stage_id}
                            onChange={(event) => void moveStage(opportunity.id, event.target.value)}
                            className="border-2 border-[var(--app-border)] bg-white px-2 py-1 text-xs"
                          >
                            {stageOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setEditingOpportunity(opportunity)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Edit</button>
                          <button type="button" onClick={() => void removeOpportunity(opportunity.id)} className="border-2 border-red-600 bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
