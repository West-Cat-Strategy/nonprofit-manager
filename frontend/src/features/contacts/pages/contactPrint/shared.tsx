import type { ReactNode } from 'react';

export interface PrintSectionProps {
  title: string;
  subtitle?: string;
  count?: number;
  hasContent: boolean;
  error?: string | null;
  emptyMessage: string;
  children: ReactNode;
}

export interface DefinitionItem {
  label: string;
  value: ReactNode;
}

export function PrintSection({
  title,
  subtitle,
  count,
  hasContent,
  error,
  emptyMessage,
  children,
}: PrintSectionProps) {
  return (
    <section className="contact-print-section rounded-none border border-black bg-white px-5 py-4">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-black pb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">{subtitle}</p>
          <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-black">{title}</h2>
        </div>
        {typeof count === 'number' ? (
          <span className="shrink-0 border border-black px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black">
            {count}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-medium text-black">{error}</p>
      ) : hasContent ? (
        children
      ) : (
        <p className="text-sm font-medium text-black/70">{emptyMessage}</p>
      )}
    </section>
  );
}

export function DefinitionList({ items }: { items: DefinitionItem[] }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="break-inside-avoid border border-black px-3 py-2">
          <dt className="text-[10px] uppercase tracking-[0.22em] text-black/55">{item.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-black">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PrintList({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function PrintItemCard({ children }: { children: ReactNode }) {
  return <div className="break-inside-avoid border border-black px-4 py-3">{children}</div>;
}

export function SectionValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border border-black px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-black/55">{label}</div>
      <div className="mt-1 text-sm font-medium text-black">{value}</div>
    </div>
  );
}
