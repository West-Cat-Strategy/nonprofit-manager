-- Seed: Starter Templates for Website Builder
-- Description: 5 pre-built templates for nonprofits to customize

-- Default theme (shared across templates)
-- Using JSON structure that matches TemplateTheme type

-- ==================== Template 1: Basic Landing Page ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-1111-1111-1111-000000000001',
  NULL,
  'Simple Landing Page',
  'A clean, single-page template perfect for introducing your nonprofit and collecting donations.',
  'landing-page',
  ARRAY['simple', 'clean', 'donation', 'hero'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#2563eb",
      "secondary": "#7c3aed",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"Inter\", system-ui, sans-serif",
      "headingFontFamily": "\"Inter\", system-ui, sans-serif",
      "baseFontSize": "16px",
      "lineHeight": "1.6",
      "headingLineHeight": "1.2",
      "fontWeightNormal": 400,
      "fontWeightMedium": 500,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.25rem", "md": "0.5rem", "lg": "1rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 25px 50px rgba(0,0,0,0.25)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [
        {"id": "nav1", "label": "About", "href": "#about"},
        {"id": "nav2", "label": "Impact", "href": "#impact"},
        {"id": "nav3", "label": "Contact", "href": "#contact"}
      ],
      "sticky": true,
      "transparent": true,
      "showCTA": true,
      "ctaText": "Donate Now",
      "ctaLink": "#donate"
    },
    "footer": {
      "columns": [],
      "copyright": "© 2026 Your Nonprofit. All rights reserved.",
      "showNewsletter": true
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["Hero section", "About section", "Impact stats", "Donation form", "Contact section"]}',
  '1.0.0'
);

-- Landing Page - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-1111-1111-1111-000000000001',
  'a1b2c3d4-1111-1111-1111-000000000001',
  'Home',
  'home',
  true,
  '{"title": "Welcome to Our Nonprofit", "description": "Making a difference in our community through dedicated service and your generous support."}',
  '[
    {
      "id": "hero-section",
      "name": "Hero",
      "backgroundColor": "#1e293b",
      "paddingTop": "6rem",
      "paddingBottom": "6rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "Making a Difference Together", "level": 1, "align": "center", "color": "#ffffff"},
        {"id": "hero2", "type": "text", "content": "Join us in creating lasting change in our community. Every contribution makes an impact.", "align": "center", "color": "#cbd5e1", "fontSize": "1.25rem"},
        {"id": "hero3", "type": "button", "text": "Donate Now", "href": "#donate", "variant": "primary", "size": "lg"}
      ]
    },
    {
      "id": "about-section",
      "name": "About",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "about1", "type": "heading", "content": "Our Mission", "level": 2, "align": "center"},
        {"id": "about2", "type": "text", "content": "We are dedicated to improving lives through community programs, education, and outreach. Since our founding, we have helped thousands of individuals and families.", "align": "center"}
      ]
    },
    {
      "id": "impact-section",
      "name": "Impact",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "impact1", "type": "heading", "content": "Our Impact", "level": 2, "align": "center"},
        {"id": "impact2", "type": "stats", "items": [
          {"id": "stat1", "value": "10,000+", "label": "People Helped"},
          {"id": "stat2", "value": "500+", "label": "Volunteers"},
          {"id": "stat3", "value": "50+", "label": "Programs"},
          {"id": "stat4", "value": "15", "label": "Years of Service"}
        ], "columns": 4}
      ]
    },
    {
      "id": "donate-section",
      "name": "Donate",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "donate1", "type": "heading", "content": "Support Our Cause", "level": 2, "align": "center"},
        {"id": "donate2", "type": "donation-form", "heading": "Make a Donation", "description": "Your gift helps us continue our important work.", "suggestedAmounts": [25, 50, 100, 250], "allowCustomAmount": true, "recurringOption": true}
      ]
    },
    {
      "id": "contact-section",
      "name": "Contact",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "contact1", "type": "heading", "content": "Get in Touch", "level": 2, "align": "center"},
        {"id": "contact2", "type": "contact-form", "heading": "", "description": "Have questions? We would love to hear from you.", "submitText": "Send Message", "includePhone": true, "includeMessage": true}
      ]
    }
  ]',
  0
);

-- ==================== Template 2: Event-Focused Site ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-2222-2222-2222-000000000002',
  NULL,
  'Event Showcase',
  'A dynamic template designed to showcase your upcoming events and encourage registrations.',
  'event',
  ARRAY['events', 'calendar', 'registration', 'countdown'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#7c3aed",
      "secondary": "#2563eb",
      "accent": "#ec4899",
      "background": "#ffffff",
      "surface": "#faf5ff",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"Plus Jakarta Sans\", system-ui, sans-serif",
      "headingFontFamily": "\"Plus Jakarta Sans\", system-ui, sans-serif",
      "baseFontSize": "16px",
      "lineHeight": "1.6",
      "headingLineHeight": "1.2",
      "fontWeightNormal": 400,
      "fontWeightMedium": 600,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.5rem", "md": "0.75rem", "lg": "1.5rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 25px 50px rgba(0,0,0,0.25)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [
        {"id": "nav1", "label": "Events", "href": "#events"},
        {"id": "nav2", "label": "About", "href": "/about"},
        {"id": "nav3", "label": "Get Involved", "href": "/volunteer"}
      ],
      "sticky": true,
      "transparent": false,
      "showCTA": true,
      "ctaText": "Register Now",
      "ctaLink": "#featured"
    },
    "footer": {
      "columns": [
        {"title": "Quick Links", "links": [{"label": "Events", "href": "#events"}, {"label": "About Us", "href": "/about"}]}
      ],
      "copyright": "© 2026 Your Nonprofit. All rights reserved."
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["Event countdown", "Event list", "Registration forms", "Calendar view"]}',
  '1.0.0'
);

