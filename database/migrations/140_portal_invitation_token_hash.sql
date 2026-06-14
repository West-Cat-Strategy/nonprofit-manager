-- Migration 140: Portal invitation token hash
-- Created: 2026-06-13
-- Description:
--   * stores portal invitation lookup tokens as SHA-256 hashes
--   * backfills existing invitation hashes from legacy cleartext tokens
--   * keeps the legacy token column nullable for rollback/compatibility only
--   * records explicit portal-signup ambiguity states for public-intake audit

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE portal_invitations
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);

UPDATE portal_invitations
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

ALTER TABLE portal_invitations
  ALTER COLUMN token DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_invitations_token_hash
  ON portal_invitations(token_hash)
  WHERE token_hash IS NOT NULL;

COMMENT ON COLUMN portal_invitations.token IS
  'Legacy cleartext invitation token retained nullable for existing compatibility only; new rows store token_hash and leave this null';

COMMENT ON COLUMN portal_invitations.token_hash IS
  'SHA-256 hash of the portal invitation token used for validation and acceptance lookup';

ALTER TABLE public_intake_resolutions
  DROP CONSTRAINT IF EXISTS public_intake_resolutions_ambiguity_state_check;

ALTER TABLE public_intake_resolutions
  ADD CONSTRAINT public_intake_resolutions_ambiguity_state_check CHECK (
    ambiguity_state IN (
      'none',
      'no_match',
      'single_match',
      'multiple_matches',
      'single_tenant_no_match_created',
      'account_ambiguous'
    )
  );

DROP FUNCTION IF EXISTS public.portal_resolve_signup_request(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.portal_resolve_signup_request(
  portal_first_name TEXT,
  portal_last_name TEXT,
  portal_email TEXT,
  portal_phone TEXT DEFAULT NULL
) RETURNS TABLE (
  contact_id UUID,
  account_id UUID,
  resolution_status TEXT,
  ambiguity_state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  matched_contact_count INTEGER := 0;
  matched_account_count INTEGER := 0;
  active_account_count INTEGER := 0;
  resolved_contact_id UUID;
  resolved_account_id UUID;
BEGIN
  SELECT
    COUNT(*)::integer,
    COUNT(DISTINCT c.account_id)::integer
  INTO matched_contact_count, matched_account_count
  FROM public.contacts c
  WHERE lower(c.email) = lower(portal_email)
    AND c.account_id IS NOT NULL;

  SELECT c.account_id
  INTO resolved_account_id
  FROM public.contacts c
  WHERE lower(c.email) = lower(portal_email)
    AND c.account_id IS NOT NULL
  ORDER BY c.account_id::TEXT ASC
  LIMIT 1;

  IF matched_contact_count = 1 THEN
    SELECT c.id, c.account_id
    INTO resolved_contact_id, resolved_account_id
    FROM public.contacts c
    WHERE lower(c.email) = lower(portal_email)
      AND c.account_id IS NOT NULL
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id ASC
    LIMIT 1;

    RETURN QUERY
    SELECT resolved_contact_id, resolved_account_id, 'resolved'::TEXT, 'single_match'::TEXT;
    RETURN;
  END IF;

  IF matched_contact_count = 0 THEN
    SELECT COUNT(*)::integer
    INTO active_account_count
    FROM public.accounts active_accounts
    WHERE COALESCE(active_accounts.is_active, TRUE);

    SELECT a.id
    INTO resolved_account_id
    FROM public.accounts a
    WHERE COALESCE(a.is_active, TRUE)
      AND active_account_count = 1
    ORDER BY a.id::TEXT ASC
    LIMIT 1;

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
      SELECT
        resolved_contact_id,
        resolved_account_id,
        'needs_contact_resolution'::TEXT,
        'single_tenant_no_match_created'::TEXT;
      RETURN;
    END IF;

    IF active_account_count = 0 THEN
      RETURN QUERY
      SELECT NULL::UUID, NULL::UUID, 'needs_contact_resolution'::TEXT, 'no_match'::TEXT;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT NULL::UUID, NULL::UUID, 'needs_contact_resolution'::TEXT, 'account_ambiguous'::TEXT;
    RETURN;
  END IF;

  IF matched_account_count = 1 THEN
    RETURN QUERY
    SELECT NULL::UUID, resolved_account_id, 'needs_contact_resolution'::TEXT, 'multiple_matches'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT NULL::UUID, NULL::UUID, 'needs_contact_resolution'::TEXT, 'account_ambiguous'::TEXT;
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
