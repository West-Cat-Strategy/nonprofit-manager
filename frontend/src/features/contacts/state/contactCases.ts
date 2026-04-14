import { fetchCasesByContact, selectCasesByContact } from '../../cases/state';
import type { CaseWithDetails } from '../../../types/case';

type CasesSelectorState = Parameters<typeof selectCasesByContact>[0];

export type ContactCasesLookupState = CasesSelectorState;

export const fetchContactCasesByContact = fetchCasesByContact;

export const selectContactCasesByContact = (
  state: ContactCasesLookupState,
  contactId: string
): CaseWithDetails[] => selectCasesByContact(state, contactId);
