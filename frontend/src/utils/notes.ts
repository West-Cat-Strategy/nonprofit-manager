/**
 * Shared utilities for note components (CaseNotes, ContactNotes)
 * Consolidates common icons, labels, and formatting
 */

/**
 * Common note type values used across both case and contact notes
 */
export type CommonNoteType = 'note' | 'email' | 'call' | 'meeting' | 'update' | 'other';

/**
 * Icon mapping for note types
 */
const NOTE_ICONS: Record<string, string> = {
  note: '📝',
  email: '📧',
  call: '📞',
  meeting: '🤝',
  update: '📢',
  status_change: '🔄',
  other: '📌',
};

/**
 * Label mapping for note types
 */
const NOTE_LABELS: Record<string, string> = {
  note: 'Note',
  email: 'Email',
  call: 'Phone Call',
  meeting: 'Meeting',
  update: 'Update',
  status_change: 'Status Change',
  other: 'Other',
};

/**
 * Get the emoji icon for a note type
 */
export function getNoteIcon(noteType: string): string {
  return NOTE_ICONS[noteType] || '📝';
}

/**
 * Get the display label for a note type
 */
export function getNoteTypeLabel(noteType: string): string {
  return NOTE_LABELS[noteType] || 'Note';
}

/**
 * Format a date as relative time for notes (e.g., "2 hours ago", "3 days ago")
 * More granular than formatRelativeTime for recent activity
 */
export function formatNoteDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Note type options for select dropdowns
 */
export const NOTE_TYPE_OPTIONS = [
  { value: 'note', label: 'General Note' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'update', label: 'Update' },
] as const;

/**
 * Badge style classes based on note properties
 */
export function getNoteBadgeClass(options: {
  isImportant?: boolean;
  isPinned?: boolean;
}): string {
  const { isImportant, isPinned } = options;
  if (isImportant) return 'border-yellow-300 bg-yellow-50';
  if (isPinned) return 'border-blue-300 bg-blue-50';
  return 'border-gray-200';
}

/**
 * Tag badge component props helper
 */
export function getTagBadges(options: {
  isPinned?: boolean;
  isInternal?: boolean;
  isImportant?: boolean;
}): Array<{ label: string; className: string }> {
  const badges: Array<{ label: string; className: string }> = [];

  if (options.isPinned) {
    badges.push({ label: 'Pinned', className: 'bg-blue-100 text-blue-800' });
  }
  if (options.isInternal) {
    badges.push({ label: 'Internal', className: 'bg-gray-100 text-gray-600' });
  }
  if (options.isImportant) {
    badges.push({ label: 'Important', className: 'bg-yellow-100 text-yellow-800' });
  }

  return badges;
}
