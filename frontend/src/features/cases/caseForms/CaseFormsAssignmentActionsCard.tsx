import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type {
  CaseFormAssignmentDetail,
  CaseFormDeliveryChannel,
  CaseFormReviewDecision,
} from '../../../types/caseForms';
import { staffCaseFormsApiClient } from '../api/caseFormsApiClient';
import { sendLabelForChannels } from './caseFormsPanelUtils';

interface CaseFormsAssignmentActionsCardProps {
  caseId: string;
  clientViewable: boolean;
  deliveryChannels: CaseFormDeliveryChannel[];
  detail: CaseFormAssignmentDetail;
  draftAutosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  emailDeliveryEnabled: boolean;
  smsDeliveryEnabled: boolean;
  canShowAccessLink: boolean;
  recipientEmail: string;
  recipientPhone: string;
  reviewNotes: string;
  saving: boolean;
  onChangeDeliveryChannels: (value: CaseFormDeliveryChannel[]) => void;
  setReviewNotes: (value: string) => void;
  onCopyAccessLink: () => void;
  onReviewDecision: (decision: CaseFormReviewDecision['decision']) => void;
  onSaveDraft: () => void;
  onSend: () => void;
  onSubmitAsStaff: () => void;
}

export function CaseFormsAssignmentActionsCard({
  caseId,
  clientViewable,
  deliveryChannels,
  detail,
  draftAutosaveStatus,
  emailDeliveryEnabled,
  smsDeliveryEnabled,
  canShowAccessLink,
  recipientEmail,
  recipientPhone,
  reviewNotes,
  saving,
  onChangeDeliveryChannels,
  setReviewNotes,
  onCopyAccessLink,
  onReviewDecision,
  onSaveDraft,
  onSend,
  onSubmitAsStaff,
}: CaseFormsAssignmentActionsCardProps) {
  const revisionNotesRequired = !reviewNotes.trim();
  const portalDeliveryEnabled = deliveryChannels.includes('portal');
  const setChannel = (channel: CaseFormDeliveryChannel, enabled: boolean): void => {
    const next = enabled
      ? Array.from(new Set([...deliveryChannels, channel]))
      : deliveryChannels.filter((item) => item !== channel);
    onChangeDeliveryChannels(next);
  };

  return (
    <BrutalCard color="white" className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black uppercase">Assignment Actions</h3>
          <p className="text-sm text-black/70">
            Save staff-entered answers, open the form by channel, and move the submission through review.
          </p>
        </div>
        {canShowAccessLink && (
          <button
            type="button"
            className="rounded border-2 border-black bg-[var(--loop-yellow)] px-3 py-2 text-xs font-black uppercase"
            onClick={onCopyAccessLink}
          >
            Copy Link
          </button>
        )}
      </div>

      {!clientViewable && (
        <div className="rounded border-2 border-black bg-[var(--loop-pink)] px-3 py-2 text-sm font-semibold">
          Portal delivery needs a client-visible case or an active portal account. Email and SMS links can still be sent directly.
        </div>
      )}

      <div className="rounded border-2 border-black bg-app-surface p-3">
        <p className="mb-2 text-xs font-black uppercase text-black/70">Open Form Channels</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['portal', 'email', 'sms'] as CaseFormDeliveryChannel[]).map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm font-black uppercase">
              <input
                type="checkbox"
                checked={deliveryChannels.includes(channel)}
                onChange={(event) => setChannel(channel, event.target.checked)}
              />
              {channel === 'sms' ? 'SMS' : channel}
            </label>
          ))}
        </div>
      </div>

      {canShowAccessLink && (
        <div className="rounded border-2 border-black bg-app-surface px-3 py-2 text-xs font-semibold">
          {detail.assignment.access_link_url}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <BrutalButton onClick={onSaveDraft} disabled={saving} variant="secondary">
          Save Draft
        </BrutalButton>
        <BrutalButton onClick={onSubmitAsStaff} disabled={saving}>
          Submit as Staff
        </BrutalButton>
        <BrutalButton
          onClick={onSend}
          disabled={
            saving ||
            deliveryChannels.length === 0 ||
            (emailDeliveryEnabled && !recipientEmail.trim()) ||
            (smsDeliveryEnabled && !recipientPhone.trim())
          }
          variant="secondary"
        >
          {sendLabelForChannels(deliveryChannels)}
        </BrutalButton>
        <a
          href={staffCaseFormsApiClient.getResponsePacketDownloadUrl(caseId, detail.assignment.id)}
          className="inline-flex items-center rounded border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase"
          target="_blank"
          rel="noreferrer"
        >
          Response Packet
        </a>
      </div>

      {emailDeliveryEnabled && !recipientEmail.trim() && (
        <p className="text-xs font-semibold uppercase text-black/60">
          Add a recipient email before sending through an email delivery target.
        </p>
      )}
      {smsDeliveryEnabled && !recipientPhone.trim() && (
        <p className="text-xs font-semibold uppercase text-black/60">
          Add a recipient phone before sending through SMS.
        </p>
      )}
      {portalDeliveryEnabled && !clientViewable && (
        <p className="text-xs font-semibold uppercase text-black/60">
          Portal delivery will be accepted only if this client already has an active portal account.
        </p>
      )}
      <p className="text-xs font-semibold uppercase text-black/60">
        Answer autosave: {draftAutosaveStatus === 'saving'
          ? 'saving'
          : draftAutosaveStatus === 'saved'
            ? 'saved'
            : draftAutosaveStatus === 'error'
              ? 'needs manual save'
              : 'ready'}
      </p>

      <div className="rounded border-2 border-black bg-[var(--loop-pink)] p-4 space-y-3">
        {detail.assignment.status === 'revision_requested' && detail.assignment.revision_notes && (
          <div className="rounded border-2 border-black bg-white px-3 py-2 text-sm font-semibold">
            Changes requested: {detail.assignment.revision_notes}
          </div>
        )}
        <label
          className="block text-xs font-black uppercase text-black/70"
          htmlFor="case-form-review-notes"
        >
          Review Notes
        </label>
        <textarea
          id="case-form-review-notes"
          value={reviewNotes}
          onChange={(event) => setReviewNotes(event.target.value)}
          rows={3}
          className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          <BrutalButton
            onClick={() => onReviewDecision('revision_requested')}
            disabled={saving || revisionNotesRequired}
            size="sm"
            variant="secondary"
          >
            Request Changes
          </BrutalButton>
          <BrutalButton onClick={() => onReviewDecision('reviewed')} disabled={saving} size="sm">
            Mark Reviewed
          </BrutalButton>
          <BrutalButton onClick={() => onReviewDecision('closed')} disabled={saving} size="sm" variant="secondary">
            Close
          </BrutalButton>
          <BrutalButton onClick={() => onReviewDecision('cancelled')} disabled={saving} size="sm" variant="danger">
            Cancel
          </BrutalButton>
        </div>
      </div>
    </BrutalCard>
  );
}
