import type { Volunteer, VolunteerAssignment } from '../features/volunteers/state';

interface AssignmentVolunteerFitCuesProps {
  volunteer: Volunteer | null;
  activeAssignmentLabel: string;
  hasSelectedWindow: boolean;
  overlappingAssignments: VolunteerAssignment[];
  matchedVolunteerTerms: string[];
}

const formatDateTimeLabel = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatStatusLabel = (value?: string | null): string =>
  value ? value.replace(/_/g, ' ') : 'Not specified';

export function AssignmentVolunteerFitCues({
  volunteer,
  activeAssignmentLabel,
  hasSelectedWindow,
  overlappingAssignments,
  matchedVolunteerTerms,
}: AssignmentVolunteerFitCuesProps) {
  return (
    <section className="sm:col-span-2 rounded-md border border-app-border bg-app-surface-muted p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-text-heading">Volunteer fit cues</h3>
          {volunteer ? (
            <p className="mt-1 text-sm text-app-text-muted">
              Availability is {formatStatusLabel(volunteer.availability_status)}
              {volunteer.max_hours_per_week
                ? ` with ${volunteer.max_hours_per_week} hours per week max`
                : ''}
              .
            </p>
          ) : (
            <p className="mt-1 text-sm text-app-text-muted">
              Loading volunteer availability and skills.
            </p>
          )}
        </div>
        <div className="text-sm text-app-text-muted sm:text-right">
          <p>{activeAssignmentLabel}</p>
          {hasSelectedWindow ? (
            <p>
              {overlappingAssignments.length > 0
                ? `${overlappingAssignments.length} schedule overlap${
                    overlappingAssignments.length === 1 ? '' : 's'
                  } found`
                : 'No loaded schedule overlaps'}
            </p>
          ) : (
            <p>Schedule window not set</p>
          )}
        </div>
      </div>

      {volunteer?.availability_notes && (
        <p className="mt-3 text-sm text-app-text-muted">
          Availability notes: {volunteer.availability_notes}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-app-text-muted">Skills</p>
          <p className="mt-1 text-sm text-app-text">
            {volunteer?.skills?.length ? volunteer.skills.slice(0, 6).join(', ') : 'No skills listed'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-app-text-muted">Assignment match</p>
          <p className="mt-1 text-sm text-app-text">
            {matchedVolunteerTerms.length > 0
              ? matchedVolunteerTerms.slice(0, 4).join(', ')
              : 'No skill or preferred-role overlap yet'}
          </p>
        </div>
      </div>

      {overlappingAssignments.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-app-accent-text">
          {overlappingAssignments.slice(0, 2).map((item) => (
            <li key={item.assignment_id}>
              Overlap: {item.event_name || item.task_name || item.role || 'Assignment'} at{' '}
              {formatDateTimeLabel(item.start_time)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
