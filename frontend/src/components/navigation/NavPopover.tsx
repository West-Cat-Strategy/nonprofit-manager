import type { ReactNode, RefObject } from 'react';
import { classNames } from '../ui/classNames';

interface NavPopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
}

export default function NavPopover({
  open,
  onClose,
  children,
  align = 'left',
  panelClassName,
  panelRef,
}: NavPopoverProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={classNames(
          'menu-surface-opaque absolute z-20 mt-2 rounded-lg border border-app-border py-1 shadow-lg animate-fadeIn',
          align === 'right' ? 'right-0' : 'left-0',
          panelClassName
        )}
      >
        {children}
      </div>
    </>
  );
}
