/**
 * Linking Module - PARTNERSHIP MANAGEMENT
 * Uses LoopApiService, standard Loop Green theme
 */

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';
import LoopApiService from '../../services/LoopApiService';
import type { Organization } from '../../types/schema';

export default function LinkingModule() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const data = await LoopApiService.getOrganizations();
                setOrganizations(data);
            } catch (error) {
                console.error('Failed to fetch organizations:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrgs();
    }, []);

    const handleNewItem = () => console.log('Open New Organization Modal');
    const handleEdit = (id: string) => console.log(`Edit Organization ${id}`);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-[var(--loop-green)] text-black border-black';
            case 'pending':
                return 'bg-[var(--loop-yellow)] text-black border-black';
            case 'review':
                return 'bg-[var(--loop-purple)] text-black border-black';
            default:
                return 'bg-app-hover text-black border-black';
        }
    };

    if (loading) {
        return (
            <NeoBrutalistLayout pageTitle="LINKING">
                <div className="flex justify-center items-center h-screen pb-40">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black dark:border-white"></div>
                </div>
            </NeoBrutalistLayout>
        );
    }

    return (
        <NeoBrutalistLayout pageTitle="LINKING">
            <div className="p-6">
                {/* Search Bar */}
                <div className="mb-6 flex justify-between items-center gap-4">
                    <div className="flex-1 max-w-2xl">
                        <BrutalInput
                            type="search"
                            placeholder="Search partnerships..."
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

                {/* Banner - GREEN */}
                <div className="bg-[var(--loop-green)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6">
                    <h2 className="text-3xl font-black mb-2 uppercase">Linking Network</h2>
                    <p className="text-lg font-medium">Managing partnerships and organizational connections.</p>
                </div>

                {/* Data Table */}
                <div className="bg-app-surface dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[var(--loop-green)]">
                            <tr>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm text-black">
                                    ORGANIZATION
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm text-black">
                                    TYPE
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm text-black">
                                    STATUS
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm text-black">
                                    CONTACT
                                </th>
                                <th className="px-6 py-4 text-left border-b-2 border-black font-black uppercase text-sm text-black">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {organizations.map((org) => (
                                <tr key={org.id} className="border-b-2 border-black hover:bg-app-surface-muted dark:hover:bg-app-text transition-colors">
                                    <td className="px-6 py-4 font-bold bg-[var(--loop-green)] border-r-2 border-black text-black">{org.name}</td>
                                    <td className="px-6 py-4 capitalize font-medium text-black dark:text-white">{org.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold uppercase px-3 py-1 border-2 ${getStatusColor(org.status)}`}>
                                            {org.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-black dark:text-white">{org.contact}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleEdit(org.id)}
                                            className="px-4 py-2 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase text-sm"
                                        >
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
