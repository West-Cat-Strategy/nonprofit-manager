/**
 * People Directory - Service Layer Integration (Phase 1 Refined)
 * 
 * Updated in Phase 2 Sweep:
 * - Uses BrutalInput
 * - Uses CSS Variables
 * - Consistent Styling
 */

import { useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import PeopleCard from '../../components/neo-brutalist/PeopleCard';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';
import LoopApiService from '../../services/LoopApiService';
import type { AdaptedPerson } from '../../types/schema';

type TabType = 'all' | 'staff' | 'volunteer' | 'board';

export default function PeopleDirectory() {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [people, setPeople] = useState<AdaptedPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchDebounceTimer, setSearchDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Fetch people from service layer
    const fetchPeople = useCallback(async (role?: TabType, query?: string) => {
        setLoading(true);
        try {
            setError(false);
            const filter = {
                role: role === 'all' ? undefined : role,
                query: query || undefined,
            };
            const data = await LoopApiService.getPeople(filter);
            setPeople(data);
        } catch (err) {
            console.error('[PeopleDirectory] Failed to fetch people:', err);
            setError(true);
            setPeople([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchPeople('all');
    }, [fetchPeople]);

    // Handle tab change
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchTerm(''); // Clear search when changing tabs
        fetchPeople(tab);
    };

    // Handle search with 300ms debounce
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);

        // Clear existing timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        // Set new debounce timer
        const timer = setTimeout(() => {
            fetchPeople(activeTab, value);
        }, 300);

        setSearchDebounceTimer(timer);
    };

    // Handle "+ NEW ITEM" button click
    const handleNewPerson = () => {
        console.log('Open Create Person Modal');
        // Phase 2: Open modal or route to creation page
        // Example: navigate('/people/new') or setShowCreateModal(true)
    };

    // Get counts for tabs (from current loaded data)
    const getCounts = () => ({
        all: people.length,
        staff: people.filter(p => p.role === 'staff').length,
        volunteer: people.filter(p => p.role === 'volunteer').length,
        board: people.filter(p => p.role === 'board').length,
    });

    const counts = getCounts();

    const TabButton = ({ tab, label, count }: { tab: TabType; label: string; count: number }) => (
        <button
            onClick={() => handleTabChange(tab)}
            disabled={loading}
            className={`px-6 py-3 font-bold uppercase border-2 border-black dark:border-white transition-all disabled:opacity-50 ${activeTab === tab
                ? 'bg-[var(--loop-pink)] text-black shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                : 'bg-white dark:bg-[#121212] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
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
        return (
            <NeoBrutalistLayout pageTitle="DIRECTORY">
                <div className="p-6">
                    <div className="bg-red-100 border-2 border-red-500 p-6 text-center shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                        <h2 className="text-2xl font-black text-red-600 mb-2 uppercase">Directory Unavailable</h2>
                        <p className="font-bold">Failed to load people data. Please try again later.</p>
                        <button onClick={() => fetchPeople(activeTab)} className="mt-4 px-6 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 uppercase">
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
                            placeholder="Search people..."
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
                    <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-12 text-center">
                        <h3 className="font-black text-2xl mb-2 uppercase text-black dark:text-white">No People Found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {searchTerm ? 'Try adjusting your search term' : 'No people in this category'}
                        </p>
                    </div>
                )}
            </div>
        </NeoBrutalistLayout>
    );
}
