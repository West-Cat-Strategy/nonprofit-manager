import type { PoolClient } from 'pg';
import { encrypt } from '@utils/encryption';
import { CBIS_IMPORT_ENTITY_ORDER, getSchemaBundleVersion, type CbisImportEntityType, type CbisImportRow, type LoadedCbisImportBundle } from './cbisImportBundle';
import type { CbisImportEntityResult, DuplicateSafetyPlan, RunCbisImportOptions, Scalar } from './cbisImportTypes';
import { boolValue, intValue, jsonValue, listValue, numberValue, requiredText, requiredTextMax, requiredUuid, rowKey, targetIdColumnFor, text, textMax, uuid } from './cbisImportRowUtils';

const valuesFor = (columns: string[], row: Record<string, Scalar>): Scalar[] =>
  columns.map((column) => row[column] ?? null);

const upsertById = async (
  client: PoolClient,
  table: string,
  columns: string[],
  row: Record<string, Scalar>,
  updateColumns = columns.filter((column) => column !== 'id' && column !== 'created_at' && column !== 'created_by')
): Promise<void> => {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
  await client.query(
    `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updates}
    `,
    valuesFor(columns, row)
  );
};

const ensureCaseLookups = async (
  client: PoolClient,
  actorId: string,
  safeRows: Record<CbisImportEntityType, CbisImportRow[]>
): Promise<void> => {
  const caseTypes = new Map<string, string>();
  const caseStatuses = new Map<string, string>();

  for (const row of safeRows.cases) {
    caseTypes.set(requiredUuid(row, 'case_type_id'), text(row, 'case_type_name') ?? 'General Support');
    caseStatuses.set(requiredUuid(row, 'status_id'), text(row, 'status_name') ?? text(row, 'status') ?? 'Intake');
  }

  for (const row of safeRows.case_type_assignments) {
    caseTypes.set(requiredUuid(row, 'case_type_id'), text(row, 'case_type_name') ?? 'General Support');
  }

  const existingTypeRows = caseTypes.size
    ? await client.query<{ id: string; name: string }>(
        `
          SELECT id, name
          FROM case_types
          WHERE name = ANY($1::text[])
        `,
        [[...new Set(caseTypes.values())]]
      )
    : { rows: [] };
  const existingCaseTypesByName = new Map(existingTypeRows.rows.map((row) => [row.name, row.id]));
  const caseTypeIdRemap = new Map<string, string>();

  for (const [id, name] of caseTypes.entries()) {
    const existingId = existingCaseTypesByName.get(name);
    if (existingId) {
      caseTypeIdRemap.set(id, existingId);
      continue;
    }

    await client.query(
      `
        INSERT INTO case_types (id, name, description, is_active, requires_intake, created_by, modified_by)
        VALUES ($1, $2, 'Imported from CBIS prepared bundle', true, false, $3, $3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, modified_by = EXCLUDED.modified_by
      `,
      [id, name, actorId]
    );
  }

  if (caseTypeIdRemap.size > 0) {
    for (const row of [...safeRows.cases, ...safeRows.case_type_assignments]) {
      const mappedId = caseTypeIdRemap.get(row.case_type_id);
      if (mappedId) {
        row.case_type_id = mappedId;
      }
    }
  }

  const desiredStatusRows = [...caseStatuses.entries()].map(([id, name]) => ({
    id,
    name,
    statusType: name.toLowerCase().includes('closed') ? 'closed' : 'active',
  }));
  const existingStatusRows = desiredStatusRows.length
    ? await client.query<{ id: string; name: string; status_type: string }>(
        `
          SELECT DISTINCT ON (name, status_type) id, name, status_type
          FROM case_statuses
          WHERE (name, status_type) IN (
            SELECT desired.name, desired.status_type
            FROM UNNEST($1::text[], $2::text[]) AS desired(name, status_type)
          )
          ORDER BY name, status_type, sort_order ASC, created_at ASC
        `,
        [desiredStatusRows.map((row) => row.name), desiredStatusRows.map((row) => row.statusType)]
      )
    : { rows: [] };
  const existingStatusesByKey = new Map(
    existingStatusRows.rows.map((row) => [`${row.name}\u0000${row.status_type}`, row.id])
  );
  const caseStatusIdRemap = new Map<string, string>();

  for (const { id, name, statusType } of desiredStatusRows) {
    const existingId = existingStatusesByKey.get(`${name}\u0000${statusType}`);
    if (existingId) {
      caseStatusIdRemap.set(id, existingId);
      continue;
    }

    await client.query(
      `
        INSERT INTO case_statuses (id, name, status_type, description, sort_order, is_active)
        VALUES ($1, $2, $3, 'Imported from CBIS prepared bundle', 0, true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status_type = EXCLUDED.status_type
      `,
      [id, name, statusType]
    );
  }

  if (caseStatusIdRemap.size > 0) {
    for (const row of safeRows.cases) {
      const mappedId = caseStatusIdRemap.get(row.status_id);
      if (mappedId) {
        row.status_id = mappedId;
      }
    }
  }
};

