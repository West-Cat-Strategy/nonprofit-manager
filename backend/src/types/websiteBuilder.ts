export type * from '@nonprofit-manager/contracts/websiteBuilder';

import type { PublicActionSubmission } from '@nonprofit-manager/contracts/websiteBuilder';

export type PublicActionSubmissionTransition = 'accept' | 'reject' | 'fulfill';

export interface PublicActionSubmissionTransitionResult {
  submission: PublicActionSubmission;
  contactId?: string;
  pledgeId?: string;
  supportLetterId?: string;
}
