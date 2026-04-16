import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../components/AdminWorkspaceShell';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  discoverFacebookPages,
  fetchFacebookPageSnapshots,
  fetchFacebookPages,
  fetchFacebookSettings,
  fetchSocialMediaSiteMappings,
  syncFacebookPage,
  testFacebookSettings,
  updateFacebookSettings,
  updateWebsiteFacebookMapping,
} from '../../socialMedia/state';
import type { SocialMediaSettingsPatch, SocialMediaSiteMapping } from '../../socialMedia/types/contracts';

const numberFormatter = new Intl.NumberFormat();

const formatCount = (value: number | null | undefined): string =>
  value === null || value === undefined ? '--' : numberFormatter.format(value);

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleString();
};

const formatDay = (value: string): string =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const getEngagementRate = (mapping: { engagedUsers: number | null; reach: number | null }): string => {
  if (!mapping.engagedUsers || !mapping.reach || mapping.reach <= 0) {
    return '--';
  }

  return `${((mapping.engagedUsers / mapping.reach) * 100).toFixed(1)}%`;
};

function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-app-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-app-text-heading">{title}</h2>
          {description ? <p className="text-sm text-app-text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export default function SocialMediaPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const {
    settings,
    pages,
    siteMappings,
    snapshotsByPageId,
    settingsLoading,
    pagesLoading,
    siteMappingsLoading,
    isSavingSettings,
    isTestingSettings,
    isDiscoveringPages,
    pageSyncingIds,
    siteSavingIds,
    snapshotLoadingByPageId,
    testResult,
    error,
  } = useAppSelector((state) => state.socialMedia);

  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [clearAppSecret, setClearAppSecret] = useState(false);
  const [clearAccessToken, setClearAccessToken] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [mappingDrafts, setMappingDrafts] = useState<
    Record<string, { trackedPageId: string; syncEnabled: boolean }>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchFacebookSettings());
    void dispatch(fetchFacebookPages());
    void dispatch(fetchSocialMediaSiteMappings());
  }, [dispatch]);

  useEffect(() => {
    setAppId(settings?.appId ?? '');
    setAppSecret('');
    setAccessToken('');
    setClearAppSecret(false);
    setClearAccessToken(false);
  }, [settings?.appId, settings?.credentials.accessToken, settings?.credentials.appSecret]);

  useEffect(() => {
    setMappingDrafts(
      Object.fromEntries(
        siteMappings.map((mapping) => [
          mapping.siteId,
          {
            trackedPageId: mapping.trackedPageId ?? '',
            syncEnabled: mapping.syncEnabled,
          },
        ])
      )
    );
  }, [siteMappings]);

  useEffect(() => {
    if (pages.length === 0) {
      setSelectedPageId('');
      return;
    }

    setSelectedPageId((current) =>
      pages.some((page) => page.id === current) ? current : pages[0].id
    );
  }, [pages]);

  useEffect(() => {
    if (!selectedPageId) return;
    void dispatch(fetchFacebookPageSnapshots({ pageId: selectedPageId, limit: 30 }));
  }, [dispatch, selectedPageId]);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const selectedSnapshots = selectedPageId ? snapshotsByPageId[selectedPageId] ?? [] : [];
  const historyMax = Math.max(
    ...selectedSnapshots.map((snapshot) => snapshot.reach ?? snapshot.impressions ?? snapshot.followers ?? 0),
    1
  );

  const handleSaveSettings = async () => {
    const payload: SocialMediaSettingsPatch = {};
    const currentAppId = settings?.appId ?? '';

    if (appId !== currentAppId) {
      payload.appId = appId.trim();
    }

    if (clearAppSecret) {
      payload.appSecret = null;
    } else if (appSecret.trim()) {
      payload.appSecret = appSecret.trim();
    }

    if (clearAccessToken) {
      payload.accessToken = null;
    } else if (accessToken.trim()) {
      payload.accessToken = accessToken.trim();
    }

    if (Object.keys(payload).length === 0) {
      setStatusMessage('No Facebook settings changes to save.');
      return;
    }

    const action = await dispatch(updateFacebookSettings({ data: payload }));
    if (updateFacebookSettings.fulfilled.match(action)) {
      setStatusMessage('Facebook credentials saved.');
      setAppSecret('');
      setAccessToken('');
      setClearAppSecret(false);
      setClearAccessToken(false);
    }
  };

  const handleTestSettings = async () => {
    const action = await dispatch(testFacebookSettings());
    if (testFacebookSettings.fulfilled.match(action)) {
      setStatusMessage(action.payload.message);
      void dispatch(fetchFacebookSettings());
    }
  };

  const handleDiscoverPages = async () => {
    const action = await dispatch(discoverFacebookPages());
    if (discoverFacebookPages.fulfilled.match(action)) {
      setStatusMessage(
        action.payload.length > 0
          ? `Discovered ${action.payload.length} Facebook page${action.payload.length === 1 ? '' : 's'}.`
          : 'No Facebook pages were returned for this access token.'
      );
    }
  };

  const handleSyncPage = async (pageId: string) => {
    const action = await dispatch(syncFacebookPage(pageId));
    if (syncFacebookPage.fulfilled.match(action)) {
      setStatusMessage(`Synced ${action.payload.pageName}.`);
      void dispatch(fetchFacebookPageSnapshots({ pageId, limit: 30 }));
    }
  };

  const handleDraftChange = (
    siteId: string,
    patch: Partial<{ trackedPageId: string; syncEnabled: boolean }>
  ) => {
    setMappingDrafts((current) => {
      const next = {
        trackedPageId: current[siteId]?.trackedPageId ?? '',
        syncEnabled: current[siteId]?.syncEnabled ?? false,
        ...patch,
      };

      if (!next.trackedPageId) {
        next.syncEnabled = false;
      }

      return {
        ...current,
        [siteId]: next,
      };
    });
  };

  const handleSaveMapping = async (mapping: SocialMediaSiteMapping) => {
    const draft = mappingDrafts[mapping.siteId] ?? {
      trackedPageId: mapping.trackedPageId ?? '',
      syncEnabled: mapping.syncEnabled,
    };

    const action = await dispatch(
      updateWebsiteFacebookMapping({
        siteId: mapping.siteId,
        data: {
          trackedPageId: draft.trackedPageId || null,
          syncEnabled: draft.trackedPageId ? draft.syncEnabled : false,
        },
      })
    );

    if (updateWebsiteFacebookMapping.fulfilled.match(action)) {
      setStatusMessage(`Saved Facebook mapping for ${mapping.siteName}.`);
      void dispatch(fetchFacebookPages());
    }
  };

  return (
    <AdminWorkspaceShell
      title="Social Media"
      description="Manage organization-level Facebook credentials, page sync, and website mappings from one admin workspace."
      currentPath={location.pathname}
      badge={
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-heading">
            Admin Workspace
          </span>
          <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-accent-text">
            Facebook First
          </span>
        </div>
      }
    >
      <AdminQuickActionsBar role="admin" />
      {error ? (
        <div className="rounded-2xl border border-app-accent bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
          {error}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text">
          {statusMessage}
        </div>
      ) : null}
      {testResult ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            testResult.success
              ? 'border-app-border bg-app-surface-muted text-app-text'
              : 'border-app-accent bg-app-accent-soft text-app-accent-text'
          }`}
        >
          {testResult.message}
        </div>
      ) : null}

      <SectionCard
        title="Facebook Credentials"
        description="Store the page discovery token once at the organization level. Secret fields are never echoed back after save."
        actions={
          <>
            <button
              type="button"
              onClick={handleTestSettings}
              disabled={isTestingSettings || settingsLoading}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTestingSettings ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings || settingsLoading}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingSettings ? 'Saving...' : 'Save Credentials'}
            </button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-app-text-label">Facebook App ID</span>
              <input
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
                placeholder="Optional app id for appsecret_proof"
                className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text outline-none transition focus:border-app-accent"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-app-text-label">App Secret</span>
              <input
                type="password"
                value={appSecret}
                onChange={(event) => {
                  setAppSecret(event.target.value);
                  if (event.target.value) setClearAppSecret(false);
                }}
                placeholder={
                  settings?.credentials.appSecret ? 'Saved secret configured' : 'Optional app secret'
                }
                className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text outline-none transition focus:border-app-accent"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-app-text-label">Access Token</span>
              <textarea
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value);
                  if (event.target.value) setClearAccessToken(false);
                }}
                placeholder={
                  settings?.credentials.accessToken
                    ? 'Saved access token configured'
                    : 'Paste a Facebook user or system user token'
                }
                rows={4}
                className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text outline-none transition focus:border-app-accent"
              />
            </label>

            <div className="flex flex-wrap gap-4 text-sm text-app-text-muted">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clearAppSecret}
                  onChange={(event) => setClearAppSecret(event.target.checked)}
                />
                Clear saved app secret
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clearAccessToken}
                  onChange={(event) => setClearAccessToken(event.target.checked)}
                />
                Clear saved access token
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl bg-app-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                Stored Status
              </p>
              <div className="mt-3 space-y-2 text-sm text-app-text">
                <div className="flex items-center justify-between">
                  <span>Access token</span>
                  <span>{settings?.credentials.accessToken ? 'Configured' : 'Missing'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>App secret</span>
                  <span>{settings?.credentials.appSecret ? 'Configured' : 'Optional'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last tested</span>
                  <span>{formatTimestamp(settings?.lastTestedAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-app-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                Sync Health
              </p>
              <div className="mt-3 space-y-2 text-sm text-app-text">
                <div className="flex items-center justify-between">
                  <span>Configured</span>
                  <span>{settings?.isConfigured ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last org sync</span>
                  <span>{formatTimestamp(settings?.lastSyncAt)}</span>
                </div>
                <div className="text-app-text-muted">
                  {settings?.lastSyncError || 'No sync errors recorded.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Tracked Pages"
        description="Discover the Facebook pages your saved token can access, then manually sync or review the latest page-level metrics."
        actions={
          <button
            type="button"
            onClick={handleDiscoverPages}
            disabled={isDiscoveringPages || isTestingSettings}
            className="rounded-xl border border-app-border px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDiscoveringPages ? 'Discovering...' : 'Discover Pages'}
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-app-border text-sm">
            <thead>
              <tr className="text-left text-app-text-subtle">
                <th className="pb-3 pr-4 font-medium">Page</th>
                <th className="pb-3 pr-4 font-medium">Followers</th>
                <th className="pb-3 pr-4 font-medium">Reach</th>
                <th className="pb-3 pr-4 font-medium">Engagement</th>
                <th className="pb-3 pr-4 font-medium">Linked Sites</th>
                <th className="pb-3 pr-4 font-medium">Last Sync</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {pagesLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-app-text-muted">
                    Loading Facebook pages...
                  </td>
                </tr>
              ) : null}
              {!pagesLoading && pages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-app-text-muted">
                    No Facebook pages discovered yet.
                  </td>
                </tr>
              ) : null}
              {pages.map((page) => (
                <tr key={page.id} className={page.id === selectedPageId ? 'bg-app-surface-muted' : ''}>
                  <td className="py-4 pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPageId(page.id)}
                      className="text-left"
                    >
                      <div className="font-medium text-app-text">{page.pageName}</div>
                      <div className="text-xs text-app-text-muted">{page.externalPageId}</div>
                    </button>
                  </td>
                  <td className="py-4 pr-4 text-app-text">{formatCount(page.latestSnapshot?.followers)}</td>
                  <td className="py-4 pr-4 text-app-text">{formatCount(page.latestSnapshot?.reach)}</td>
                  <td className="py-4 pr-4 text-app-text">
                    {getEngagementRate({
                      engagedUsers: page.latestSnapshot?.engagedUsers ?? null,
                      reach: page.latestSnapshot?.reach ?? null,
                    })}
                  </td>
                  <td className="py-4 pr-4 text-app-text">{page.linkedSiteIds.length}</td>
                  <td className="py-4 pr-4 text-app-text-muted">{formatTimestamp(page.lastSyncAt)}</td>
                  <td className="py-4">
                    <button
                      type="button"
                      onClick={() => handleSyncPage(page.id)}
                      disabled={pageSyncingIds[page.id]}
                      className="rounded-xl border border-app-border px-3 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pageSyncingIds[page.id] ? 'Syncing...' : 'Manual Refresh'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="30-Day History"
        description="Review recent daily snapshots for the selected Facebook page."
      >
        {!selectedPage ? (
          <p className="text-sm text-app-text-muted">
            Select a tracked page to view its recent snapshot history.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-app-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Followers
                </p>
                <p className="mt-2 text-2xl font-semibold text-app-text-heading">
                  {formatCount(selectedPage.latestSnapshot?.followers)}
                </p>
              </div>
              <div className="rounded-2xl bg-app-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Reach
                </p>
                <p className="mt-2 text-2xl font-semibold text-app-text-heading">
                  {formatCount(selectedPage.latestSnapshot?.reach)}
                </p>
              </div>
              <div className="rounded-2xl bg-app-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Impressions
                </p>
                <p className="mt-2 text-2xl font-semibold text-app-text-heading">
                  {formatCount(selectedPage.latestSnapshot?.impressions)}
                </p>
              </div>
              <div className="rounded-2xl bg-app-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Engaged Users
                </p>
                <p className="mt-2 text-2xl font-semibold text-app-text-heading">
                  {formatCount(selectedPage.latestSnapshot?.engagedUsers)}
                </p>
              </div>
              <div className="rounded-2xl bg-app-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Posts
                </p>
                <p className="mt-2 text-2xl font-semibold text-app-text-heading">
                  {formatCount(selectedPage.latestSnapshot?.postCount)}
                </p>
              </div>
            </div>

            {snapshotLoadingByPageId[selectedPage.id] ? (
              <p className="text-sm text-app-text-muted">Loading snapshot history...</p>
            ) : null}

            {!snapshotLoadingByPageId[selectedPage.id] && selectedSnapshots.length === 0 ? (
              <p className="text-sm text-app-text-muted">
                No daily snapshots yet. Run a manual refresh to capture the first one.
              </p>
            ) : null}

            {!snapshotLoadingByPageId[selectedPage.id] && selectedSnapshots.length > 0 ? (
              <div className="space-y-3">
                {selectedSnapshots.map((snapshot) => {
                  const scaleBase = snapshot.reach ?? snapshot.impressions ?? snapshot.followers ?? 0;
                  const width = Math.max(10, Math.round((scaleBase / historyMax) * 100));

                  return (
                    <div
                      key={snapshot.id}
                      className="rounded-2xl border border-app-border bg-app-surface-muted p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-app-text-heading">
                            {formatDay(snapshot.snapshotDate)}
                          </div>
                          <div className="mt-1 text-xs text-app-text-muted">
                            Followers {formatCount(snapshot.followers)} | Reach {formatCount(snapshot.reach)} | Engaged {formatCount(snapshot.engagedUsers)}
                          </div>
                        </div>
                        <div className="w-full max-w-md">
                          <div className="h-3 rounded-full bg-app-border">
                            <div
                              className="h-3 rounded-full bg-app-accent"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <div className="mt-2 flex justify-between text-xs text-app-text-subtle">
                            <span>Impressions {formatCount(snapshot.impressions)}</span>
                            <span>Posts {formatCount(snapshot.postCount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Website Mappings"
        description="Map each website to a tracked Facebook page using the existing publishing integration settings."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-app-border text-sm">
            <thead>
              <tr className="text-left text-app-text-subtle">
                <th className="pb-3 pr-4 font-medium">Website</th>
                <th className="pb-3 pr-4 font-medium">Facebook Page</th>
                <th className="pb-3 pr-4 font-medium">Sync</th>
                <th className="pb-3 pr-4 font-medium">Latest Sync</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {siteMappingsLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-app-text-muted">
                    Loading website mappings...
                  </td>
                </tr>
              ) : null}
              {!siteMappingsLoading && siteMappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-app-text-muted">
                    No websites available for mapping.
                  </td>
                </tr>
              ) : null}
              {siteMappings.map((mapping) => {
                const draft = mappingDrafts[mapping.siteId] ?? {
                  trackedPageId: mapping.trackedPageId ?? '',
                  syncEnabled: mapping.syncEnabled,
                };

                return (
                  <tr key={mapping.siteId}>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-app-text">{mapping.siteName}</div>
                      <div className="text-xs text-app-text-muted">{mapping.primaryUrl}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <select
                        aria-label={`Facebook page for ${mapping.siteName}`}
                        value={draft.trackedPageId}
                        onChange={(event) =>
                          handleDraftChange(mapping.siteId, {
                            trackedPageId: event.target.value,
                            syncEnabled: event.target.value ? draft.syncEnabled : false,
                          })
                        }
                        className="w-full min-w-[220px] rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-accent"
                      >
                        <option value="">Not linked</option>
                        {pages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.pageName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <label className="flex items-center gap-2 text-app-text">
                        <input
                          type="checkbox"
                          checked={draft.syncEnabled}
                          disabled={!draft.trackedPageId}
                          onChange={(event) =>
                            handleDraftChange(mapping.siteId, { syncEnabled: event.target.checked })
                          }
                        />
                        Enabled
                      </label>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-app-text-muted">{formatTimestamp(mapping.lastSyncAt)}</div>
                      {mapping.lastSyncError ? (
                        <div className="mt-1 text-xs text-app-accent">{mapping.lastSyncError}</div>
                      ) : null}
                    </td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => handleSaveMapping(mapping)}
                        disabled={siteSavingIds[mapping.siteId]}
                        className="rounded-xl border border-app-border px-3 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {siteSavingIds[mapping.siteId] ? 'Saving...' : 'Save Mapping'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminWorkspaceShell>
  );
}
