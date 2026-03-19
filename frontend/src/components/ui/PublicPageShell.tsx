import type { ReactNode } from 'react';

interface PublicPageShellProps {
  badge?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PublicPageShell({
  badge,
  title,
  description,
  actions,
  children,
}: PublicPageShellProps) {
  return (
    <div className="app-shell app-shell--public relative min-h-screen overflow-hidden bg-gradient-to-br from-app-bg via-app-shell-top to-app-accent-soft/30 text-app-text">
      <div
        aria-hidden="true"
        className="app-shell-orb app-shell-orb--primary pointer-events-none absolute left-[-8rem] top-[-6rem] h-64 w-64 rounded-full bg-[var(--app-shell-glow)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="app-shell-orb app-shell-orb--secondary pointer-events-none absolute bottom-[-6rem] right-[-8rem] h-72 w-72 rounded-full bg-[var(--app-shell-glow-secondary)] blur-3xl"
      />

      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="app-shell-panel rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/92 p-6 shadow-[var(--ui-elev-2)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {badge ? (
                <span className="inline-flex items-center rounded-full border border-app-border-muted bg-app-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-label">
                  {badge}
                </span>
              ) : null}
              <h1 className="font-display mt-3 text-3xl font-semibold text-app-text-heading sm:text-4xl">
                {title}
              </h1>
              {description ? <p className="mt-3 text-base text-app-text-muted">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </section>

        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}
