/**
 * Neo-Brutalist Dashboard - HARD-CODED STYLING VERSION
 * All colors and shadows use direct hex values and arbitrary Tailwind classes
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import { mockDashboardStats } from '../../utils/mockData';

export default function NeoBrutalistDashboard() {
    return (
        <NeoBrutalistLayout pageTitle="WORKBENCH OVERVIEW">
            <div className="p-6">

                {/* Search Bar and New Item Button */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            placeholder="Search data..."
                            className="w-full border-2 border-black dark:border-[#F5F5DC] px-4 py-2 pl-10 bg-white dark:bg-[#1a1a1a] text-black dark:text-[#F5F5DC] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-[#F5F5DC]"
                        />
                    </div>
                    <button className="px-6 py-2 bg-[#4DD0E1] text-black border-2 border-black dark:border-[#F5F5DC] shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_#F5F5DC] transition-all font-bold uppercase">
                        + NEW ITEM
                    </button>
                </div>

                {/* "Hello, Community Builder" Banner - YELLOW */}
                <div className="bg-[#FFD700] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6 animate-slideDown">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <h1 className="text-4xl font-black mb-4 text-black">
                                Hello, Community Builder.
                            </h1>
                            <p className="text-lg font-medium text-black">
                                You have{' '}
                                <span className="font-bold border-2 border-black px-3 py-1 bg-white inline-block shadow-[2px_2px_0px_0px_var(--shadow-color)] text-black animate-popIn">
                                    {mockDashboardStats.pendingTasks || 0} pending tasks
                                </span>{' '}
                                and{' '}
                                <span className="font-bold border-2 border-black px-3 py-1 bg-white inline-block shadow-[2px_2px_0px_0px_var(--shadow-color)] text-black animate-popIn [animation-delay:0.2s]">
                                    {mockDashboardStats.newPeopleRequests || 0} new people requests
                                </span>{' '}
                                today.
                            </p>
                            <div className="mt-6 flex gap-4">
                                <Link to="/tasks">
                                    <button className="px-6 py-3 bg-white text-black border-2 border-black dark:border-[#F5F5DC] shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-[#1a1a1a] dark:text-[#F5F5DC] font-bold uppercase">
                                        VIEW TASKS
                                    </button>
                                </Link>
                                <Link to="/people">
                                    <button className="px-6 py-3 bg-black text-white border-2 border-black dark:border-[#F5F5DC] shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-800 font-bold uppercase">
                                        REVIEW PEOPLE
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
                    <div className="bg-[#FFD700] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[#90EE90] border-2 border-black mb-3">
                            <span className="text-2xl">🔗</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{mockDashboardStats.activePartners || 0}</div>
                        <div className="text-sm font-bold uppercase">ACTIVE PARTNERS</div>
                        <div className="text-xs text-gray-600 mt-1">+2 this month</div>
                    </div>

                    {/* Ops Efficiency - YELLOW */}
                    <div className="bg-[#FFD700] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[#FFD700] border-2 border-black mb-3">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{mockDashboardStats.opsEfficiency || 0}</div>
                        <div className="text-sm font-bold uppercase">OPS EFFICIENCY</div>
                        <div className="text-xs text-gray-600 mt-1">5 tasks remaining</div>
                    </div>

                    {/* Reach - PURPLE */}
                    <div className="bg-[#FFD700] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[#D8BFD8] border-2 border-black mb-3">
                            <span className="text-2xl">📢</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{mockDashboardStats.reach || 0}</div>
                        <div className="text-sm font-bold uppercase">REACH</div>
                        <div className="text-xs text-gray-600 mt-1">campaigns active</div>
                    </div>

                    {/* People - PINK */}
                    <div className="bg-[#FFD700] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[#FFB6C1] border-2 border-black mb-3">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div className="text-3xl font-black mb-1 text-black">{mockDashboardStats.totalPeople || 0}</div>
                        <div className="text-sm font-bold uppercase">PEOPLE</div>
                        <div className="text-xs text-gray-600 mt-1">total active people</div>
                    </div>
                </div>

                {/* Quick Tools Section */}
                <div className="bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                    <h2 className="text-xl font-black mb-6 uppercase text-black dark:text-[#F5F5DC]">Quick Tools</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to="/linking">
                            <div className="bg-[#90EE90] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
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
                            <div className="bg-[#87CEEB] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
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
                            <div className="bg-[#D8BFD8] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
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
                            <div className="bg-[#FFB6C1] border-2 border-black dark:border-[#F5F5DC] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all cursor-pointer">
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
