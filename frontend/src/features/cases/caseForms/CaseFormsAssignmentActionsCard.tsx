import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type {
  CaseFormAssignmentDetail,
  CaseFormDeliveryTarget,
  CaseFormReviewDecision,
} from '../../../types/caseForms';
import { staffCaseFormsApiClient } from '../api/caseFormsApiClient';
import { sendLabelForTarget } from './caseFormsPanelUtils';

interface CaseFormsAssignmentActionsCardProps {
  caseId: string;
  clientViewable: boolean;
  deliveryTarget: CaseFormDeliveryTarget;
  detail: CaseFormAssignmentDetail;
  emailDeliveryEnabled: boolean;
  canShowAccessLink: boolean;
  recipientEmail: string;
  reviewNotes: string;
  saving: boolean;
  onChangeDeliveryTarget: (value: CaseFormDeliveryTarget) => void;
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
  deliveryTarget,
  detail,
  emailDeliveryEnabled,
  canShowAccessLink,
  recipientEmail,
  reviewNotes,
  saving,
  onChangeDeliveryTarget,
  setReviewNotes,
  onCopyAccessLink,
  onReviewDecision,
  onSaveDraft,
  onSend,
  onSubmitAsStaff,
}: CaseFormsAssignmentActionsCardProps) {
  const revisionNotesRequired = !reviewNotes.trim();

  return (
    <BrutalCard color="white" className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black uppercase">Assignment Actions</h3>
          <p className="text-sm text-black/70">
            Save staff-entered answers, choose portal or email delivery, and move the submission through review.
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
          This case is not shared with the client yet. Turn on client visibility before delivering forms by portal or email.
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-black uppercase text-black/70" htmlFor="case-form-delivery-target">
          Delivery Target
        </label>
        <select
          id="case-form-delivery-target"
          aria-label="Delivery Target"
          value={deliveryTarget}
          onChange={(event) => onChangeDeliveryTarget(event.target.value as CaseFormDeliveryTarget)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        >
          <option value="portal">Portal</option>
          <option value="email">Email</option>
          <option value="portal_and_email">Portal + Email</option>
        </select>
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
          disabled={saving || !clientViewable || (emailDeliveryEnabled && !recipientEmail.trim())}
          variant="secondary"
        >
          {sendLabelForTarget(deliveryTarget)}
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
