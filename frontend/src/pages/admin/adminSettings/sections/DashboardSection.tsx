import { useEffect, useState } from 'react';
import api from '../../../../services/api';
import { useApiError } from '../../../../hooks/useApiError';

interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalContacts: number;
    recentDonations: number;
    recentSignups: Array<{ id: string; email: string; created_at: string }>;
}

export default function DashboardSection() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { setFromError } = useApiError({ notify: true });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/stats');
                setStats(response.data);
            } catch (error) {
                setFromError(error, 'Failed to load admin stats');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [setFromError]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--loop-blue)]"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={stats.totalUsers} color="bg-[var(--loop-blue)]" />
                <StatCard title="Active Users (30d)" value={stats.activeUsers} color="bg-[var(--loop-green)]" />
                <StatCard title="Total Contacts" value={stats.totalContacts} color="bg-[var(--loop-purple)]" />
                <StatCard
                    title="Recent Donations (30d)"
                    value={`$${stats.recentDonations.toLocaleString()}`}
                    color="bg-[var(--loop-yellow)]"
                />
            </div>

            <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black uppercase mb-4">Recent Signups</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-[var(--app-border)]">
                                <th className="pb-2 font-bold uppercase">Email</th>
                                <th className="pb-2 font-bold uppercase">Date Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentSignups.map((user) => (
                                <tr key={user.id} className="border-b border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]">
                                    <td className="py-2">{user.email}</td>
                                    <td className="py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {stats.recentSignups.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="py-4 text-center text-[var(--app-text-muted)]">No recent users found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
    return (
        <div className={`${color} border-2 border-[var(--app-border)] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <h3 className="text-sm font-bold uppercase mb-1 opacity-80">{title}</h3>
            <p className="text-3xl font-black">{value}</p>
        </div>
    );
}
