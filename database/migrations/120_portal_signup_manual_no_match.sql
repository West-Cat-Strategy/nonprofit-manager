-- Migration 120: Portal signup manual no-match resolution
-- Created: 2026-05-03
-- Description:
--   * stops public portal signup from auto-creating accountless contacts
--   * leaves no-match and duplicate-email signups pending for staff resolution

ALTER TABLE portal_signup_requests
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

UPDATE portal_signup_requests psr
SET account_id = c.account_id
FROM contacts c
WHERE c.id = psr.contact_id
  AND psr.account_id IS NULL
  AND c.account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_signup_requests_account_status
  ON portal_signup_requests(account_id, status, requested_at DESC);

DROP FUNCTION IF EXISTS public.portal_resolve_signup_request(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.portal_resolve_signup_request(
  portal_first_name TEXT,
  portal_last_name TEXT,
  portal_email TEXT,
  portal_phone TEXT DEFAULT NULL
) RETURNS TABLE (
  contact_id UUID,
  account_id UUID,
  resolution_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  matched_contact_count INTEGER := 0;
  matched_account_count INTEGER := 0;
  resolved_contact_id UUID;
  resolved_account_id UUID;
BEGIN
  SELECT
    COUNT(*)::integer,
    COUNT(DISTINCT c.account_id)::integer,
    MIN(c.account_id)
  INTO matched_contact_count, matched_account_count, resolved_account_id
  FROM public.contacts c
  WHERE lower(c.email) = lower(portal_email)
    AND c.account_id IS NOT NULL;

  IF matched_contact_count = 1 THEN
    SELECT c.id, c.account_id
    INTO resolved_contact_id, resolved_account_id
    FROM public.contacts c
    WHERE lower(c.email) = lower(portal_email)
      AND c.account_id IS NOT NULL
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id ASC
    LIMIT 1;

    RETURN QUERY
    SELECT resolved_contact_id, resolved_account_id, 'resolved'::TEXT;
    RETURN;
  END IF;

  IF matched_contact_count = 0 THEN
    SELECT MIN(a.id)
    INTO resolved_account_id
    FROM public.accounts a
    WHERE COALESCE(a.is_active, TRUE)
    HAVING COUNT(*) = 1;

    IF resolved_account_id IS NOT NULL THEN
      INSERT INTO public.contacts (
        account_id,
        first_name,
        last_name,
        email,
        phone,
        created_by,
        modified_by
      ) VALUES (
        resolved_account_id,
        portal_first_name,
        portal_last_name,
        portal_email,
        NULLIF(portal_phone, ''),
        NULL,
        NULL
      )
      RETURNING id INTO resolved_contact_id;

      RETURN QUERY
      SELECT resolved_contact_id, resolved_account_id, 'needs_contact_resolution'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF matched_account_count = 1 THEN
    RETURN QUERY
    SELECT NULL::UUID, resolved_account_id, 'needs_contact_resolution'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT NULL::UUID, NULL::UUID, 'needs_contact_resolution'::TEXT;
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
