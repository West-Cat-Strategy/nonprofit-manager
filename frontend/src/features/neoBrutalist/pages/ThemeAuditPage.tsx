import ThemeSelector from '../../../components/ThemeSelector';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const shellHighlights = [
  'Shell glow, backdrop, and radius should shift with each theme.',
  'Buttons, inputs, and muted surfaces should remain distinct in light and dark.',
  'High Contrast should stay plain, clear, and uncompromising.',
];

export default function ThemeAuditPage() {
  return (
    <NeoBrutalistLayout>
      <div className="space-y-8 p-6 sm:p-8">
        <section className="app-shell-panel rounded-[var(--ui-radius-lg)] border border-app-border bg-app-surface-elevated/92 p-6 shadow-[var(--ui-elev-2)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-app-border-muted bg-app-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-app-text-label">
                Theme Audit
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-app-text-heading sm:text-4xl">
                Visual QA workbench for theme identity
              </h1>
              <p className="mt-3 text-base text-app-text-muted">
                Use this page to compare theme selection, shell atmosphere, emphasis states, and
                control readability without leaving the app.
              </p>
            </div>

<<<<<<< HEAD
          <div className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-4 py-3 text-sm text-app-text-muted shadow-sm">
            Active theme and color scheme should always stay legible, expressive, and easy to
            distinguish at a glance.
          </div>
=======
            <div className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-4 py-3 text-sm text-app-text-muted shadow-sm">
              Active theme and color scheme should always stay legible, expressive, and easy to
              distinguish at a glance.
            </div>
>>>>>>> origin/main
          </div>
        </section>

        <ThemeSelector />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="app-shell-panel overflow-hidden rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/90 shadow-[var(--ui-elev-2)] backdrop-blur">
            <div className="border-b border-app-border-muted px-5 py-4">
              <h2 className="text-xl font-semibold text-app-text-heading">Shell Atmosphere</h2>
              <p className="mt-1 text-sm text-app-text-muted">
                Public/auth shell cues should feel like the selected theme, not a single shared
                skin.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <article className="app-shell relative overflow-hidden rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-gradient-to-br from-app-bg via-app-shell-top to-app-accent-soft/30 p-5 text-app-text">
                <div
                  aria-hidden="true"
                  className="app-shell-orb app-shell-orb--primary pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--app-shell-glow)] blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="app-shell-orb app-shell-orb--secondary pointer-events-none absolute -bottom-12 right-0 h-36 w-36 rounded-full bg-[var(--app-shell-glow-secondary)] blur-3xl"
                />

                <div className="relative">
                  <span className="inline-flex items-center rounded-full border border-app-border-muted bg-app-surface-elevated/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-app-text-label">
                    Public Shell
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold text-app-text-heading">
                    Mission-facing landing state
                  </h3>
                  <p className="mt-2 text-sm text-app-text-muted">
                    This should feel obviously different between Editorial Ops, Sea Breeze,
                    Corporate, Clean Modern, Glass, and High Contrast.
                  </p>
                </div>
              </article>

              <article className="app-shell-panel rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/92 p-5 shadow-[var(--ui-elev-1)] backdrop-blur">
                <span className="inline-flex items-center rounded-full border border-app-border-muted bg-app-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-app-text-label">
                  Auth Shell
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-app-text-heading">
                  Secure but theme-aware
                </h3>
                <p className="mt-2 text-sm text-app-text-muted">
                  Cards, glows, and corner treatment should inherit the selected personality while
                  preserving clarity for forms.
                </p>

                <div className="mt-5 space-y-3 text-sm text-app-text">
                  {shellHighlights.map((copy) => (
                    <div
                      key={copy}
                      className="app-shell-panel flex items-start gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted/70 p-3 shadow-sm backdrop-blur"
                    >
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                        ✓
                      </span>
                      <span>{copy}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="app-shell-panel rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/92 p-5 shadow-[var(--ui-elev-2)] backdrop-blur">
            <h2 className="text-xl font-semibold text-app-text-heading">Surface QA</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Check action contrast, muted content, and focus treatment in the active theme.
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4">
                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm">
                    Primary action
                  </button>
                  <button className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text shadow-sm">
                    Secondary action
                  </button>
                  <button className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-muted shadow-sm">
                    Muted action
                  </button>
                </div>
              </div>

              <div className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4">
                <label htmlFor="theme-audit-input" className="text-sm font-medium text-app-text-label">
                  Example input
                </label>
                <input
                  id="theme-audit-input"
                  className="mt-2 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text"
                  placeholder="Check background, border, and focus ring"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
<<<<<<< HEAD
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-yellow p-3 text-sm font-semibold text-[var(--app-text-heading)]">
                  Highlight
                </div>
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-green p-3 text-sm font-semibold text-[var(--app-text-heading)]">
                  Success
                </div>
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-cyan p-3 text-sm font-semibold text-[var(--app-text-heading)]">
=======
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-yellow p-3 text-sm font-semibold text-black">
                  Highlight
                </div>
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-green p-3 text-sm font-semibold text-black">
                  Success
                </div>
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-loop-cyan p-3 text-sm font-semibold text-black">
>>>>>>> origin/main
                  Info
                </div>
              </div>

              <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text">
                Emphasis containers should stay readable and visually on-brand in every theme mode.
              </div>
            </div>
          </section>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
