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
  blue: 'bg-sky-200/60',
  green: 'bg-emerald-200/60',
  purple: 'bg-violet-200/60',
  yellow: 'bg-amber-200/60',
  red: 'bg-rose-200/60',
  teal: 'bg-teal-200/60',
  indigo: 'bg-indigo-200/60',
};

const accentText: Record<KPICardProps['color'], string> = {
  blue: 'text-sky-700',
  green: 'text-emerald-700',
  purple: 'text-violet-700',
  yellow: 'text-amber-700',
  red: 'text-rose-700',
  teal: 'text-teal-700',
  indigo: 'text-indigo-700',
};

function KPICard({ title, value, subtitle, caption, color }: KPICardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      role="article"
      aria-label={`${title}: ${value}`}
    >
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accentGlow[color]}`} aria-hidden="true" />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accentText[color]}`}>
          {title}
        </p>
        <p className="font-display mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {caption && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{caption}</p>}
      </div>
    </div>
  );
}

export default memo(KPICard);
export type { KPICardProps };
