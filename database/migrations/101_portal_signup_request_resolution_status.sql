-- Migration 101: portal signup request resolution status
-- Created: 2026-04-19
-- Description:
--   * stores submitted signup identity on portal_signup_requests
--   * upgrades the public signup bridge to require manual resolution for duplicate-email matches
--   * snapshots existing ambiguous pending/approved signup requests for manual follow-up

ALTER TABLE portal_signup_requests
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS resolution_status VARCHAR(40) NOT NULL DEFAULT 'resolved';

ALTER TABLE portal_signup_requests
  DROP CONSTRAINT IF EXISTS portal_signup_resolution_status_check;

ALTER TABLE portal_signup_requests
  ADD CONSTRAINT portal_signup_resolution_status_check
  CHECK (resolution_status IN ('resolved', 'needs_contact_resolution'));

COMMENT ON COLUMN portal_signup_requests.first_name IS
  'Submitted signup first name captured at request time';
COMMENT ON COLUMN portal_signup_requests.last_name IS
  'Submitted signup last name captured at request time';
COMMENT ON COLUMN portal_signup_requests.phone IS
  'Submitted signup phone captured at request time';
COMMENT ON COLUMN portal_signup_requests.resolution_status IS
  'Whether the signup request already resolved to a single contact or needs manual contact selection';

UPDATE portal_signup_requests psr
SET first_name = COALESCE(psr.first_name, c.first_name),
    last_name = COALESCE(psr.last_name, c.last_name),
    phone = COALESCE(psr.phone, c.phone)
FROM contacts c
WHERE c.id = psr.contact_id
  AND (psr.first_name IS NULL OR psr.last_name IS NULL OR psr.phone IS NULL);

