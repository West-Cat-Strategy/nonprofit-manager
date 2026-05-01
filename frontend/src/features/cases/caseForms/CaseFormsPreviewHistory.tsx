import { BrutalCard } from '../../../components/neo-brutalist';
import type {
  CaseFormAsset,
  CaseFormAssignmentDetail,
  CaseFormAssignmentEvent,
  CaseFormQuestion,
  CaseFormSchema,
} from '../../../types/caseForms';
import CaseFormRenderer from './CaseFormRenderer';

interface CaseFormsPreviewHistoryProps {
  assets: CaseFormAsset[];
  detail: CaseFormAssignmentDetail;
  draftAnswers: Record<string, unknown>;
  editorDescription: string;
  editorSchema: CaseFormSchema;
  editorTitle: string;
  onAnswerChange: (questionKey: string, value: unknown) => void;
  onUploadAsset: (question: CaseFormQuestion, file: File) => Promise<CaseFormAsset>;
}

const eventLabels: Record<CaseFormAssignmentEvent['event_type'], string> = {
  opened: 'Opened to client',
  submission_recorded: 'Submission recorded',
  revision_requested: 'Revision requested',
  reviewed: 'Reviewed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const formatEventSummary = (event: CaseFormAssignmentEvent): string => {
  const parts = [
    event.submission_id ? `Submission ${event.metadata.submission_number || event.submission_id}` : null,
    typeof event.metadata.mapped_field_count === 'number'
      ? `${event.metadata.mapped_field_count} mapped fields`
      : null,
    typeof event.metadata.selected_asset_count === 'number'
      ? `${event.metadata.selected_asset_count} assets`
      : null,
    event.metadata.decision ? `Decision: ${event.metadata.decision}` : null,
    typeof event.metadata.notes_character_count === 'number'
      ? `${event.metadata.notes_character_count} note chars`
      : null,
  ].filter(Boolean);

  return parts.join(' / ');
};

export function CaseFormsPreviewHistory({
  assets,
  detail,
  draftAnswers,
  editorDescription,
  editorSchema,
  editorTitle,
  onAnswerChange,
  onUploadAsset,
}: CaseFormsPreviewHistoryProps) {
  return (
    <div className="space-y-6">
      <BrutalCard color="white" className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-black uppercase">Live Preview</h3>
          <p className="text-sm text-black/70">
            Staff and clients answer the same schema. This preview uses the current draft values and draft assets.
          </p>
        </div>
        <CaseFormRenderer
          schema={{ ...editorSchema, title: editorTitle, description: editorDescription }}
          answers={draftAnswers}
          assets={assets}
          variant="staff"
          onAnswerChange={onAnswerChange}
          onUploadAsset={onUploadAsset}
        />
      </BrutalCard>

      {detail.evidence_events && (
        <BrutalCard color="white" className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-black uppercase">Evidence Events</h3>
            <p className="text-sm text-black/70">
              Staff-only timeline of submission and review milestones.
            </p>
          </div>
          <div className="space-y-3">
            {detail.evidence_events.length === 0 && (
              <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
                No evidence events recorded yet.
              </div>
            )}
            {detail.evidence_events.map((event) => (
              <div key={event.id} className="rounded border-2 border-black bg-app-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase">{eventLabels[event.event_type]}</p>
                    <p className="text-sm text-black/70">
                      {new Date(event.created_at).toLocaleString()} • {event.actor_type}
                    </p>
                  </div>
                </div>
                {formatEventSummary(event) && (
                  <p className="mt-3 text-xs font-semibold uppercase text-black/60">
                    {formatEventSummary(event)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </BrutalCard>
      )}

      <BrutalCard color="white" className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-black uppercase">Submission History</h3>
          <p className="text-sm text-black/70">
            Immutable snapshots recorded onto the client file with packet + attachment filing.
          </p>
        </div>
        <div className="space-y-3">
          {detail.submissions.length === 0 && (
            <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
              No submissions yet. Drafts remain editable until staff or the client submits.
            </div>
          )}
          {detail.submissions.map((submission) => (
            <div key={submission.id} className="rounded border-2 border-black bg-app-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase">Submission #{submission.submission_number}</p>
                  <p className="text-sm text-black/70">
                    {new Date(submission.created_at).toLocaleString()} • {submission.submitted_by_actor_type}
                  </p>
                </div>
                {submission.response_packet_download_url && (
                  <a
                    href={submission.response_packet_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-black px-2 py-1 text-xs font-black uppercase"
                  >
                    Packet
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase text-black/60">
                {submission.mapping_audit.filter((item) => item.applied).length} mapped fields applied
              </p>
            </div>
          ))}
        </div>
      </BrutalCard>
    </div>
  );
}
