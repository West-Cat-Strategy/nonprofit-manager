-- Allow Mautic-imported newsletter content to mirror into website_entries.

ALTER TABLE website_entries
  DROP CONSTRAINT IF EXISTS website_entries_source_check;

ALTER TABLE website_entries
  ADD CONSTRAINT website_entries_source_check
  CHECK (source IN ('native', 'mailchimp', 'mautic'));