CREATE TABLE IF NOT EXISTS portal_signup_request_duplicate_contact_audit (
  request_id UUID PRIMARY KEY,
  request_status VARCHAR(20) NOT NULL,
  request_email VARCHAR(255) NOT NULL,
  request_contact_id UUID,
  request_resolution_status VARCHAR(40) NOT NULL,
  request_first_name VARCHAR(100),
  request_last_name VARCHAR(100),
  request_phone VARCHAR(50),
  portal_user_id UUID,
  portal_user_contact_id UUID,
  matched_contact_count INTEGER NOT NULL,
  matched_contact_ids UUID[] NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE portal_signup_request_duplicate_contact_audit IS
  'One-time audit snapshot created by migration 101 for signup requests whose email matched multiple contacts';

WITH duplicate_matches AS (
  SELECT
    psr.id AS request_id,
    psr.status AS request_status,
    psr.email AS request_email,
    psr.contact_id AS request_contact_id,
    psr.resolution_status AS request_resolution_status,
    psr.first_name AS request_first_name,
    psr.last_name AS request_last_name,
    psr.phone AS request_phone,
    pu.id AS portal_user_id,
    pu.contact_id AS portal_user_contact_id,
    COUNT(c.id)::integer AS matched_contact_count,
    ARRAY_AGG(
      c.id
      ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id ASC
    ) AS matched_contact_ids
  FROM portal_signup_requests psr
  INNER JOIN contacts c
    ON lower(c.email) = lower(psr.email)
  LEFT JOIN portal_users pu
    ON lower(pu.email) = lower(psr.email)
  WHERE psr.status IN ('pending', 'approved')
  GROUP BY
    psr.id,
    psr.status,
    psr.email,
    psr.contact_id,
    psr.resolution_status,
    psr.first_name,
    psr.last_name,
    psr.phone,
    pu.id,
    pu.contact_id
  HAVING COUNT(c.id) > 1
)
INSERT INTO portal_signup_request_duplicate_contact_audit (
  request_id,
  request_status,
  request_email,
  request_contact_id,
  request_resolution_status,
  request_first_name,
  request_last_name,
  request_phone,
  portal_user_id,
  portal_user_contact_id,
  matched_contact_count,
  matched_contact_ids
)
SELECT
  request_id,
  request_status,
  request_email,
  request_contact_id,
  request_resolution_status,
  request_first_name,
  request_last_name,
  request_phone,
  portal_user_id,
  portal_user_contact_id,
  matched_contact_count,
  matched_contact_ids
FROM duplicate_matches
ON CONFLICT (request_id) DO NOTHING;

WITH pending_duplicate_requests AS (
  SELECT psr.id
  FROM portal_signup_requests psr
  INNER JOIN contacts c
    ON lower(c.email) = lower(psr.email)
  WHERE psr.status = 'pending'
  GROUP BY psr.id
  HAVING COUNT(c.id) > 1
)
UPDATE portal_signup_requests psr
SET contact_id = NULL,
    resolution_status = 'needs_contact_resolution'
FROM pending_duplicate_requests pending_duplicates
WHERE psr.id = pending_duplicates.id;

CREATE OR REPLACE FUNCTION public.portal_resolve_signup_request(
  portal_first_name TEXT,
  portal_last_name TEXT,
  portal_email TEXT,
  portal_phone TEXT DEFAULT NULL
) RETURNS TABLE (
  contact_id UUID,
  resolution_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  matched_contact_count INTEGER := 0;
  resolved_contact_id UUID;
BEGIN
  SELECT COUNT(*)::integer
  INTO matched_contact_count
  FROM public.contacts c
  WHERE lower(c.email) = lower(portal_email);

  IF matched_contact_count = 0 THEN
    INSERT INTO public.contacts (
      first_name,
      last_name,
      email,
      phone,
      created_by,
      modified_by
    ) VALUES (
      portal_first_name,
      portal_last_name,
      portal_email,
      NULLIF(portal_phone, ''),
      NULL,
      NULL
    )
    RETURNING id INTO resolved_contact_id;

    RETURN QUERY
    SELECT resolved_contact_id, 'resolved'::TEXT;
    RETURN;
  END IF;

  IF matched_contact_count = 1 THEN
    SELECT c.id
    INTO resolved_contact_id
    FROM public.contacts c
    WHERE lower(c.email) = lower(portal_email)
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id ASC
    LIMIT 1;

    RETURN QUERY
    SELECT resolved_contact_id, 'resolved'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT NULL::UUID, 'needs_contact_resolution'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_resolve_signup_request(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

DO $$
DECLARE
  target_role TEXT;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['nonprofit_app_user', 'nonprofit_app_user_prod']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = target_role
    ) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.portal_resolve_signup_request(TEXT, TEXT, TEXT, TEXT) TO %I',
        target_role
      );
    END IF;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.portal_resolve_signup_contact_id(
  portal_first_name TEXT,
  portal_last_name TEXT,
  portal_email TEXT,
  portal_phone TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resolved_contact_id UUID;
  resolved_request_status TEXT;
BEGIN
  SELECT resolution.contact_id, resolution.resolution_status
  INTO resolved_contact_id, resolved_request_status
  FROM public.portal_resolve_signup_request(
    portal_first_name,
    portal_last_name,
    portal_email,
    portal_phone
  ) AS resolution;

  IF resolved_request_status <> 'resolved' THEN
    RETURN NULL;
  END IF;

  RETURN resolved_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_get_profile(
  portal_user_id UUID
) RETURNS TABLE (
  contact_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  preferred_contact_method TEXT,
  pronouns TEXT,
  gender TEXT,
  phn_encrypted TEXT,
  profile_picture TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id AS contact_id,
    c.first_name::TEXT,
    c.last_name::TEXT,
    c.email::TEXT,
    c.phone::TEXT,
    c.mobile_phone::TEXT,
    c.address_line1::TEXT,
    c.address_line2::TEXT,
    c.city::TEXT,
    c.state_province::TEXT,
    c.postal_code::TEXT,
    c.country::TEXT,
    c.preferred_contact_method::TEXT,
    c.pronouns::TEXT,
    c.gender::TEXT,
    c.phn_encrypted::TEXT,
    to_jsonb(c) ->> 'profile_picture' AS profile_picture
  FROM public.contacts c
  INNER JOIN public.portal_users pu
    ON pu.contact_id = c.id
  WHERE pu.id = portal_user_id
    AND pu.status = 'active'
    AND pu.is_verified = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_profile(
  portal_user_id UUID,
  updates JSONB
) RETURNS TABLE (
  contact_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  preferred_contact_method TEXT,
  pronouns TEXT,
  gender TEXT,
  phn_encrypted TEXT,
  profile_picture TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resolved_contact_id UUID;
  has_profile_picture BOOLEAN := FALSE;
  update_sql TEXT;
BEGIN
  SELECT c.id
  INTO resolved_contact_id
  FROM public.contacts c
  INNER JOIN public.portal_users pu
    ON pu.contact_id = c.id
  WHERE pu.id = portal_user_id
    AND pu.status = 'active'
    AND pu.is_verified = true
  LIMIT 1;

  IF resolved_contact_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'profile_picture'
  )
  INTO has_profile_picture;

  update_sql := '
    UPDATE public.contacts c
    SET first_name = CASE WHEN $2 ? ''first_name'' THEN $2->>''first_name'' ELSE c.first_name END,
        last_name = CASE WHEN $2 ? ''last_name'' THEN $2->>''last_name'' ELSE c.last_name END,
        email = CASE WHEN $2 ? ''email'' THEN $2->>''email'' ELSE c.email END,
        phone = CASE WHEN $2 ? ''phone'' THEN $2->>''phone'' ELSE c.phone END,
        mobile_phone = CASE WHEN $2 ? ''mobile_phone'' THEN $2->>''mobile_phone'' ELSE c.mobile_phone END,
        address_line1 = CASE WHEN $2 ? ''address_line1'' THEN $2->>''address_line1'' ELSE c.address_line1 END,
        address_line2 = CASE WHEN $2 ? ''address_line2'' THEN $2->>''address_line2'' ELSE c.address_line2 END,
        city = CASE WHEN $2 ? ''city'' THEN $2->>''city'' ELSE c.city END,
        state_province = CASE WHEN $2 ? ''state_province'' THEN $2->>''state_province'' ELSE c.state_province END,
        postal_code = CASE WHEN $2 ? ''postal_code'' THEN $2->>''postal_code'' ELSE c.postal_code END,
        country = CASE WHEN $2 ? ''country'' THEN $2->>''country'' ELSE c.country END,
        preferred_contact_method = CASE WHEN $2 ? ''preferred_contact_method'' THEN $2->>''preferred_contact_method'' ELSE c.preferred_contact_method END,
        pronouns = CASE WHEN $2 ? ''pronouns'' THEN $2->>''pronouns'' ELSE c.pronouns END,
        gender = CASE WHEN $2 ? ''gender'' THEN $2->>''gender'' ELSE c.gender END,
        phn_encrypted = CASE WHEN $2 ? ''phn_encrypted'' THEN $2->>''phn_encrypted'' ELSE c.phn_encrypted END,';

  IF has_profile_picture THEN
    update_sql := update_sql || '
        profile_picture = CASE WHEN $2 ? ''profile_picture'' THEN $2->>''profile_picture'' ELSE c.profile_picture END,';
  END IF;

  update_sql := update_sql || '
        updated_at = NOW(),
        modified_by = NULL
    WHERE c.id = $1
    RETURNING
      c.id AS contact_id,
      c.first_name::TEXT,
      c.last_name::TEXT,
      c.email::TEXT,
      c.phone::TEXT,
      c.mobile_phone::TEXT,
      c.address_line1::TEXT,
      c.address_line2::TEXT,
      c.city::TEXT,
      c.state_province::TEXT,
      c.postal_code::TEXT,
      c.country::TEXT,
      c.preferred_contact_method::TEXT,
      c.pronouns::TEXT,
      c.gender::TEXT,
      c.phn_encrypted::TEXT,
      to_jsonb(c) ->> ''profile_picture'' AS profile_picture';

  RETURN QUERY EXECUTE update_sql USING resolved_contact_id, updates;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_get_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_update_profile(UUID, JSONB) FROM PUBLIC;

DO $$
DECLARE
  target_role TEXT;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['nonprofit_app_user', 'nonprofit_app_user_prod']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = target_role
    ) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.portal_get_profile(UUID) TO %I',
        target_role
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.portal_update_profile(UUID, JSONB) TO %I',
        target_role
      );
    END IF;
  END LOOP;
END
$$;
