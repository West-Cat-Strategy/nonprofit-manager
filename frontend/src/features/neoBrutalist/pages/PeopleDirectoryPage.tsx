/**
 * People Directory - Service Layer Integration (Phase 1 Refined)
 * 
 * Updated in Phase 2 Sweep:
 * - Uses BrutalInput
 * - Uses CSS Variables
 * - Consistent Styling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import PeopleCard from '../../../components/neo-brutalist/PeopleCard';
import BrutalInput from '../../../components/neo-brutalist/BrutalInput';
import api from '../../../services/api';
import { getDemoPeople, isDemoPath } from '../../../services/loop/demo';
import type { AdaptedPerson } from '../../../types/schema';

type TabType = 'all' | 'staff' | 'volunteer' | 'board';

type ContactsResponse = {
    data: Array<{
        contact_id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        mobile_phone: string | null;
        job_title: string | null;
        is_active: boolean;
    }>;
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
};

const DEFAULT_PAGE_SIZE = 100;
const FALLBACK_NAME = 'Unknown';
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const EMPTY_COUNTS: Record<TabType, number> = {
    all: 0,
    staff: 0,
    volunteer: 0,
    board: 0,
};
const BRUTAL_FOCUS_RING =
    'focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]';

const normalizeQuery = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const roleForTab = (tab: TabType): AdaptedPerson['role'] | undefined =>
    tab === 'all' ? undefined : tab;

const getDemoCounts = (query: string): Record<TabType, number> => ({
    all: getDemoPeople({ query: normalizeQuery(query) }).length,
    staff: getDemoPeople({ role: 'staff', query: normalizeQuery(query) }).length,
    volunteer: getDemoPeople({ role: 'volunteer', query: normalizeQuery(query) }).length,
    board: getDemoPeople({ role: 'board', query: normalizeQuery(query) }).length,
});

export default function PeopleDirectory() {
    const { pathname } = useLocation();
    const isDemoRoute = isDemoPath(pathname);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [people, setPeople] = useState<AdaptedPerson[]>(() =>
        isDemoRoute ? getDemoPeople() : []
    );
    const [counts, setCounts] = useState<Record<TabType, number>>(() =>
        isDemoRoute ? getDemoCounts('') : EMPTY_COUNTS
    );
    const [loading, setLoading] = useState(() => !isDemoRoute);
    const [error, setError] = useState(false);
    const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
    const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousTabRef = useRef<TabType | null>(null);

    const fetchPeople = useCallback(async (tab: TabType, query: string) => {
        if (isDemoRoute) {
            setError(false);
            setPeople(
                getDemoPeople({
                    role: roleForTab(tab),
                    query: normalizeQuery(query),
                })
            );
            setLoading(false);
            return;
        }

        if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
            setLoading(false);
            setError(true);
            return;
        }

        setLoading(true);
        try {
            setError(false);
            const res = await api.get<ContactsResponse>('/contacts', {
                params: {
                    page: 1,
                    limit: DEFAULT_PAGE_SIZE,
                    search: normalizeQuery(query),
                    role: roleForTab(tab),
                    is_active: true,
                },
            });

            const data = res.data.data.map((c) => ({
                id: c.contact_id,
                firstName: c.first_name?.trim() || FALLBACK_NAME,
                lastName: c.last_name?.trim() || '',
                email: c.email || '',
                phone: c.phone || c.mobile_phone || undefined,
                role: tab === 'all' ? undefined : tab,
                status: c.is_active ? 'active' : 'inactive',
                title: c.job_title || undefined,
                fullName:
                    `${c.first_name || ''} ${c.last_name || ''}`.trim()
                    || c.email
                    || FALLBACK_NAME,
                cardColor: 'gray',
            })) satisfies AdaptedPerson[];

            setPeople(data);
        } catch (err) {
            console.error('[PeopleDirectory] Failed to fetch people:', err);
            const error = err as AxiosError;
            if (error.response?.status === 429) {
                const retryAfterHeader = error.response.headers?.['retry-after'];
                const retryAfterSeconds = Number(retryAfterHeader);
                const safeRetrySeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                    ? retryAfterSeconds
                    : DEFAULT_RETRY_AFTER_SECONDS;
                setRateLimitedUntil(Date.now() + safeRetrySeconds * 1000);
            }
            setError(true);
            setPeople([]);
        } finally {
            setLoading(false);
        }
    }, [isDemoRoute, rateLimitedUntil]);

    const fetchCounts = useCallback(async (query: string) => {
        if (isDemoRoute) {
            setCounts(getDemoCounts(query));
            return;
        }

        if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
            return;
        }

        try {
            const search = normalizeQuery(query);
            const baseParams = { page: 1, limit: 1, search, is_active: true as const };

            const [allRes, staffRes, volunteerRes, boardRes] = await Promise.all([
                api.get<ContactsResponse>('/contacts', { params: baseParams }),
                api.get<ContactsResponse>('/contacts', { params: { ...baseParams, role: 'staff' } }),
                api.get<ContactsResponse>('/contacts', { params: { ...baseParams, role: 'volunteer' } }),
                api.get<ContactsResponse>('/contacts', { params: { ...baseParams, role: 'board' } }),
            ]);

            setCounts({
                all: allRes.data.pagination.total,
                staff: staffRes.data.pagination.total,
                volunteer: volunteerRes.data.pagination.total,
                board: boardRes.data.pagination.total,
            });
        } catch (err) {
            console.error('[PeopleDirectory] Failed to fetch counts:', err);
        }
    }, [isDemoRoute, rateLimitedUntil]);

    const refresh = useCallback(
        async (tab: TabType, query: string) => {
            if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
                setLoading(false);
                setError(true);
                return;
            }
            await Promise.all([fetchPeople(tab, query), fetchCounts(query)]);
        },
        [fetchCounts, fetchPeople, rateLimitedUntil]
    );

    // Handle tab change
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchTerm(''); // Clear search when changing tabs
    };

    // Server-side quick lookup (debounced)
    const handleSearchChange = (value: string) => setSearchTerm(value);

    // Handle "+ NEW ITEM" button click
    const handleNewPerson = () => {
        navigate('/contacts/new');
    };

    useEffect(() => {
        const tabChanged = previousTabRef.current !== activeTab;
        previousTabRef.current = activeTab;

        if (searchDebounceTimerRef.current) {
            clearTimeout(searchDebounceTimerRef.current);
        }

        if (tabChanged) {
            refresh(activeTab, searchTerm);
            return;
        }

        const timer = setTimeout(() => refresh(activeTab, searchTerm), 250);

        searchDebounceTimerRef.current = timer;

        return () => {
            clearTimeout(timer);
            if (searchDebounceTimerRef.current === timer) {
                searchDebounceTimerRef.current = null;
            }
        };
    }, [activeTab, refresh, searchTerm]);

    const TabButton = ({ tab, label, count }: { tab: TabType; label: string; count: number }) => (
        <button
            type="button"
            onClick={() => handleTabChange(tab)}
            disabled={loading}
            aria-pressed={activeTab === tab}
            className={`px-6 py-3 font-bold uppercase border-2 border-app-border transition-all disabled:opacity-50 ${BRUTAL_FOCUS_RING} ${activeTab === tab
                ? 'bg-[var(--loop-pink)] text-app-brutal-ink shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                : 'bg-app-surface-elevated text-app-text-heading hover:bg-app-surface-muted hover:text-app-text-heading shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                }`}
        >
            {label} {!loading && `(${count})`}
        </button>
    );

    if (loading) {
        return (
            <NeoBrutalistLayout pageTitle="DIRECTORY">
                <div className="flex justify-center items-center h-screen pb-40">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black dark:border-white"></div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    if (error) {
        const waitSeconds = rateLimitedUntil ? Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000)) : 0;
        const isRateLimited = waitSeconds > 0;
        return (
            <NeoBrutalistLayout pageTitle="DIRECTORY">
                <div className="p-6">
                    <div className="bg-app-accent-soft border-2 border-app-border p-6 text-center shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                        <h2 className="text-2xl font-black text-app-accent mb-2 uppercase">Directory Unavailable</h2>
                        <p className="font-bold">
                            {isRateLimited
                                ? `Rate limit reached. Try again in about ${waitSeconds} seconds.`
                                : 'Failed to load people data. Please try again later.'}
                        </p>
                        <button
                            onClick={() => refresh(activeTab, searchTerm)}
                            disabled={isRateLimited}
                            className="mt-4 px-6 py-2 bg-app-accent text-[var(--app-accent-foreground)] font-bold border-2 border-black hover:bg-app-accent uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    return (
        <NeoBrutalistLayout pageTitle="DIRECTORY">
            <div className="p-6">
                {/* Banner - PINK */}
                <div className="bg-[var(--loop-pink)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6">
                    <h2 className="text-3xl font-black mb-2 uppercase text-app-brutal-ink">LEGACY DIRECTORY</h2>
                    <p className="max-w-3xl font-bold text-app-brutal-ink">
                        `/people` remains available for compatibility, but the canonical staff workflow now lives under
                        People at `/contacts` and donor organizations at `/accounts`.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/contacts')}
                            className={`border-2 border-app-border bg-[var(--loop-cyan)] px-4 py-2 font-black uppercase text-app-brutal-ink shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--loop-green)] ${BRUTAL_FOCUS_RING}`}
                        >
                            Open People
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/accounts')}
                            className={`border-2 border-app-border bg-[var(--loop-yellow)] px-4 py-2 font-black uppercase text-app-brutal-ink shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--loop-cyan)] ${BRUTAL_FOCUS_RING}`}
                        >
                            Open Accounts
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl">
                        <BrutalInput
                            type="search"
                            aria-label="Search people"
                            placeholder="Quick lookup (name, email, phone)..."
                            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleNewPerson}
                        className={`px-6 py-2 bg-[var(--loop-cyan)] text-app-brutal-ink border-2 border-app-border shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-[var(--loop-green)] font-bold uppercase transition-colors ${BRUTAL_FOCUS_RING}`}
                    >
                        + NEW ITEM
                    </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-2">
                    <TabButton tab="all" label="ALL PEOPLE" count={counts.all} />
                    <TabButton tab="staff" label="STAFF" count={counts.staff} />
                    <TabButton tab="volunteer" label="VOLUNTEERS" count={counts.volunteer} />
                    <TabButton tab="board" label="BOARD" count={counts.board} />
                </div>

                {/* People Grid - Using Reusable PeopleCard Component */}
                {people.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {people.map((person) => (
                            <PeopleCard key={person.id} person={person} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {people.length === 0 && (
                    <div className="bg-app-surface dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-12 text-center">
                        <h3 className="font-black text-2xl mb-2 uppercase text-black dark:text-white">No People Found</h3>
                        <p className="text-app-text-muted dark:text-app-text-subtle">
                            {searchTerm ? 'Try adjusting your search term' : 'No people in this category'}
                        </p>
                    </div>
                )}
            </div>
        </NeoBrutalistLayout>
    );
}
