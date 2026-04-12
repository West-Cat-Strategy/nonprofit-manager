import React from 'react';
import type { WebsiteSiteStatus } from '../types';

interface WebsiteStatusBadgeProps {
  status: WebsiteSiteStatus;
  blocked?: boolean;
}

const toneMap: Record<WebsiteSiteStatus, string> = {
<<<<<<< HEAD
  draft:
    'bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-300',
  published:
    'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50 dark:border-emerald-300',
  maintenance:
    'bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-50 dark:border-sky-300',
  suspended:
    'bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-50 dark:border-rose-300',
=======
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  maintenance: 'bg-sky-100 text-sky-800',
  suspended: 'bg-rose-100 text-rose-800',
>>>>>>> origin/main
};

const WebsiteStatusBadge: React.FC<WebsiteStatusBadgeProps> = ({ status, blocked = false }) => {
  if (blocked) {
    return (
<<<<<<< HEAD
      <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-950 dark:bg-rose-950/40 dark:text-rose-50">
=======
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
>>>>>>> origin/main
        Needs assignment
      </span>
    );
  }

  return (
<<<<<<< HEAD
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap[status]}`}>
=======
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[status]}`}>
>>>>>>> origin/main
      {status}
    </span>
  );
};

export default WebsiteStatusBadge;
