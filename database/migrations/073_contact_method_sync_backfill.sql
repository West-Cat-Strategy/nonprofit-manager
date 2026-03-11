-- Migration 073: Contact method sync backfill
-- Backfills structured email/phone records from legacy contact summary columns
-- and then refreshes the summary columns from the structured records.

INSERT INTO contact_email_addresses (
  contact_id,
  email_address,
  label,
  is_primary,
  created_at,
  updated_at,
  created_by,
  modified_by
)
SELECT
  c.id,
  LOWER(BTRIM(c.email)),
  'personal',
  NOT EXISTS (
    SELECT 1
    FROM contact_email_addresses AS existing_primary
    WHERE existing_primary.contact_id = c.id
      AND existing_primary.is_primary = true
  ),
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  c.created_by,
  c.modified_by
FROM contacts AS c
WHERE c.email IS NOT NULL
  AND BTRIM(c.email) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM contact_email_addresses AS existing_email
    WHERE existing_email.contact_id = c.id
      AND LOWER(existing_email.email_address) = LOWER(BTRIM(c.email))
  );

INSERT INTO contact_phone_numbers (
  contact_id,
  phone_number,
  label,
  is_primary,
  created_at,
  updated_at,
  created_by,
  modified_by
)
SELECT
  c.id,
  BTRIM(c.phone),
  'other',
  NOT EXISTS (
    SELECT 1
    FROM contact_phone_numbers AS existing_primary
    WHERE existing_primary.contact_id = c.id
      AND existing_primary.is_primary = true
  ),
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  c.created_by,
  c.modified_by
FROM contacts AS c
WHERE c.phone IS NOT NULL
  AND BTRIM(c.phone) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM contact_phone_numbers AS existing_phone
    WHERE existing_phone.contact_id = c.id
      AND existing_phone.phone_number = BTRIM(c.phone)
  );

INSERT INTO contact_phone_numbers (
  contact_id,
  phone_number,
  label,
  is_primary,
  created_at,
  updated_at,
  created_by,
  modified_by
)
SELECT
  c.id,
  BTRIM(c.mobile_phone),
  'mobile',
  NOT EXISTS (
    SELECT 1
    FROM contact_phone_numbers AS existing_primary
    WHERE existing_primary.contact_id = c.id
      AND existing_primary.is_primary = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM contact_phone_numbers AS existing_non_mobile
    WHERE existing_non_mobile.contact_id = c.id
      AND existing_non_mobile.label <> 'mobile'
  ),
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  c.created_by,
  c.modified_by
FROM contacts AS c
WHERE c.mobile_phone IS NOT NULL
  AND BTRIM(c.mobile_phone) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM contact_phone_numbers AS existing_mobile
    WHERE existing_mobile.contact_id = c.id
      AND existing_mobile.phone_number = BTRIM(c.mobile_phone)
  );

UPDATE contacts AS c
SET email = (
      SELECT ce.email_address
      FROM contact_email_addresses AS ce
      WHERE ce.contact_id = c.id
      ORDER BY ce.is_primary DESC, ce.created_at ASC, ce.id ASC
      LIMIT 1
    ),
    phone = (
      SELECT cp.phone_number
      FROM contact_phone_numbers AS cp
      WHERE cp.contact_id = c.id
        AND cp.label <> 'mobile'
      ORDER BY cp.is_primary DESC, cp.created_at ASC, cp.id ASC
      LIMIT 1
    ),
    mobile_phone = (
      SELECT cp.phone_number
      FROM contact_phone_numbers AS cp
      WHERE cp.contact_id = c.id
        AND cp.label = 'mobile'
      ORDER BY cp.is_primary DESC, cp.created_at ASC, cp.id ASC
      LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM contact_email_addresses AS ce
  WHERE ce.contact_id = c.id
)
OR EXISTS (
  SELECT 1
  FROM contact_phone_numbers AS cp
  WHERE cp.contact_id = c.id
);
