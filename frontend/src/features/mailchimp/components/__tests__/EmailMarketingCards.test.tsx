import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CampaignRunCard } from '../EmailMarketingCards';
import type { CampaignRun } from '../../../../types/mailchimp';

const baseRun: CampaignRun = {
  id: 'run-1',
  provider: 'local_email',
  providerCampaignId: null,
  title: 'Spring Appeal',
  listId: 'local_email:crm',
  includeAudienceId: null,
  exclusionAudienceIds: [],
  suppressionSnapshot: [],
  testRecipients: [],
  audienceSnapshot: {},
  requestedSendTime: null,
  status: 'sending',
  counts: { requestedContactCount: 2 },
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

describe('CampaignRunCard', () => {
  it('enables local sending continuation, local controls, and compact recipient drilldown', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onCancel = vi.fn();
    const onReschedule = vi.fn();
    const onLoadRecipients = vi.fn();

    render(
      <CampaignRunCard
        run={baseRun}
        onSend={onSend}
        onCancel={onCancel}
        onReschedule={onReschedule}
        onLoadRecipients={onLoadRecipients}
        recipients={[
          {
            id: 'recipient-1',
            campaignRunId: 'run-1',
            contactId: 'contact-1',
            email: 'ada@example.org',
            contactName: 'Ada Lovelace',
            status: 'queued',
            failureMessage: null,
            sentAt: null,
            createdAt: '2026-05-01T00:00:00Z',
            updatedAt: '2026-05-01T00:00:00Z',
          },
          {
            id: 'recipient-2',
            campaignRunId: 'run-1',
            contactId: 'contact-2',
            email: 'grace@example.org',
            status: 'failed',
            failureMessage: 'SMTP send failed',
            sentAt: null,
            createdAt: '2026-05-01T00:00:00Z',
            updatedAt: '2026-05-01T00:00:00Z',
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue sending/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await user.selectOptions(screen.getByLabelText(/recipients/i), 'failed');
    await user.click(screen.getByRole('button', { name: /show recipients/i }));

    expect(onSend).toHaveBeenCalledWith('run-1');
    expect(onCancel).toHaveBeenCalledWith('run-1');
    expect(onLoadRecipients).toHaveBeenCalledWith('run-1', 'failed');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('SMTP send failed')).toBeInTheDocument();
  });

  it('keeps Mailchimp cancel and reschedule controls in unsupported state', () => {
    render(
      <CampaignRunCard
        run={{
          ...baseRun,
          provider: 'mailchimp',
          providerCampaignId: 'campaign-1',
          status: 'draft',
        }}
      />
    );

    expect(screen.getByRole('button', { name: /cancel unsupported/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reschedule unsupported/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /show recipients/i })).not.toBeInTheDocument();
  });

  it('submits local reschedule requests for draft runs', async () => {
    const user = userEvent.setup();
    const onReschedule = vi.fn();

    render(
      <CampaignRunCard
        run={{ ...baseRun, status: 'draft' }}
        onReschedule={onReschedule}
      />
    );

    await user.type(screen.getByLabelText(/new send time/i), '2026-05-02T10:30');
    await user.click(screen.getByRole('button', { name: /^reschedule$/i }));

    expect(onReschedule).toHaveBeenCalledWith('run-1', '2026-05-02T10:30');
  });
});
