import type { ReactNode } from 'react';

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
  return (
    <div className="auth-page-light relative min-h-screen overflow-hidden bg-gradient-to-br from-app-bg via-white to-app-accent-soft/70 font-body">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-0 h-72 w-72 rounded-full bg-app-accent-soft/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-app-accent-soft/55 blur-3xl"
      />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col justify-center">
            {badge && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-app-border bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-text shadow-sm">
                {badge}
              </span>
            )}
            <h1 className="font-display mt-4 text-4xl font-semibold text-app-text-heading sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-app-text sm:text-lg">{description}</p>
            {highlights.length > 0 && (
              <div className="mt-6 grid gap-3 text-sm text-app-text">
                {highlights.map((copy) => (
                  <div
                    key={copy}
                    className="flex items-start gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-white/70 p-3 shadow-sm"
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
          </div>
          <div className="rounded-[var(--ui-radius-lg)] border border-app-border/80 bg-white/92 p-8 shadow-[var(--ui-elev-2)] backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
