/**
 * Linking Module - HARD-CODED NEO-BRUTALIST STYLING
 * Green theme (#90EE90) with thick black borders
 */

import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import { mockOrganizations } from '../../utils/mockData';

export default function LinkingModule() {
    const [searchTerm, setSearchTerm] = useState('');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-[#90EE90] text-black border-black';
            case 'pending':
                return 'bg-[#FFD700] text-black border-black';
            case 'review':
                return 'bg-[#D8BFD8] text-black border-black';
            default:
                return 'bg-gray-300 text-black border-black';
        }
    };

    return (
        <NeoBrutalistLayout pageTitle="LINKING">
            <div className="p-6">
                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            placeholder="Search data..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border-2 border-black dark:border-white px-4 py-2 pl-10 bg-white dark:bg-[#000000] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                        />
                    </div>
                    <button className="px-6 py-2 bg-[#4DD0E1] text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-cyan-400 font-bold uppercase">
                        + NEW ITEM
                    </button>
                </div>

                {/* Banner - GREEN */}
                <div className="bg-[#90EE90] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6">
                    <h2 className="text-3xl font-black mb-2 uppercase">Linking Network</h2>
                    <p className="text-lg font-medium">Managing partnerships and organizational connections.</p>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#90EE90]">
                            <tr>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm">
                                    ORGANIZATION
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm">
                                    TYPE
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm">
                                    STATUS
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm">
                                    CONTACT
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockOrganizations.map((org) => (
                                <tr key={org.id} className="border-b-2 border-black hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold bg-[#90EE90] border-r-2 border-black">{org.name}</td>
                                    <td className="px-6 py-4 capitalize font-medium">{org.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold uppercase px-3 py-1 border-2 ${getStatusColor(org.status)}`}>
                                            {org.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{org.contact}</td>
                                    <td className="px-6 py-4">
                                        <button className="px-4 py-2 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-gray-100 font-bold uppercase text-sm">
                                            EDIT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </NeoBrutalistLayout>
    );
}