-- Event Site - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-2222-2222-2222-000000000001',
  'a1b2c3d4-2222-2222-2222-000000000002',
  'Home',
  'home',
  true,
  '{"title": "Upcoming Events - Our Nonprofit", "description": "Discover and register for our upcoming events. Join us in making a difference!"}',
  '[
    {
      "id": "featured-section",
      "name": "Featured Event",
      "backgroundColor": "#7c3aed",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "feat1", "type": "text", "content": "FEATURED EVENT", "align": "center", "color": "#e9d5ff", "fontSize": "0.875rem"},
        {"id": "feat2", "type": "heading", "content": "Annual Charity Gala 2026", "level": 1, "align": "center", "color": "#ffffff"},
        {"id": "feat3", "type": "text", "content": "Join us for an unforgettable evening of celebration, inspiration, and giving.", "align": "center", "color": "#e9d5ff"},
        {"id": "feat4", "type": "countdown", "targetDate": "2026-06-15T18:00:00", "title": "Event Starts In", "showDays": true, "showHours": true, "showMinutes": true, "showSeconds": true},
        {"id": "feat5", "type": "button", "text": "Get Your Tickets", "href": "#register", "variant": "secondary", "size": "lg"}
      ]
    },
    {
      "id": "events-section",
      "name": "Upcoming Events",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "events1", "type": "heading", "content": "Upcoming Events", "level": 2, "align": "center"},
        {"id": "events2", "type": "text", "content": "Browse our calendar and find events that interest you.", "align": "center"},
        {"id": "events3", "type": "event-list", "maxEvents": 6, "showPastEvents": false, "layout": "grid"}
      ]
    },
    {
      "id": "newsletter-section",
      "name": "Newsletter",
      "backgroundColor": "#faf5ff",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "news1", "type": "heading", "content": "Stay Updated", "level": 2, "align": "center"},
        {"id": "news2", "type": "newsletter-signup", "heading": "", "description": "Subscribe to receive updates about upcoming events and opportunities.", "buttonText": "Subscribe"}
      ]
    }
  ]',
  0
);

-- ==================== Template 3: Donation Campaign Page ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-3333-3333-3333-000000000003',
  NULL,
  'Fundraising Campaign',
  'A compelling single-page template designed to drive donations with impactful storytelling.',
  'donation',
  ARRAY['fundraising', 'campaign', 'donation', 'progress'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#059669",
      "secondary": "#0891b2",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "surface": "#f0fdf4",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"DM Sans\", system-ui, sans-serif",
      "headingFontFamily": "\"DM Sans\", system-ui, sans-serif",
      "baseFontSize": "16px",
      "lineHeight": "1.7",
      "headingLineHeight": "1.2",
      "fontWeightNormal": 400,
      "fontWeightMedium": 500,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.25rem", "md": "0.5rem", "lg": "1rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 25px 50px rgba(0,0,0,0.25)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [],
      "sticky": true,
      "transparent": false,
      "showCTA": true,
      "ctaText": "Donate",
      "ctaLink": "#donate"
    },
    "footer": {
      "columns": [],
      "copyright": "© 2026 Your Nonprofit. All rights reserved.",
      "socialLinks": [
        {"platform": "facebook", "url": "#"},
        {"platform": "twitter", "url": "#"},
        {"platform": "instagram", "url": "#"}
      ]
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["Progress bar", "Story section", "Impact testimonials", "Multiple donation tiers"]}',
  '1.0.0'
);

-- Campaign Page - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-3333-3333-3333-000000000001',
  'a1b2c3d4-3333-3333-3333-000000000003',
  'Home',
  'home',
  true,
  '{"title": "Help Us Reach Our Goal - Fundraising Campaign", "description": "Join our campaign to make a lasting impact. Every donation brings us closer to our goal."}',
  '[
    {
      "id": "hero-section",
      "name": "Campaign Hero",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "hero1", "type": "text", "content": "FUNDRAISING CAMPAIGN", "align": "center", "color": "#059669", "fontSize": "0.875rem"},
        {"id": "hero2", "type": "heading", "content": "Help Us Build a Brighter Future", "level": 1, "align": "center"},
        {"id": "hero3", "type": "text", "content": "We are raising $50,000 to expand our community programs and reach more families in need.", "align": "center"},
        {"id": "hero4", "type": "stats", "items": [
          {"id": "stat1", "value": "$32,500", "label": "Raised So Far"},
          {"id": "stat2", "value": "65%", "label": "Of Our Goal"},
          {"id": "stat3", "value": "234", "label": "Donors"}
        ], "columns": 3}
      ]
    },
    {
      "id": "story-section",
      "name": "Our Story",
      "backgroundColor": "#f0fdf4",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "story1", "type": "heading", "content": "Why We Need Your Help", "level": 2, "align": "center"},
        {"id": "story2", "type": "text", "content": "Every day, families in our community face challenges that seem insurmountable. With your support, we can provide essential services, education, and hope to those who need it most. Your donation directly funds programs that change lives.", "align": "center"}
      ]
    },
    {
      "id": "testimonials-section",
      "name": "Impact Stories",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "test1", "type": "heading", "content": "Stories of Impact", "level": 2, "align": "center"},
        {"id": "test2", "type": "testimonial", "quote": "Thanks to this organization, my family was able to get back on our feet. The support we received changed our lives.", "author": "Maria S.", "title": "Program Participant"}
      ]
    },
    {
      "id": "donate-section",
      "name": "Donate",
      "backgroundColor": "#f0fdf4",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "donate1", "type": "heading", "content": "Make Your Impact", "level": 2, "align": "center"},
        {"id": "donate2", "type": "donation-form", "heading": "", "description": "Choose an amount that works for you. Every gift makes a difference.", "suggestedAmounts": [25, 50, 100, 500], "allowCustomAmount": true, "recurringOption": true}
      ]
    }
  ]',
  0
);

