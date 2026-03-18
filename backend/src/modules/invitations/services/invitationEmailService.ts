import { getEmailSettings as rootGetEmailSettings } from '@services/emailSettingsService';
import { sendInvitationEmail as rootSendInvitationEmail } from '@services/emailService';

export const getEmailSettings = rootGetEmailSettings;
export const sendInvitationEmail = rootSendInvitationEmail;
