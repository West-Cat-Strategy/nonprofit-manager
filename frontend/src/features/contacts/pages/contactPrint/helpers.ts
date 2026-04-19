import { RELATIONSHIP_TYPES, type Contact } from '../../../../types/contact';

export const formatMaybe = (value: string | null | undefined): string => value?.trim() || '—';

export const formatBoolean = (value: boolean): string => (value ? 'Yes' : 'No');

export const buildContactName = (contact: Contact): string => {
  const parts = [
    contact.salutation,
    contact.preferred_name || contact.first_name,
    contact.middle_name,
    contact.last_name,
    contact.suffix,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.join(' ') || 'Contact';
};

export const findRelationshipLabel = (relationshipType: string): string =>
  RELATIONSHIP_TYPES.find((entry) => entry.value === relationshipType)?.label ?? relationshipType;
