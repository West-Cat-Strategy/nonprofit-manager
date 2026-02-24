import pool from '@config/database';

export interface PortalCaseContext {
  case_id: string;
  case_number: string;
  case_title: string;
  status_id: string;
  status_name: string;
  status_type: string;
  updated_at: string;
  assigned_to: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  pointperson_email: string | null;
  is_messageable: boolean;
  is_default: boolean;
}

export interface PortalPointpersonContext {
  default_case_id: string | null;
  default_pointperson_user_id: string | null;
  cases: PortalCaseContext[];
}

const ACTIVE_STATUS_TYPES = ['closed', 'cancelled'];

export const getActiveCaseContextsForContact = async (
  contactId: string
): Promise<PortalCaseContext[]> => {
  const result = await pool.query(
    `SELECT
      c.id AS case_id,
      c.case_number,
      c.title AS case_title,
      c.status_id,
      cs.name AS status_name,
      cs.status_type,
      c.updated_at,
      c.assigned_to,
      u.first_name AS pointperson_first_name,
      u.last_name AS pointperson_last_name,
      u.email AS pointperson_email
     FROM cases c
     JOIN case_statuses cs ON cs.id = c.status_id
     LEFT JOIN users u ON u.id = c.assigned_to
     WHERE c.contact_id = $1
       AND c.client_viewable = true
       AND cs.status_type NOT IN ('closed', 'cancelled')
     ORDER BY c.updated_at DESC, c.created_at DESC`,
    [contactId]
  );

  const rows = result.rows as Array<Omit<PortalCaseContext, 'is_messageable' | 'is_default'>>;
  const defaultCase = rows.find((row) => row.assigned_to !== null) || null;

  return rows.map((row) => ({
    ...row,
    is_messageable: row.assigned_to !== null,
    is_default: defaultCase ? row.case_id === defaultCase.case_id : false,
  }));
};

export const getPortalPointpersonContext = async (
  contactId: string
): Promise<PortalPointpersonContext> => {
  const cases = await getActiveCaseContextsForContact(contactId);
  const defaultCase = cases.find((entry) => entry.is_default) || null;

  return {
    default_case_id: defaultCase?.case_id || null,
    default_pointperson_user_id: defaultCase?.assigned_to || null,
    cases,
  };
};

export interface ResolvedPortalCaseSelection {
  selected_case_id: string | null;
  selected_pointperson_user_id: string | null;
  selected_case: PortalCaseContext | null;
  cases: PortalCaseContext[];
}

export const resolvePortalCaseSelection = async (
  contactId: string,
  caseId?: string | null
): Promise<ResolvedPortalCaseSelection> => {
  const cases = await getActiveCaseContextsForContact(contactId);

  if (cases.length === 0) {
    return {
      selected_case_id: null,
      selected_pointperson_user_id: null,
      selected_case: null,
      cases,
    };
  }

  const defaultCase = cases.find((entry) => entry.is_default) || cases[0];

  if (!caseId) {
    return {
      selected_case_id: defaultCase.case_id,
      selected_pointperson_user_id: defaultCase.assigned_to,
      selected_case: defaultCase,
      cases,
    };
  }

  const requestedCase = cases.find((entry) => entry.case_id === caseId);
  if (!requestedCase) {
    throw new Error('Selected case is not available for this portal user');
  }

  return {
    selected_case_id: requestedCase.case_id,
    selected_pointperson_user_id: requestedCase.assigned_to,
    selected_case: requestedCase,
    cases,
  };
};

export const ensureCaseIsPortalAccessible = async (
  contactId: string,
  caseId: string
): Promise<PortalCaseContext | null> => {
  const result = await pool.query(
    `SELECT
      c.id AS case_id,
      c.case_number,
      c.title AS case_title,
      c.status_id,
      cs.name AS status_name,
      cs.status_type,
      c.updated_at,
      c.assigned_to,
      u.first_name AS pointperson_first_name,
      u.last_name AS pointperson_last_name,
      u.email AS pointperson_email
     FROM cases c
     JOIN case_statuses cs ON cs.id = c.status_id
     LEFT JOIN users u ON u.id = c.assigned_to
     WHERE c.id = $1
       AND c.contact_id = $2
       AND c.client_viewable = true`,
    [caseId, contactId]
  );

  const row = result.rows[0] as Omit<PortalCaseContext, 'is_messageable' | 'is_default'> | undefined;
  if (!row) {
    return null;
  }

  const isActive = !ACTIVE_STATUS_TYPES.includes(row.status_type);
  return {
    ...row,
    is_messageable: isActive && row.assigned_to !== null,
    is_default: false,
  };
};