-- ==================== Template 4: Blog/News Site ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-4444-4444-4444-000000000004',
  NULL,
  'News & Blog',
  'A content-focused template for sharing news, stories, and updates with your community.',
  'blog',
  ARRAY['blog', 'news', 'stories', 'content'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#1e40af",
      "secondary": "#4f46e5",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "surface": "#f1f5f9",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"Source Sans Pro\", system-ui, sans-serif",
      "headingFontFamily": "\"Merriweather\", Georgia, serif",
      "baseFontSize": "18px",
      "lineHeight": "1.8",
      "headingLineHeight": "1.3",
      "fontWeightNormal": 400,
      "fontWeightMedium": 600,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 25px 50px rgba(0,0,0,0.25)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [
        {"id": "nav1", "label": "Home", "href": "/"},
        {"id": "nav2", "label": "News", "href": "/news"},
        {"id": "nav3", "label": "Stories", "href": "/stories"},
        {"id": "nav4", "label": "About", "href": "/about"}
      ],
      "sticky": true,
      "transparent": false
    },
    "footer": {
      "columns": [
        {"title": "Navigation", "links": [{"label": "Home", "href": "/"}, {"label": "News", "href": "/news"}, {"label": "About", "href": "/about"}]},
        {"title": "Connect", "links": [{"label": "Contact", "href": "/contact"}, {"label": "Subscribe", "href": "#newsletter"}]}
      ],
      "copyright": "© 2026 Your Nonprofit. All rights reserved.",
      "showNewsletter": true
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["Blog layout", "Category filtering", "Newsletter signup", "Reading-optimized typography"]}',
  '1.0.0'
);

-- Blog Site - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-4444-4444-4444-000000000001',
  'a1b2c3d4-4444-4444-4444-000000000004',
  'Home',
  'home',
  true,
  '{"title": "News & Stories - Our Nonprofit", "description": "Stay updated with the latest news, stories of impact, and updates from our organization."}',
  '[
    {
      "id": "hero-section",
      "name": "Welcome",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "News & Stories", "level": 1, "align": "center"},
        {"id": "hero2", "type": "text", "content": "Updates from our community, stories of impact, and the latest news from our programs.", "align": "center"}
      ]
    },
    {
      "id": "featured-section",
      "name": "Featured Post",
      "backgroundColor": "#f1f5f9",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "feat1", "type": "text", "content": "FEATURED STORY", "align": "left", "color": "#1e40af", "fontSize": "0.875rem"},
        {"id": "feat2", "type": "heading", "content": "How Your Support Changed Lives This Year", "level": 2, "align": "left"},
        {"id": "feat3", "type": "text", "content": "2025 was a transformative year for our community. Thanks to generous donors like you, we were able to expand our programs and reach more families than ever before.", "align": "left"},
        {"id": "feat4", "type": "button", "text": "Read Full Story", "href": "/stories/2025-impact", "variant": "primary"}
      ]
    },
    {
      "id": "newsletter-section",
      "name": "Newsletter",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "news1", "type": "heading", "content": "Subscribe to Our Newsletter", "level": 2, "align": "center"},
        {"id": "news2", "type": "newsletter-signup", "heading": "", "description": "Get the latest updates delivered directly to your inbox.", "buttonText": "Subscribe"}
      ]
    }
  ]',
  0
);

-- ==================== Template 5: Multi-page Nonprofit Site ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-5555-5555-5555-000000000005',
  NULL,
  'Complete Nonprofit Website',
  'A comprehensive multi-page template with all the sections a nonprofit needs: home, about, programs, volunteer, and donate.',
  'multi-page',
  ARRAY['complete', 'multi-page', 'volunteer', 'programs', 'professional'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#0f766e",
      "secondary": "#6366f1",
      "accent": "#f97316",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"Inter\", system-ui, sans-serif",
      "headingFontFamily": "\"Inter\", system-ui, sans-serif",
      "baseFontSize": "16px",
      "lineHeight": "1.6",
      "headingLineHeight": "1.2",
      "fontWeightNormal": 400,
      "fontWeightMedium": 500,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.25rem", "md": "0.5rem", "lg": "1rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 25px 50px rgba(0,0,0,0.25)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [
        {"id": "nav1", "label": "Home", "href": "/"},
        {"id": "nav2", "label": "About", "href": "/about"},
        {"id": "nav3", "label": "Programs", "href": "/programs"},
        {"id": "nav4", "label": "Volunteer", "href": "/volunteer"},
        {"id": "nav5", "label": "Events", "href": "/events"},
        {"id": "nav6", "label": "Contact", "href": "/contact"}
      ],
      "sticky": true,
      "transparent": false,
      "showCTA": true,
      "ctaText": "Donate",
      "ctaLink": "/donate"
    },
    "footer": {
      "description": "Dedicated to making a positive impact in our community through programs, volunteer work, and community engagement.",
      "columns": [
        {"title": "Quick Links", "links": [{"label": "About Us", "href": "/about"}, {"label": "Programs", "href": "/programs"}, {"label": "Events", "href": "/events"}]},
        {"title": "Get Involved", "links": [{"label": "Volunteer", "href": "/volunteer"}, {"label": "Donate", "href": "/donate"}, {"label": "Partner", "href": "/contact"}]},
        {"title": "Contact", "links": [{"label": "Contact Us", "href": "/contact"}, {"label": "FAQ", "href": "/faq"}]}
      ],
      "socialLinks": [
        {"platform": "facebook", "url": "#"},
        {"platform": "twitter", "url": "#"},
        {"platform": "instagram", "url": "#"},
        {"platform": "linkedin", "url": "#"}
      ],
      "copyright": "© 2026 Your Nonprofit. All rights reserved.",
      "showNewsletter": true
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["5 pre-built pages", "Team section", "Programs showcase", "Volunteer signup", "Event calendar"]}',
  '1.0.0'
);

