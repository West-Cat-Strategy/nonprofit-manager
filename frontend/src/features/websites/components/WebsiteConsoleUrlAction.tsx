import React from 'react';

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
  const resolvedClassName = href ? className : `${className} cursor-not-allowed opacity-60`;

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={resolvedClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" disabled title={disabledTitle} className={resolvedClassName}>
      {children}
    </button>
  );
};

export default WebsiteConsoleUrlAction;
