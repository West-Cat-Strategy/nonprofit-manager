/**
 * Neo-Brutalist Sidebar - Yellow LOOP Branding
 * Chameleon Mode: Active modules change sidebar button colors
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NeoBrutalistSidebar() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const NavButton = ({ to, icon, label, active }: { to: string; icon: string; label: string; active?: boolean }) => (
        <Link to={to}>
            <div className={`flex items-center gap-3 px-4 py-3 border-b-2 border-black transition-all ${active
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
                }`}>
                <span className="text-lg">{icon}</span>
                <span className="font-bold">{label}</span>
            </div>
        </Link>
    );

    const ModuleButton = ({ to, icon, label, activeColor }: {
        to: string;
        icon: string;
        label: string;
        activeColor?: string;
    }) => {
        const active = isActive(to);
        const bgColor = activeColor || 'bg-gray-200';

        return (
            <Link to={to}>
                <div className={`flex items-center gap-3 px-4 py-3 border-b-2 border-black transition-all ${active
                    ? `${bgColor} text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`
                    : 'bg-white text-black hover:bg-gray-50'
                    }`}>
                    <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold border-2 border-black">
                        {icon}
                    </div>
                    <span className="font-bold text-sm">{label}</span>
                </div>
            </Link>
        );
    };

    // Get current date in format "FEB 03 2026"
    const getCurrentDate = () => {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const now = new Date();
        const month = months[now.getMonth()];
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        return `${month} ${day} ${year}`;
    };

    return (
        <div className="w-48 bg-white border-r-2 border-black flex flex-col h-screen">
            {/* Yellow LOOP Branding Header */}
            <div className="bg-[#FFD700] border-b-2 border-black p-4 shadow-[6px_0px_0px_0px_rgba(0,0,0,1)]">
                <h1 className="font-black text-xl leading-tight">
                    COMMUNITY<br />LOOP
                </h1>
                <div className="mt-2 inline-block border-2 border-black bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {getCurrentDate()}
                </div>
            </div>

            {/* Dashboard */}
            <NavButton
                to="/dashboard"
                icon="▦"
                label="Dashboard"
                active={isActive('/dashboard') || isActive('/')}
            />

            {/* Yellow Separator Box (replaces MODULES label) */}
            <div className="h-6 bg-[#FFD700] border-b-2 border-black shadow-[6px_0px_0px_0px_rgba(0,0,0,1)]"></div>

            {/* Module Links with Chameleon Colors */}
            <ModuleButton
                to="/linking"
                icon="L"
                label="Linking"
                activeColor="bg-[#90EE90]"
            />

            <ModuleButton
                to="/operations"
                icon="O"
                label="Operations"
                activeColor="bg-[#87CEEB]"
            />

            <ModuleButton
                to="/outreach"
                icon="O"
                label="Outreach"
                activeColor="bg-[#D8BFD8]"
            />

            <ModuleButton
                to="/people"
                icon="P"
                label="People"
                activeColor="bg-[#FFB6C1]"
            />

            {/* Spacer */}
            <div className="flex-1 border-b-2 border-black"></div>

            {/* User Profile at Bottom */}
            <div className="border-t-2 border-black p-4 bg-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">
                    JA
                </div>
                <div className="flex-1">
                    <div className="font-bold text-sm">Jane Admin</div>
                    <div className="text-xs text-gray-600">@westcat</div>
                </div>
                <button className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    ⚙️
                </button>
            </div>
        </div>
    );
}
