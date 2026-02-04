-- Seed theme color palettes and font pairings

INSERT INTO theme_color_palettes (name, description, colors, is_system, is_active)
VALUES
  (
    'Nonprofit Blue',
    'Trustworthy blue palette for nonprofits',
    '{
      "primary": "#2563eb",
      "secondary": "#1e40af",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#1e293b",
      "textMuted": "#64748b",
      "border": "#e2e8f0",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    }'::jsonb,
    true,
    true
  ),
  (
    'Community Green',
    'Warm, community-focused green palette',
    '{
      "primary": "#16a34a",
      "secondary": "#15803d",
      "accent": "#22c55e",
      "background": "#ffffff",
      "surface": "#f0fdf4",
      "text": "#14532d",
      "textMuted": "#3f6212",
      "border": "#dcfce7",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    }'::jsonb,
    true,
    true
  ),
  (
    'Impact Orange',
    'Bold palette for impact stories and campaigns',
    '{
      "primary": "#ea580c",
      "secondary": "#c2410c",
      "accent": "#f97316",
      "background": "#ffffff",
      "surface": "#fff7ed",
      "text": "#7c2d12",
      "textMuted": "#9a3412",
      "border": "#fed7aa",
      "error": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    }'::jsonb,
    true,
    true
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO theme_font_pairings (
  name,
  description,
  heading_font,
  body_font,
  accent_font,
  heading_weights,
  body_weights,
  font_urls,
  is_system,
  is_active
)
VALUES
  (
    'Modern Sans',
    'Clean, readable pairing for modern nonprofits',
    'Inter, system-ui, sans-serif',
    'Inter, system-ui, sans-serif',
    'Inter, system-ui, sans-serif',
    ARRAY['600', '700'],
    ARRAY['400', '500', '600'],
    ARRAY[]::text[],
    true,
    true
  ),
  (
    'Serif Trust',
    'Serif headings with sans body for credibility',
    'Playfair Display, serif',
    'Source Sans Pro, system-ui, sans-serif',
    'Playfair Display, serif',
    ARRAY['600', '700'],
    ARRAY['400', '500', '600'],
    ARRAY[]::text[],
    true,
    true
  ),
  (
    'Friendly Rounded',
    'Approachable rounded type for community orgs',
    'Nunito, system-ui, sans-serif',
    'Nunito Sans, system-ui, sans-serif',
    'Nunito, system-ui, sans-serif',
    ARRAY['600', '700'],
    ARRAY['400', '500', '600'],
    ARRAY[]::text[],
    true,
    true
  )
ON CONFLICT (name) DO NOTHING;
