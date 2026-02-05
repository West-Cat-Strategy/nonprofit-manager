import { memo } from 'react';

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

/**
 * Skip to main content link for keyboard users
 * Hidden visually but accessible to screen readers and keyboard navigation
 */
function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
      onClick={(e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.removeAttribute('tabindex');
        }
      }}
    >
      {children}
    </a>
  );
}

export default memo(SkipLink);
