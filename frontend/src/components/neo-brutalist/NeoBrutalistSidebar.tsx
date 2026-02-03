/**
 * Neo-Brutalist Sidebar - Yellow LOOP Branding
 * Chameleon Mode: Active modules change sidebar button colors
 */

import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

function NavButton({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link to={to}>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b-2 border-black dark:border-white transition-all ${
          active
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'bg-white dark:bg-[#121212] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
        }`}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-bold">{label}</span>
      </div>
    </Link>
  );
}

function ModuleButton({
  to,
  icon,
  label,
  activeColor,
  active,
}: {
  to: string;
  icon: string;
  label: string;
  activeColor?: string;
  active: boolean;
}) {
  const bgColor = activeColor || 'bg-gray-200';

  return (
    <Link to={to} className="block mb-3">
      <div
        className={`flex items-center gap-3 px-4 py-3 border-2 border-black dark:border-white transition-all ${
          active
            ? `${bgColor} text-black shadow-[6px_6px_0px_0px_var(--shadow-color)]`
            : 'bg-white dark:bg-[#121212] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 shadow-[4px_4px_0px_0px_var(--shadow-color)]'
        }`}
      >
        <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold border-2 border-black">
          {icon}
        </div>
        <span className="font-bold text-sm">{label}</span>
      </div>
    </Link>
  );
}

export default function NeoBrutalistSidebar() {
    const location = useLocation();
    const { user } = useAppSelector((state) => state.auth);

    const isActive = (path: string) => location.pathname === path;

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
        <div className="w-48 bg-white dark:bg-[#121212] border-r-2 border-black dark:border-white flex flex-col h-screen">
            {/* Yellow LOOP Branding Header */}
            <div className="bg-[var(--loop-yellow)] dark:bg-[#CCAC00] border-b-2 border-black dark:border-white p-4 shadow-[6px_0px_0px_0px_var(--shadow-color)]">
                <h1 className="font-black text-xl leading-tight text-black">
                    COMMUNITY<br />LOOP
                </h1>
                <div className="mt-2 inline-block border-2 border-black bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)]">
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
            <div className="h-6 bg-[var(--loop-yellow)] dark:bg-[#CCAC00] border-b-2 border-black dark:border-white shadow-[6px_0px_0px_0px_var(--shadow-color)]"></div>

            {/* Module Links with Chameleon Colors */}
            <ModuleButton
                to="/linking"
                icon="L"
                label="Linking"
                activeColor="bg-[var(--loop-green)]"
                active={isActive('/linking')}
            />

            <ModuleButton
                to="/operations"
                icon="O"
                label="Operations"
                activeColor="bg-[var(--loop-blue)]"
                active={isActive('/operations')}
            />

            <ModuleButton
                to="/outreach"
                icon="O"
                label="Outreach"
                activeColor="bg-[var(--loop-purple)]"
                active={isActive('/outreach')}
            />

            <ModuleButton
                to="/people"
                icon="P"
                label="People"
                activeColor="bg-[var(--loop-pink)]"
                active={isActive('/people')}
            />

            {/* Spacer */}
            <div className="flex-1 border-b-2 border-black"></div>

            {/* Settings */}
            <NavButton
                to="/settings/user"
                icon="⚙"
                label="Settings"
                active={isActive('/settings/user')}
            />

            {/* Organization Admin (admins only) */}
            {user?.role === 'admin' && (
                <NavButton
                    to="/settings/admin"
                    icon="★"
                    label="Org Admin"
                    active={isActive('/settings/admin')}
                />
            )}


        </div>
    );
}
