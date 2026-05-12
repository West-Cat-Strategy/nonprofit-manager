import { logger } from '@config/logger';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendMail } from '@services/emailService';
import {
  renderMailchimpCampaignPreview,
  resolveMailchimpCampaignContent,
} from '@services/template/emailCampaignRenderer';
import mailchimpService from '@services/mailchimpService';
import type {
  CommunicationCampaign,
  CommunicationCampaignActionResult,
  CommunicationCampaignRescheduleRequest,
  CommunicationCampaignTestSendRequest,
  CommunicationCampaignTestSendResponse,
  CommunicationProviderAudience,
  CommunicationProviderStatus,
  CreateCommunicationCampaignRequest,
} from '@app-types/communications';
import {
  retryFailedCampaignRunRecipients,
  unsupportedMailchimpRunAction,
} from './campaignRunActionService';
export { retryFailedCampaignRunRecipients } from './campaignRunActionService';
import {
  findMailchimpRunIds,
  getCampaignRun,
  listCampaignRunRecipients,
  listCampaignRuns,
} from './campaignRunStore';
import {
  asMailchimpRequest,
  CommunicationsValidationError,
  mapLocalRunToCampaign,
  mapMailchimpCampaign,
  uniqueStrings,
} from './communicationsServiceHelpers';
export { CommunicationsValidationError } from './communicationsServiceHelpers';
import {
  cancelLocalCampaignRun,
  createLocalCampaign,
  refreshLocalCampaignRunStatus,
  rescheduleLocalCampaignRun,
  sendLocalCampaignRun,
} from './localCampaignDeliveryService';
import {
  archiveAudience,
  createAudience,
  getLocalAudience,
  isLocalAudienceId,
  listAudiences,
  previewAudience,
} from './savedAudienceService';

export {
  archiveAudience,
  createAudience,
  listAudiences,
  listCampaignRunRecipients,
  listCampaignRuns,
  previewAudience,
};

export const getStatus = async (): Promise<CommunicationProviderStatus> => {
  const [emailSettings, mailchimp] = await Promise.all([
    getEmailSettings(),
    mailchimpService.getStatus(),
  ]);
  const localConfigured = Boolean(emailSettings?.isConfigured);

  return {
    configured: localConfigured,
    provider: 'local_email',
    localEmail: {
      provider: 'local_email',
      configured: localConfigured,
      ready: localConfigured,
      fromAddress: emailSettings?.smtpFromAddress ?? null,
      fromName: emailSettings?.smtpFromName ?? null,
      lastTestedAt: emailSettings?.lastTestedAt ?? null,
      lastTestSuccess: emailSettings?.lastTestSuccess ?? null,
    },
    mailchimp,
    providers: {
      local_email: {
        provider: 'local_email',
        configured: localConfigured,
        ready: localConfigured,
        fromAddress: emailSettings?.smtpFromAddress ?? null,
        fromName: emailSettings?.smtpFromName ?? null,
      },
      mailchimp: {
        provider: 'mailchimp',
        configured: Boolean(mailchimp.configured),
        accountName: mailchimp.accountName,
        audienceCount: mailchimp.listCount,
      },
    },
    defaultProvider: 'local_email',
  };
};

export const listProviderAudiences = async (
  requesterScopeAccountIds?: string[]
): Promise<CommunicationProviderAudience[]> => {
  const localAudience = await getLocalAudience(requesterScopeAccountIds);
  try {
    const mailchimpLists = await mailchimpService.getLists();
    return [
      localAudience,
      ...mailchimpLists.map((list) => ({
        ...list,
        provider: 'mailchimp' as const,
      })),
    ];
  } catch (error) {
    logger.warn('Failed to load optional Mailchimp provider audiences', { error });
    return [localAudience];
  }
};

