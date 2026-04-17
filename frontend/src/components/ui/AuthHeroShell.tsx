import { useId, type ReactNode } from 'react';
import SkipLink from '../SkipLink';

interface AuthHeroShellProps {
  badge?: string;
  title: string;
  description: string;
  highlights?: string[];
  children: ReactNode;
}

export default function AuthHeroShell({
  badge,
  title,
  description,
  highlights = [],
  children,
}: AuthHeroShellProps) {
  const titleId = useId();

  return (
    <div className="app-shell app-shell--auth relative min-h-screen overflow-hidden bg-gradient-to-br from-app-bg via-app-shell-top to-app-accent-soft/35 font-body text-app-text">
      <SkipLink targetId="auth-main-content" />
      <div
        aria-hidden="true"
        className="app-shell-orb app-shell-orb--primary pointer-events-none absolute -top-24 left-0 h-72 w-72 rounded-full bg-[var(--app-shell-glow)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="app-shell-orb app-shell-orb--secondary pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[var(--app-shell-glow-secondary)] blur-3xl"
      />
      <main
        id="auth-main-content"
        className="relative mx-auto flex min-h-screen max-w-6xl items-start px-4 py-6 sm:items-center sm:px-6 sm:py-10 lg:px-8"
      >
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.05fr]">
          <header className="order-2 flex flex-col gap-6 lg:order-1">
            {badge && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-app-border-muted bg-app-surface-elevated/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-text-label shadow-sm backdrop-blur">
                {badge}
              </span>
            )}
            <div className="space-y-3">
              <h1
                id={titleId}
                className="font-display text-3xl font-semibold text-app-text-heading sm:text-4xl"
              >
                {title}
              </h1>
              <p className="max-w-2xl text-base text-app-text sm:text-lg">{description}</p>
            </div>
            {highlights.length > 0 && (
              <div className="space-y-3 text-sm text-app-text">
                {highlights.map((copy) => (
                  <div
                    key={copy}
                    className="app-shell-panel flex items-start gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-elevated/80 p-3 shadow-sm backdrop-blur"
                  >
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 011.415-1.42l2.792 2.792 6.792-6.792a1 1 0 011.416 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span>{copy}</span>
                  </div>
                ))}
              </div>
            )}
          </header>
          <section
            aria-labelledby={titleId}
            className="app-shell-panel order-1 rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/92 p-5 shadow-[var(--ui-elev-2)] backdrop-blur sm:p-8 lg:order-2"
          >
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
