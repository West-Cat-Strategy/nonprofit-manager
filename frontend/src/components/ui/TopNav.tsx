import type { ReactNode } from 'react';
import { classNames } from './classNames';

interface TopNavProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function TopNav({ left, center, right, className }: TopNavProps) {
  return (
    <header
      className={classNames(
        'sticky top-0 z-50 border-b border-app-border-muted bg-app-surface-elevated/95 backdrop-blur px-3 sm:px-4 lg:px-6',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">{left}</div>
        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">{center}</div>
        <div className="flex items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}
