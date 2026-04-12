import React from 'react';
import { resolveSafeNavigationTarget } from '../../../utils/safeUrl';

interface WebsiteConsoleUrlActionProps {
  href?: string | null;
  children: React.ReactNode;
  className: string;
  disabledTitle?: string;
  external?: boolean;
}

const WebsiteConsoleUrlAction: React.FC<WebsiteConsoleUrlActionProps> = ({
  href,
  children,
  className,
  disabledTitle,
  external = true,
}) => {
  const safeHref = href ? resolveSafeNavigationTarget(href) : null;
  const resolvedClassName = safeHref ? className : `${className} cursor-not-allowed opacity-60`;

  if (safeHref) {
    return (
      <a
        href={safeHref}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={resolvedClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={disabledTitle}
      className={resolvedClassName}
    >
      {children}
    </button>
  );
};

export default WebsiteConsoleUrlAction;
