import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  clearOutcomesAdminError,
  createOutcomeDefinition,
  disableOutcomeDefinition,
  enableOutcomeDefinition,
  fetchOutcomeDefinitionsAdmin,
  reorderOutcomeDefinitions,
  updateOutcomeDefinition,
} from '../../../../store/slices/outcomesAdminSlice';
import { useToast } from '../../../../contexts/useToast';
import type {
  OutcomeDefinition,
  OutcomeDefinitionCreateInput,
  OutcomeDefinitionUpdateInput,
} from '../../../../types/outcomes';

const slugifyKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

type FormState = {
  name: string;
  key: string;
  description: string;
  category: string;
  isReportable: boolean;
  isActive: boolean;
};

const defaultFormState: FormState = {
  name: '',
  key: '',
  description: '',
  category: '',
  isReportable: true,
  isActive: true,
};

const normalizeFormForRequest = (form: FormState): OutcomeDefinitionCreateInput => ({
  name: form.name.trim(),
  key: slugifyKey(form.key),
  description: form.description.trim() ? form.description.trim() : null,
  category: form.category.trim() ? form.category.trim() : null,
  isReportable: form.isReportable,
  isActive: form.isActive,
});

const moveInArray = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

const OutcomeDefinitionsSection = () => {
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { definitions, loading, saving, error } = useAppSelector((state) => state.outcomesAdmin);

  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OutcomeDefinition | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  useEffect(() => {
    void dispatch(fetchOutcomeDefinitionsAdmin(true));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearOutcomesAdminError());
    }
  }, [dispatch, error, showError]);

  const visibleDefinitions = useMemo(() => {
    if (showInactive) {
      return definitions;
    }
    return definitions.filter((definition) => definition.is_active);
  }, [definitions, showInactive]);

  const handleOpenCreate = () => {
    setEditing(null);
    setKeyManuallyEdited(false);
    setForm(defaultFormState);
    setShowModal(true);
  };

  const handleOpenEdit = (definition: OutcomeDefinition) => {
    setEditing(definition);
    setKeyManuallyEdited(true);
    setForm({
      name: definition.name,
      key: definition.key,
      description: definition.description || '',
      category: definition.category || '',
      isReportable: definition.is_reportable,
      isActive: definition.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = normalizeFormForRequest(form);

    if (!payload.name) {
      showError('Outcome name is required');
      return;
    }

    if (!payload.key || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(payload.key)) {
      showError('Outcome key must be snake_case');
      return;
    }

    try {
      if (editing) {
        const updatePayload: OutcomeDefinitionUpdateInput = {
          name: payload.name,
          key: payload.key,
          description: payload.description,
          category: payload.category,
          isReportable: payload.isReportable,
          isActive: payload.isActive,
        };
        await dispatch(updateOutcomeDefinition({ id: editing.id, payload: updatePayload })).unwrap();
        showSuccess('Outcome updated');
      } else {
        await dispatch(createOutcomeDefinition(payload)).unwrap();
        showSuccess('Outcome created');
      }

      setShowModal(false);
      setEditing(null);
      setForm(defaultFormState);
      setKeyManuallyEdited(false);
    } catch {
      // error toast is handled via slice state
    }
  };

  const handleToggleActive = async (definition: OutcomeDefinition) => {
    try {
      if (definition.is_active) {
        await dispatch(disableOutcomeDefinition(definition.id)).unwrap();
        showSuccess('Outcome disabled');
      } else {
        await dispatch(enableOutcomeDefinition(definition.id)).unwrap();
        showSuccess('Outcome enabled');
      }
    } catch {
      // handled by slice state
    }
  };

  const handleMove = async (definitionId: string, direction: 'up' | 'down') => {
    const index = definitions.findIndex((definition) => definition.id === definitionId);
    if (index === -1) {
      return;
    }

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= definitions.length) {
      return;
    }

    const reordered = moveInArray(definitions, index, nextIndex);
    const orderedIds = reordered.map((definition) => definition.id);

    try {
      await dispatch(reorderOutcomeDefinitions(orderedIds)).unwrap();
      showSuccess('Outcome order updated');
    } catch {
      // handled by slice state
    }
  };

  return (
    <section className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black uppercase text-[var(--app-text)]">Outcome Definitions</h2>
          <p className="text-sm text-[var(--app-text-muted)] mt-1">
            Manage active outcomes used for tagging case interactions and reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Show inactive
          </label>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 font-bold uppercase text-sm border-2 border-[var(--app-border)] bg-[var(--loop-yellow)]"
          >
            + New Outcome
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-[var(--app-border)]">
        <table className="min-w-full divide-y divide-[var(--app-border)]">
          <thead className="bg-[var(--app-surface-muted)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Name</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Key</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Category</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Reportable</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Status</th>
              <th className="px-3 py-2 text-right text-xs font-black uppercase text-[var(--app-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {visibleDefinitions.map((definition) => (
              <tr key={definition.id}>
                <td className="px-3 py-2 align-top">
                  <p className="font-semibold text-[var(--app-text)]">{definition.name}</p>
                  {definition.description && (
                    <p className="text-xs text-[var(--app-text-muted)] mt-1">{definition.description}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-[var(--app-text-muted)]">{definition.key}</td>
                <td className="px-3 py-2 text-sm text-[var(--app-text-muted)]">{definition.category || '—'}</td>
                <td className="px-3 py-2 text-sm">
                  <span className={definition.is_reportable ? 'text-green-700 font-semibold' : 'text-gray-500'}>
                    {definition.is_reportable ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className={definition.is_active ? 'text-blue-700 font-semibold' : 'text-gray-500'}>
                    {definition.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleMove(definition.id, 'up')}
                      className="px-2 py-1 text-xs border border-[var(--app-border)]"
                      disabled={saving || definitions[0]?.id === definition.id}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(definition.id, 'down')}
                      className="px-2 py-1 text-xs border border-[var(--app-border)]"
                      disabled={saving || definitions[definitions.length - 1]?.id === definition.id}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(definition)}
                      className="px-2 py-1 text-xs border border-[var(--app-border)] bg-[var(--app-surface-muted)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(definition)}
                      className="px-2 py-1 text-xs border border-[var(--app-border)]"
                    >
                      {definition.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visibleDefinitions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-[var(--app-text-muted)]"
                >
                  No outcomes available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-3 text-sm text-[var(--app-text-muted)]">Loading outcomes...</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] w-full max-w-xl p-6">
            <h3 className="text-lg font-black uppercase text-[var(--app-text)] mb-4">
              {editing ? 'Edit Outcome Definition' : 'Create Outcome Definition'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name: nextName,
                      key: keyManuallyEdited ? prev.key : slugifyKey(nextName),
                    }));
                  }}
                  className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">
                  Key (snake_case)
                </label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(event) => {
                    setKeyManuallyEdited(true);
                    setForm((prev) => ({ ...prev, key: event.target.value }));
                  }}
                  className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                  <input
                    type="checkbox"
                    checked={form.isReportable}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isReportable: event.target.checked }))
                    }
                  />
                  Reportable
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="px-4 py-2 border-2 border-[var(--app-border)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OutcomeDefinitionsSection;