-- Multi-page Site - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-5555-5555-5555-000000000001',
  'a1b2c3d4-5555-5555-5555-000000000005',
  'Home',
  'home',
  true,
  '{"title": "Welcome - Your Nonprofit Name", "description": "Making a difference in our community through dedicated programs and volunteer work."}',
  '[
    {
      "id": "hero-section",
      "name": "Hero",
      "backgroundColor": "#0f766e",
      "paddingTop": "6rem",
      "paddingBottom": "6rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "Building Stronger Communities Together", "level": 1, "align": "center", "color": "#ffffff"},
        {"id": "hero2", "type": "text", "content": "Through dedicated service and community partnerships, we are creating lasting change.", "align": "center", "color": "#99f6e4"},
        {"id": "hero3", "type": "button", "text": "Get Involved", "href": "/volunteer", "variant": "secondary", "size": "lg"}
      ]
    },
    {
      "id": "programs-preview",
      "name": "Programs Preview",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "prog1", "type": "heading", "content": "Our Programs", "level": 2, "align": "center"},
        {"id": "prog2", "type": "text", "content": "We offer a variety of programs to serve our community.", "align": "center"}
      ]
    },
    {
      "id": "impact-section",
      "name": "Impact",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "impact1", "type": "stats", "items": [
          {"id": "stat1", "value": "25+", "label": "Years of Service"},
          {"id": "stat2", "value": "50,000+", "label": "Lives Impacted"},
          {"id": "stat3", "value": "1,000+", "label": "Active Volunteers"},
          {"id": "stat4", "value": "100+", "label": "Community Partners"}
        ], "columns": 4}
      ]
    },
    {
      "id": "events-preview",
      "name": "Upcoming Events",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "events1", "type": "heading", "content": "Upcoming Events", "level": 2, "align": "center"},
        {"id": "events2", "type": "event-list", "maxEvents": 3, "showPastEvents": false, "layout": "grid"},
        {"id": "events3", "type": "button", "text": "View All Events", "href": "/events", "variant": "outline"}
      ]
    },
    {
      "id": "cta-section",
      "name": "Call to Action",
      "backgroundColor": "#0f766e",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "cta1", "type": "heading", "content": "Ready to Make a Difference?", "level": 2, "align": "center", "color": "#ffffff"},
        {"id": "cta2", "type": "text", "content": "Join our community of volunteers and donors making real change happen.", "align": "center", "color": "#99f6e4"},
        {"id": "cta3", "type": "button", "text": "Donate Now", "href": "/donate", "variant": "secondary", "size": "lg"}
      ]
    }
  ]',
  0
);

-- Multi-page Site - About Page
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-5555-5555-5555-000000000002',
  'a1b2c3d4-5555-5555-5555-000000000005',
  'About',
  'about',
  false,
  '{"title": "About Us - Your Nonprofit Name", "description": "Learn about our mission, history, and the team behind our organization."}',
  '[
    {
      "id": "hero-section",
      "name": "About Hero",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "About Us", "level": 1, "align": "center"},
        {"id": "hero2", "type": "text", "content": "Our mission, vision, and the people who make it happen.", "align": "center"}
      ]
    },
    {
      "id": "mission-section",
      "name": "Mission",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "mission1", "type": "heading", "content": "Our Mission", "level": 2},
        {"id": "mission2", "type": "text", "content": "We are dedicated to creating positive change in our community by providing essential services, educational programs, and opportunities for growth to those who need them most."}
      ]
    },
    {
      "id": "team-section",
      "name": "Our Team",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "team1", "type": "heading", "content": "Meet Our Team", "level": 2, "align": "center"},
        {"id": "team2", "type": "team", "members": [
          {"id": "member1", "name": "Jane Smith", "role": "Executive Director", "bio": "Jane has led our organization for over 10 years."},
          {"id": "member2", "name": "John Doe", "role": "Program Director", "bio": "John oversees all community programs."},
          {"id": "member3", "name": "Sarah Johnson", "role": "Development Director", "bio": "Sarah manages fundraising and donor relations."}
        ], "columns": 3, "showBio": true}
      ]
    }
  ]',
  1
);

-- Multi-page Site - Volunteer Page
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-5555-5555-5555-000000000003',
  'a1b2c3d4-5555-5555-5555-000000000005',
  'Volunteer',
  'volunteer',
  false,
  '{"title": "Volunteer With Us - Your Nonprofit Name", "description": "Join our team of dedicated volunteers and make a difference in your community."}',
  '[
    {
      "id": "hero-section",
      "name": "Volunteer Hero",
      "backgroundColor": "#0f766e",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "Volunteer With Us", "level": 1, "align": "center", "color": "#ffffff"},
        {"id": "hero2", "type": "text", "content": "Make a real difference in your community. Join our team of dedicated volunteers.", "align": "center", "color": "#99f6e4"}
      ]
    },
    {
      "id": "opportunities-section",
      "name": "Opportunities",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "opp1", "type": "heading", "content": "Volunteer Opportunities", "level": 2, "align": "center"},
        {"id": "opp2", "type": "text", "content": "We have a variety of volunteer roles to match your skills and interests.", "align": "center"}
      ]
    },
    {
      "id": "signup-section",
      "name": "Sign Up",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "signup1", "type": "heading", "content": "Ready to Get Started?", "level": 2, "align": "center"},
        {"id": "signup2", "type": "contact-form", "heading": "", "description": "Fill out this form and we will contact you about volunteer opportunities.", "submitText": "Submit Application", "includePhone": true, "includeMessage": true, "successMessage": "Thank you for your interest! We will be in touch soon."}
      ]
    }
  ]',
  2
);

-- Multi-page Site - Donate Page
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-5555-5555-5555-000000000004',
  'a1b2c3d4-5555-5555-5555-000000000005',
  'Donate',
  'donate',
  false,
  '{"title": "Donate - Your Nonprofit Name", "description": "Support our mission with a tax-deductible donation. Every gift makes a difference."}',
  '[
    {
      "id": "hero-section",
      "name": "Donate Hero",
      "paddingTop": "4rem",
      "paddingBottom": "2rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "Support Our Mission", "level": 1, "align": "center"},
        {"id": "hero2", "type": "text", "content": "Your generous donation helps us continue our important work in the community.", "align": "center"}
      ]
    },
    {
      "id": "donation-section",
      "name": "Donation Form",
      "paddingTop": "2rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "donate1", "type": "donation-form", "heading": "Make a Donation", "description": "All donations are tax-deductible. You will receive a receipt via email.", "suggestedAmounts": [25, 50, 100, 250, 500, 1000], "allowCustomAmount": true, "recurringOption": true}
      ]
    },
    {
      "id": "impact-section",
      "name": "Your Impact",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "impact1", "type": "heading", "content": "Your Impact", "level": 2, "align": "center"},
        {"id": "impact2", "type": "text", "content": "See how your donation makes a difference:", "align": "center"},
        {"id": "impact3", "type": "pricing", "tiers": [
          {"id": "tier1", "name": "$25", "price": "", "description": "Provides supplies for one student", "features": ["School supplies", "Books", "Learning materials"], "buttonText": "Donate $25", "buttonLink": "#donate"},
          {"id": "tier2", "name": "$100", "price": "", "description": "Feeds a family for one week", "features": ["Groceries", "Fresh produce", "Nutritious meals"], "buttonText": "Donate $100", "buttonLink": "#donate", "highlighted": true},
          {"id": "tier3", "name": "$500", "price": "", "description": "Sponsors a program participant", "features": ["Full program access", "Materials included", "Support services"], "buttonText": "Donate $500", "buttonLink": "#donate"}
        ], "columns": 3}
      ]
    }
  ]',
  3
);

