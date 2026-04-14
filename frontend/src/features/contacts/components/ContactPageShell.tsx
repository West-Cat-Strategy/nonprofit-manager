import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrutalCard } from '../../../components/neo-brutalist';

const MOBILE_STICKY_TOP_OFFSET = 56;
const DESKTOP_STICKY_TOP_OFFSET = 64;
const DESKTOP_STICKY_QUERY = '(min-width: 640px)';

interface ContactPageShellProps {
  tone: 'green' | 'purple' | 'yellow' | 'pink' | 'white';
  backLabel: string;
  onBack: () => void;
  title: string;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  enableStickyTitle?: boolean;
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
  enableStickyTitle = false,
  children,
}: ContactPageShellProps) {
  const stickyTitleSentinelRef = useRef<HTMLDivElement | null>(null);
  const [stickyTitleVisible, setStickyTitleVisible] = useState(false);
  const [stickyTopOffset, setStickyTopOffset] = useState<number | null>(null);
  const stickyTitleEnabled = enableStickyTitle && title.trim().length > 0;

  useEffect(() => {
    if (!stickyTitleEnabled || typeof window === 'undefined') {
      setStickyTopOffset(null);
      setStickyTitleVisible(false);
      return;
    }

    if (typeof window.matchMedia !== 'function') {
      setStickyTopOffset(MOBILE_STICKY_TOP_OFFSET);
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_STICKY_QUERY);
    const updateStickyTopOffset = () => {
      setStickyTopOffset(
        mediaQuery.matches ? DESKTOP_STICKY_TOP_OFFSET : MOBILE_STICKY_TOP_OFFSET
      );
    };

    updateStickyTopOffset();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateStickyTopOffset);
      return () => mediaQuery.removeEventListener('change', updateStickyTopOffset);
    }

    mediaQuery.addListener(updateStickyTopOffset);
    return () => mediaQuery.removeListener(updateStickyTopOffset);
  }, [stickyTitleEnabled]);

  useEffect(() => {
    if (!stickyTitleEnabled || stickyTopOffset === null) {
      setStickyTitleVisible(false);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setStickyTitleVisible(false);
      return;
    }

    const sentinel = stickyTitleSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyTitleVisible(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${stickyTopOffset}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [stickyTitleEnabled, stickyTopOffset]);

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

            {stickyTitleEnabled ? (
              <div ref={stickyTitleSentinelRef} aria-hidden="true" className="h-px w-full" />
            ) : null}

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

      {stickyTitleEnabled && stickyTitleVisible ? (
        <div className="sticky top-14 z-40 h-0 pointer-events-none sm:top-16">
          <BrutalCard
            color="white"
            className="app-shell-surface-opaque pointer-events-auto px-4 py-3"
          >
            <section aria-label="Current contact header">
              <p
                className="truncate text-sm font-black uppercase tracking-tight text-black dark:text-white sm:text-base"
                title={title}
              >
                {title}
              </p>
            </section>
          </BrutalCard>
        </div>
      ) : null}

      {children}
    </div>
  );
}
