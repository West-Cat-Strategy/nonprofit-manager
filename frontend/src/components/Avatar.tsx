import { useMemo, useState } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeToClasses: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-7 h-7 sm:w-8 sm:h-8', text: 'text-xs sm:text-sm' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-16 h-16', text: 'text-xl' },
};

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.trim()?.[0] || '';
  const last = lastName?.trim()?.[0] || '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
};

export default function Avatar({
  src,
  firstName,
  lastName,
  alt,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  alt?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = useMemo(() => getInitials(firstName, lastName), [firstName, lastName]);
  const sizeClasses = sizeToClasses[size];

  const containerClasses = [
    sizeClasses.container,
    'rounded-full shrink-0 overflow-hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const showImage = Boolean(src) && !imgError;

  if (showImage) {
    return (
      <img
        src={src as string}
        alt={alt || `${firstName || ''} ${lastName || ''}`.trim() || 'User avatar'}
        className={`${containerClasses} object-cover`}
        onError={() => setImgError(true)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={[
        containerClasses,
        'bg-gradient-to-br from-app-accent-soft0 to-indigo-600 flex items-center justify-center text-white font-semibold',
        sizeClasses.text,
      ].join(' ')}
      aria-label={alt || 'User avatar'}
    >
      {initials}
    </div>
  );
}

