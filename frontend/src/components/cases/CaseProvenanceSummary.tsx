import { BrutalBadge, BrutalCard } from '../neo-brutalist';
import { classNames } from '../ui/classNames';
import { summarizeLabels } from '../../features/cases/utils/caseClassification';
import type { CaseProvenance, PortalCaseProvenance } from '../../types/case';

type Provenance = CaseProvenance | PortalCaseProvenance;

interface CaseProvenanceSummaryProps {
  provenance?: Provenance | null;
  variant: 'staff' | 'portal';
  density?: 'inline' | 'panel';
  className?: string;
}

const confidenceLabel = (value: Provenance['confidence_label']): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const confidenceBadgeColor = (
  value: Provenance['confidence_label']
): 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'blue' => {
  switch (value) {
    case 'high':
      return 'green';
    case 'medium':
      return 'blue';
    case 'low':
      return 'yellow';
    default:
      return 'gray';
  }
};

const InlineBadge = ({
  children,
  variant,
  className,
}: {
  children: string;
  variant: 'staff' | 'portal';
  className?: string;
}) => {
  if (variant === 'staff') {
    return (
      <BrutalBadge color="blue" size="sm" className={className}>
        {children}
      </BrutalBadge>
    );
  }

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded border border-app-border-muted bg-app-surface-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-app-text-muted',
        className
      )}
    >
      {children}
    </span>
  );
};

const summarizeCount = (count: number, label: string): string =>
  `${count} ${label}${count === 1 ? '' : 's'}`;

const renderLabelChips = (labels: string[], variant: 'staff' | 'portal') => {
  const summary = summarizeLabels(labels, 5);
  return (
    <div className="flex flex-wrap gap-2">
      {summary.visible.map((label) =>
        variant === 'staff' ? (
          <BrutalBadge key={label} color="gray" size="sm">
            {label}
          </BrutalBadge>
        ) : (
          <span
            key={label}
            className="inline-flex items-center rounded bg-app-surface-muted px-2 py-0.5 text-[11px] font-semibold text-app-text-muted"
          >
            {label}
          </span>
        )
      )}
      {summary.hiddenCount > 0 &&
        (variant === 'staff' ? (
          <BrutalBadge color="green" size="sm">
            +{summary.hiddenCount}
          </BrutalBadge>
        ) : (
          <span className="inline-flex items-center rounded bg-app-surface-muted px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
            +{summary.hiddenCount}
          </span>
        ))}
    </div>
  );
};