-- Multi-page Site - Contact Page
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-5555-5555-5555-000000000005',
  'a1b2c3d4-5555-5555-5555-000000000005',
  'Contact',
  'contact',
  false,
  '{"title": "Contact Us - Your Nonprofit Name", "description": "Get in touch with our team. We would love to hear from you."}',
  '[
    {
      "id": "hero-section",
      "name": "Contact Hero",
      "paddingTop": "4rem",
      "paddingBottom": "2rem",
      "components": [
        {"id": "hero1", "type": "heading", "content": "Contact Us", "level": 1, "align": "center"},
        {"id": "hero2", "type": "text", "content": "Have questions? We would love to hear from you.", "align": "center"}
      ]
    },
    {
      "id": "contact-section",
      "name": "Contact Form",
      "paddingTop": "2rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "contact1", "type": "contact-form", "heading": "Send Us a Message", "submitText": "Send Message", "includePhone": true, "includeMessage": true, "successMessage": "Thank you for reaching out! We will respond within 1-2 business days."}
      ]
    },
    {
      "id": "info-section",
      "name": "Contact Info",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "info1", "type": "heading", "content": "Visit Us", "level": 2, "align": "center"},
        {"id": "info2", "type": "text", "content": "400 West Georgia Street, Suite 1200\nVancouver, BC V6B 1A1\n\nPhone: (604) 555-1234\nEmail: info@yournonprofit.org", "align": "center"},
        {"id": "info3", "type": "map", "address": "400 West Georgia Street, Vancouver, BC V6B 1A1", "height": "300px", "zoom": 15}
      ]
    }
  ]',
  4
);

-- ==================== Template 6: Public Nonprofit Website ====================

INSERT INTO templates (
  id, user_id, name, description, category, tags, status, is_system_template,
  theme, global_settings, metadata, current_version
) VALUES (
  'a1b2c3d4-6666-6666-6666-000000000006',
  NULL,
  'Community Nonprofit Hub',
  'A public-facing nonprofit starter with a news hub, program pages, team profiles, referral intake, and a prominent client portal link.',
  'multi-page',
  ARRAY['nonprofit', 'community', 'news', 'programs', 'referral', 'portal'],
  'published',
  true,
  '{
    "colors": {
      "primary": "#0f766e",
      "secondary": "#334155",
      "accent": "#d97706",
      "background": "#fbfbf7",
      "surface": "#ffffff",
      "text": "#0f172a",
      "textMuted": "#475569",
      "border": "#dbe3e0",
      "error": "#ef4444",
      "success": "#16a34a",
      "warning": "#f59e0b"
    },
    "typography": {
      "fontFamily": "\"Inter\", system-ui, sans-serif",
      "headingFontFamily": "\"Merriweather\", Georgia, serif",
      "baseFontSize": "16px",
      "lineHeight": "1.7",
      "headingLineHeight": "1.15",
      "fontWeightNormal": 400,
      "fontWeightMedium": 500,
      "fontWeightBold": 700
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"},
    "borderRadius": {"sm": "0.25rem", "md": "0.65rem", "lg": "1rem", "full": "9999px"},
    "shadows": {"sm": "0 1px 2px rgba(15,23,42,0.06)", "md": "0 10px 20px rgba(15,23,42,0.08)", "lg": "0 18px 35px rgba(15,23,42,0.12)", "xl": "0 30px 60px rgba(15,23,42,0.18)"}
  }',
  '{
    "language": "en",
    "header": {
      "navigation": [
        {"id": "nav1", "label": "Home", "href": "/"},
        {"id": "nav2", "label": "What''s Happening", "href": "/whats-happening"},
        {"id": "nav3", "label": "Our Space", "href": "/our-space"},
        {"id": "nav4", "label": "Our Programs", "href": "/programs"},
        {"id": "nav5", "label": "Our People", "href": "/our-people"},
        {"id": "nav6", "label": "Get Involved", "href": "/get-involved"},
        {"id": "nav7", "label": "Contact", "href": "/contact"},
        {"id": "nav8", "label": "Client Portal", "href": "/portal"}
      ],
      "sticky": true,
      "transparent": false,
      "showCTA": true,
      "ctaText": "Client Portal",
      "ctaLink": "/portal"
    },
    "footer": {
      "description": "Serving our neighbors through public programs, advocacy, referrals, and a welcoming community space.",
      "columns": [
        {"title": "Explore", "links": [{"label": "Home", "href": "/"}, {"label": "What''s Happening", "href": "/whats-happening"}, {"label": "Our Programs", "href": "/programs"}]},
        {"title": "Get Involved", "links": [{"label": "Donate", "href": "/get-involved"}, {"label": "Volunteer", "href": "/get-involved"}, {"label": "Referral Form", "href": "/contact"}]},
        {"title": "Contact", "links": [{"label": "Contact Us", "href": "/contact"}, {"label": "Client Portal", "href": "/portal"}]}
      ],
      "socialLinks": [
        {"platform": "facebook", "url": "#"},
        {"platform": "instagram", "url": "#"},
        {"platform": "linkedin", "url": "#"}
      ],
      "copyright": "© 2026 Community Nonprofit Hub. All rights reserved.",
      "showNewsletter": true,
      "newsletterTitle": "Stay in the loop",
      "newsletterDescription": "Receive updates, advocacy notes, and community news."
    }
  }',
  '{"version": "1.0.0", "author": "System", "features": ["Public news hub", "Program pages", "Team directory", "Referral intake", "Client portal CTA", "Responsive nonprofit layouts"]}',
  '1.0.0'
);

