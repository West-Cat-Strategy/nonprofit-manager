/**
 * People Directory - Database-Driven View
 * 
 * This page uses a REUSABLE PeopleCard component that renders whatever data
 * is passed to it. When ready to connect to a real API, just swap the
 * mockData import for an API call - no UI code changes needed!
 */

import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import PeopleCard from '../../components/neo-brutalist/PeopleCard';
import { mockPeople } from '../../utils/mockData';
import { adaptMockPeople, filterPeopleByRole } from '../../utils/dataAdapter';
import type { AdaptedPerson } from '../../utils/dataAdapter';

type TabType = 'all' | 'staff' | 'volunteer' | 'board';

export default function PeopleDirectory() {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [people, setPeople] = useState<AdaptedPerson[]>([]);

    useEffect(() => {
        // In production, this would be: const data = await fetchPeople();
        const adaptedData = adaptMockPeople(mockPeople);
        setPeople(adaptedData);
    }, []);

    const filteredPeople = filterPeopleByRole(people, activeTab);

    const TabButton = ({ tab, label, count }: { tab: TabType; label: string; count: number }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-bold uppercase border-2 border-black transition-all ${activeTab === tab
                ? 'bg-[#FFB6C1] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-black hover:bg-gray-100'
                }`}
        >
            {label} ({count})
        </button>
    );

    return (
        <NeoBrutalistLayout>
            <div className="p-6">
                {/* Page Title */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black uppercase mb-2">PEOPLE DIRECTORY</h1>
                </div>

                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            placeholder="Search data..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border-2 border-black px-4 py-2 pl-10 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <button className="px-6 py-2 bg-[#4DD0E1] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-400 font-bold uppercase">
                        + NEW ITEM
                    </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-2">
                    <TabButton
                        tab="all"
                        label="ALL PEOPLE"
                        count={people.length}
                    />
                    <TabButton
                        tab="staff"
                        label="STAFF"
                        count={people.filter(p => p.role === 'staff').length}
                    />
                    <TabButton
                        tab="volunteer"
                        label="VOLUNTEERS"
                        count={people.filter(p => p.role === 'volunteer').length}
                    />
                    <TabButton
                        tab="board"
                        label="BOARD"
                        count={people.filter(p => p.role === 'board').length}
                    />
                </div>

                {/* People Grid - Using Reusable PeopleCard Component */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredPeople
                        .filter(person =>
                            searchTerm === '' ||
                            person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            person.email.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((person) => (
                            <PeopleCard key={person.id} person={person} />
                        ))}
                </div>

                {/* Empty State */}
                {filteredPeople.length === 0 && (
                    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
                        <h3 className="font-black text-2xl mb-2 uppercase">No People Found</h3>
                        <p className="text-gray-600">Try adjusting your filters or search term</p>
                    </div>
                )}
            </div>
        </NeoBrutalistLayout>
    );
}
