import { useState } from 'react';
import type { SavedReport, ShareSettings } from '../../types/savedReport';
import api from '../../services/api';

interface ReportSharingDialogProps {
    report: SavedReport;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function ReportSharingDialog({ report, isOpen, onClose, onSuccess }: ReportSharingDialogProps) {
    const [shareMode, setShareMode] = useState<'users' | 'public'>('users');
    const [userEmails, setUserEmails] = useState('');
    const [canEdit, setCanEdit] = useState(false);
    const [expiresAt, setExpiresAt] = useState('');
    const [publicLink, setPublicLink] = useState(report.public_token || '');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleShareWithUsers = async () => {
        try {
            setLoading(true);
            const emails = userEmails.split(',').map(e => e.trim()).filter(e => e);

            await api.post(`/saved-reports/${report.id}/share`, {
                user_ids: emails, // In production, you'd need to resolve emails to user IDs
                share_settings: {
                    can_edit: canEdit,
                    expires_at: expiresAt || undefined,
                },
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error sharing report:', error);
            alert('Failed to share report');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePublicLink = async () => {
        try {
            setLoading(true);
            const response = await api.post(`/saved-reports/${report.id}/public-link`, {
                expires_at: expiresAt || undefined,
            });
            setPublicLink(response.data.token);
        } catch (error) {
            console.error('Error generating public link:', error);
            alert('Failed to generate public link');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokePublicLink = async () => {
        try {
            setLoading(true);
            await api.delete(`/saved-reports/${report.id}/public-link`);
            setPublicLink('');
            onSuccess();
        } catch (error) {
            console.error('Error revoking public link:', error);
            alert('Failed to revoke public link');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const fullUrl = `${window.location.origin}/public/reports/${publicLink}`;
        navigator.clipboard.writeText(fullUrl);
        alert('Link copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--app-surface)] border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-[var(--loop-yellow)] border-b-4 border-black p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-black uppercase">Share Report</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black hover:text-white border-2 border-black transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Report Info */}
                    <div className="mb-6 p-4 bg-[var(--app-surface-muted)] border-2 border-black">
                        <h3 className="font-black uppercase mb-1">{report.name}</h3>
                        {report.description && (
                            <p className="text-sm text-[var(--app-text-muted)]">{report.description}</p>
                        )}
                    </div>

                    {/* Share Mode Toggle */}
                    <div className="mb-6 flex gap-4">
                        <button
                            onClick={() => setShareMode('users')}
                            className={`flex-1 px-4 py-3 border-2 border-black font-bold uppercase transition-all ${shareMode === 'users'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                                }`}
                        >
                            👥 Share with Users
                        </button>
                        <button
                            onClick={() => setShareMode('public')}
                            className={`flex-1 px-4 py-3 border-2 border-black font-bold uppercase transition-all ${shareMode === 'public'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                                }`}
                        >
                            🔗 Public Link
                        </button>
                    </div>

                    {/* Share with Users */}
                    {shareMode === 'users' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    User Emails (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={userEmails}
                                    onChange={(e) => setUserEmails(e.target.value)}
                                    placeholder="user1@example.com, user2@example.com"
                                    className="w-full px-4 py-3 border-2 border-black font-mono focus:ring-0"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="can-edit"
                                    checked={canEdit}
                                    onChange={(e) => setCanEdit(e.target.checked)}
                                    className="w-5 h-5 border-2 border-black"
                                />
                                <label htmlFor="can-edit" className="font-bold uppercase cursor-pointer">
                                    Allow Editing
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Expires At (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-black focus:ring-0"
                                />
                            </div>

                            <button
                                onClick={handleShareWithUsers}
                                disabled={loading || !userEmails}
                                className="w-full px-6 py-3 bg-[var(--loop-green)] text-black border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
                            >
                                {loading ? 'Sharing...' : 'Share Report'}
                            </button>
                        </div>
                    )}

                    {/* Public Link */}
                    {shareMode === 'public' && (
                        <div className="space-y-4">
                            {publicLink ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-[var(--loop-green)] border-2 border-black">
                                        <p className="text-sm font-bold uppercase mb-2">🔗 Public Link Active</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={`${window.location.origin}/public/reports/${publicLink}`}
                                                readOnly
                                                className="flex-1 px-3 py-2 border-2 border-black font-mono text-sm"
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className="px-4 py-2 bg-black text-white border-2 border-black font-bold uppercase hover:bg-[var(--app-text)]"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleRevokePublicLink}
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-[var(--loop-red)] text-white border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Revoking...' : 'Revoke Public Link'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold uppercase mb-2">
                                            Expires At (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-black focus:ring-0"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGeneratePublicLink}
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-[var(--loop-green)] text-black border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Generating...' : 'Generate Public Link'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReportSharingDialog;
