/**
 * Neo-Brutalist Layout - Content wrapper (navigation is provided by the global Layout)
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface NeoBrutalistLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function NeoBrutalistLayout({ children, pageTitle }: NeoBrutalistLayoutProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [landmarkRole, setLandmarkRole] = useState<'main' | 'region'>('main');

  useLayoutEffect(() => {
    const isNestedInsideMain = Boolean(containerRef.current?.parentElement?.closest('main'));
    setLandmarkRole(isNestedInsideMain ? 'region' : 'main');
  }, []);

  return (
    <section
      ref={containerRef}
      data-shell-transition
      role={landmarkRole}
      className="min-h-full bg-[var(--app-bg)] transition-colors duration-300"
      aria-label={pageTitle || undefined}
    >
      {children}
    </section>
  );
}