const SourceRoleList = ({
  provenance,
  variant,
}: {
  provenance: Provenance;
  variant: 'staff' | 'portal';
}) => {
  if (!provenance.source_role_breakdown || provenance.source_role_breakdown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className={variant === 'staff' ? 'text-xs font-black uppercase text-black/60' : 'text-xs font-semibold uppercase tracking-wide text-app-text-muted'}>
        Source roles
      </p>
      <div className="space-y-2">
        {provenance.source_role_breakdown.map((entry) => (
          <div
            key={`${entry.source_role}-${entry.source_row_count}`}
            className={classNames(
              'rounded border px-3 py-2',
              variant === 'staff'
                ? 'border-black bg-app-surface-muted'
                : 'border-app-border-muted bg-app-surface'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {variant === 'staff' ? (
                  <BrutalBadge color="purple" size="sm">
                    {entry.source_role}
                  </BrutalBadge>
                ) : (
                  <span className="inline-flex items-center rounded bg-app-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase text-app-accent-text">
                    {entry.source_role}
                  </span>
                )}
                <span
                  className={
                    variant === 'staff'
                      ? 'text-xs font-bold text-black/60'
                      : 'text-xs font-medium text-app-text-muted'
                  }
                >
                  {summarizeCount(entry.source_row_count, 'row')}
                </span>
              </div>
              {entry.source_tables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {renderLabelChips(entry.source_tables, variant)}
                </div>
              )}
            </div>
            {variant === 'staff' && 'source_row_ids' in entry && entry.source_row_ids && entry.source_row_ids.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] font-black uppercase text-black/50">Row IDs</p>
                {renderLabelChips(entry.source_row_ids, variant)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ProvenancePanel = ({
  provenance,
  variant,
  className,
}: {
  provenance: Provenance;
  variant: 'staff' | 'portal';
  className?: string;
}) => {
  const heading =
    variant === 'staff' ? 'Imported import provenance' : 'Imported source summary';
  const subheading =
    variant === 'staff'
      ? 'Imported from the Imported / Westcat bundle and linked to this case.'
      : 'A client-safe summary of the imported case history is shown here.';
  const confidenceColor = confidenceBadgeColor(provenance.confidence_label);
  const staffProvenance = provenance as CaseProvenance;

  return variant === 'staff' ? (
    <BrutalCard color="white" className={classNames('p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-black/60">{heading}</p>
          <h4 className="mt-1 text-lg font-black uppercase text-black">
            {staffProvenance.primary_label}
          </h4>
          <p className="text-sm font-bold text-black/70">
            Record type: {staffProvenance.record_type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BrutalBadge color="blue" size="sm">
            Imported
          </BrutalBadge>
          <BrutalBadge color={confidenceColor} size="sm">
            {confidenceLabel(provenance.confidence_label)}
          </BrutalBadge>
          {staffProvenance.is_low_confidence && (
            <BrutalBadge color="red" size="sm">
              Low confidence
            </BrutalBadge>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-black bg-app-surface-muted p-3">
          <div className="text-[11px] font-black uppercase text-black/50">Cluster</div>
          <div className="mt-1 text-sm font-bold text-black">{staffProvenance.cluster_id || '—'}</div>
        </div>
        <div className="rounded border border-black bg-app-surface-muted p-3">
          <div className="text-[11px] font-black uppercase text-black/50">Source tables</div>
          <div className="mt-1 text-sm font-bold text-black">
            {summarizeCount(staffProvenance.source_table_count, 'table')}
          </div>
        </div>
        <div className="rounded border border-black bg-app-surface-muted p-3">
          <div className="text-[11px] font-black uppercase text-black/50">Source files</div>
          <div className="mt-1 text-sm font-bold text-black">
            {summarizeCount(staffProvenance.source_file_count, 'file')}
          </div>
        </div>
        <div className="rounded border border-black bg-app-surface-muted p-3">
          <div className="text-[11px] font-black uppercase text-black/50">Linked rows</div>
          <div className="mt-1 text-sm font-bold text-black">
            {summarizeCount(staffProvenance.source_row_count, 'row')}
          </div>
        </div>
      </div>

      {staffProvenance.source_tables.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">Source tables</p>
          {renderLabelChips(staffProvenance.source_tables, 'staff')}
        </div>
      )}

      {staffProvenance.source_files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">Source files</p>
          {renderLabelChips(staffProvenance.source_files, 'staff')}
        </div>
      )}

      {staffProvenance.participant_ids.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">Linked participants</p>
          {renderLabelChips(staffProvenance.participant_ids, 'staff')}
        </div>
      )}

      {staffProvenance.source_row_ids.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">Source row IDs</p>
          {renderLabelChips(staffProvenance.source_row_ids, 'staff')}
        </div>
      )}

      {staffProvenance.source_type_breakdown.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">Source type breakdown</p>
          {renderLabelChips(staffProvenance.source_type_breakdown, 'staff')}
        </div>
      )}

      <div className="mt-4">
        <SourceRoleList provenance={provenance} variant="staff" />
      </div>
    </BrutalCard>
  ) : (
    <div
      className={classNames(
        'rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted p-4',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{heading}</p>
          <h4 className="mt-1 text-base font-semibold text-app-text">{provenance.primary_label}</h4>
          <p className="mt-1 text-sm text-app-text-muted">Record type: {provenance.record_type}</p>
          <p className="mt-1 text-sm text-app-text-muted">{subheading}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded bg-app-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase text-app-accent-text">
            Imported
          </span>
          <span
            className={classNames(
              'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase',
              provenance.is_low_confidence
                ? 'bg-app-accent-soft text-app-accent-text'
                : 'bg-app-surface text-app-text-muted'
            )}
          >
            {confidenceLabel(provenance.confidence_label)}
          </span>
          {provenance.is_low_confidence && (
            <span className="inline-flex items-center rounded bg-app-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase text-app-accent-text">
              Review closely
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-app-text-muted">Source tables</div>
          <div className="mt-1 text-sm font-semibold text-app-text">
            {summarizeCount(provenance.source_table_count, 'table')}
          </div>
        </div>
        <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-app-text-muted">Source files</div>
          <div className="mt-1 text-sm font-semibold text-app-text">
            {summarizeCount(provenance.source_file_count, 'file')}
          </div>
        </div>
        <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-app-text-muted">Linked rows</div>
          <div className="mt-1 text-sm font-semibold text-app-text">
            {summarizeCount(provenance.source_row_count, 'row')}
          </div>
        </div>
        <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-app-text-muted">Source roles</div>
          <div className="mt-1 text-sm font-semibold text-app-text">
            {summarizeCount(provenance.source_role_breakdown.length, 'role')}
          </div>
        </div>
      </div>

      {provenance.source_tables.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Source tables</p>
          {renderLabelChips(provenance.source_tables, 'portal')}
        </div>
      )}

      {provenance.source_type_breakdown.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Source type breakdown</p>
          {renderLabelChips(provenance.source_type_breakdown, 'portal')}
        </div>
      )}

      <div className="mt-4">
        <SourceRoleList provenance={provenance} variant="portal" />
      </div>
    </div>
  );
};

export default function CaseProvenanceSummary({
  provenance,
  variant,
  density = 'panel',
  className,
}: CaseProvenanceSummaryProps) {
  if (!provenance) {
    return null;
  }

  if (density === 'inline') {
    return (
      <div className={classNames('flex flex-wrap items-center gap-2', className)}>
        <InlineBadge variant={variant}>{variant === 'staff' ? 'Imported' : 'Imported'}</InlineBadge>
        <InlineBadge variant={variant}>{summarizeCount(provenance.source_table_count, 'table')}</InlineBadge>
        <InlineBadge variant={variant}>{summarizeCount(provenance.source_role_breakdown.length, 'role')}</InlineBadge>
        {provenance.is_low_confidence && (
          <InlineBadge variant={variant} className={variant === 'staff' ? 'bg-[var(--loop-yellow)]' : ''}>
            Low confidence
          </InlineBadge>
        )}
      </div>
    );
  }

  return <ProvenancePanel provenance={provenance} variant={variant} className={className} />;
}
