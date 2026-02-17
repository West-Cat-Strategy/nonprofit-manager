/**
 * Neo-Brutalist Layout - Content wrapper (navigation is provided by the global Layout)
 */

import type { ReactNode } from 'react';

interface NeoBrutalistLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function NeoBrutalistLayout({ children, pageTitle }: NeoBrutalistLayoutProps) {
  return (
    <div
      className="min-h-full bg-[var(--app-bg)] transition-colors duration-300"
      aria-label={pageTitle || undefined}
    >
      {children}
    </div>
  );
}
