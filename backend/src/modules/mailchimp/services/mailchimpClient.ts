import mailchimp from '@mailchimp/mailchimp_marketing';
import { logger } from '@config/logger';

// Note: @mailchimp/mailchimp_marketing has incomplete TypeScript definitions.
// We use 'any' here because the library's types don't expose the actual API methods
// (ping, lists, campaigns, etc.) that are available at runtime.
export const mailchimpClient = mailchimp as any;

const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

let isConfigured = false;

function initializeMailchimp(): void {
  if (!mailchimpApiKey || !mailchimpServerPrefix) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn(
        'Mailchimp is not configured. Set MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX.'
      );
    }
    return;
  }

  mailchimp.setConfig({
    apiKey: mailchimpApiKey,
    server: mailchimpServerPrefix,
  });

  isConfigured = true;
  logger.info('Mailchimp client initialized');
}

initializeMailchimp();

export function isMailchimpConfigured(): boolean {
  return isConfigured;
}

export function assertMailchimpConfigured(message: string): void {
  if (!isConfigured) {
    throw new Error(message);
  }
}

export function warnIfMailchimpNotConfigured(message: string): boolean {
  if (isConfigured) {
    return false;
  }

  logger.warn(message);
  return true;
}
