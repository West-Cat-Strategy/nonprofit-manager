import type { Pool } from 'pg';

export type DonationQueryValue = string | number | boolean | Date | null | string[];

export const addDonationOrganizationScope = (
  conditions: string[],
  params: DonationQueryValue[],
  paramCount: number,
  organizationId?: string | null,
  contactAlias = 'c'
): number => {
  if (!organizationId) {
    return paramCount;
  }

  conditions.push(`COALESCE(d.account_id, ${contactAlias}.account_id) = $${paramCount}`);
  params.push(organizationId);
  return paramCount + 1;
};

export const hasOfficialTaxReceiptCoverage = async (
  pool: Pool,
  donationId: string,
  organizationId?: string | null
): Promise<boolean> => {
  const params: DonationQueryValue[] = [donationId];
  const orgCondition = organizationId
    ? `AND COALESCE(d.account_id, c.account_id) = $2`
    : '';
  if (organizationId) {
    params.push(organizationId);
  }

  const result = await pool.query<{ receipt_id: string }>(
    `SELECT tri.receipt_id
     FROM tax_receipt_items tri
     INNER JOIN donations d ON d.id = tri.donation_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     WHERE tri.donation_id = $1
       AND tri.official_coverage = true
       ${orgCondition}
     LIMIT 1`,
    params
  );

  return result.rowCount ? result.rowCount > 0 : false;
};

export const resolveDonationOrganizationId = async (
  pool: Pool,
  input: { account_id?: string | null; contact_id?: string | null },
  organizationId?: string | null
): Promise<string | null> => {
  if (organizationId) return organizationId;
  if (input.account_id) return input.account_id;
  if (!input.contact_id) return null;

  const result = await pool.query<{ account_id: string | null }>(
    `SELECT account_id FROM contacts WHERE id = $1 LIMIT 1`,
    [input.contact_id]
  );
  return result.rows[0]?.account_id ?? null;
};

export const assertDonationTargetWithinOrganization = async (
  pool: Pool,
  input: { account_id?: string | null; contact_id?: string | null },
  organizationId?: string | null
): Promise<void> => {
  if (!organizationId) {
    return;
  }

  if (input.account_id && input.account_id !== organizationId) {
    throw Object.assign(new Error('Donation account is outside the active organization'), {
      statusCode: 403,
      code: 'forbidden',
    });
  }

  if (!input.contact_id) {
    return;
  }

  const result = await pool.query<{ account_id: string | null }>(
    `SELECT account_id FROM contacts WHERE id = $1 LIMIT 1`,
    [input.contact_id]
  );
  const contactAccountId = result.rows[0]?.account_id ?? null;
  if (contactAccountId !== organizationId) {
    throw Object.assign(new Error('Donation contact is outside the active organization'), {
      statusCode: 403,
      code: 'forbidden',
    });
  }
};
