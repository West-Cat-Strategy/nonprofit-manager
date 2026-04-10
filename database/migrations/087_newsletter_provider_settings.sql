-- Migration 087: Newsletter provider settings

ALTER TABLE website_site_settings
  ADD COLUMN IF NOT EXISTS newsletter_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE website_site_settings
  ADD COLUMN IF NOT EXISTS mautic_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE website_site_settings
SET newsletter_config = jsonb_set(
  COALESCE(newsletter_config, '{}'::jsonb),
  '{provider}',
  to_jsonb(CASE
    WHEN mailchimp_config ? 'audienceId' AND NULLIF(mailchimp_config->>'audienceId', '') IS NOT NULL THEN 'mailchimp'
    ELSE 'mautic'
  END),
  true
)
WHERE COALESCE(newsletter_config->>'provider', '') = '';
