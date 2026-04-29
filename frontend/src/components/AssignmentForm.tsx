import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createAssignment,
  fetchVolunteerAssignments,
  fetchVolunteerById,
  updateAssignment,
} from '../features/volunteers/state';
import type { Volunteer, VolunteerAssignment } from '../features/volunteers/state';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { eventsApiClient } from '../features/events/api/eventsApiClient';
import { tasksApiClient } from '../features/tasks/api/tasksApiClient';
import type { Event } from '../types/event';
import type { Task } from '../types/task';

interface Assignment {
  assignment_id?: string;
  volunteer_id: string;
  event_id?: string | null;
  task_id?: string | null;
  assignment_type: 'event' | 'task' | 'general';
  role?: string | null;
  start_time: string;
  end_time?: string | null;
  hours_logged?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string | null;
}

interface AssignmentFormProps {
  assignment?: Assignment;
  volunteerId: string; // The volunteer this assignment is for
  mode: 'create' | 'edit';
}

interface AssignmentPickerOption {
  id: string;
  label: string;
  description: string;
  matchText: string;
}

const ACTIVE_EVENT_STATUSES: Event['status'][] = ['planned', 'active'];
const ACTIVE_TASK_STATUSES: Task['status'][] = ['not_started', 'in_progress', 'waiting'];

const formatDateLabel = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString();
};

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

const mapEventToPickerOption = (event: Event): AssignmentPickerOption => {
  const dateLabel = formatDateLabel(event.next_occurrence_start_date || event.start_date);
  const description = [dateLabel, event.location_name, event.event_type]
    .filter(Boolean)
    .join(' - ');

  return {
    id: event.event_id,
    label: event.event_name || 'Untitled event',
    description,
    matchText: [
      event.event_name,
      event.description,
      event.event_type,
      event.location_name,
      event.city,
      event.state_province,
    ]
      .filter(Boolean)
      .join(' '),
  };
};

const mapTaskToPickerOption = (task: Task): AssignmentPickerOption => {
  const dueDateLabel = formatDateLabel(task.due_date);
  const description = [task.status.replace(/_/g, ' '), task.priority, dueDateLabel]
    .filter(Boolean)
    .join(' - ');

  return {
    id: task.id,
    label: task.subject || 'Untitled task',
    description,
    matchText: [
      task.subject,
      task.description,
      task.priority,
      task.related_to_type,
      task.related_to_name,
    ]
      .filter(Boolean)
      .join(' '),
  };
};

const sortTaskOptions = (left: AssignmentPickerOption, right: AssignmentPickerOption) =>
  left.label.localeCompare(right.label);

const getAssignmentBounds = (
  assignment: Pick<VolunteerAssignment, 'start_time' | 'end_time'>
): { start: Date; end: Date } | null => {
  const start = new Date(assignment.start_time);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = assignment.end_time ? new Date(assignment.end_time) : start;
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
};

const getSelectedWindow = (startValue: string, endValue?: string | null) => {
  if (!startValue) {
    return null;
  }

  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = endValue ? new Date(endValue) : start;
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
};

const assignmentOverlapsWindow = (
  assignment: VolunteerAssignment,
  window: { start: Date; end: Date }
) => {
  const bounds = getAssignmentBounds(assignment);
  if (!bounds) {
    return false;
  }

  return bounds.start <= window.end && bounds.end >= window.start;
};

const buildVolunteerSearchTerms = (volunteer: Volunteer | null) => [
  ...(volunteer?.skills || []),
  ...(volunteer?.preferred_roles || []),
];

