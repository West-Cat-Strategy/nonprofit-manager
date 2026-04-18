-- CBIS case visibility recovery helper
-- Usage (psql):
--   \set organization_id '00000000-0000-0000-0000-000000000000'
--   \set contact_ids '''{11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222}'''
--   \set created_after '''2026-04-01T00:00:00Z'''
--   \i scripts/support/cbis-case-visibility-repair.sql
--
-- Optional targeted repair:
--   \set case_ids '''{33333333-3333-3333-3333-333333333333}'''
--   BEGIN;
--   -- uncomment the repair statement below after reviewing the audit result
--   ROLLBACK;
--
-- This helper is intentionally scoped for support-led recovery after the CBIS
-- case visibility hotfix. Audit first, then repair only the reported rows.

WITH scoped_contacts AS (
  SELECT
    c.id AS contact_id,
    c.account_id AS contact_account_id,
    c.first_name,
    c.last_name
  FROM contacts c
  WHERE c.id = ANY(:contact_ids::uuid[])
),
candidate_cases AS (
  SELECT
    cs.id AS case_id,
    cs.case_number,
    cs.title,
    cs.contact_id,
    cs.account_id AS case_account_id,
    sc.contact_account_id,
    cs.created_at,
    EXISTS(
      SELECT 1
      FROM case_notes cn
      WHERE cn.case_id = cs.id
    ) AS has_case_notes,
    COALESCE(cs.account_id, sc.contact_account_id) = :organization_id::uuid AS case_scope_visible,
    CONCAT_WS(' ', sc.first_name, sc.last_name) AS contact_name
  FROM cases cs
  INNER JOIN scoped_contacts sc
    ON sc.contact_id = cs.contact_id
  WHERE cs.created_at >= :created_after::timestamptz
)
SELECT
  case_id,
  case_number,
  title,
  contact_id,
  contact_name,
  case_account_id,
  contact_account_id,
  created_at,
  has_case_notes,
  case_scope_visible,
  CASE
    WHEN case_scope_visible THEN 'visible to case catalog/detail'
    ELSE 'hidden from case catalog/detail'
  END AS case_scope_state
FROM candidate_cases
ORDER BY created_at DESC, case_number ASC;

-- Uncomment this targeted repair only after the audit query above confirms the
-- exact rows to recover for the affected organization.
--
-- UPDATE cases
-- SET
--   account_id = :organization_id::uuid,
--   updated_at = NOW()
-- WHERE id = ANY(:case_ids::uuid[])
--   AND contact_id = ANY(:contact_ids::uuid[])
--   AND created_at >= :created_after::timestamptz
-- RETURNING id, case_number, title, account_id, updated_at;
