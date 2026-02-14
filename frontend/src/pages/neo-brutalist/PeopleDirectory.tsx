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
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import PeopleCard from '../../components/neo-brutalist/PeopleCard';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';
import api from '../../services/api';
import type { AdaptedPerson } from '../../types/schema';

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

export default function PeopleDirectory() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [people, setPeople] = useState<AdaptedPerson[]>([]);
    const [counts, setCounts] = useState<Record<TabType, number>>({
        all: 0,
        staff: 0,
        volunteer: 0,
        board: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
    const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousTabRef = useRef<TabType | null>(null);

    const fetchPeople = useCallback(async (tab: TabType, query: string) => {
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
                    search: query.trim() === '' ? undefined : query.trim(),
                    role: tab === 'all' ? undefined : tab,
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
    }, [rateLimitedUntil]);

    const fetchCounts = useCallback(async (query: string) => {
        if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
            return;
        }

        try {
            const search = query.trim() === '' ? undefined : query.trim();
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
    }, [rateLimitedUntil]);

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
            onClick={() => handleTabChange(tab)}
            disabled={loading}
            className={`px-6 py-3 font-bold uppercase border-2 border-black dark:border-white transition-all disabled:opacity-50 ${activeTab === tab
                ? 'bg-[var(--loop-pink)] text-black shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                : 'bg-app-surface dark:bg-[#121212] text-black dark:text-white hover:bg-app-surface-muted dark:hover:bg-app-text'
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
                    <div className="bg-red-100 border-2 border-red-500 p-6 text-center shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                        <h2 className="text-2xl font-black text-red-600 mb-2 uppercase">Directory Unavailable</h2>
                        <p className="font-bold">
                            {isRateLimited
                                ? `Rate limit reached. Try again in about ${waitSeconds} seconds.`
                                : 'Failed to load people data. Please try again later.'}
                        </p>
                        <button
                            onClick={() => refresh(activeTab, searchTerm)}
                            disabled={isRateLimited}
                            className="mt-4 px-6 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <h2 className="text-3xl font-black mb-2 uppercase">DIRECTORY</h2>
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
                        onClick={handleNewPerson}
                        className="px-6 py-2 bg-[var(--loop-cyan)] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-cyan-400 font-bold uppercase"
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