const syncContactRoles = async (
  client: PoolClient,
  contactId: string,
  roles: string[],
  actorId: string
): Promise<void> => {
  if (roles.length === 0) {
    return;
  }
  for (const role of roles) {
    await client.query(
      `
        INSERT INTO contact_roles (name, description, is_system)
        VALUES ($1, 'Imported from CBIS prepared bundle', false)
        ON CONFLICT (name) DO NOTHING
      `,
      [role]
    );
  }
  await client.query(
    `
      INSERT INTO contact_role_assignments (contact_id, role_id, assigned_by)
      SELECT $1, cr.id, $3
      FROM contact_roles cr
      WHERE cr.name = ANY($2::text[])
      ON CONFLICT (contact_id, role_id) DO NOTHING
    `,
    [contactId, roles, actorId]
  );
};

export const importReadyRows = async (
  client: PoolClient,
  options: RunCbisImportOptions,
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  safetyPlan: DuplicateSafetyPlan
): Promise<void> => {
  await ensureCaseLookups(client, options.actorId, safetyPlan.safeRows);

  for (const row of safetyPlan.safeRows.accounts) {
    await upsertById(client, 'accounts', [
      'id',
      'account_number',
      'account_name',
      'account_type',
      'category',
      'email',
      'phone',
      'website',
      'description',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'tax_id',
      'is_active',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'account_id'),
      account_number: text(row, 'account_number'),
      account_name: requiredText(row, 'account_name'),
      account_type: text(row, 'account_type'),
      category: text(row, 'category'),
      email: text(row, 'email'),
      phone: text(row, 'phone'),
      website: text(row, 'website'),
      description: text(row, 'description'),
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      tax_id: text(row, 'tax_id'),
      is_active: boolValue(row, 'is_active') ?? true,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.accounts.imported += 1;
  }

  for (const row of safetyPlan.safeRows.contacts) {
    const contactId = requiredUuid(row, 'contact_id');
    await upsertById(client, 'contacts', [
      'id',
      'account_id',
      'first_name',
      'preferred_name',
      'last_name',
      'middle_name',
      'salutation',
      'suffix',
      'birth_date',
      'gender',
      'pronouns',
      'phn_encrypted',
      'email',
      'phone',
      'mobile_phone',
      'job_title',
      'department',
      'preferred_contact_method',
      'do_not_email',
      'do_not_phone',
      'do_not_text',
      'do_not_voicemail',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'no_fixed_address',
      'notes',
      'tags',
      'is_active',
      'created_by',
      'modified_by',
    ], {
      id: contactId,
      account_id: uuid(row, 'account_id'),
      first_name: requiredText(row, 'first_name'),
      preferred_name: text(row, 'preferred_name'),
      last_name: requiredText(row, 'last_name'),
      middle_name: text(row, 'middle_name'),
      salutation: text(row, 'salutation'),
      suffix: text(row, 'suffix'),
      birth_date: text(row, 'birth_date'),
      gender: text(row, 'gender'),
      pronouns: text(row, 'pronouns'),
      phn_encrypted: text(row, 'phn') ? encrypt(requiredText(row, 'phn')) : null,
      email: text(row, 'email'),
      phone: text(row, 'phone'),
      mobile_phone: text(row, 'mobile_phone'),
      job_title: text(row, 'job_title'),
      department: text(row, 'department'),
      preferred_contact_method: text(row, 'preferred_contact_method'),
      do_not_email: boolValue(row, 'do_not_email') ?? false,
      do_not_phone: boolValue(row, 'do_not_phone') ?? false,
      do_not_text: boolValue(row, 'do_not_text') ?? false,
      do_not_voicemail: boolValue(row, 'do_not_voicemail') ?? false,
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      no_fixed_address: boolValue(row, 'no_fixed_address') ?? false,
      notes: text(row, 'notes'),
      tags: listValue(row, 'tags'),
      is_active: boolValue(row, 'is_active') ?? true,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    await syncContactRoles(client, contactId, listValue(row, 'roles'), options.actorId);
    results.contacts.imported += 1;
  }

  for (const row of safetyPlan.safeRows.cases) {
    await upsertById(client, 'cases', [
      'id',
      'case_number',
      'contact_id',
      'account_id',
      'case_type_id',
      'status_id',
      'priority',
      'title',
      'description',
      'source',
      'referral_source',
      'intake_date',
      'opened_date',
      'closed_date',
      'due_date',
      'outcome',
      'outcome_notes',
      'closure_reason',
      'requires_followup',
      'followup_date',
      'tags',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'case_id'),
      case_number: requiredText(row, 'case_number'),
      contact_id: requiredUuid(row, 'contact_id'),
      account_id: uuid(row, 'account_id'),
      case_type_id: requiredUuid(row, 'case_type_id'),
      status_id: requiredUuid(row, 'status_id'),
      priority: text(row, 'priority') ?? 'medium',
      title: requiredText(row, 'title'),
      description: text(row, 'description'),
      source: text(row, 'source'),
      referral_source: text(row, 'referral_source'),
      intake_date: text(row, 'intake_date'),
      opened_date: text(row, 'opened_date'),
      closed_date: text(row, 'closed_date'),
      due_date: text(row, 'due_date'),
      outcome: text(row, 'outcome'),
      outcome_notes: text(row, 'outcome_notes'),
      closure_reason: text(row, 'closure_reason'),
      requires_followup: boolValue(row, 'requires_followup') ?? false,
      followup_date: text(row, 'followup_date'),
      tags: listValue(row, 'tags'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.cases.imported += 1;
  }

  for (const row of safetyPlan.safeRows.case_type_assignments) {
    await upsertById(client, 'case_type_assignments', [
      'id',
      'case_id',
      'case_type_id',
      'is_primary',
      'sort_order',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'assignment_id'),
      case_id: requiredUuid(row, 'case_id'),
      case_type_id: requiredUuid(row, 'case_type_id'),
      is_primary: boolValue(row, 'is_primary') ?? false,
      sort_order: intValue(row, 'sort_order') ?? 0,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.case_type_assignments.imported += 1;
  }

  for (const row of safetyPlan.safeRows.case_outcome_assignments) {
    await upsertById(client, 'case_outcome_assignments', [
      'id',
      'case_id',
      'outcome_value',
      'is_primary',
      'sort_order',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'assignment_id'),
      case_id: requiredUuid(row, 'case_id'),
      outcome_value: requiredText(row, 'outcome_value'),
      is_primary: boolValue(row, 'is_primary') ?? false,
      sort_order: intValue(row, 'sort_order') ?? 0,
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.case_outcome_assignments.imported += 1;
  }

  for (const row of safetyPlan.safeRows.events) {
    await upsertById(client, 'events', [
      'id',
      'organization_id',
      'name',
      'description',
      'event_type',
      'status',
      'start_date',
      'end_date',
      'location_name',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'capacity',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'event_id'),
      organization_id: options.organizationId,
      name: requiredText(row, 'event_name'),
      description: text(row, 'description'),
      event_type: text(row, 'event_type'),
      status: text(row, 'status') ?? 'planned',
      start_date: requiredText(row, 'start_date'),
      end_date: requiredText(row, 'end_date'),
      location_name: text(row, 'location_name'),
      address_line1: text(row, 'address_line1'),
      address_line2: text(row, 'address_line2'),
      city: text(row, 'city'),
      state_province: text(row, 'state_province'),
      postal_code: text(row, 'postal_code'),
      country: text(row, 'country'),
      capacity: intValue(row, 'capacity'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.events.imported += 1;
  }

  for (const row of safetyPlan.safeRows.event_occurrences) {
    await upsertById(client, 'event_occurrences', [
      'id',
      'event_id',
      'organization_id',
      'sequence_index',
      'scheduled_start_date',
      'scheduled_end_date',
      'start_date',
      'end_date',
      'status',
      'event_name',
      'description',
      'location_name',
      'capacity',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'occurrence_id'),
      event_id: requiredUuid(row, 'event_id'),
      organization_id: options.organizationId,
      sequence_index: intValue(row, 'sequence_index') ?? 0,
      scheduled_start_date: requiredText(row, 'scheduled_start_date'),
      scheduled_end_date: requiredText(row, 'scheduled_end_date'),
      start_date: requiredText(row, 'start_date'),
      end_date: requiredText(row, 'end_date'),
      status: text(row, 'status') ?? 'planned',
      event_name: requiredText(row, 'event_name'),
      description: text(row, 'description'),
      location_name: text(row, 'location_name'),
      capacity: intValue(row, 'capacity'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.event_occurrences.imported += 1;
  }

  for (const row of safetyPlan.safeRows.event_registrations) {
    await upsertById(client, 'event_registrations', [
      'id',
      'event_id',
      'occurrence_id',
      'contact_id',
      'registration_status',
      'checked_in',
      'check_in_time',
      'notes',
    ], {
      id: requiredUuid(row, 'registration_id'),
      event_id: requiredUuid(row, 'event_id'),
      occurrence_id: requiredUuid(row, 'occurrence_id'),
      contact_id: requiredUuid(row, 'contact_id'),
      registration_status: text(row, 'registration_status') ?? 'confirmed',
      checked_in: boolValue(row, 'checked_in') ?? false,
      check_in_time: text(row, 'check_in_time'),
      notes: text(row, 'notes'),
    });
    results.event_registrations.imported += 1;
  }

  for (const row of safetyPlan.safeRows.activities) {
    const regardingId = uuid(row, 'case_id') ?? uuid(row, 'contact_id') ?? uuid(row, 'account_id') ?? uuid(row, 'event_id');
    const regardingType =
      uuid(row, 'case_id') ? 'case' : uuid(row, 'contact_id') ? 'contact' : uuid(row, 'account_id') ? 'account' : uuid(row, 'event_id') ? 'event' : null;
    await upsertById(client, 'activities', [
      'id',
      'activity_type',
      'subject',
      'description',
      'activity_date',
      'regarding_type',
      'regarding_id',
      'created_by',
    ], {
      id: requiredUuid(row, 'activity_id'),
      activity_type: requiredText(row, 'activity_type'),
      subject: textMax(row, 'subject', 255),
      description: text(row, 'description'),
      activity_date: requiredText(row, 'activity_date'),
      regarding_type: regardingType,
      regarding_id: regardingId,
      created_by: options.actorId,
    }, ['activity_type', 'subject', 'description', 'activity_date', 'regarding_type', 'regarding_id']);
    results.activities.imported += 1;
  }

  for (const row of safetyPlan.safeRows.activity_events) {
    await upsertById(client, 'activity_events', [
      'id',
      'organization_id',
      'activity_type',
      'title',
      'description',
      'actor_name',
      'entity_type',
      'entity_id',
      'related_entity_type',
      'related_entity_id',
      'metadata',
      'occurred_at',
      'source_table',
      'source_record_id',
    ], {
      id: requiredUuid(row, 'activity_event_id'),
      organization_id: options.organizationId,
      activity_type: requiredText(row, 'activity_type'),
      title: requiredTextMax(row, 'title', 255),
      description: text(row, 'description') ?? '',
      actor_name: text(row, 'actor_name'),
      entity_type: requiredText(row, 'entity_type'),
      entity_id: requiredUuid(row, 'entity_id'),
      related_entity_type: text(row, 'related_entity_type'),
      related_entity_id: uuid(row, 'related_entity_id'),
      metadata: JSON.stringify(jsonValue(row, 'metadata')),
      occurred_at: requiredText(row, 'occurred_at'),
      source_table: text(row, 'source_table'),
      source_record_id: uuid(row, 'source_record_id'),
    });
    results.activity_events.imported += 1;
  }

  for (const row of safetyPlan.safeRows.donations) {
    await upsertById(client, 'donations', [
      'id',
      'donation_number',
      'account_id',
      'contact_id',
      'amount',
      'currency',
      'donation_date',
      'payment_method',
      'payment_status',
      'transaction_id',
      'campaign_name',
      'designation',
      'is_recurring',
      'recurring_frequency',
      'notes',
      'receipt_sent',
      'receipt_sent_date',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'donation_id'),
      donation_number: text(row, 'donation_number'),
      account_id: uuid(row, 'account_id'),
      contact_id: uuid(row, 'contact_id'),
      amount: numberValue(row, 'amount') ?? 0,
      currency: text(row, 'currency') ?? 'CAD',
      donation_date: requiredText(row, 'donation_date'),
      payment_method: text(row, 'payment_method'),
      payment_status: text(row, 'payment_status') ?? 'completed',
      transaction_id: text(row, 'transaction_id'),
      campaign_name: text(row, 'campaign_name'),
      designation: text(row, 'designation'),
      is_recurring: boolValue(row, 'is_recurring') ?? false,
      recurring_frequency: text(row, 'recurring_frequency'),
      notes: text(row, 'notes'),
      receipt_sent: boolValue(row, 'receipt_sent') ?? false,
      receipt_sent_date: text(row, 'receipt_sent_date'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.donations.imported += 1;
  }

  for (const row of safetyPlan.safeRows.volunteers) {
    await upsertById(client, 'volunteers', [
      'id',
      'contact_id',
      'volunteer_status',
      'skills',
      'availability',
      'availability_status',
      'availability_notes',
      'emergency_contact_name',
      'emergency_contact_phone',
      'background_check_date',
      'background_check_status',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'volunteer_id'),
      contact_id: requiredUuid(row, 'contact_id'),
      volunteer_status: text(row, 'availability_status') ?? 'available',
      skills: listValue(row, 'skills'),
      availability: text(row, 'availability_notes'),
      availability_status: text(row, 'availability_status') ?? 'available',
      availability_notes: text(row, 'availability_notes'),
      emergency_contact_name: text(row, 'emergency_contact_name'),
      emergency_contact_phone: text(row, 'emergency_contact_phone'),
      background_check_date: text(row, 'background_check_date'),
      background_check_status: text(row, 'background_check_status'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.volunteers.imported += 1;
  }

  for (const row of safetyPlan.safeRows.volunteer_hours) {
    await upsertById(client, 'volunteer_hours', [
      'id',
      'volunteer_id',
      'activity_date',
      'hours_logged',
      'activity_type',
      'description',
      'notes',
      'verified',
    ], {
      id: requiredUuid(row, 'volunteer_hour_id'),
      volunteer_id: requiredUuid(row, 'volunteer_id'),
      activity_date: requiredText(row, 'activity_date'),
      hours_logged: numberValue(row, 'hours_logged') ?? 0,
      activity_type: textMax(row, 'activity_type', 100),
      description: text(row, 'description'),
      notes: text(row, 'notes'),
      verified: boolValue(row, 'verified') ?? false,
    });
    results.volunteer_hours.imported += 1;
  }

  for (const row of safetyPlan.safeRows.follow_ups) {
    await upsertById(client, 'follow_ups', [
      'id',
      'organization_id',
      'entity_type',
      'entity_id',
      'title',
      'description',
      'scheduled_date',
      'scheduled_time',
      'frequency',
      'frequency_end_date',
      'method',
      'status',
      'completed_date',
      'completed_notes',
      'assigned_to',
      'created_by',
      'modified_by',
    ], {
      id: requiredUuid(row, 'follow_up_id'),
      organization_id: options.organizationId,
      entity_type: requiredText(row, 'entity_type'),
      entity_id: requiredUuid(row, 'entity_id'),
      title: requiredText(row, 'title'),
      description: text(row, 'description'),
      scheduled_date: requiredText(row, 'scheduled_date'),
      scheduled_time: text(row, 'scheduled_time'),
      frequency: text(row, 'frequency') ?? 'once',
      frequency_end_date: text(row, 'frequency_end_date'),
      method: text(row, 'method'),
      status: text(row, 'status') ?? 'scheduled',
      completed_date: text(row, 'completed_date'),
      completed_notes: text(row, 'completed_notes'),
      assigned_to: uuid(row, 'assigned_to'),
      created_by: options.actorId,
      modified_by: options.actorId,
    });
    results.follow_ups.imported += 1;
  }
};

export const persistTargetProvenance = async (
  client: PoolClient,
  runId: string,
  bundle: LoadedCbisImportBundle,
  organizationId: string,
  safetyPlan: DuplicateSafetyPlan
): Promise<void> => {
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    for (const row of safetyPlan.safeRows[entityType]) {
      const targetEntityId = requiredUuid(row, targetIdColumnFor(entityType));
      const provenanceSources = safetyPlan.safeProvenance.get(rowKey(entityType, targetEntityId)) ?? [];
      for (const source of provenanceSources) {
        await client.query(
          `
            INSERT INTO cbis_import_target_provenance (
              organization_id,
              target_entity_type,
              target_entity_id,
              source_file,
              source_table,
              source_row_id,
              source_row_hash,
              bundle_fingerprint,
              schema_bundle_version,
              first_import_run_id,
              last_import_run_id
            ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10::uuid, $10::uuid)
            ON CONFLICT (organization_id, target_entity_type, source_file, source_table, source_row_id) DO UPDATE SET
              target_entity_id = EXCLUDED.target_entity_id,
              source_row_hash = EXCLUDED.source_row_hash,
              bundle_fingerprint = EXCLUDED.bundle_fingerprint,
              schema_bundle_version = EXCLUDED.schema_bundle_version,
              last_import_run_id = EXCLUDED.last_import_run_id
          `,
          [
            organizationId,
            entityType,
            targetEntityId,
            source.source_file,
            source.source_table,
            source.source_row_id,
            source.source_row_hash,
            bundle.fingerprint,
            getSchemaBundleVersion(bundle),
            runId,
          ]
        );
      }
    }
  }
};
