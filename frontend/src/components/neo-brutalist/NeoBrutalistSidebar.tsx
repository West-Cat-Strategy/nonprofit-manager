/**
 * Neo-Brutalist Sidebar - Yellow LOOP Branding
 * Chameleon Mode: Active modules change sidebar button colors
 */

import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface NavButtonProps {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
}

function NavButton({ to, icon, label, active }: NavButtonProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b-2 border-black dark:border-white transition-all ${
          active
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'bg-[var(--app-surface)] text-black dark:text-white hover:opacity-80'
        }`}
      >
        <span className="text-lg" aria-hidden="true">{icon}</span>
        <span className="font-bold">{label}</span>
      </div>
    </Link>
  );
}

interface ModuleButtonProps {
  to: string;
  icon: string;
  label: string;
  activeColor?: string;
  active: boolean;
}

function ModuleButton({ to, icon, label, activeColor, active }: ModuleButtonProps) {
  const bgColor = activeColor || 'bg-gray-200';

  return (
    <Link
      to={to}
      className="block mb-3"
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 border-2 border-black dark:border-white transition-all ${
          active
            ? `${bgColor} text-black shadow-[6px_6px_0px_0px_var(--shadow-color)]`
            : 'bg-[var(--app-surface)] text-black dark:text-white hover:opacity-80 shadow-[4px_4px_0px_0px_var(--shadow-color)]'
        }`}
      >
        <div
          className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold border-2 border-black"
          aria-hidden="true"
        >
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

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
    <aside
      className="w-48 bg-[var(--app-bg)] border-r-2 border-black dark:border-white flex flex-col h-screen transition-colors duration-300"
      aria-label="Main navigation"
    >
      {/* Yellow LOOP Branding Header */}
      <div className="bg-[var(--loop-yellow)] border-b-2 border-black dark:border-white p-4 shadow-[6px_0px_0px_0px_var(--shadow-color)] transition-colors duration-300">
        <h1 className="font-black text-xl leading-tight text-black">
          COMMUNITY<br />LOOP
        </h1>
        <div
          className="mt-2 inline-block border-2 border-black bg-[var(--app-surface)] px-2 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] text-[var(--app-text)]"
          aria-label={`Today's date: ${getCurrentDate()}`}
        >
          {getCurrentDate()}
        </div>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary navigation">
        <NavButton
          to="/dashboard"
          icon="▦"
          label="Dashboard"
          active={isActive('/dashboard') || isActive('/')}
        />
      </nav>

      {/* Yellow Separator Box */}
      <div
        className="h-6 bg-[var(--loop-yellow)] border-b-2 border-black dark:border-white shadow-[6px_0px_0px_0px_var(--shadow-color)] transition-colors duration-300"
        aria-hidden="true"
      />

      {/* Module Navigation */}
      <nav className="flex-1 px-2 pt-2" aria-label="Module navigation">
        <ModuleButton
          to="/people"
          icon="P"
          label="People"
          activeColor="bg-[var(--loop-pink)]"
          active={isActive('/people')}
        />

        <ModuleButton
          to="/cases"
          icon="C"
          label="Cases"
          activeColor="bg-[var(--loop-blue)]"
          active={isActive('/cases')}
        />

        <ModuleButton
          to="/events"
          icon="E"
          label="Events"
          activeColor="bg-[var(--loop-purple)]"
          active={isActive('/events')}
        />

        <ModuleButton
          to="/tasks"
          icon="T"
          label="Tasks"
          activeColor="bg-[var(--loop-green)]"
          active={isActive('/tasks')}
        />

        <ModuleButton
          to="/reports"
          icon="R"
          label="Reports"
          activeColor="bg-[var(--loop-yellow)]"
          active={isActive('/reports')}
        />
      </nav>

      {/* Spacer */}
      <div className="flex-1 border-b-2 border-black" aria-hidden="true" />

      {/* Settings Navigation */}
      <nav aria-label="Settings navigation">
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
      </nav>
    </aside>
  );
}
