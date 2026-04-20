-- Migration 100: portal public signup contact bridge
-- Created: 2026-04-19
-- Description:
--   * allows the public portal signup flow to resolve or create a contact
--     without weakening the broader contacts RLS contract

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
BEGIN
  SELECT c.id
  INTO resolved_contact_id
  FROM public.contacts c
  WHERE lower(c.email) = lower(portal_email)
  ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id ASC
  LIMIT 1;

  IF resolved_contact_id IS NOT NULL THEN
    RETURN resolved_contact_id;
  END IF;

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

  RETURN resolved_contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_resolve_signup_contact_id(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

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
        'GRANT EXECUTE ON FUNCTION public.portal_resolve_signup_contact_id(TEXT, TEXT, TEXT, TEXT) TO %I',
        target_role
      );
    END IF;
  END LOOP;
END
$$;
