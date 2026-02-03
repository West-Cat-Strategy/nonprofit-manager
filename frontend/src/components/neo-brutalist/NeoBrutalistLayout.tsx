/**
 * Neo-Brutalist Layout - Two-column layout with sidebar
 * Precision-refined: No top whitespace, unified header bar
 */

import React, { ReactNode } from 'react';
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
    const [showMenu, setShowMenu] = React.useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Left Sidebar */}
            <NeoBrutalistSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Unified Top Bar - Page Title Left, Profile Right */}
                <div className="bg-white dark:bg-[#121212] border-b-2 border-black dark:border-white pl-6 pr-0 py-0 flex items-center justify-between">
                    {/* Page Title (Left Side) */}
                    <h1 className="text-xl font-black uppercase tracking-tight py-3 text-black dark:text-white">
                        {pageTitle || 'WORKBENCH OVERVIEW'}
                    </h1>

                    {/* Profile Menu (Right Side) - Flush Right & Jumbo */}
                    <div className="relative h-full">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-6 px-8 h-[96px] border-l-2 border-black dark:border-white bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-gray-900 font-bold shadow-none transition-all active:bg-gray-100 dark:active:bg-gray-800"
                        >
                            <div className="flex items-center gap-6">
                                {user?.profilePicture ? (
                                    <img key={user.profilePicture} src={user.profilePicture} alt="Profile" className="w-16 h-16 rounded-full border-2 border-black object-cover" />
                                ) : (
                                    <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-3xl font-black rounded-full border-2 border-black">
                                        {user?.firstName?.[0] || 'U'}
                                    </div>
                                )}
                                <span className="text-3xl font-black italic text-black dark:text-white">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                            </div>
                            <svg className="w-8 h-8 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_var(--shadow-color)] z-50">
                                <button
                                    onClick={() => navigate('/settings/user')}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm border-b-2 border-black dark:border-white text-black dark:text-white"
                                >
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm text-black dark:text-white"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto bg-white">
                    {children}
                </div>
            </div>
        </div>
    );
}
