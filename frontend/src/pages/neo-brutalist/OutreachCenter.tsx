/**
 * Outreach Center - CAMPAIGN MANAGEMENT
 * Uses LoopApiService, standard Loop Purple theme
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, EnvelopeIcon, CalendarIcon, CurrencyDollarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';
import LoopApiService from '../../services/LoopApiService';
import type { CampaignStats, CampaignEvent } from '../../types/schema';

export default function OutreachCenter() {
    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [events, setEvents] = useState<CampaignEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, eventsData] = await Promise.all([
                    LoopApiService.getCampaignStats(),
                    LoopApiService.getCampaignEvents()
                ]);
                setStats(statsData);
                setEvents(eventsData);
            } catch (error) {
                console.error('Failed to fetch outreach data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleNewItem = () => navigate('/events/new');
    const handleNewBlast = () => navigate('/contacts?action=email');
    const handleViewReports = () => navigate('/analytics');
    const handleManageEvent = (id: string) => navigate(`/events/${id}`);

    if (loading) {
        return (
            <NeoBrutalistLayout pageTitle="COMMUNITY OUTREACH">
                <div className="flex justify-center items-center h-screen pb-40">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black dark:border-white"></div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    return (
        <NeoBrutalistLayout pageTitle="COMMUNITY OUTREACH">
            <div className="p-6">
                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl">
                        <BrutalInput
                            type="search"
                            placeholder="Search campaigns..."
                            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleNewItem}
                        className="px-6 py-2 bg-[var(--loop-cyan)] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-cyan-400 font-bold uppercase"
                    >
                        + NEW ITEM
                    </button>
                </div>

                {/* Campaign Central Banner - PURPLE */}
                <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-12 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black mb-4 uppercase text-black">Campaign Central</h2>
                            <div className="text-6xl font-black mb-2 text-black">{stats?.peopleEngaged.toLocaleString()}</div>
                            <div className="text-lg font-bold uppercase tracking-wide text-black">PEOPLE ENGAGED</div>
                            <div className="mt-8 flex gap-4">
                                <button
                                    onClick={handleNewBlast}
                                    className="px-6 py-3 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase"
                                >
                                    NEW BLAST
                                </button>
                                <button
                                    onClick={handleViewReports}
                                    className="px-6 py-3 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase"
                                >
                                    VIEW REPORTS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaign Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <EnvelopeIcon className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Newsletter</h3>
                        <p className="text-sm text-black">{stats?.newsletterSubs}</p>
                    </div>

                    <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-pink-500" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Events</h3>
                        <p className="text-sm text-black">{stats?.upcomingEvents}</p>
                    </div>

                    <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-3 text-green-600" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Donors</h3>
                        <p className="text-sm text-black">{stats?.activeDonors}</p>
                    </div>

                    <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 text-center">
                        <GlobeAltIcon className="w-12 h-12 mx-auto mb-3 text-app-accent" />
                        <h3 className="font-black text-lg mb-2 uppercase text-black">Social</h3>
                        <p className="text-sm text-black">{stats?.socialHandle}</p>
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                    <div className="border-b-2 border-black pb-4 mb-4">
                        <h2 className="font-black text-xl uppercase text-black">UPCOMING SCHEDULE</h2>
                    </div>

                    <div className="space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                                <div className="flex items-center gap-6">
                                    <div className="bg-app-surface border-2 border-black p-3 text-center min-w-[80px]">
                                        <div className="text-xs font-bold uppercase text-black">{event.date.split(' ')[0]}</div>
                                        <div className="text-2xl font-black text-black">{event.date.split(' ')[1]}</div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-black">{event.title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-black/80">
                                            <span>📅 {event.rsvpCount} RSVPs</span>
                                            <span>⏰ {event.time}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleManageEvent(event.id)}
                                    className="px-4 py-2 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase text-sm"
                                >
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
