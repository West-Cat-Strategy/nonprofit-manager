/**
 * Neo-Brutalist Dashboard - ASYNC DATA VERSION
 * Uses LoopApiService for data, BrutalInput for search, and CSS variables
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, UserPlusIcon, CalendarDaysIcon, ClipboardDocumentListIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';
import LoopApiService from '../../services/LoopApiService';
import type { DashboardStats } from '../../types/schema';

export default function NeoBrutalistDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickSearch, setQuickSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(false);
                const data = await LoopApiService.getDashboardStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleNewItem = () => {
        console.log('Open New Item Modal');
    };

    if (loading) {
        return (
            <NeoBrutalistLayout pageTitle="WORKBENCH OVERVIEW">
                <div className="flex justify-center items-center h-screen pb-40">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black dark:border-white"></div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    if (error) {
        return (
            <NeoBrutalistLayout pageTitle="WORKBENCH OVERVIEW">
                <div className="p-6">
                    <div className="bg-red-100 border-2 border-red-500 p-6 text-center shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                        <h2 className="text-2xl font-black text-red-600 mb-2 uppercase">System Error</h2>
                        <p className="font-bold">Failed to load dashboard data. Please check your connection.</p>
                        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 uppercase">
                            Retry
                        </button>
                    </div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    return (
        <NeoBrutalistLayout pageTitle="WORKBENCH OVERVIEW">
            <div className="p-6">

                {/* Search Bar and New Item Button */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl">
                        <BrutalInput
                            type="search"
                            aria-label="Search dashboard"
                            placeholder="Search data..."
                            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleNewItem}
                        className="px-6 py-2 bg-[var(--loop-cyan)] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_#F5F5DC] transition-all font-bold uppercase"
                    >
                        + NEW ITEM
                    </button>
                </div>

                {/* "Hello, Community Builder" Banner - YELLOW */}
                <div className="bg-[var(--loop-yellow)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6 animate-slideDown">
                    <div className="flex justify-between items-start gap-8">
                        <div className="flex-1">
                            <h1 className="text-4xl font-black mb-4 text-black">
                                Hello, Community Builder.
                            </h1>
                            <p className="text-lg font-medium text-black mb-6">
                                You have{' '}
                                <span className="font-bold border-2 border-black px-3 py-1 bg-white inline-block shadow-[2px_2px_0px_0px_var(--shadow-color)] text-black animate-popIn">
                                    {stats?.pendingTasks || 0} pending tasks
                                </span>{' '}
                                and{' '}
                                <span className="font-bold border-2 border-black px-3 py-1 bg-white inline-block shadow-[2px_2px_0px_0px_var(--shadow-color)] text-black animate-popIn [animation-delay:0.2s]">
                                    {stats?.newPeopleRequests || 0} new people requests
                                </span>{' '}
                                today.
                            </p>
                            
                            {/* Quick Lookup Search */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold uppercase mb-2 text-black">Quick Lookup</label>
                                <div className="flex gap-2 max-w-lg">
                                    <div className="flex-1">
                                        <BrutalInput
                                            type="search"
                                            aria-label="Quick lookup"
                                            placeholder="Search people, cases, events..."
                                            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                                            value={quickSearch}
                                            onChange={(e) => setQuickSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && quickSearch.trim()) {
                                                    navigate(`/people?search=${encodeURIComponent(quickSearch)}`);
                                                }
                                            }}
                                            className="bg-white"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => quickSearch.trim() && navigate(`/people?search=${encodeURIComponent(quickSearch)}`)}
                                        className="px-4 py-2 bg-black text-white border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition-all font-bold uppercase"
                                    >
                                        GO
                                    </button>
                                </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <Link to="/people/new">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--loop-pink)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition-all font-bold text-sm uppercase">
                                        <UserPlusIcon className="w-4 h-4" />
                                        Add Person
                                    </button>
                                </Link>
                                <Link to="/cases/new">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--loop-blue)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition-all font-bold text-sm uppercase">
                                        <ClipboardDocumentListIcon className="w-4 h-4" />
                                        New Case
                                    </button>
                                </Link>
                                <Link to="/events/new">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--loop-purple)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition-all font-bold text-sm uppercase">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        Create Event
                                    </button>
                                </Link>
                                <Link to="/tasks/new">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--loop-green)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition-all font-bold text-sm uppercase">
                                        <DocumentPlusIcon className="w-4 h-4" />
                                        Add Task
                                    </button>
                                </Link>
                            </div>
                        </div>
                        {/* Decorative circles */}
                        <div className="hidden lg:flex gap-4 items-center">
                            <div className="w-24 h-24 rounded-full bg-[#C9A020] opacity-40" />
                            <div className="w-32 h-32 rounded-full bg-[#C9A020] opacity-40" />
                        </div>
                    </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Active Partners - GREEN */}
                    <div className="bg-[var(--loop-yellow)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[var(--loop-green)] border-2 border-black mb-3">
                            <span className="text-2xl">🔗</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{stats?.activePartners || 0}</div>
                        <div className="text-sm font-bold uppercase">ACTIVE PARTNERS</div>
                        <div className="text-xs text-gray-600 mt-1">+2 this month</div>
                    </div>

                    {/* Ops Efficiency - YELLOW */}
                    <div className="bg-[var(--loop-yellow)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[var(--loop-yellow)] border-2 border-black mb-3">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{stats?.opsEfficiency || 0}</div>
                        <div className="text-sm font-bold uppercase">OPS EFFICIENCY</div>
                        <div className="text-xs text-gray-600 mt-1">5 tasks remaining</div>
                    </div>

                    {/* Reach - PURPLE */}
                    <div className="bg-[var(--loop-yellow)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[var(--loop-purple)] border-2 border-black mb-3">
                            <span className="text-2xl">📢</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{stats?.reach || 0}</div>
                        <div className="text-sm font-bold uppercase">REACH</div>
                        <div className="text-xs text-gray-600 mt-1">campaigns active</div>
                    </div>

                    {/* People - PINK */}
                    <div className="bg-[var(--loop-yellow)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[var(--loop-pink)] border-2 border-black mb-3">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{stats?.totalPeople || 0}</div>
                        <div className="text-sm font-bold uppercase">PEOPLE</div>
                        <div className="text-xs text-gray-600 mt-1">total active people</div>
                    </div>
                </div>

                {/* Quick Tools Section */}
                <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                    <h2 className="text-xl font-black mb-6 uppercase text-black dark:text-white">Quick Tools</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to="/linking">
                            <div className="bg-[var(--loop-green)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">🔗</div>
                                    <div>
                                        <h3 className="font-bold text-lg text-black">Linking Network</h3>
                                        <p className="text-sm text-gray-600">Manage partnerships</p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to="/operations">
                            <div className="bg-[var(--loop-blue)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">📋</div>
                                    <div>
                                        <h3 className="font-bold text-lg text-black">Operations Board</h3>
                                        <p className="text-sm text-gray-600">Track tasks & projects</p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to="/outreach">
                            <div className="bg-[var(--loop-purple)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">📧</div>
                                    <div>
                                        <h3 className="font-bold text-lg text-black">Outreach Center</h3>
                                        <p className="text-sm text-gray-600">Campaigns & engagement</p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link to="/people">
                            <div className="bg-[var(--loop-pink)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">👥</div>
                                    <div>
                                        <h3 className="font-bold text-lg text-black">People Directory</h3>
                                        <p className="text-sm text-gray-600">Manage your team</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </NeoBrutalistLayout>
    );
}
