import type { ReactNode } from 'react';

interface ErrorBannerProps {
  message?: string | null;
  className?: string;
  children?: ReactNode;
}

export default function ErrorBanner({ message, className, children }: ErrorBannerProps) {
  if (!message && !children) return null;

  return (
    <div className={`rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className || ''}`}>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
