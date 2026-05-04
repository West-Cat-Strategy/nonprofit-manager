export class UnsupportedMailchimpCampaignRunActionError extends Error {
  readonly statusCode = 405;
  readonly code = 'method_not_allowed';

  constructor(message: string, readonly action: 'cancel' | 'reschedule') {
    super(message);
    this.name = 'UnsupportedMailchimpCampaignRunActionError';
  }
}
