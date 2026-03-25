/**
 * SQL Constants for Donation Service
 */

export const DONATION_TAX_RECEIPT_JOIN = `
  LEFT JOIN (
    SELECT DISTINCT ON (tri.donation_id)
      tri.donation_id,
      tr.id as official_tax_receipt_id,
      tr.receipt_number as official_tax_receipt_number,
      tr.kind as official_tax_receipt_kind,
      tr.issue_date::text as official_tax_receipt_issued_at
    FROM tax_receipt_items tri
    INNER JOIN tax_receipts tr ON tr.id = tri.receipt_id
    WHERE tri.official_coverage = true
    ORDER BY tri.donation_id, tr.created_at DESC
  ) otr ON d.id = otr.donation_id
`;

export const DONATION_SELECT_COLUMNS = `
  d.id as donation_id,
  d.donation_number,
  d.account_id,
  d.contact_id,
  d.recurring_plan_id,
  d.amount,
  d.currency,
  d.donation_date,
  d.payment_method,
  d.payment_status,
  d.transaction_id,
  d.stripe_subscription_id,
  d.stripe_invoice_id,
  d.campaign_name,
  d.designation,
  d.is_recurring,
  d.recurring_frequency,
  rdp.status as recurring_plan_status,
  d.notes,
  d.receipt_sent,
  d.receipt_sent_date,
  otr.official_tax_receipt_id,
  otr.official_tax_receipt_number,
  otr.official_tax_receipt_kind,
  otr.official_tax_receipt_issued_at,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.modified_by,
  a.account_name,
  CONCAT(c.first_name, ' ', c.last_name) as contact_name
`;

export const DONATION_RETURNING_COLUMNS = `
  id as donation_id,
  donation_number,
  account_id,
  contact_id,
  recurring_plan_id,
  amount,
  currency,
  donation_date,
  payment_method,
  payment_status,
  transaction_id,
  stripe_subscription_id,
  stripe_invoice_id,
  campaign_name,
  designation,
  is_recurring,
  recurring_frequency,
  (SELECT status FROM recurring_donation_plans WHERE id = donations.recurring_plan_id) as recurring_plan_status,
  notes,
  receipt_sent,
  receipt_sent_date,
  (
    SELECT tr.id
    FROM tax_receipt_items tri
    INNER JOIN tax_receipts tr ON tr.id = tri.receipt_id
    WHERE tri.donation_id = donations.id
      AND tri.official_coverage = true
    ORDER BY tr.created_at DESC
    LIMIT 1
  ) as official_tax_receipt_id,
  (
    SELECT tr.receipt_number
    FROM tax_receipt_items tri
    INNER JOIN tax_receipts tr ON tr.id = tri.receipt_id
    WHERE tri.donation_id = donations.id
      AND tri.official_coverage = true
    ORDER BY tr.created_at DESC
    LIMIT 1
  ) as official_tax_receipt_number,
  (
    SELECT tr.kind
    FROM tax_receipt_items tri
    INNER JOIN tax_receipts tr ON tr.id = tri.receipt_id
    WHERE tri.donation_id = donations.id
      AND tri.official_coverage = true
      AND tr.kind <> 'annual_summary_reprint'
    ORDER BY tr.created_at DESC
    LIMIT 1
  ) as official_tax_receipt_kind,
  (
    SELECT tr.issue_date::text
    FROM tax_receipt_items tri
    INNER JOIN tax_receipts tr ON tr.id = tri.receipt_id
    WHERE tri.donation_id = donations.id
      AND tri.official_coverage = true
    ORDER BY tr.created_at DESC
    LIMIT 1
  ) as official_tax_receipt_issued_at,
  created_at,
  updated_at,
  created_by,
  modified_by
`;
