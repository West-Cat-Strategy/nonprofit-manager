import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout, WebsiteConsoleNotice } from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import {
  clearWebsitesError,
  createWebsiteEntry,
  deleteWebsiteEntry,
  fetchWebsiteEntries,
  fetchWebsiteOverview,
  syncWebsiteMailchimpEntries,
  updateWebsiteEntry,
} from '../state';
import type { WebsiteEntry, WebsiteEntryStatus } from '../../../types/websiteBuilder';

const emptyDraft: {
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  status: WebsiteEntryStatus;
} = {
  title: '',
  slug: '',
  excerpt: '',
  bodyHtml: '',
  status: 'draft' as const,
};

const WebsiteContentPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const { entries, isLoading, isSaving, error } = useAppSelector((state) => state.websites);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingEntry, setEditingEntry] = useState<WebsiteEntry | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteEntries({ siteId }));
  }, [dispatch, siteId]);

  const nativeEntries = useMemo(
    () => entries.filter((entry) => entry.source === 'native'),
    [entries]
  );
  const syncedEntries = useMemo(
    () => entries.filter((entry) => entry.source === 'mailchimp'),
    [entries]
  );

  const resetEditor = () => {
    setDraft(emptyDraft);
    setEditingEntry(null);
  };

  const handleEdit = (entry: WebsiteEntry) => {
    setEditingEntry(entry);
    setDraft({
      title: entry.title,
      slug: entry.slug,
      excerpt: entry.excerpt || '',
      bodyHtml: entry.bodyHtml || entry.body || '',
      status: entry.status,
    });
  };

  const refreshOverview = () => {
    if (!siteId) return;
    void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
  };

  const handleSave = async () => {
    if (!siteId || !draft.title.trim()) return;

    setNotice(null);
    if (editingEntry) {
      const result = await dispatch(
        updateWebsiteEntry({
          siteId,
          entryId: editingEntry.id,
          data: {
            title: draft.title,
            slug: draft.slug,
            excerpt: draft.excerpt,
            bodyHtml: draft.bodyHtml,
            status: draft.status,
          },
        })
      );
      if (updateWebsiteEntry.fulfilled.match(result)) {
        refreshOverview();
        resetEditor();
        setNotice({ tone: 'success', message: 'Newsletter entry updated.' });
      } else {
        setNotice({
          tone: 'error',
          message: typeof result.payload === 'string' ? result.payload : 'Failed to update entry.',
        });
      }
    } else {
      const result = await dispatch(
        createWebsiteEntry({
          siteId,
          data: {
            kind: 'newsletter',
            title: draft.title,
            slug: draft.slug,
            excerpt: draft.excerpt,
            bodyHtml: draft.bodyHtml,
            status: draft.status,
          },
        })
      );
      if (createWebsiteEntry.fulfilled.match(result)) {
        refreshOverview();
        resetEditor();
        setNotice({ tone: 'success', message: 'Newsletter entry created.' });
      } else {
        setNotice({
          tone: 'error',
          message: typeof result.payload === 'string' ? result.payload : 'Failed to create entry.',
        });
      }
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!siteId) return;
    setNotice(null);
    const result = await dispatch(deleteWebsiteEntry({ siteId, entryId }));
    if (deleteWebsiteEntry.fulfilled.match(result)) {
      refreshOverview();
      if (editingEntry?.id === entryId) {
        resetEditor();
      }
      setNotice({ tone: 'success', message: 'Newsletter entry deleted.' });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to delete entry.',
      });
    }
  };

  const handleSyncMailchimp = async () => {
    if (!siteId) return;
    setNotice(null);
    const result = await dispatch(
      syncWebsiteMailchimpEntries({
        siteId,
        listId: overview?.integrations.mailchimp.audienceId || undefined,
      })
    );
    if (syncWebsiteMailchimpEntries.fulfilled.match(result)) {
      refreshOverview();
      setNotice({ tone: 'success', message: 'Mailchimp archive synced.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to sync Mailchimp entries.',
      });
    }
  };

  if (!siteId) {
    return null;
  }

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage native newsletters, Mailchimp archive sync, and route-level content visibility."
      actions={
        <button
          type="button"
          onClick={handleSyncMailchimp}
          disabled={isSaving || Boolean(overview?.site.blocked)}
          className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sync Mailchimp
        </button>
      }
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleNotice
            tone="error"
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

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text">
                {editingEntry ? 'Edit newsletter entry' : 'New newsletter entry'}
              </h2>
              <p className="text-sm text-app-text-muted">
                Native entries are editable. Mailchimp entries remain read-only mirrors.
              </p>
            </div>
            {editingEntry ? (
              <button
                type="button"
                onClick={resetEditor}
                className="text-sm font-medium text-app-accent"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Newsletter title"
              className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <input
              type="text"
              value={draft.slug}
              onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Slug (optional)"
              className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <textarea
              value={draft.excerpt}
              onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))}
              placeholder="Short excerpt"
              rows={3}
              className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <textarea
              value={draft.bodyHtml}
              onChange={(event) => setDraft((current) => ({ ...current, bodyHtml: event.target.value }))}
              placeholder="Body HTML or rich-text markup"
              rows={10}
              className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as typeof draft.status,
                }))
              }
              className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !draft.title.trim() || Boolean(overview?.site.blocked)}
              className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingEntry ? 'Update entry' : 'Create entry'}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-app-border bg-app-surface p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  Native entries
                </div>
                <div className="mt-2 text-3xl font-semibold text-app-text">
                  {overview?.contentSummary.nativeNewsletters ?? nativeEntries.length}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  Mailchimp synced
                </div>
                <div className="mt-2 text-3xl font-semibold text-app-text">
                  {overview?.contentSummary.syncedNewsletters ?? syncedEntries.length}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  Published
                </div>
                <div className="mt-2 text-3xl font-semibold text-app-text">
                  {overview?.contentSummary.publishedNewsletters ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-app-border bg-app-surface p-5">
            <h2 className="text-lg font-semibold text-app-text">Route visibility</h2>
            <div className="mt-4 space-y-3">
              {(overview?.draftRoutes || []).map((route) => (
                <div
                  key={`${route.pageId}-${route.path}`}
                  className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-app-text">{route.pageName}</div>
                      <div className="text-sm text-app-text-muted">{route.path}</div>
                    </div>
                    <div className="text-xs text-app-text-subtle">
                      {route.live ? 'Live' : 'Draft only'}
                      {route.noIndex ? ' • noindex' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <h2 className="text-lg font-semibold text-app-text">Native archive</h2>
          <div className="mt-4 space-y-3">
            {isLoading && entries.length === 0 ? (
              <div className="text-sm text-app-text-muted">Loading content...</div>
            ) : nativeEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-app-border px-4 py-4 text-sm text-app-text-muted">
                No native newsletter entries yet.
              </div>
            ) : (
              nativeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-app-text">{entry.title}</div>
                      <div className="text-sm text-app-text-muted">
                        {entry.slug} • {entry.status}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="rounded-full border border-app-border px-3 py-1 text-xs font-medium text-app-text-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <h2 className="text-lg font-semibold text-app-text">Mailchimp archive</h2>
          <div className="mt-4 space-y-3">
            {syncedEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-app-border px-4 py-4 text-sm text-app-text-muted">
                No Mailchimp campaigns have been imported yet.
              </div>
            ) : (
              syncedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                >
                  <div className="font-medium text-app-text">{entry.title}</div>
                  <div className="text-sm text-app-text-muted">
                    {entry.slug} • {entry.status} • read only
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        </div>
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteContentPage;