-- Community Nonprofit Hub - Home
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000001',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Home',
  'home',
  true,
  '{"title": "Community Nonprofit Hub", "description": "A welcoming public home for our programs, community space, and ways to get involved."}',
  '[
    {
      "id": "home-hero",
      "name": "Hero",
      "backgroundColor": "#0f766e",
      "paddingTop": "5rem",
      "paddingBottom": "5rem",
      "components": [
        {
          "id": "home-hero-columns",
          "type": "columns",
          "gap": "2rem",
          "columns": [
            {
              "id": "home-hero-copy",
              "width": "2/3",
              "components": [
                {"id": "home-hero-title", "type": "heading", "content": "A community hub built for care, dignity, and connection.", "level": 1, "align": "left", "color": "#ffffff"},
                {"id": "home-hero-text", "type": "text", "content": "Find out what''s happening, explore our programs, learn about our space, and reach the people who can help you get connected.", "align": "left", "color": "#e2f7f3"},
                {"id": "home-hero-actions", "type": "columns", "gap": "0.75rem", "columns": [
                  {"id": "home-hero-action-1", "width": "1/3", "components": [{"id": "home-portal", "type": "button", "text": "Client Portal", "href": "/portal", "variant": "secondary", "size": "lg"}]},
                  {"id": "home-hero-action-2", "width": "1/3", "components": [{"id": "home-news", "type": "button", "text": "What''s Happening", "href": "/whats-happening", "variant": "outline", "size": "lg"}]},
                  {"id": "home-hero-action-3", "width": "1/3", "components": [{"id": "home-help", "type": "button", "text": "Get Involved", "href": "/get-involved", "variant": "outline", "size": "lg"}]}
                ]}
              ]
            },
            {
              "id": "home-hero-card",
              "width": "1/3",
              "components": [
                {"id": "home-portal-card", "type": "card", "title": "Client Portal", "subtitle": "Private access for clients and staff", "content": "Use the portal to manage referrals, updates, and follow-up resources.", "link": "/portal", "linkText": "Open portal", "shadow": true}
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "home-impact",
      "name": "Impact",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "home-impact-title", "type": "heading", "content": "Impact at a glance", "level": 2, "align": "center"},
        {"id": "home-impact-text", "type": "text", "content": "Every part of the public site should help people understand the work, see the outcomes, and take the next step.", "align": "center"},
        {"id": "home-impact-stats", "type": "stats", "items": [
          {"id": "home-stat-1", "value": "25+", "label": "Years serving neighbors"},
          {"id": "home-stat-2", "value": "1,000+", "label": "Annual community connections"},
          {"id": "home-stat-3", "value": "12", "label": "Program and service pathways"},
          {"id": "home-stat-4", "value": "1", "label": "Connected public website"}
        ], "columns": 4}
      ]
    },
    {
      "id": "home-cards",
      "name": "Highlights",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "home-highlights", "type": "columns", "gap": "1rem", "columns": [
          {"id": "highlight-1", "width": "1/3", "components": [{"id": "highlight-card-1", "type": "card", "title": "Our Space", "subtitle": "See the place people visit", "content": "Photos, directions, accessibility notes, and a map make the space easy to find.", "link": "/our-space", "linkText": "View our space"}]},
          {"id": "highlight-2", "width": "1/3", "components": [{"id": "highlight-card-2", "type": "card", "title": "Programs", "subtitle": "Understand what we offer", "content": "Program pages explain the services, eligibility, and next steps for each offering.", "link": "/programs", "linkText": "Browse programs"}]},
          {"id": "highlight-3", "width": "1/3", "components": [{"id": "highlight-card-3", "type": "card", "title": "Make a referral", "subtitle": "Start a warm handoff", "content": "The referral form creates a CRM intake record so staff can follow up quickly.", "link": "/contact", "linkText": "Start referral"}]}
        ]}
      ]
    }
  ]',
  0
);

-- Community Nonprofit Hub - What''s Happening
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000002',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'What''s Happening',
  'whats-happening',
  false,
  '{"title": "What''s Happening", "description": "News, advocacy updates, stories, and upcoming events from our organization."}',
  '[
    {
      "id": "whats-hero",
      "name": "What''s Happening Hero",
      "backgroundColor": "#f8fafc",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "whats-title", "type": "heading", "content": "What''s Happening", "level": 1, "align": "center"},
        {"id": "whats-text", "type": "text", "content": "Read the latest stories, updates, and event announcements from our community.", "align": "center"},
        {"id": "whats-button", "type": "button", "text": "Subscribe for updates", "href": "#newsletter", "variant": "primary", "size": "lg"}
      ]
    },
    {
      "id": "whats-feed",
      "name": "News and Events",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "whats-archive", "type": "newsletter-archive", "maxItems": 6, "sourceFilter": "all"},
        {"id": "whats-events", "type": "event-list", "maxEvents": 3, "showPastEvents": false, "layout": "grid"}
      ]
    },
    {
      "id": "whats-newsletter",
      "name": "Newsletter Signup",
      "backgroundColor": "#0f766e",
      "paddingTop": "4rem",
      "paddingBottom": "4rem",
      "components": [
        {"id": "whats-newsletter-title", "type": "heading", "content": "Get the next update", "level": 2, "align": "center", "color": "#ffffff"},
        {"id": "whats-newsletter-text", "type": "text", "content": "Subscribe once and stay connected to stories, events, and advocacy work.", "align": "center", "color": "#d9f5ef"},
        {"id": "whats-newsletter-form", "type": "newsletter-signup", "heading": "", "description": "", "buttonText": "Subscribe"}
      ]
    }
  ]',
  1
);

