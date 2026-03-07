import React from 'react';
import type { WebsiteSiteStatus } from '../types';

interface WebsiteStatusBadgeProps {
  status: WebsiteSiteStatus;
  blocked?: boolean;
}

const toneMap: Record<WebsiteSiteStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  maintenance: 'bg-sky-100 text-sky-800',
  suspended: 'bg-rose-100 text-rose-800',
};

const WebsiteStatusBadge: React.FC<WebsiteStatusBadgeProps> = ({ status, blocked = false }) => {
  if (blocked) {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
        Needs assignment
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[status]}`}>
      {status}
    </span>
  );
};

export default WebsiteStatusBadge;
