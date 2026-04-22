/**
 * Format currency values using Canadian locale defaults
 */
export function formatCurrency(amount: number, currency = 'CAD', options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'CAD' ? 0 : 2,
    maximumFractionDigits: currency === 'CAD' ? 0 : 2,
    ...options,
  }).format(amount);
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const toValidDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed
      .replace(
        /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2}|[+-]\d{4}|[+-]\d{2})?$/,
        (_match, datePart: string, timePart: string, offset: string | undefined) => {
          if (!offset) {
            return `${datePart}T${timePart}`;
          }

          if (/^[+-]\d{2}$/.test(offset)) {
            return `${datePart}T${timePart}${offset}:00`;
          }

          if (/^[+-]\d{4}$/.test(offset)) {
            return `${datePart}T${timePart}${offset.slice(0, 3)}:${offset.slice(3)}`;
          }

          return `${datePart}T${timePart}${offset}`;
        }
      );

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = (value as { valueOf?: () => unknown }).valueOf?.();
    if (candidate && candidate !== value) {
      return toValidDate(candidate);
    }
  }

  return null;
};

/**
 * Format a date as a localized date string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: string | number | Date | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

const getDateOnlyParts = (value: string | Date | null | undefined): DateOnlyParts | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }

  const trimmed = value.trim();
  const directMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    return {
      year: Number(directMatch[1]),
      month: Number(directMatch[2]),
      day: Number(directMatch[3]),
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
};

export function toDateInputValue(date: string | Date | null | undefined): string {
  const parts = getDateOnlyParts(date);
  if (!parts) {
    return '';
  }

  return `${parts.year}-${`${parts.month}`.padStart(2, '0')}-${`${parts.day}`.padStart(2, '0')}`;
}

export function formatDateOnly(date: string | Date | null | undefined): string {
  const parts = getDateOnlyParts(date);
  if (!parts) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function getAgeFromDateOnly(date: string | Date | null | undefined): number | null {
  const parts = getDateOnlyParts(date);
  if (!parts) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parts.year;
  const monthDiff = today.getMonth() + 1 - parts.month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parts.day)) {
    age -= 1;
  }

  return age;
}

/**
 * Format a date with time (e.g., "Jan 15, 2024, 2:30 PM")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format time only from a Date (e.g., "2:30 PM")
 */
export function formatTime(date: string | Date | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a time-only string like "14:30" to "2:30 PM"
 */
export function formatTimeString(timeString: string | null | undefined): string {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  if (!hours || !minutes) return timeString;
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a date with Today/Tomorrow labels for near dates
 */
export function formatDateSmart(date: string | Date | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '';

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffMins) >= 1) {
    return rtf.format(diffMins, 'minute');
  }
  return rtf.format(diffSecs, 'second');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a phone number to US format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
