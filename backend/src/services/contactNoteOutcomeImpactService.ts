/**
 * Compatibility wrapper for legacy contact-note outcome impact imports.
 * Canonical ownership lives in `@modules/contacts/services/contactNoteOutcomeImpactService`.
 */

export {
  ContactNoteOutcomeImpactService,
  getContactNoteOutcomes,
  saveContactNoteOutcomes,
  saveContactNoteOutcomesWithExecutor,
} from '@modules/contacts/services/contactNoteOutcomeImpactService';

export { default } from '@modules/contacts/services/contactNoteOutcomeImpactService';
