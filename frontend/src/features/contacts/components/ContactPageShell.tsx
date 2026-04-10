import type { ReactNode } from 'react';
import { BrutalCard } from '../../../components/neo-brutalist';

interface ContactPageShellProps {
  tone: 'green' | 'purple' | 'yellow' | 'pink' | 'white';
  backLabel: string;
  onBack: () => void;
  title: string;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function ContactPageShell({
  tone,
  backLabel,
  onBack,
  title,
  description,
  metadata,
  actions,
  children,
}: ContactPageShellProps) {
  return (
    <div className="p-6 space-y-6">
      <BrutalCard color={tone} className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm font-black uppercase text-black/70 transition hover:text-black dark:text-white/80 dark:hover:text-white"
              aria-label={backLabel}
            >
              ← {backLabel}
            </button>

            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white">
                {title}
              </h1>
              {description ? (
                <div className="max-w-3xl text-sm font-bold leading-6 text-black/70 dark:text-white/80">
                  {description}
                </div>
              ) : null}
            </div>

            {metadata ? <div className="flex flex-wrap gap-2">{metadata}</div> : null}
          </div>

          {actions ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:gap-3">
              {actions}
            </div>
          ) : null}
        </div>
      </BrutalCard>

      {children}
    </div>
  );
}
