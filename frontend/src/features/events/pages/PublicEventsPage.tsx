import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApiClient } from '../api/eventsApiClient';
import type { PublicEventListItem, PublicEventsListResult, PublicEventsPageInfo } from '../../../types/event';
import { parseApiError } from '../../../utils/apiError';

const PAGE_SIZE = 12;

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All event types' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community', label: 'Community' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'conference', label: 'Conference' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Date TBD';
  }

  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
};

const formatLocation = (event: PublicEventListItem): string => {
  const parts = [event.location_name, event.city, event.state_province, event.country]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(', ') : 'Location TBD';
};

const truncate = (value: string | null, maxLength: number): string => {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

export default function PublicEventsPage() {
  const { site } = useParams<{ site: string }>();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventType, setEventType] = useState('');
  const [includePast, setIncludePast] = useState(false);

  const [items, setItems] = useState<PublicEventListItem[]>([]);
  const [siteInfo, setSiteInfo] = useState<PublicEventsListResult['site'] | null>(null);
  const [pageInfo, setPageInfo] = useState<PublicEventsPageInfo>({
    limit: PAGE_SIZE,
    offset: 0,
    total: 0,
    has_more: false,
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [searchInput]);

  const fetchEvents = useCallback(
    async (offset: number, append: boolean) => {
      if (!site) {
        setError('Missing site identifier.');
        setLoading(false);
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const result = await eventsApiClient.listPublicEventsBySite(site, {
          search: searchQuery || undefined,
          event_type: eventType ? (eventType as PublicEventListItem['event_type']) : undefined,
          include_past: includePast,
          limit: PAGE_SIZE,
          offset,
          sort_by: 'start_date',
          sort_order: 'asc',
        });

        setSiteInfo(result.site);
        setPageInfo(result.page);
        setItems((current) => (append ? [...current, ...result.items] : result.items));
      } catch (requestError) {
        const parsed = parseApiError(requestError, 'Unable to load public events.');
        setError(parsed.message);
        if (!append) {
          setItems([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventType, includePast, searchQuery, site]
  );

  useEffect(() => {
    void fetchEvents(0, false);
  }, [fetchEvents]);

  const handleLoadMore = useCallback(() => {
    if (!pageInfo.has_more || loadingMore) return;
    void fetchEvents(pageInfo.offset + pageInfo.limit, true);
  }, [fetchEvents, loadingMore, pageInfo.has_more, pageInfo.limit, pageInfo.offset]);

  const subtitle = useMemo(() => {
    if (!siteInfo) {
      return site ? `Site: ${site}` : 'Public events';
    }

    return siteInfo.name;
  }, [site, siteInfo]);

  return (
    <main className="min-h-screen bg-app-bg px-4 py-8 text-app-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-lg border border-app-border bg-app-surface p-6">
          <h1 className="text-2xl font-semibold text-app-text">Public Events</h1>
          <p className="mt-2 text-sm text-app-text-muted">{subtitle}</p>
        </header>

        <section className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-app-text-muted">Search</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search events"
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-app-text-muted">Event type</span>
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-app-text-muted md:self-end">
              <input
                type="checkbox"
                checked={includePast}
                onChange={(event) => setIncludePast(event.target.checked)}
                className="rounded border-app-input-border"
              />
              Include past events
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-app-border bg-app-surface p-6">
          {loading ? (
            <p className="text-sm text-app-text-muted">Loading public events...</p>
          ) : error ? (
            <p className="text-sm text-app-accent">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-app-text-muted">No public events match your filters.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((event) => (
                  <article key={event.event_id} className="rounded-lg border border-app-border bg-app-surface-muted p-4">
                    <h2 className="text-base font-semibold text-app-text">{event.event_name}</h2>
                    <p className="mt-1 text-xs uppercase tracking-wide text-app-text-muted">{event.event_type}</p>
                    <p className="mt-2 text-sm text-app-text-muted">{formatDateRange(event.start_date, event.end_date)}</p>
                    <p className="mt-1 text-sm text-app-text-muted">{formatLocation(event)}</p>
                    {event.description ? (
                      <p className="mt-3 text-sm text-app-text">{truncate(event.description, 180)}</p>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-app-text-muted">
                  Showing {items.length} of {pageInfo.total}
                </p>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={!pageInfo.has_more || loadingMore}
                  className="rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text disabled:opacity-60"
                >
                  {loadingMore ? 'Loading...' : pageInfo.has_more ? 'Load more' : 'No more events'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
