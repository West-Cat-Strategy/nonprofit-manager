import { memo } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  caption?: string;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'teal' | 'indigo';
  icon?: React.ReactNode;
}

const accentGlow: Record<KPICardProps['color'], string> = {
  blue: 'bg-app-accent-soft/60',
  green: 'bg-app-accent-soft/60',
  purple: 'bg-app-accent-soft/60',
  yellow: 'bg-app-accent-soft/60',
  red: 'bg-app-accent-soft/60',
  teal: 'bg-app-accent-soft/60',
  indigo: 'bg-app-accent-soft/60',
};

const accentText: Record<KPICardProps['color'], string> = {
  blue: 'text-app-accent-text',
  green: 'text-app-accent-text',
  purple: 'text-app-accent-text',
  yellow: 'text-app-accent-text',
  red: 'text-app-accent-text',
  teal: 'text-app-accent-text',
  indigo: 'text-app-accent-text',
};

function KPICard({ title, value, subtitle, caption, color }: KPICardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      role="article"
      aria-label={`${title}: ${value}`}
    >
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accentGlow[color]}`} aria-hidden="true" />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accentText[color]}`}>
          {title}
        </p>
        <p className="font-display mt-2 text-2xl font-semibold text-app-text">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-app-text-muted">{subtitle}</p>}
        {caption && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-app-text-subtle">{caption}</p>}
      </div>
    </div>
  );
}

export default memo(KPICard);
export type { KPICardProps };
