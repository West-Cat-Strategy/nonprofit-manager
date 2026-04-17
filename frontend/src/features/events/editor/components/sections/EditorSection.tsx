import type { ReactNode } from 'react';

interface EditorSectionProps {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export function EditorSection({ title, description, badge, children }: EditorSectionProps) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">{title}</h2>
          {description ? <div className="mt-1 text-sm text-app-text-muted">{description}</div> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
