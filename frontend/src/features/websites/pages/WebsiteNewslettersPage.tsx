import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  WebsiteConsoleLayout,
  WebsiteConsoleNotice,
  WebsiteConsoleStatePanel,
  WebsiteConsoleUrlAction,
} from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import { formatWebsiteConsoleDate, getWebsiteConsoleUrlTarget } from '../lib/websiteConsole';
import {
  clearWebsitesError,
  createWebsiteNewsletterListPreset,
  fetchWebsiteNewsletterWorkspace,
  refreshWebsiteNewsletterWorkspace,
  selectWebsiteIntegrations,
  updateWebsiteNewsletterIntegration,
  updateWebsiteNewsletterListPreset,
  deleteWebsiteNewsletterListPreset,
} from '../state';
import type { WebsiteNewsletterListPreset } from '../types';

const emptyPresetDraft = {
  name: '',
  audienceId: '',
  notes: '',
  defaultTags: '',
  syncEnabled: true,
};

const WebsiteNewslettersPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const integrations = useAppSelector(selectWebsiteIntegrations);
  const { isSaving, isLoading, error } = useAppSelector((state) => ({
    isSaving: state.websites.isSaving,
    isLoading: state.websites.isLoading,
    error: state.websites.error,
  }));
  const previewHref = getWebsiteConsoleUrlTarget(overview?.deployment);
  const [newsletterProvider, setNewsletterProvider] = useState<'mailchimp' | 'mautic'>('mautic');
  const [selectedAudienceId, setSelectedAudienceId] = useState('');
  const [selectedAudienceName, setSelectedAudienceName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [audienceSearch, setAudienceSearch] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetDraft, setPresetDraft] = useState(emptyPresetDraft);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteNewsletterWorkspace(siteId));
  }, [dispatch, siteId]);

  useEffect(() => {
    if (!integrations) return;
    setNewsletterProvider(integrations.newsletter.provider || 'mautic');
    setSelectedAudienceId(
      integrations.newsletter.selectedAudienceId ||
        integrations.newsletter.listPresets.find(
          (preset) => preset.id === integrations.newsletter.selectedPresetId
        )?.audienceId ||
        integrations.mailchimp.audienceId ||
        integrations.mautic.segmentId ||
        ''
    );
    setSelectedAudienceName(integrations.newsletter.selectedAudienceName || '');
    setSelectedPresetId(integrations.newsletter.selectedPresetId || '');
  }, [integrations]);

  const availableAudiences = useMemo(
    () => integrations?.newsletter.availableAudiences || [],
    [integrations?.newsletter.availableAudiences]
  );
  const listPresets = useMemo(
    () => integrations?.newsletter.listPresets || [],
    [integrations?.newsletter.listPresets]
  );
  const activePreset = listPresets.find((preset) => preset.id === selectedPresetId) || null;
  const activeAudience =
    availableAudiences.find((audience) => audience.id === selectedAudienceId) || null;
  const filteredAudiences = useMemo(
    () =>
      availableAudiences.filter((audience) => {
        const haystack = `${audience.name} ${audience.id}`.toLowerCase();
        return haystack.includes(audienceSearch.trim().toLowerCase());
      }),
    [availableAudiences, audienceSearch]
  );
  const filteredPresets = useMemo(
    () =>
      listPresets.filter((preset) => {
        const haystack =
          `${preset.name} ${preset.audienceName || ''} ${preset.notes || ''} ${preset.provider}`.toLowerCase();
        return haystack.includes(presetSearch.trim().toLowerCase());
      }),
    [listPresets, presetSearch]
  );
  const selectedAudienceSummary =
    selectedAudienceName || activeAudience?.name || selectedAudienceId || 'No audience selected';
  const activePresetAudience =
    activePreset?.audienceName || activeAudience?.name || 'No saved preset selected';

  if (!siteId) {
    return null;
  }

  const saveWorkspaceSelection = async () => {
    setNotice(null);
    const result = await dispatch(
      updateWebsiteNewsletterIntegration({
        siteId,
        data: {
          provider: newsletterProvider,
          selectedAudienceId: selectedAudienceId || null,
          selectedAudienceName: selectedAudienceName || activeAudience?.name || null,
          selectedPresetId: selectedPresetId || null,
        },
      })
    );

    if (updateWebsiteNewsletterIntegration.fulfilled.match(result)) {
      setNotice({
        tone: 'success',
        message:
          newsletterProvider === 'mailchimp'
            ? 'Newsletter audience saved for Mailchimp.'
            : 'Newsletter audience saved for Mautic.',
      });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string'
            ? result.payload
            : 'Failed to save newsletter audience.',
      });
    }
  };

  const refreshWorkspace = async () => {
    setNotice(null);
    const result = await dispatch(refreshWebsiteNewsletterWorkspace(siteId));
    if (refreshWebsiteNewsletterWorkspace.fulfilled.match(result)) {
      setNotice({ tone: 'success', message: 'Newsletter workspace refreshed.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string'
            ? result.payload
            : 'Failed to refresh newsletter workspace.',
      });
    }
  };

  const savePreset = async () => {
    const audience = availableAudiences.find(
      (entry) => entry.id === presetDraft.audienceId || entry.id === selectedAudienceId
    );
    if (!presetDraft.name.trim()) return;

    setNotice(null);
    const payload = {
      name: presetDraft.name.trim(),
      provider: newsletterProvider,
      audienceId: presetDraft.audienceId || selectedAudienceId,
      audienceName: audience?.name || selectedAudienceName || null,
      notes: presetDraft.notes.trim() || null,
      defaultTags: presetDraft.defaultTags
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      syncEnabled: presetDraft.syncEnabled,
    };

    const result = editingPresetId
      ? await dispatch(
          updateWebsiteNewsletterListPreset({
            siteId,
            listId: editingPresetId,
            data: payload,
          })
        )
      : await dispatch(
          createWebsiteNewsletterListPreset({
            siteId,
            data: payload,
          })
        );

    if (
      (editingPresetId && updateWebsiteNewsletterListPreset.fulfilled.match(result)) ||
      (!editingPresetId && createWebsiteNewsletterListPreset.fulfilled.match(result))
    ) {
      setEditingPresetId(null);
      setPresetDraft(emptyPresetDraft);
      setNotice({
        tone: 'success',
        message: editingPresetId ? 'Newsletter list updated.' : 'Newsletter list created.',
      });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to save newsletter list.',
      });
    }
  };

  const deletePreset = async (presetId: string) => {
    setNotice(null);
    const result = await dispatch(deleteWebsiteNewsletterListPreset({ siteId, listId: presetId }));
    if (deleteWebsiteNewsletterListPreset.fulfilled.match(result)) {
      setNotice({ tone: 'success', message: 'Newsletter list deleted.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to delete newsletter list.',
      });
    }
  };

  const activatePreset = async (preset: WebsiteNewsletterListPreset) => {
    setSelectedPresetId(preset.id);
    setSelectedAudienceId(preset.audienceId);
    setSelectedAudienceName(preset.audienceName || '');
    setNewsletterProvider(preset.provider);
    await dispatch(
      updateWebsiteNewsletterIntegration({
        siteId,
        data: {
          provider: preset.provider,
          selectedPresetId: preset.id,
          selectedAudienceId: preset.audienceId,
          selectedAudienceName: preset.audienceName || activeAudience?.name || null,
        },
      })
    );
  };

  const startEditPreset = (preset: WebsiteNewsletterListPreset) => {
    setEditingPresetId(preset.id);
    setPresetDraft({
      name: preset.name,
      audienceId: preset.audienceId,
      notes: preset.notes || '',
      defaultTags: (preset.defaultTags || []).join(', '),
      syncEnabled: preset.syncEnabled ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingPresetId(null);
    setPresetDraft(emptyPresetDraft);
  };

  const activeProviderHelp =
    newsletterProvider === 'mautic'
      ? 'Mautic uses API-authenticated segments, so connect credentials in Communications and pick a segment here.'
      : 'Mailchimp uses audiences/lists. Pick the audience here and manage credentials in Communications.';

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Choose the active newsletter audience, manage reusable list presets, and keep signup routing aligned."
      subtitle="This workspace keeps the signup destination and list metadata in sync so the website console can rely on one audience source of truth."
      actions={
        <div className="flex flex-wrap gap-3">
          <WebsiteConsoleUrlAction
            href={previewHref}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            disabledTitle="Preview is unavailable until the site has a public URL."
          >
            Open preview
          </WebsiteConsoleUrlAction>
          <a
            href="/settings/communications"
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Open communications hub
          </a>
          <a
            href={`/websites/${siteId}/integrations`}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Provider settings
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleStatePanel
            tone="error"
            title="Newsletter workspace unavailable"
            message={error}
            onDismiss={() => dispatch(clearWebsitesError())}
          />
        ) : null}
        {notice ? (
          <WebsiteConsoleNotice
            tone={notice.tone}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        ) : null}

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Provider
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {newsletterProvider === 'mautic' ? 'Mautic' : 'Mailchimp'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">{activeProviderHelp}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Active audience
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {selectedAudienceSummary}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {integrations?.newsletter.configured
                  ? 'Ready for signup traffic.'
                  : 'Pick an audience and connect credentials.'}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Saved lists
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">{listPresets.length}</div>
              <p className="mt-2 text-sm text-app-text-muted">
                Reusable list presets with audience, notes, and tags.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Last refreshed
              </div>
              <div className="mt-2 text-lg font-semibold text-app-text">
                {formatWebsiteConsoleDate(integrations?.newsletter.lastRefreshedAt)}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {integrations?.newsletter.availableAudiences.length || 0} audiences available now.
              </p>
            </div>
          </div>
        </section>

        {isLoading && !integrations ? (
          <WebsiteConsoleStatePanel
            tone="loading"
            title="Loading newsletter workspace"
            message="We are fetching provider audiences and list presets."
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-app-border bg-app-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Active audience</h2>
                <p className="text-sm text-app-text-muted">
                  Choose the audience that should receive newsletter signup traffic.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshWorkspace}
                disabled={isSaving || Boolean(overview?.site.blocked)}
                className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh audiences
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <select
                aria-label="Newsletter provider"
                value={newsletterProvider}
                onChange={(event) =>
                  setNewsletterProvider(event.target.value as 'mailchimp' | 'mautic')
                }
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              >
                <option value="mautic">Mautic</option>
                <option value="mailchimp">Mailchimp</option>
              </select>

              <input
                type="search"
                aria-label="Search audiences"
                value={audienceSearch}
                onChange={(event) => setAudienceSearch(event.target.value)}
                placeholder="Search audiences by name or ID"
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />

              <select
                aria-label="Active audience"
                value={selectedAudienceId}
                onChange={(event) => {
                  const audience = filteredAudiences.find(
                    (entry) => entry.id === event.target.value
                  );
                  setSelectedAudienceId(event.target.value);
                  setSelectedAudienceName(audience?.name || '');
                  setSelectedPresetId('');
                }}
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              >
                <option value="">Select audience</option>
                {filteredAudiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name} {audience.memberCount ? `(${audience.memberCount})` : ''}
                  </option>
                ))}
              </select>

              <textarea
                aria-label="Selected newsletter audience guidance"
                value={activeProviderHelp}
                readOnly
                rows={3}
                className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text-muted"
              />

              <button
                type="button"
                disabled={isSaving || Boolean(overview?.site.blocked)}
                onClick={saveWorkspaceSelection}
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save active audience
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">
                  {editingPresetId ? 'Edit newsletter list' : 'Create newsletter list'}
                </h2>
                <p className="text-sm text-app-text-muted">
                  Save a reusable list preset that points to a provider audience or segment.
                </p>
              </div>
              {editingPresetId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4">
              <input
                type="text"
                aria-label="List name"
                value={presetDraft.name}
                onChange={(event) =>
                  setPresetDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="List name"
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <select
                aria-label="List audience"
                value={presetDraft.audienceId || selectedAudienceId}
                onChange={(event) =>
                  setPresetDraft((current) => ({ ...current, audienceId: event.target.value }))
                }
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              >
                <option value="">Use active audience</option>
                {filteredAudiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                aria-label="List notes"
                value={presetDraft.notes}
                onChange={(event) =>
                  setPresetDraft((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Notes for staff"
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <input
                type="text"
                aria-label="List default tags"
                value={presetDraft.defaultTags}
                onChange={(event) =>
                  setPresetDraft((current) => ({ ...current, defaultTags: event.target.value }))
                }
                placeholder="Default tags (comma separated)"
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <label className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={presetDraft.syncEnabled}
                  onChange={(event) =>
                    setPresetDraft((current) => ({ ...current, syncEnabled: event.target.checked }))
                  }
                />
                Keep this list synced with the active provider
              </label>

              <button
                type="button"
                disabled={isSaving || Boolean(overview?.site.blocked)}
                onClick={savePreset}
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingPresetId ? 'Update list' : 'Save list'}
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-app-text">Saved lists</h2>
              <p className="text-sm text-app-text-muted">
                Search, review, activate, or delete reusable newsletter list presets.
              </p>
            </div>
            <input
              type="search"
              aria-label="Search newsletter lists"
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
              placeholder="Filter lists"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
          </div>

          <div className="mt-4 grid gap-4">
            {filteredPresets.length === 0 ? (
              <WebsiteConsoleStatePanel
                tone="empty"
                title="No saved newsletter lists yet"
                message="Create a reusable list preset above to keep a newsletter audience handy for future campaigns."
              />
            ) : null}

            {filteredPresets.map((preset) => (
              <article
                key={preset.id}
                className={`rounded-2xl border p-4 ${
                  preset.id === selectedPresetId
                    ? 'border-app-accent bg-app-surface-muted'
                    : 'border-app-border bg-app-surface-muted'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-app-text">{preset.name}</h3>
                      <span className="rounded-full bg-app-surface px-2 py-1 text-xs font-medium text-app-text-muted">
                        {preset.provider}
                      </span>
                      {preset.id === selectedPresetId ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-app-text-muted">
                      Audience: {preset.audienceName || preset.audienceId}
                    </p>
                    {preset.notes ? (
                      <p className="mt-1 text-sm text-app-text-subtle">{preset.notes}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-app-text-subtle">
                      Updated{' '}
                      {formatWebsiteConsoleDate(preset.updatedAt || preset.createdAt || null)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => activatePreset(preset)}
                      className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface"
                    >
                      Use audience
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditPreset(preset)}
                      className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(preset.id)}
                      className="rounded-full border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Newsletter health
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.newsletter.configured ? 'Healthy' : 'Needs attention'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {integrations?.newsletter.configured
                  ? 'A provider is configured and the active audience is ready.'
                  : 'Open the Integrations tab to finish provider credentials and return here to select the audience.'}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Selected list
              </div>
              <div className="mt-2 text-lg font-semibold text-app-text">{activePresetAudience}</div>
              <p className="mt-2 text-sm text-app-text-muted">
                {activePreset
                  ? `This preset targets ${activePreset.audienceId}.`
                  : 'Choose a saved preset or select an audience directly.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteNewslettersPage;
