import { CBIS_IMPORT_ENTITY_ORDER, type CbisImportEntityType, type CbisImportRow, type LoadedCbisImportBundle } from './cbisImportBundle';
import type { DependencyReference } from './cbisImportTypes';
import { normalizeText, rowKey, targetIdColumnFor, text, uuid } from './cbisImportRowUtils';

const referenceEntityTypeFor = (value: string | null): CbisImportEntityType | null => {
  const normalized = normalizeText(value)?.replace(/[-\s]/g, '_');
  if (!normalized) {
    return null;
  }
  const aliases: Record<string, CbisImportEntityType> = {
    account: 'accounts',
    accounts: 'accounts',
    organization: 'accounts',
    organizations: 'accounts',
    contact: 'contacts',
    contacts: 'contacts',
    participant: 'contacts',
    person: 'contacts',
    case: 'cases',
    cases: 'cases',
    event: 'events',
    events: 'events',
    event_occurrence: 'event_occurrences',
    event_occurrences: 'event_occurrences',
    occurrence: 'event_occurrences',
    volunteer: 'volunteers',
    volunteers: 'volunteers',
  };
  return aliases[normalized] ?? null;
};

export const dependencyReferencesFor = (entityType: CbisImportEntityType, row: CbisImportRow): DependencyReference[] => {
  const references: DependencyReference[] = [];
  const addReference = (targetType: CbisImportEntityType, key: string, label = key): void => {
    const targetEntityId = uuid(row, key);
    if (targetEntityId) {
      references.push({ entityType: targetType, targetEntityId, label });
    }
  };
  const addPolymorphicReference = (typeKey: string, idKey: string, label: string): void => {
    const targetType = referenceEntityTypeFor(text(row, typeKey));
    const targetEntityId = uuid(row, idKey);
    if (targetType && targetEntityId) {
      references.push({ entityType: targetType, targetEntityId, label });
    }
  };

  if (entityType === 'contacts') {
    addReference('accounts', 'account_id');
  } else if (entityType === 'cases') {
    addReference('contacts', 'contact_id');
    addReference('accounts', 'account_id');
  } else if (entityType === 'case_type_assignments' || entityType === 'case_outcome_assignments') {
    addReference('cases', 'case_id');
  } else if (entityType === 'event_occurrences') {
    addReference('events', 'event_id');
  } else if (entityType === 'event_registrations') {
    addReference('events', 'event_id');
    addReference('event_occurrences', 'occurrence_id');
    addReference('contacts', 'contact_id');
  } else if (entityType === 'activities') {
    addReference('cases', 'case_id');
    addReference('contacts', 'contact_id');
    addReference('accounts', 'account_id');
    addReference('events', 'event_id');
  } else if (entityType === 'activity_events') {
    addPolymorphicReference('entity_type', 'entity_id', 'entity_id');
    addPolymorphicReference('related_entity_type', 'related_entity_id', 'related_entity_id');
  } else if (entityType === 'donations') {
    addReference('accounts', 'account_id');
    addReference('contacts', 'contact_id');
  } else if (entityType === 'volunteers') {
    addReference('contacts', 'contact_id');
  } else if (entityType === 'volunteer_hours') {
    addReference('volunteers', 'volunteer_id');
  } else if (entityType === 'follow_ups') {
    addPolymorphicReference('entity_type', 'entity_id', 'entity_id');
  }

  return references;
};

export const collectTargetKeys = (rows: Record<CbisImportEntityType, CbisImportRow[]>): Set<string> => {
  const keys = new Set<string>();
  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    for (const row of rows[entityType]) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      if (targetEntityId) {
        keys.add(rowKey(entityType, targetEntityId));
      }
    }
  }
  return keys;
};

export const collectBundleTargetKeys = (bundle: LoadedCbisImportBundle): Set<string> =>
  collectTargetKeys(bundle.entities);

export const findBlockedDependency = (
  row: CbisImportRow,
  entityType: CbisImportEntityType,
  bundleTargetKeys: Set<string>,
  safeTargetKeys: Set<string>,
  heldKeys: Set<string>
): DependencyReference | null => {
  for (const reference of dependencyReferencesFor(entityType, row)) {
    const key = rowKey(reference.entityType, reference.targetEntityId);
    if (heldKeys.has(key) || (bundleTargetKeys.has(key) && !safeTargetKeys.has(key))) {
      return reference;
    }
  }
  return null;
};
