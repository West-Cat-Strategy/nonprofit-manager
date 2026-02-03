/**
 * Neo-Brutalist Layout - Two-column layout with sidebar
 * Precision-refined: No top whitespace, unified header bar
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import NeoBrutalistSidebar from './NeoBrutalistSidebar';

interface NeoBrutalistLayoutProps {
    children: ReactNode;
    pageTitle?: string;
}

export default function NeoBrutalistLayout({ children, pageTitle }: NeoBrutalistLayoutProps) {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--app-bg)] transition-colors duration-300">
            {/* Left Sidebar */}
            <NeoBrutalistSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Unified Top Bar - Page Title Left, Profile Right */}
                <div className="relative z-50 bg-[var(--app-bg)] border-b-2 border-black dark:border-white pl-6 pr-0 py-0 flex items-center justify-between transition-colors duration-300">
                    {/* Page Title (Left Side) */}
                    <h1 className="text-xl font-black uppercase tracking-tight py-3 text-black dark:text-white">
                        {pageTitle || 'WORKBENCH OVERVIEW'}
                    </h1>

                    {/* Profile Menu (Right Side) - Flush Right & Jumbo */}
                    <div className="relative h-full">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-6 px-8 h-[96px] border-l-2 border-black dark:border-white bg-[var(--app-bg)] hover:bg-[var(--app-surface)] font-bold shadow-none transition-all active:opacity-80"
                            aria-label="Open user menu"
                            aria-haspopup="menu"
                            aria-expanded={showMenu ? 'true' : 'false'}
                        >
                            <div className="flex items-center gap-6">
                                {user?.profilePicture ? (
                                    <img key={user.profilePicture} src={user.profilePicture} alt="Profile" className="w-16 h-16 rounded-full border-2 border-black object-cover" />
                                ) : (
                                    <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-3xl font-black rounded-full border-2 border-black">
                                        {user?.firstName?.[0] || 'U'}
                                    </div>
                                )}
                                <span className="text-3xl font-black italic text-black dark:text-white truncate max-w-xs">
                                    {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                                </span>
                            </div>
                            <svg className="w-8 h-8 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu - High z-index to appear above brutal borders */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-[var(--app-surface)] border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_var(--shadow-color)] z-[100] opacity-100">
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        navigate('/settings/user');
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold text-sm border-b-2 border-black dark:border-white text-black dark:text-white transition-colors"
                                >
                                    Settings
                                </button>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            navigate('/settings/admin');
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm border-b-2 border-black dark:border-white text-black dark:text-white"
                                    >
                                        Organization Admin
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold text-sm text-black dark:text-white transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto bg-[var(--app-bg)] transition-colors duration-300">
                    {children}
                </div>
            </div>
        </div>
    );
}
