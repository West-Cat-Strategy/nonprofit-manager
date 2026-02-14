/**
 * Neo-Brutalist Sidebar - Yellow LOOP Branding
 * Chameleon Mode: Active modules change sidebar button colors
 */

import { Link, useLocation } from 'react-router-dom';

// SVG Icon Components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const PeopleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const CasesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const EventsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const TasksIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);


interface NavButtonProps {
  to: string;
  icon: React.ReactNode;
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
        className={`flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--app-border)] transition-all ${
          active
            ? 'bg-[var(--app-border)] text-[var(--app-bg)]'
            : 'bg-[var(--app-surface-muted)] text-[var(--app-text)] hover:bg-[var(--app-surface)]'
        }`}
      >
        <span aria-hidden="true">{icon}</span>
        <span className="font-bold">{label}</span>
      </div>
    </Link>
  );
}

interface ModuleButtonProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  activeColor?: string;
  active: boolean;
}

function ModuleButton({ to, icon, label, activeColor, active }: ModuleButtonProps) {
  const bgColor = activeColor || 'bg-app-surface-muted';

  return (
    <Link
      to={to}
      className="block mb-3"
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 border-2 border-[var(--app-border)] transition-all ${
          active
            ? `${bgColor} text-black shadow-[6px_6px_0px_0px_var(--shadow-color)]`
            : 'bg-[var(--app-surface-muted)] hover:bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]'
        }`}
      >
        <div
          className={`w-7 h-7 flex items-center justify-center border-2 border-[var(--app-border)] ${
            active ? 'bg-black text-white' : 'bg-[var(--app-border)] text-[var(--app-bg)]'
          }`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <span className="font-bold text-sm text-[var(--app-text)]">{label}</span>
      </div>
    </Link>
  );
}

export default function NeoBrutalistSidebar() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside
      className="w-48 bg-[var(--app-bg)] border-r-2 border-[var(--app-border)] flex flex-col h-screen transition-colors duration-300"
      aria-label="Main navigation"
    >
      {/* Primary Navigation */}
      <nav aria-label="Primary navigation">
        <NavButton
          to="/dashboard"
          icon={<DashboardIcon />}
          label="Dashboard"
          active={isActive('/dashboard') || isActive('/')}
        />
      </nav>

      {/* Yellow Separator Box */}
      <div
        className="h-6 bg-[var(--loop-yellow)] border-b-2 border-[var(--app-border)] shadow-[6px_0px_0px_0px_var(--shadow-color)] transition-colors duration-300"
        aria-hidden="true"
      />

      {/* Module Navigation */}
      <nav className="flex-1 px-2 pt-2" aria-label="Module navigation">
        <ModuleButton
          to="/people"
          icon={<PeopleIcon />}
          label="People"
          activeColor="bg-[var(--loop-pink)]"
          active={isActive('/people')}
        />

        <ModuleButton
          to="/cases"
          icon={<CasesIcon />}
          label="Cases"
          activeColor="bg-[var(--loop-blue)]"
          active={isActive('/cases')}
        />

        <ModuleButton
          to="/events"
          icon={<EventsIcon />}
          label="Events"
          activeColor="bg-[var(--loop-purple)]"
          active={isActive('/events')}
        />

        <ModuleButton
          to="/tasks"
          icon={<TasksIcon />}
          label="Tasks"
          activeColor="bg-[var(--loop-green)]"
          active={isActive('/tasks')}
        />

        <ModuleButton
          to="/reports"
          icon={<ReportsIcon />}
          label="Reports"
          activeColor="bg-[var(--loop-yellow)]"
          active={isActive('/reports')}
        />
      </nav>
    </aside>
  );
}
