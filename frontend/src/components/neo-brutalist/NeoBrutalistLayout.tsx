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
                <div className="bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between">
                    {/* Page Title (Left Side) */}
                    <h1 className="text-xl font-black uppercase tracking-tight">
                        {pageTitle || 'WORKBENCH OVERVIEW'}
                    </h1>

                    {/* Profile Menu (Right Side) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white hover:bg-gray-50 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)]"
                        >
                            <div className="flex items-center gap-2">
                                {user?.profilePicture ? (
                                    <img key={user.profilePicture} src={user.profilePicture} alt="Profile" className="w-9 h-9 rounded-full border border-black object-cover" />
                                ) : (
                                    <div className="w-9 h-9 bg-black text-white flex items-center justify-center text-sm font-bold rounded-full border border-black">
                                        {user?.firstName?.[0] || 'U'}
                                    </div>
                                )}
                                <span className="text-lg font-black">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-[6px_6px_0px_0px_var(--shadow-color)] z-50">
                                <button
                                    onClick={() => navigate('/settings/user')}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 font-bold text-sm border-b-2 border-black"
                                >
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 font-bold text-sm"
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