-- Community Nonprofit Hub - What''s Happening Story Detail
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000003',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Story Detail',
  'story-detail',
  false,
  '{"title": "Story Detail", "description": "Read the full story, update, or advocacy note."}',
  '[
    {
      "id": "story-detail-hero",
      "name": "Story Detail Hero",
      "paddingTop": "3rem",
      "paddingBottom": "2rem",
      "components": [
        {"id": "story-detail-title", "type": "heading", "content": "Story Detail", "level": 1, "align": "center"},
        {"id": "story-detail-text", "type": "text", "content": "The full article appears below this intro.", "align": "center"}
      ]
    }
  ]',
  2
);

-- Community Nonprofit Hub - Our Space
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000004',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Our Space',
  'our-space',
  false,
  '{"title": "Our Space", "description": "Photos, directions, accessibility details, and a map for the community space."}',
  '[
    {
      "id": "space-hero",
      "name": "Space Hero",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "space-title", "type": "heading", "content": "Our Space", "level": 1, "align": "center"},
        {"id": "space-text", "type": "text", "content": "A welcoming place to meet, learn, and connect with services.", "align": "center"}
      ]
    },
    {
      "id": "space-gallery",
      "name": "Gallery",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "space-gallery-heading", "type": "heading", "content": "Inside the space", "level": 2, "align": "center"},
        {"id": "space-gallery-grid", "type": "gallery", "columns": 3, "items": [
          {"id": "space-photo-1", "src": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80", "alt": "Community meeting room"},
          {"id": "space-photo-2", "src": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", "alt": "Welcoming lounge"},
          {"id": "space-photo-3", "src": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", "alt": "Program gathering"}
        ]}
      ]
    },
    {
      "id": "space-visit",
      "name": "Visit Us",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "space-visit-columns", "type": "columns", "gap": "1rem", "columns": [
          {"id": "space-map-col", "width": "2/3", "components": [{"id": "space-map", "type": "map", "address": "400 West Georgia Street, Vancouver, BC V6B 1A1", "height": "360px", "zoom": 15}]},
          {"id": "space-info-col", "width": "1/3", "components": [{"id": "space-info-card", "type": "card", "title": "Before you visit", "subtitle": "Hours, access, and directions", "content": "We are open weekdays, accessible by transit, and happy to coordinate accommodations in advance.", "link": "/contact", "linkText": "Ask a question"}]}
        ]}
      ]
    }
  ]',
  3
);

-- Community Nonprofit Hub - Our Programs
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000005',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Our Programs',
  'programs',
  false,
  '{"title": "Our Programs", "description": "Explore the support, learning, and community programs we offer."}',
  '[
    {
      "id": "programs-hero",
      "name": "Programs Hero",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "programs-title", "type": "heading", "content": "Our Programs", "level": 1, "align": "center"},
        {"id": "programs-text", "type": "text", "content": "Each program is designed to help people move from need to stability with dignity and support.", "align": "center"}
      ]
    },
    {
      "id": "programs-cards",
      "name": "Program Cards",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "programs-columns", "type": "columns", "gap": "1rem", "columns": [
          {"id": "program-1", "width": "1/3", "components": [{"id": "program-card-1", "type": "card", "title": "Community Navigation", "subtitle": "Start with a warm handoff", "content": "Help people find the right service, the right staff member, and the right next step.", "link": "/contact", "linkText": "Refer someone"}]},
          {"id": "program-2", "width": "1/3", "components": [{"id": "program-card-2", "type": "card", "title": "Resource Support", "subtitle": "Practical help in a crisis", "content": "Provide access to essential resources, forms, and follow-up pathways without forcing people to start over.", "link": "/whats-happening", "linkText": "See updates"}]},
          {"id": "program-3", "width": "1/3", "components": [{"id": "program-card-3", "type": "card", "title": "Community Learning", "subtitle": "Build skills and confidence", "content": "Offer workshops, information sessions, and ongoing support that strengthen the whole community.", "link": "/get-involved", "linkText": "Join in"}]}
        ]}
      ]
    },
    {
      "id": "programs-testimonial",
      "name": "Testimonial",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "programs-testimonial-title", "type": "heading", "content": "Why people return", "level": 2, "align": "center"},
        {"id": "programs-testimonial-copy", "type": "testimonial", "quote": "We finally knew where to go and who could help.", "author": "Community Member", "title": "Program participant"}
      ]
    }
  ]',
  4
);

-- Community Nonprofit Hub - Our People
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000006',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Our People',
  'our-people',
  false,
  '{"title": "Our People", "description": "Meet the staff, board, and volunteers who make the work possible."}',
  '[
    {
      "id": "people-hero",
      "name": "People Hero",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "people-title", "type": "heading", "content": "Our People", "level": 1, "align": "center"},
        {"id": "people-text", "type": "text", "content": "A team-first site should make staff, board, and volunteers easy to find and easy to trust.", "align": "center"}
      ]
    },
    {
      "id": "people-team",
      "name": "Team",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "people-team-heading", "type": "heading", "content": "Staff and board", "level": 2, "align": "center"},
        {"id": "people-team-grid", "type": "team", "columns": 3, "showBio": true, "showSocial": false, "members": [
          {"id": "member-1", "name": "Jordan Lee", "role": "Executive Director", "bio": "Leads the organization''s public strategy and community partnerships."},
          {"id": "member-2", "name": "Maya Patel", "role": "Programs Director", "bio": "Coordinates program delivery, referrals, and participant support."},
          {"id": "member-3", "name": "Sam Rivera", "role": "Community Outreach", "bio": "Keeps neighbors informed and connected to the right resources."}
        ]}
      ]
    },
    {
      "id": "people-partners",
      "name": "Partners",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "people-partners-heading", "type": "heading", "content": "Community partners", "level": 2, "align": "center"},
        {"id": "people-logos", "type": "logo-grid", "columns": 4, "grayscale": true, "maxLogoHeight": "48px", "logos": [
          {"id": "logo-1", "src": "https://dummyimage.com/240x120/f8fafc/0f172a&text=Partner+One", "alt": "Partner One"},
          {"id": "logo-2", "src": "https://dummyimage.com/240x120/f8fafc/0f172a&text=Partner+Two", "alt": "Partner Two"},
          {"id": "logo-3", "src": "https://dummyimage.com/240x120/f8fafc/0f172a&text=Partner+Three", "alt": "Partner Three"},
          {"id": "logo-4", "src": "https://dummyimage.com/240x120/f8fafc/0f172a&text=Partner+Four", "alt": "Partner Four"}
        ]}
      ]
    }
  ]',
  5
);

