import React from 'react';
import type { PageComponent, TemplateTheme } from '../../types/websiteBuilder';
import { sanitizeBuilderUrl } from '../../utils/validation';
import { getReadableTextColor } from './readableForeground';
import { getSocialIcon } from './EditorCanvasSocialIcons';

interface ComponentRendererProps {
  component: PageComponent;
  theme: TemplateTheme;
}

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ component, theme }) => {
  const baseStyle: React.CSSProperties = {
    margin: component.margin
      ? `${component.margin.top || 0} ${component.margin.right || 0} ${component.margin.bottom || 0} ${component.margin.left || 0}`
      : undefined,
    padding: component.padding
      ? `${component.padding.top || 0} ${component.padding.right || 0} ${component.padding.bottom || 0} ${component.padding.left || 0}`
      : undefined,
    ...component.style,
  };
  const primaryForeground = getReadableTextColor(theme.colors.primary, {
    lightTextColor: theme.colors.background,
    darkTextColor: theme.colors.text,
  });
  const secondaryForeground = getReadableTextColor(theme.colors.secondary, {
    lightTextColor: theme.colors.background,
    darkTextColor: theme.colors.text,
  });

  switch (component.type) {
    case 'heading': {
      const headingTag = `h${component.level}`;
      const fontSizes: Record<number, string> = {
        1: '2.5rem',
        2: '2rem',
        3: '1.5rem',
        4: '1.25rem',
        5: '1.125rem',
        6: '1rem',
      };
      return React.createElement(
        headingTag,
        {
          style: {
            ...baseStyle,
            textAlign: component.align,
            color: component.color || theme.colors.text,
            fontFamily: theme.typography.headingFontFamily,
            fontWeight: theme.typography.fontWeightBold,
            fontSize: fontSizes[component.level],
            lineHeight: theme.typography.headingLineHeight,
          },
        },
        component.content
      );
    }

    case 'text':
      return (
        <p
          style={{
            ...baseStyle,
            textAlign: component.align,
            color: component.color || theme.colors.text,
            fontFamily: theme.typography.fontFamily,
            fontSize: component.fontSize || theme.typography.baseFontSize,
            lineHeight: theme.typography.lineHeight,
          }}
        >
          {component.content}
        </p>
      );

    case 'button': {
      const variants: Record<string, React.CSSProperties> = {
        primary: {
          backgroundColor: theme.colors.primary,
          color: primaryForeground,
          border: 'none',
        },
        secondary: {
          backgroundColor: theme.colors.secondary,
          color: secondaryForeground,
          border: 'none',
        },
        outline: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: `2px solid ${theme.colors.primary}`,
        },
        ghost: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: 'none',
        },
        link: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: 'none',
          textDecoration: 'underline',
        },
      };

      const sizes: Record<string, React.CSSProperties> = {
        sm: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
        md: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
        lg: { padding: '1rem 2rem', fontSize: '1.125rem' },
        xl: { padding: '1.25rem 2.5rem', fontSize: '1.25rem' },
      };

      return (
        <button
          style={{
            ...baseStyle,
            ...variants[component.variant || 'primary'],
            ...sizes[component.size || 'md'],
            borderRadius: theme.borderRadius.md,
            fontWeight: theme.typography.fontWeightMedium,
            cursor: 'pointer',
            width: component.fullWidth ? '100%' : 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {component.text}
        </button>
      );
    }

    case 'image':
      return (
        <div style={baseStyle}>
          {sanitizeBuilderUrl(component.src) ? (
            <img
              src={sanitizeBuilderUrl(component.src)}
              alt={component.alt}
              style={{
                width: component.width || '100%',
                height: component.height || 'auto',
                objectFit: component.objectFit || 'cover',
                borderRadius: component.borderRadius || theme.borderRadius.md,
              }}
            />
          ) : (
            <div
              className="bg-app-surface-muted flex items-center justify-center"
              style={{
                width: component.width || '100%',
                height: component.height || '200px',
                borderRadius: component.borderRadius || theme.borderRadius.md,
              }}
            >
              <svg className="w-12 h-12 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {component.caption && (
            <p className="text-sm text-app-text-muted mt-2 text-center">{component.caption}</p>
          )}
        </div>
      );

    case 'divider':
      return (
        <hr
          style={{
            ...baseStyle,
            border: 'none',
            borderTop: `${component.thickness || '1px'} solid ${component.color || theme.colors.border}`,
            width: component.width || '100%',
            margin: '1rem auto',
          }}
        />
      );

    case 'spacer':
      return <div style={{ ...baseStyle, height: component.height }} />;

    case 'stats':
      return (
        <div
          style={baseStyle}
          className={`grid gap-4 grid-cols-${component.columns || 4}`}
        >
          {component.items.map((item) => (
            <div key={item.id} className="text-center">
              <div
                className="text-3xl font-bold"
                style={{ color: theme.colors.primary }}
              >
                {item.value}
              </div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                {item.label}
              </div>
            </div>
          ))}
          {component.items.length === 0 && (
            <div className="col-span-full text-center text-app-text-subtle py-4">
              Add statistics items in the property panel
            </div>
          )}
        </div>
      );

    case 'testimonial': {
      const safeAvatar = sanitizeBuilderUrl(component.avatar || '');
      return (
        <blockquote style={baseStyle} className="text-center">
          <p
            className="text-lg italic mb-4"
            style={{ color: theme.colors.text }}
          >
            "{component.quote}"
          </p>
          <footer>
            {safeAvatar && (
              <img
                src={safeAvatar}
                alt={component.author}
                className="w-12 h-12 rounded-full mx-auto mb-2"
              />
            )}
            <cite className="not-italic">
              <span className="font-semibold" style={{ color: theme.colors.text }}>
                {component.author}
              </span>
              {component.title && (
                <span className="block text-sm" style={{ color: theme.colors.textMuted }}>
                  {component.title}
                </span>
              )}
            </cite>
          </footer>
        </blockquote>
      );
    }

    case 'contact-form':
      return (
        <div style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-app-text-muted">
              {component.formMode === 'supporter' ? 'Supporter signup' : 'Contact form'}
            </p>
            <h4 className="font-semibold text-app-text">
              {component.heading || (component.formMode === 'supporter' ? 'Add your name' : 'Get in touch')}
            </h4>
            {component.description ? (
              <p className="mt-1 text-sm text-app-text-muted">{component.description}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">First name</div>
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Last name</div>
            </div>
            <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Email</div>
            {component.includePhone !== false ? (
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Phone</div>
            ) : null}
            {component.includeMessage !== false ? (
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-4 text-sm text-app-text-muted">Message</div>
            ) : null}
            <button
              style={{ backgroundColor: theme.colors.primary, color: primaryForeground }}
              className="rounded-md px-4 py-2 text-sm font-medium"
            >
              {component.submitText || 'Send Message'}
            </button>
          </div>
        </div>
      );

    case 'newsletter-signup':
      return (
        <div style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-app-text-muted">Newsletter signup</p>
            <h4 className="font-semibold text-app-text">{component.heading || 'Stay in the loop'}</h4>
            <p className="mt-1 text-sm text-app-text-muted">
              {component.description || 'Collect CRM and newsletter subscribers directly from the public site.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Email address</div>
            <button
              style={{ backgroundColor: theme.colors.primary, color: primaryForeground }}
              className="rounded-md px-4 py-2 text-sm font-medium"
            >
              {component.buttonText || 'Subscribe'}
            </button>
          </div>
          <p className="mt-3 text-xs text-app-text-muted">
            Audience: {component.audienceMode || 'crm'}
            {component.mailchimpListId || component.mauticSegmentId
              ? ` · Audience ${(component.mailchimpListId || component.mauticSegmentId) as string}`
              : ''}
          </p>
        </div>
      );

    case 'donation-form':
      return (
        <div style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-app-text-muted">Donation checkout</p>
            <h4 className="font-semibold text-app-text">{component.heading || 'Support this work'}</h4>
            {component.description ? (
              <p className="mt-1 text-sm text-app-text-muted">{component.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(component.suggestedAmounts && component.suggestedAmounts.length > 0
              ? component.suggestedAmounts
              : [25, 50, 100, 250]
            ).map((amount) => (
              <span key={amount} className="rounded-full border border-app-border bg-app-surface px-3 py-1 text-sm text-app-text">
                ${amount}
              </span>
            ))}
          </div>
          {component.allowCustomAmount !== false ? (
            <div className="mt-3 rounded-md border border-dashed border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">
              Custom amount enabled
            </div>
          ) : null}
          {component.recurringOption ? (
            <p className="mt-3 text-xs text-app-text-muted">Monthly recurring option enabled</p>
          ) : null}
        </div>
      );

    case 'volunteer-interest-form':
      return (
        <div style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-app-text-muted">Volunteer intake</p>
            <h4 className="font-semibold text-app-text">{component.heading || 'Volunteer with us'}</h4>
            {component.description ? (
              <p className="mt-1 text-sm text-app-text-muted">{component.description}</p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">First name</div>
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Last name</div>
            </div>
            <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Email</div>
            {component.includePhone !== false ? (
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Phone</div>
            ) : null}
            <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Availability</div>
            <button
              style={{ backgroundColor: theme.colors.primary, color: primaryForeground }}
              className="rounded-md px-4 py-2 text-sm font-medium"
            >
              {component.submitText || 'Share Interest'}
            </button>
          </div>
        </div>
      );

    case 'event-list':
    case 'event-calendar': {
      const filterType =
        component.type === 'event-list'
          ? component.eventType || component.filterByTag || ''
          : component.eventType || '';
      const maxEvents = Math.max(1, component.maxEvents || (component.type === 'event-calendar' ? 8 : 6));
      const layout = component.type === 'event-list' ? component.layout || 'grid' : 'list';
      const previewEvents = [
        {
          id: 'preview-1',
          title: 'Community Dinner',
          eventType: 'community',
          date: 'Apr 2, 2026 · 6:00 PM',
          location: 'Main Hall, Vancouver',
          description: 'Join volunteers and neighbors for an evening meal and program updates.',
        },
        {
          id: 'preview-2',
          title: 'Fundraising Breakfast',
          eventType: 'fundraiser',
          date: 'Apr 9, 2026 · 8:00 AM',
          location: 'Harbor Center, Vancouver',
          description: 'Sponsor breakfast with a short impact presentation and donor Q&A.',
        },
        {
          id: 'preview-3',
          title: 'Volunteer Orientation',
          eventType: 'volunteer',
          date: 'Apr 12, 2026 · 10:00 AM',
          location: 'Outreach Hub, Burnaby',
          description: 'Onboarding session for new volunteers supporting spring campaigns.',
        },
      ]
        .filter((event) => !filterType || event.eventType === filterType)
        .slice(0, maxEvents);

      const resolvedLayout = layout === 'calendar' ? 'list' : layout;

      return (
        <div style={baseStyle} className="space-y-3 rounded-lg border border-app-border p-4 bg-app-surface-muted">
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
            <span className="rounded-full bg-app-surface px-2 py-1">
              {component.type === 'event-calendar'
                ? `View: ${component.initialView || 'month'}`
                : `Layout: ${layout}`}
            </span>
            <span className="rounded-full bg-app-surface px-2 py-1">
              Max: {maxEvents}
            </span>
            {filterType ? (
              <span className="rounded-full bg-app-surface px-2 py-1">Type: {filterType}</span>
            ) : null}
            {component.showPastEvents ? (
              <span className="rounded-full bg-app-surface px-2 py-1">Includes past events</span>
            ) : null}
          </div>

          {component.type === 'event-calendar' ? (
            <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text-muted">
              Calendar pages publish as live event feeds inside the site layout.
            </div>
          ) : null}

          {previewEvents.length === 0 ? (
            <div className="rounded-md border border-dashed border-app-border bg-app-surface px-3 py-6 text-center text-sm text-app-text-muted">
              {component.emptyMessage || 'No public events are available right now.'}
            </div>
          ) : (
            <div className={resolvedLayout === 'grid' ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
              {previewEvents.map((event) => (
                <article key={event.id} className="rounded-md border border-app-border bg-app-surface p-3">
                  <h4 className="font-medium text-app-text">{event.title}</h4>
                  <p className="mt-1 text-xs uppercase tracking-wide text-app-text-muted">{event.eventType}</p>
                  <p className="mt-2 text-sm text-app-text-muted">{event.date}</p>
                  <p className="text-sm text-app-text-muted">{event.location}</p>
                  <p className="mt-2 text-sm text-app-text">{event.description}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'event-detail':
      return (
        <article style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <p className="text-xs uppercase tracking-wide text-app-text-muted">Event detail page</p>
          <h3 className="mt-1 text-xl font-semibold text-app-text">Spring Community Dinner</h3>
          <p className="mt-2 text-sm text-app-text-muted">April 2, 2026 · 6:00 PM</p>
          {component.showLocation !== false ? (
            <p className="text-sm text-app-text-muted">Main Hall, 123 Harbor St, Vancouver, BC</p>
          ) : null}
          {component.showCapacity !== false ? (
            <p className="mt-2 text-sm text-app-text-muted">Capacity: 86 / 120 registered</p>
          ) : null}
          {component.showDescription !== false ? (
            <p className="mt-3 text-sm text-app-text">
              Published pages render the live event title, schedule, location, and registration state here.
            </p>
          ) : null}
        </article>
      );

    case 'event-registration':
      return (
        <div style={baseStyle} className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <p className="text-xs uppercase tracking-wide text-app-text-muted">Event registration</p>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">First name</div>
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Last name</div>
            </div>
            <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Email</div>
            {component.includePhone !== false ? (
              <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">Phone</div>
            ) : null}
            <button
              style={{ backgroundColor: theme.colors.primary, color: primaryForeground }}
              className="rounded-md px-4 py-2 text-sm font-medium"
            >
              {component.submitText || 'Register'}
            </button>
          </div>
        </div>
      );

    case 'newsletter-archive': {
      const previewNewsletters = [
        {
          id: 'newsletter-1',
          title: 'March Program Update',
          source: 'native',
          date: 'Mar 1, 2026',
          excerpt: 'Highlights from winter outreach, upcoming events, and volunteer needs.',
        },
        {
          id: 'newsletter-2',
          title: 'February Donor Bulletin',
          source: 'mailchimp',
          date: 'Feb 14, 2026',
          excerpt: 'A recap of campaign milestones and stewardship notes for the month.',
        },
      ]
        .filter((item) =>
          !component.sourceFilter || component.sourceFilter === 'all'
            ? true
            : item.source === component.sourceFilter
        )
        .slice(0, component.maxItems || 10);

      return (
        <div style={baseStyle} className="space-y-3 rounded-lg border border-app-border p-4 bg-app-surface-muted">
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
            <span className="rounded-full bg-app-surface px-2 py-1">
              Source: {component.sourceFilter || 'all'}
            </span>
            <span className="rounded-full bg-app-surface px-2 py-1">
              Max: {component.maxItems || 10}
            </span>
          </div>

          {previewNewsletters.length === 0 ? (
            <div className="rounded-md border border-dashed border-app-border bg-app-surface px-3 py-6 text-center text-sm text-app-text-muted">
              {component.emptyMessage || 'No newsletters are available right now.'}
            </div>
          ) : (
            <div className="space-y-3">
              {previewNewsletters.map((item) => (
                <article key={item.id} className="rounded-md border border-app-border bg-app-surface p-3">
                  <p className="text-xs uppercase tracking-wide text-app-text-muted">{item.source}</p>
                  <h4 className="mt-1 font-medium text-app-text">{item.title}</h4>
                  <p className="mt-1 text-sm text-app-text-muted">{item.date}</p>
                  <p className="mt-2 text-sm text-app-text">{item.excerpt}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'gallery':
      return (
        <div style={baseStyle}>
          {component.items && component.items.length > 0 ? (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${component.columns || 3}, 1fr)`,
                gap: component.gap || '1rem',
              }}
            >
              {component.items.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-lg bg-app-surface-muted"
                  style={{ aspectRatio: component.aspectRatio || '1' }}
                >
                  {item.src ? (
                    <img
                      src={item.src}
                      alt={item.alt || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-app-text-subtle">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2">
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-app-surface-muted rounded-lg text-center text-app-text-muted">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">Gallery</p>
              <p className="text-sm">Add images in the property panel</p>
            </div>
          )}
        </div>
      );

    case 'video': {
      const getVideoEmbedUrl = () => {
        if (!component.src) return null;
        if (component.provider === 'youtube') {
          const match = component.src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
          if (match) {
            return `https://www.youtube.com/embed/${match[1]}`;
          }
        }
        if (component.provider === 'vimeo') {
          const match = component.src.match(/vimeo\.com\/(\d+)/);
          if (match) {
            return `https://player.vimeo.com/video/${match[1]}`;
          }
        }
        return component.src;
      };

      const embedUrl = getVideoEmbedUrl();

      return (
        <div style={baseStyle}>
          {embedUrl ? (
            <div
              className="relative w-full rounded-lg overflow-hidden bg-black"
              style={{ aspectRatio: component.aspectRatio || '16/9' }}
            >
              <iframe
                src={sanitizeBuilderUrl(embedUrl) || 'about:blank'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
              />
            </div>
          ) : (
            <div
              className="bg-app-text rounded-lg flex items-center justify-center text-app-text-subtle"
              style={{
                aspectRatio: component.aspectRatio || '16/9',
                backgroundImage: component.poster
                  ? (() => {
                      const safePoster = sanitizeBuilderUrl(component.poster);
                      return safePoster ? `url(${safePoster})` : undefined;
                    })()
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Add video URL in property panel</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'map':
      return (
        <div style={baseStyle}>
          {component.address || (component.latitude && component.longitude) ? (
            <div
              className="relative w-full rounded-lg overflow-hidden bg-app-surface-muted"
              style={{ height: component.height || '300px' }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-app-surface-muted">
                <div className="text-center text-app-text-muted">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="font-medium">{component.address || 'Map Location'}</p>
                  {component.latitude && component.longitude && (
                    <p className="text-xs mt-1">
                      {component.latitude.toFixed(4)}, {component.longitude.toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs mt-2 text-app-text-subtle">
                    Map preview in published site
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="bg-app-surface-muted rounded-lg flex items-center justify-center text-app-text-subtle"
              style={{ height: component.height || '300px' }}
            >
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-medium">Map</p>
                <p className="text-sm">Add location in property panel</p>
              </div>
            </div>
          )}
        </div>
      );

    case 'social-links':
      return (
        <div style={baseStyle}>
          {component.links && component.links.length > 0 ? (
            <div
              className="flex flex-wrap gap-3"
              style={{
                justifyContent:
                  component.align === 'center'
                    ? 'center'
                    : component.align === 'right'
                      ? 'flex-end'
                      : 'flex-start',
              }}
            >
              {component.links.map((link) => (
                <a
                  key={link.platform}
                  href={sanitizeBuilderUrl(link.url) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg transition-colors ${
                    component.iconStyle === 'filled'
                      ? 'bg-app-text text-[var(--app-bg)] hover:bg-app-accent-hover hover:text-[var(--app-accent-foreground)]'
                      : component.iconStyle === 'rounded'
                        ? 'bg-app-surface-muted text-app-text-muted hover:bg-app-surface-muted rounded-full'
                        : 'text-app-text-muted hover:text-app-text'
                  }`}
                  style={{ color: component.iconStyle === 'outline' ? theme.colors.primary : undefined }}
                >
                  {getSocialIcon(link.platform, component.iconSize || 'md')}
                </a>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-app-surface-muted rounded-lg text-center text-app-text-muted">
              <div className="flex justify-center gap-4 mb-2">
                {getSocialIcon('facebook', component.iconSize || 'md')}
                {getSocialIcon('twitter', component.iconSize || 'md')}
                {getSocialIcon('instagram', component.iconSize || 'md')}
              </div>
              <p className="font-medium">Social Links</p>
              <p className="text-sm">Add links in property panel</p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div style={baseStyle} className="p-4 bg-app-surface-muted rounded text-app-text-muted text-center">
          {component.type} component
        </div>
      );
  }
};

export default ComponentRenderer;
