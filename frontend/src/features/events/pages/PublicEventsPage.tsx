import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApiClient } from '../api/eventsApiClient';
import type { PublicEventListItem, PublicEventsListResult, PublicEventsPageInfo } from '../../../types/event';
import { PrimaryButton, PublicPageShell, SecondaryButton, SectionCard } from '../../../components/ui';
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
    <PublicPageShell
      badge="Public events"
      title="Find upcoming events"
      description={`Browse upcoming public programs, fundraisers, and community gatherings for ${subtitle}.`}
      actions={
        searchInput || eventType || includePast ? (
          <SecondaryButton
            onClick={() => {
              setSearchInput('');
              setSearchQuery('');
              setEventType('');
              setIncludePast(false);
            }}
          >
            Clear filters
          </SecondaryButton>
        ) : undefined
      }
    >
      <SectionCard
        title="Filter events"
        subtitle="Search by keyword, narrow by event type, or include past events."
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text-label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title, location, or description"
              className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text-label">Event type</span>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2 text-sm text-app-text md:self-end">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(event) => setIncludePast(event.target.checked)}
              className="rounded border-app-input-border"
            />
            <span>Include past events</span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Available events"
        subtitle={`Showing ${items.length} of ${pageInfo.total} matching events.`}
      >
        {loading ? (
          <div className="rounded-[var(--ui-radius-sm)] bg-app-surface-muted p-4 text-sm text-app-text-muted">
            Loading public events...
          </div>
        ) : error ? (
          <div className="rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent-soft p-4 text-sm text-app-accent-text">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--ui-radius-sm)] bg-app-surface-muted p-6 text-sm text-app-text-muted">
            No public events match your filters.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((event) => (
                <article
                  key={event.event_id}
                  className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted/70 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                        {event.event_type}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-app-text-heading">
                        {event.event_name}
                      </h2>
                    </div>
                    <span className="rounded-full bg-app-surface px-3 py-1 text-xs font-medium text-app-text-muted">
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-app-text-muted">
                    {formatDateRange(event.start_date, event.end_date)}
                  </p>
                  <p className="mt-1 text-sm text-app-text-muted">{formatLocation(event)}</p>
                  {event.description ? (
                    <p className="mt-4 text-sm leading-6 text-app-text">
                      {truncate(event.description, 180)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-app-text-muted">
                {pageInfo.has_more
                  ? 'More events are available below.'
                  : 'You have reached the end of the available events.'}
              </p>
              <PrimaryButton
                onClick={handleLoadMore}
                disabled={!pageInfo.has_more || loadingMore}
              >
                {loadingMore ? 'Loading...' : pageInfo.has_more ? 'Load more events' : 'No more events'}
              </PrimaryButton>
            </div>
          </>
        )}
      </SectionCard>
    </PublicPageShell>
  );
}