const findMatchedVolunteerTerms = (terms: string[], selectedText: string) => {
  const normalizedText = selectedText.toLowerCase();
  const seen = new Set<string>();

  return terms.filter((term) => {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm || seen.has(normalizedTerm)) {
      return false;
    }
    seen.add(normalizedTerm);
    return normalizedText.includes(normalizedTerm);
  });
};

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  assignment,
  volunteerId,
  mode,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentVolunteer } = useAppSelector((state) => state.volunteers.core);
  const { assignments } = useAppSelector((state) => state.volunteers.assignments);

  const [formData, setFormData] = useState<Assignment>({
    volunteer_id: volunteerId,
    event_id: '',
    task_id: '',
    assignment_type: 'general',
    role: '',
    start_time: '',
    end_time: '',
    hours_logged: 0,
    status: 'scheduled',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [eventOptions, setEventOptions] = useState<AssignmentPickerOption[]>([]);
  const [taskOptions, setTaskOptions] = useState<AssignmentPickerOption[]>([]);
  const [eventPickerLoading, setEventPickerLoading] = useState(false);
  const [taskPickerLoading, setTaskPickerLoading] = useState(false);
  const [eventPickerError, setEventPickerError] = useState<string | null>(null);
  const [taskPickerError, setTaskPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!volunteerId) {
      return;
    }

    if (currentVolunteer?.volunteer_id !== volunteerId) {
      void dispatch(fetchVolunteerById(volunteerId));
    }
  }, [currentVolunteer?.volunteer_id, dispatch, volunteerId]);

  useEffect(() => {
    if (!volunteerId) {
      return;
    }

    void dispatch(fetchVolunteerAssignments(volunteerId));
  }, [dispatch, volunteerId]);

  useEffect(() => {
    if (assignment && mode === 'edit') {
      setFormData({
        ...assignment,
        start_time: assignment.start_time
          ? new Date(assignment.start_time).toISOString().slice(0, 16)
          : '',
        end_time: assignment.end_time
          ? new Date(assignment.end_time).toISOString().slice(0, 16)
          : '',
      });
      setIsDirty(false);
    }
  }, [assignment, mode]);

  useEffect(() => {
    if (formData.assignment_type !== 'event') {
      return;
    }

    let cancelled = false;

    const loadEvents = async () => {
      setEventPickerLoading(true);
      setEventPickerError(null);

      try {
        const responses = await Promise.all(
          ACTIVE_EVENT_STATUSES.map((status) =>
            eventsApiClient.listEvents({
              status,
              search: eventSearch.trim() || undefined,
              page: 1,
              limit: 25,
              sortBy: 'start_date',
              sortOrder: 'asc',
            })
          )
        );

        if (!cancelled) {
          const seen = new Set<string>();
          const nextOptions = responses
            .flatMap((response) => response.data || [])
            .filter((event) => {
              if (seen.has(event.event_id)) {
                return false;
              }
              seen.add(event.event_id);
              return true;
            })
            .map(mapEventToPickerOption)
            .slice(0, 25);

          setEventOptions(nextOptions);
        }
      } catch (error) {
        console.error('Failed to load planned or active events:', error);
        if (!cancelled) {
          setEventOptions([]);
          setEventPickerError('Planned and active events could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setEventPickerLoading(false);
        }
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [eventSearch, formData.assignment_type]);

  useEffect(() => {
    if (formData.assignment_type !== 'task') {
      return;
    }

    let cancelled = false;

    const loadTasks = async () => {
      setTaskPickerLoading(true);
      setTaskPickerError(null);

      try {
        const responses = await Promise.all(
          ACTIVE_TASK_STATUSES.map((status) =>
            tasksApiClient.listTasks({
              status,
              search: taskSearch.trim() || undefined,
              page: 1,
              limit: 15,
            })
          )
        );

        if (!cancelled) {
          const seen = new Set<string>();
          const nextOptions = responses
            .flatMap((response) => response.tasks || [])
            .filter((task) => {
              if (seen.has(task.id)) {
                return false;
              }
              seen.add(task.id);
              return true;
            })
            .map(mapTaskToPickerOption)
            .sort(sortTaskOptions)
            .slice(0, 25);

          setTaskOptions(nextOptions);
        }
      } catch (error) {
        console.error('Failed to load active tasks:', error);
        if (!cancelled) {
          setTaskOptions([]);
          setTaskPickerError('Active tasks could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setTaskPickerLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [formData.assignment_type, taskSearch]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !isSubmitting,
  });

  const eventSelectOptions = useMemo(() => {
    if (!formData.event_id || eventOptions.some((option) => option.id === formData.event_id)) {
      return eventOptions;
    }

    return [
      {
        id: formData.event_id,
        label: `Current event (${formData.event_id})`,
        description: 'Previously selected event',
        matchText: formData.event_id,
      },
      ...eventOptions,
    ];
  }, [eventOptions, formData.event_id]);

  const taskSelectOptions = useMemo(() => {
    if (!formData.task_id || taskOptions.some((option) => option.id === formData.task_id)) {
      return taskOptions;
    }

    return [
      {
        id: formData.task_id,
        label: `Current task (${formData.task_id})`,
        description: 'Previously selected task',
        matchText: formData.task_id,
      },
      ...taskOptions,
    ];
  }, [formData.task_id, taskOptions]);

  const volunteerForCues = currentVolunteer?.volunteer_id === volunteerId ? currentVolunteer : null;
  const selectedEvent = eventSelectOptions.find((option) => option.id === formData.event_id);
  const selectedTask = taskSelectOptions.find((option) => option.id === formData.task_id);
  const selectedPickerText = [
    selectedEvent?.label,
    selectedEvent?.description,
    selectedEvent?.matchText,
    selectedTask?.label,
    selectedTask?.description,
    selectedTask?.matchText,
    formData.role,
  ]
    .filter(Boolean)
    .join(' ');
  const matchedVolunteerTerms = findMatchedVolunteerTerms(
    buildVolunteerSearchTerms(volunteerForCues),
    selectedPickerText
  );
  const activeAssignments = assignments.filter(
    (item) =>
      item.assignment_id !== assignment?.assignment_id &&
      item.status !== 'cancelled' &&
      item.status !== 'completed'
  );
  const selectedWindow = getSelectedWindow(formData.start_time, formData.end_time);
  const overlappingAssignments = selectedWindow
    ? activeAssignments.filter((item) => assignmentOverlapsWindow(item, selectedWindow))
    : [];
  const activeAssignmentCount = activeAssignments.length;
  const activeAssignmentLabel = `${activeAssignmentCount} active assignment${
    activeAssignmentCount === 1 ? '' : 's'
  } loaded`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      ...(name === 'assignment_type' && value === 'general' ? { event_id: '', task_id: '' } : {}),
      ...(name === 'assignment_type' && value === 'event' ? { task_id: '' } : {}),
      ...(name === 'assignment_type' && value === 'task' ? { event_id: '' } : {}),
      [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
    setIsDirty(true);

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (formData.assignment_type === 'event' && !formData.event_id) {
      newErrors.event_id = 'Event is required when assignment type is "event"';
    }

    if (formData.assignment_type === 'task' && !formData.task_id) {
      newErrors.task_id = 'Task is required when assignment type is "task"';
    }

    if (formData.end_time && formData.start_time) {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);
      if (endDate < startDate) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up the data
      const cleanedData: Partial<VolunteerAssignment> = {
        volunteer_id: formData.volunteer_id,
        assignment_type: formData.assignment_type,
        start_time: new Date(formData.start_time).toISOString(),
        event_id: formData.event_id || undefined,
        task_id: formData.task_id || undefined,
        role: formData.role || undefined,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        notes: formData.notes || undefined,
      };

      if (mode === 'edit') {
        cleanedData.hours_logged = formData.hours_logged ?? 0;
        cleanedData.status = formData.status || 'scheduled';
      }

      if (mode === 'create') {
        await dispatch(createAssignment(cleanedData)).unwrap();
      } else if (mode === 'edit' && assignment?.assignment_id) {
        await dispatch(
          updateAssignment({
            assignmentId: assignment.assignment_id,
            data: cleanedData,
          })
        ).unwrap();
      }

      // Navigate back to volunteer detail page
      setIsDirty(false);
      navigate(`/volunteers/${volunteerId}`);
    } catch (error) {
      console.error('Failed to save assignment:', error);
      setErrors({ submit: 'Failed to save assignment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/volunteers/${volunteerId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-app-accent-soft border border-app-border text-app-accent-text px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Assignment Type and References */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Assignment Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="assignment_type"
              className="block text-sm font-medium text-app-text-label"
            >
              Assignment Type *
            </label>
            <select
              name="assignment_type"
              id="assignment_type"
              value={formData.assignment_type}
              onChange={handleChange}
              disabled={mode === 'edit'}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm disabled:bg-app-surface-muted"
            >
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="task">Task</option>
            </select>
            <p className="mt-1 text-sm text-app-text-muted">
              {formData.assignment_type === 'event' &&
                'Volunteer will be assigned to a specific event'}
              {formData.assignment_type === 'task' &&
                'Volunteer will be assigned to a specific task'}
              {formData.assignment_type === 'general' &&
                'General volunteer assignment not tied to an event or task'}
            </p>
          </div>

          <section className="sm:col-span-2 rounded-md border border-app-border bg-app-surface-muted p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-app-text-heading">Volunteer fit cues</h3>
                {volunteerForCues ? (
                  <p className="mt-1 text-sm text-app-text-muted">
                    Availability is {formatStatusLabel(volunteerForCues.availability_status)}
                    {volunteerForCues.max_hours_per_week
                      ? ` with ${volunteerForCues.max_hours_per_week} hours per week max`
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
                {selectedWindow ? (
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

            {volunteerForCues?.availability_notes && (
              <p className="mt-3 text-sm text-app-text-muted">
                Availability notes: {volunteerForCues.availability_notes}
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-app-text-muted">Skills</p>
                <p className="mt-1 text-sm text-app-text">
                  {volunteerForCues?.skills?.length
                    ? volunteerForCues.skills.slice(0, 6).join(', ')
                    : 'No skills listed'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-app-text-muted">
                  Assignment match
                </p>
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

          {formData.assignment_type === 'event' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="event_search"
                className="block text-sm font-medium text-app-text-label"
              >
                Search Events
              </label>
              <input
                type="text"
                name="event_search"
                id="event_search"
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                placeholder="Search by event name"
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              />

              <label
                htmlFor="event_id"
                className="mt-4 block text-sm font-medium text-app-text-label"
              >
                Event *
              </label>
              <select
                name="event_id"
                id="event_id"
                value={formData.event_id ?? ''}
                onChange={handleChange}
                className={`mt-1 block w-full border ${
                  errors.event_id ? 'border-app-border' : 'border-app-input-border'
                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
              >
                <option value="">
                  {eventPickerLoading ? 'Loading events...' : 'Select an event'}
                </option>
                {eventSelectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.description ? `${option.label} - ${option.description}` : option.label}
                  </option>
                ))}
              </select>
              {errors.event_id && <p className="mt-1 text-sm text-app-accent">{errors.event_id}</p>}
              {eventPickerError && (
                <p className="mt-1 text-sm text-app-accent">{eventPickerError}</p>
              )}
              <p className="mt-1 text-sm text-app-text-muted">
                Planned and active events are shown. Search narrows the list without changing the
                saved event ID.
              </p>
            </div>
          )}

          {formData.assignment_type === 'task' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="task_search"
                className="block text-sm font-medium text-app-text-label"
              >
                Search Active Tasks
              </label>
              <input
                type="text"
                name="task_search"
                id="task_search"
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                placeholder="Search by task subject"
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              />

              <label
                htmlFor="task_id"
                className="mt-4 block text-sm font-medium text-app-text-label"
              >
                Task *
              </label>
              <select
                name="task_id"
                id="task_id"
                value={formData.task_id ?? ''}
                onChange={handleChange}
                className={`mt-1 block w-full border ${
                  errors.task_id ? 'border-app-border' : 'border-app-input-border'
                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
              >
                <option value="">
                  {taskPickerLoading ? 'Loading active tasks...' : 'Select an active task'}
                </option>
                {taskSelectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.description ? `${option.label} - ${option.description}` : option.label}
                  </option>
                ))}
              </select>
              {errors.task_id && <p className="mt-1 text-sm text-app-accent">{errors.task_id}</p>}
              {taskPickerError && <p className="mt-1 text-sm text-app-accent">{taskPickerError}</p>}
              <p className="mt-1 text-sm text-app-text-muted">
                Active task results include not started, in progress, and waiting tasks.
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="role" className="block text-sm font-medium text-app-text-label">
              Role
            </label>
            <input
              type="text"
              name="role"
              id="role"
              value={formData.role ?? ''}
              onChange={handleChange}
              placeholder="e.g., Team Leader, Registration Assistant, Setup Crew"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Schedule</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-app-text-label">
              Start Time *
            </label>
            <input
              type="datetime-local"
              name="start_time"
              id="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.start_time ? 'border-app-border' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-app-accent">{errors.start_time}</p>
            )}
          </div>

          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-app-text-label">
              End Time
            </label>
            <input
              type="datetime-local"
              name="end_time"
              id="end_time"
              value={formData.end_time ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.end_time ? 'border-app-border' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.end_time && <p className="mt-1 text-sm text-app-accent">{errors.end_time}</p>}
          </div>
        </div>
      </div>

      {/* Status and Hours (Edit Mode Only) */}
      {mode === 'edit' && (
        <div className="bg-app-surface shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-app-text-heading mb-4">Status and Hours</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-app-text-label">
                Status
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="hours_logged"
                className="block text-sm font-medium text-app-text-label"
              >
                Hours Logged
              </label>
              <input
                type="number"
                name="hours_logged"
                id="hours_logged"
                min="0"
                step="0.5"
                value={formData.hours_logged || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Notes</h2>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-app-text-label">
            Additional Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes ?? ''}
            onChange={handleChange}
            placeholder="Any additional information about this assignment..."
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-app-surface py-2 px-4 border border-app-border rounded-md shadow-sm text-sm font-medium text-app-text-label hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-app-accent py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent disabled:bg-app-text-subtle disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Assignment'
              : 'Update Assignment'}
        </button>
      </div>
    </form>
  );
};