export const getProviderAudience = async (
  audienceId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationProviderAudience | null> => {
  if (isLocalAudienceId(audienceId)) {
    return getLocalAudience(requesterScopeAccountIds);
  }
  const audiences = await listProviderAudiences(requesterScopeAccountIds);
  return audiences.find((audience) => audience.id === audienceId) ?? null;
};

export const previewCampaign = (
  request: CreateCommunicationCampaignRequest
) => renderMailchimpCampaignPreview(asMailchimpRequest(request));

export const listCampaigns = async (
  audienceId?: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaign[]> => {
  const campaigns: CommunicationCampaign[] = [];
  const shouldIncludeLocal = isLocalAudienceId(audienceId);

  if (shouldIncludeLocal) {
    campaigns.push(
      ...(await listCampaignRuns(20, requesterScopeAccountIds))
        .filter((run) => run.provider === 'local_email')
        .map(mapLocalRunToCampaign)
    );
  }

  if (audienceId && isLocalAudienceId(audienceId)) {
    return campaigns;
  }

  try {
    const mailchimpCampaigns = await mailchimpService.getCampaigns(audienceId);
    const runIds = await findMailchimpRunIds(
      mailchimpCampaigns.map((campaign) => campaign.id),
      requesterScopeAccountIds
    );
    campaigns.push(
      ...mailchimpCampaigns.map((campaign) => mapMailchimpCampaign(campaign, runIds.get(campaign.id)))
    );
  } catch (error) {
    logger.warn('Failed to load optional Mailchimp campaigns', { error, audienceId });
  }
  return campaigns;
};

export const createCampaign = async (
  request: CreateCommunicationCampaignRequest
): Promise<CommunicationCampaign> => {
  const provider = request.provider ?? 'local_email';
  if (provider === 'mailchimp') {
    if (!request.listId) {
      throw new CommunicationsValidationError('Mailchimp campaigns require a provider audience');
    }
    const campaign = await mailchimpService.createCampaign(asMailchimpRequest(request));
    const runIds = await findMailchimpRunIds([campaign.id], request.scopeAccountIds);
    return mapMailchimpCampaign(campaign, runIds.get(campaign.id));
  }

  return createLocalCampaign(request);
};

export const sendCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return mailchimpService.sendCampaignRun(runId, requesterScopeAccountIds) as Promise<CommunicationCampaignActionResult | null>;
  }
  return sendLocalCampaignRun(runId, requesterScopeAccountIds, run);
};

export const cancelCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return unsupportedMailchimpRunAction(
      run,
      'Mailchimp campaign-run cancellation is not implemented by this backend contract.'
    );
  }
  return cancelLocalCampaignRun(runId, requesterScopeAccountIds, run);
};

export const rescheduleCampaignRun = async (
  runId: string,
  request: CommunicationCampaignRescheduleRequest,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return unsupportedMailchimpRunAction(
      run,
      'Mailchimp campaign-run rescheduling is not implemented by this backend contract.'
    );
  }
  return rescheduleLocalCampaignRun(runId, request, requesterScopeAccountIds, run);
};

export const refreshCampaignRunStatus = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return mailchimpService.refreshCampaignRunStatus(
      runId,
      requesterScopeAccountIds
    ) as Promise<CommunicationCampaignActionResult | null>;
  }
  return refreshLocalCampaignRunStatus(runId, requesterScopeAccountIds, run);
};

export const sendCampaignTest = async (
  request: CommunicationCampaignTestSendRequest
): Promise<CommunicationCampaignTestSendResponse> => {
  if ((request.provider ?? 'local_email') === 'mailchimp') {
    return mailchimpService.sendDraftCampaignTest(asMailchimpRequest(request));
  }

  const content = resolveMailchimpCampaignContent(asMailchimpRequest(request));
  const recipients = uniqueStrings(request.testRecipients.map((email) => email.toLowerCase()));
  if (recipients.length === 0) {
    throw new CommunicationsValidationError('At least one test recipient is required');
  }

  let delivered = 0;
  for (const recipient of recipients) {
    const ok = await sendMail({
      to: recipient,
      subject: request.subject,
      text: content.plainText,
      html: content.html,
    });
    if (ok) {
      delivered++;
    }
  }

  return {
    delivered: delivered === recipients.length,
    recipients,
    providerCampaignId: null,
    message:
      delivered === recipients.length
        ? 'Local campaign test email sent successfully'
        : 'One or more local campaign test emails failed',
  };
};

export default {
  getStatus,
  listProviderAudiences,
  getProviderAudience,
  listAudiences,
  archiveAudience,
  createAudience,
  previewAudience,
  previewCampaign,
  listCampaigns,
  createCampaign,
  listCampaignRuns,
  listCampaignRunRecipients,
  sendCampaignRun,
  cancelCampaignRun,
  rescheduleCampaignRun,
  retryFailedCampaignRunRecipients,
  refreshCampaignRunStatus,
  sendCampaignTest,
};
