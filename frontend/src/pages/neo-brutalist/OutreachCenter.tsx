/**
 * Outreach Center - HARD-CODED NEO-BRUTALIST STYLING  
 * Purple theme (#D8BFD8) with thick black borders
 */

import React from 'react';
import { MagnifyingGlassIcon, EnvelopeIcon, CalendarIcon, CurrencyDollarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import { mockCampaignStats, mockCampaignEvents } from '../../utils/mockData';

export default function OutreachCenter() {
    return (
        <NeoBrutalistLayout pageTitle="COMMUNITY OUTREACH">
            <div className="p-6">
                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            placeholder="Search data..."
                            className="w-full border-2 border-black dark:border-white px-4 py-2 pl-10 bg-white dark:bg-[#000000] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                        />
                    </div>
                    <button className="px-6 py-2 bg-[#4DD0E1] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-cyan-400 font-bold uppercase">
                        + NEW ITEM
                    </button>
                </div>

                {/* Campaign Central Banner - PURPLE */}
                <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-12 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black mb-4 uppercase text-black">Campaign Central</h2>
                            <div className="text-6xl font-black mb-2 text-black">{mockCampaignStats.peopleEngaged.toLocaleString()}</div>
                            <div className="text-lg font-bold uppercase tracking-wide text-black">PEOPLE ENGAGED</div>
                            <div className="mt-8 flex gap-4">
                                <button className="px-6 py-3 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-100 font-bold uppercase">
                                    NEW BLAST
                                </button>
                                <button className="px-6 py-3 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-100 font-bold uppercase">
                                    VIEW REPORTS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaign Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <EnvelopeIcon className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Newsletter</h3>
                        <p className="text-sm text-gray-600">{mockCampaignStats.newsletterSubs}</p>
                    </div>

                    <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-pink-500" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Events</h3>
                        <p className="text-sm text-gray-600">{mockCampaignStats.upcomingEvents}</p>
                    </div>

                    <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-3 text-green-600" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Donors</h3>
                        <p className="text-sm text-gray-600">{mockCampaignStats.activeDonors}</p>
                    </div>

                    <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <GlobeAltIcon className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Social</h3>
                        <p className="text-sm text-gray-600">{mockCampaignStats.socialHandle}</p>
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="bg-[#D8BFD8] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                    <div className="border-b-2 border-black pb-4 mb-4">
                        <h2 className="font-black text-xl uppercase">UPCOMING SCHEDULE</h2>
                    </div>

                    <div className="space-y-4">
                        {mockCampaignEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between border-b-2 border-gray-200 pb-4">
                                <div className="flex items-center gap-6">
                                    <div className="bg-white border-2 border-black p-3 text-center min-w-[80px]">
                                        <div className="text-xs font-bold uppercase">{event.date.split(' ')[0]}</div>
                                        <div className="text-2xl font-black">{event.date.split(' ')[1]}</div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg">{event.title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                            <span>📅 {event.rsvpCount} RSVPs</span>
                                            <span>⏰ {event.time}</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="px-4 py-2 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-100 font-bold uppercase text-sm">
                                    MANAGE
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </NeoBrutalistLayout>
    );
}