-- Community Nonprofit Hub - Get Involved
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000007',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Get Involved',
  'get-involved',
  false,
  '{"title": "Get Involved", "description": "Donate, volunteer, sign up for updates, and join the work."}',
  '[
    {
      "id": "involved-hero",
      "name": "Get Involved Hero",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "involved-title", "type": "heading", "content": "Get Involved", "level": 1, "align": "center"},
        {"id": "involved-text", "type": "text", "content": "There are many ways to support the work: give, volunteer, share updates, or send us a referral.", "align": "center"}
      ]
    },
    {
      "id": "involved-options",
      "name": "Options",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "involved-columns", "type": "columns", "gap": "1rem", "columns": [
          {"id": "involved-1", "width": "1/4", "components": [{"id": "donate-card", "type": "card", "title": "Donate", "subtitle": "Give what you can", "content": "Support the mission with a one-time or recurring gift.", "link": "/get-involved#donate", "linkText": "Donate now"}]},
          {"id": "involved-2", "width": "1/4", "components": [{"id": "volunteer-card", "type": "card", "title": "Volunteer", "subtitle": "Share your time", "content": "Join events, support operations, or help at the community space.", "link": "/get-involved#volunteer", "linkText": "Volunteer"}]},
          {"id": "involved-3", "width": "1/4", "components": [{"id": "updates-card", "type": "card", "title": "Newsletter", "subtitle": "Stay informed", "content": "Follow the latest updates, advocacy work, and community stories.", "link": "/whats-happening", "linkText": "Read updates"}]},
          {"id": "involved-4", "width": "1/4", "components": [{"id": "referral-card", "type": "card", "title": "Referrals", "subtitle": "Help someone get connected", "content": "Use the contact page to send a warm referral directly to staff.", "link": "/contact", "linkText": "Make a referral"}]}
        ]}
      ]
    },
    {
      "id": "involved-donation",
      "name": "Donate",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "involved-donate-title", "type": "heading", "content": "Support the mission", "level": 2, "align": "center"},
        {"id": "involved-donate-form", "type": "donation-form", "heading": "", "description": "Choose an amount that works for you. Every gift makes a difference.", "suggestedAmounts": [25, 50, 100, 250], "allowCustomAmount": true, "recurringOption": true}
      ]
    },
    {
      "id": "involved-volunteer",
      "name": "Volunteer",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "involved-volunteer-title", "type": "heading", "content": "Volunteer interest", "level": 2, "align": "center"},
        {"id": "involved-volunteer-form", "type": "volunteer-interest-form", "heading": "", "description": "Tell us how you would like to help and we''ll follow up.", "submitText": "Send interest", "includePhone": true}
      ]
    },
    {
      "id": "involved-updates",
      "name": "Updates",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "involved-updates-title", "type": "heading", "content": "Stay connected", "level": 2, "align": "center"},
        {"id": "involved-updates-form", "type": "newsletter-signup", "heading": "", "description": "Sign up once and stay in the loop.", "buttonText": "Subscribe"}
      ]
    }
  ]',
  6
);

-- Community Nonprofit Hub - Contact / Referral
INSERT INTO template_pages (id, template_id, name, slug, is_homepage, seo, sections, sort_order)
VALUES (
  'b1b2c3d4-6666-6666-6666-000000000008',
  'a1b2c3d4-6666-6666-6666-000000000006',
  'Contact / Referral',
  'contact',
  false,
  '{"title": "Contact and Referral", "description": "Reach the team, send a referral, or ask about services and the client portal."}',
  '[
    {
      "id": "contact-hero",
      "name": "Contact Hero",
      "paddingTop": "4rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "contact-title", "type": "heading", "content": "Contact and Referral", "level": 1, "align": "center"},
        {"id": "contact-text", "type": "text", "content": "Use this page for general questions or warm referrals that need staff follow-up.", "align": "center"}
      ]
    },
    {
      "id": "contact-forms",
      "name": "Forms",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "contact-forms-columns", "type": "columns", "gap": "1rem", "columns": [
          {"id": "contact-form-col", "width": "1/2", "components": [{"id": "contact-form-block", "type": "contact-form", "heading": "Send us a message", "description": "Questions, general inquiries, and support requests.", "submitText": "Send message", "includePhone": true, "includeMessage": true, "successMessage": "Thanks for reaching out. We''ll follow up soon."}]},
          {"id": "referral-form-col", "width": "1/2", "components": [{"id": "referral-form-block", "type": "referral-form", "heading": "Make a referral", "description": "Tell us who needs help so our team can create an intake record and follow up.", "submitText": "Submit referral", "includePhone": true, "successMessage": "Thanks. The referral has been recorded and routed for follow-up."}]}
        ]}
      ]
    },
    {
      "id": "contact-visit",
      "name": "Visit and Portal",
      "backgroundColor": "#f8fafc",
      "paddingTop": "3rem",
      "paddingBottom": "3rem",
      "components": [
        {"id": "contact-visit-columns", "type": "columns", "gap": "1rem", "columns": [
          {"id": "contact-map-col", "width": "2/3", "components": [{"id": "contact-map", "type": "map", "address": "400 West Georgia Street, Vancouver, BC V6B 1A1", "height": "320px", "zoom": 15}]},
          {"id": "contact-portal-col", "width": "1/3", "components": [{"id": "contact-portal-card", "type": "card", "title": "Client Portal", "subtitle": "Private access", "content": "Use the portal for secure follow-up, shared documents, and client resources.", "link": "/portal", "linkText": "Open portal"}]}
        ]}
      ]
    }
  ]',
  7
);
