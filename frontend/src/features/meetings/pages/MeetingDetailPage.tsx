import React from 'react';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  MapPinIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import {
  BrutalCard,
  BrutalButton,
  BrutalBadge,
  NeoBrutalistLayout,
} from '../../../components/neo-brutalist';
import { useMeetingDetailPage } from '../hooks/useMeetingDetailPage';
import { LoadingState, ErrorState } from '../../../components/ui/State';

const MeetingDetailPage: React.FC = () => {
  const {
    meeting,
    loading,
    error,
    minutesDraftMarkdown,
    minutesDraftStatus,
    minutesDraftMessage,
    onEdit,
    onBack,
    generateMinutes,
    copyMinutesDraft,
    downloadMinutesDraft,
  } = useMeetingDetailPage();

  if (loading) return <LoadingState />;
  if (error || !meeting) return <ErrorState message={error || 'Meeting not found'} />;

  const hasMinutesDraft = Boolean(minutesDraftMarkdown);
  const isGeneratingMinutes = minutesDraftStatus === 'generating';

  return (
    <NeoBrutalistLayout pageTitle={meeting.meeting.title}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase mb-2">{meeting.meeting.title}</h1>
          <p className="text-xl font-bold opacity-80">
            {meeting.meeting.meeting_type.toUpperCase()} Meeting -{' '}
            {new Date(meeting.meeting.starts_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-4">
          <BrutalButton variant="secondary" onClick={onBack}>
            <ArrowLeftIcon className="mr-2 inline h-5 w-5" aria-hidden="true" />
            Back
          </BrutalButton>
          <BrutalButton variant="primary" onClick={onEdit}>
            <PencilSquareIcon className="mr-2 inline h-5 w-5" aria-hidden="true" />
            Edit Meeting
          </BrutalButton>
          <BrutalButton variant="success" onClick={generateMinutes} disabled={isGeneratingMinutes}>
            <DocumentTextIcon className="mr-2 inline h-5 w-5" aria-hidden="true" />
            {isGeneratingMinutes ? 'Drafting...' : 'Draft Minutes'}
          </BrutalButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Agenda */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <BrutalCard>
            <div className="p-6">
              <h2 className="text-2xl font-black uppercase mb-6">Agenda Items</h2>
              {meeting.agenda_items.length === 0 ? (
                <p className="opacity-60 italic">No agenda items added yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {meeting.agenda_items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold">
                          {index + 1}. {item.title}
                        </h4>
                        <BrutalBadge color="gray">{item.duration_minutes}m</BrutalBadge>
                      </div>
                      {item.description && <p className="text-sm mt-2">{item.description}</p>}

                      {/* Motions for this item */}
                      {meeting.motions
                        .filter((m) => m.agenda_item_id === item.id)
                        .map((motion) => (
                          <div key={motion.id} className="mt-3 pl-4 border-l-4 border-black">
                            <p className="text-sm font-bold">Motion: {motion.text}</p>
                            <BrutalBadge
                              color={motion.status === 'passed' ? 'green' : 'gray'}
                              className="mt-1"
                            >
                              {motion.status.toUpperCase()}
                            </BrutalBadge>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BrutalCard>

          {(hasMinutesDraft || minutesDraftMessage) && (
            <BrutalCard>
              <div className="p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black uppercase">Minutes Draft Preview</h2>
                    {minutesDraftMessage && (
                      <p
                        className="mt-2 text-sm font-bold"
                        role={minutesDraftStatus === 'error' ? 'alert' : 'status'}
                        aria-live="polite"
                      >
                        {minutesDraftMessage}
                      </p>
                    )}
                  </div>
                  {hasMinutesDraft && (
                    <div className="flex flex-wrap gap-3">
                      <BrutalButton variant="secondary" size="sm" onClick={copyMinutesDraft}>
                        <ClipboardDocumentIcon className="mr-2 inline h-4 w-4" aria-hidden="true" />
                        Copy
                      </BrutalButton>
                      <BrutalButton variant="secondary" size="sm" onClick={downloadMinutesDraft}>
                        <ArrowDownTrayIcon className="mr-2 inline h-4 w-4" aria-hidden="true" />
                        Download Markdown
                      </BrutalButton>
                    </div>
                  )}
                </div>
                {hasMinutesDraft && (
                  <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm leading-6 shadow-[4px_4px_0px_var(--shadow-color)]">
                    {minutesDraftMarkdown}
                  </pre>
                )}
              </div>
            </BrutalCard>
          )}
        </div>

        {/* Right Column: Info & Action Items */}
        <div className="flex flex-col gap-8">
          <BrutalCard>
            <div className="p-6">
              <h2 className="text-xl font-black uppercase mb-4">Meeting Info</h2>
              <div className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Location</label>
                  <p className="font-bold">
                    <MapPinIcon className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {meeting.meeting.location || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Status</label>
                  <BrutalBadge color={getStatusColor(meeting.meeting.status)}>
                    {meeting.meeting.status}
                  </BrutalBadge>
                </div>
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Committee</label>
                  <p className="font-bold">
                    <CalendarDaysIcon className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {meeting.committee?.name || 'None'}
                  </p>
                </div>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard>
            <div className="p-6">
              <h2 className="text-xl font-black uppercase mb-4">Action Items</h2>
              {meeting.action_items.length === 0 ? (
                <p className="opacity-60 italic">No action items assigned.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {meeting.action_items.map((item) => (
                    <div
                      key={item.id}
                      className="text-sm p-3 border-2 border-black bg-app-surface shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <p className="font-bold">{item.subject}</p>
                      <p className="opacity-70 mt-1">
                        <ClipboardDocumentCheckIcon
                          className="mr-1 inline h-4 w-4"
                          aria-hidden="true"
                        />
                        Due:{' '}
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}
                      </p>
                      <BrutalBadge
                        color={item.status === 'completed' ? 'green' : 'yellow'}
                        size="sm"
                        className="mt-2"
                      >
                        {item.status}
                      </BrutalBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BrutalCard>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
};

const getStatusColor = (
  status: string
): 'yellow' | 'green' | 'red' | 'gray' | 'purple' | 'blue' => {
  switch (status) {
    case 'scheduled':
      return 'blue';
    case 'in_progress':
      return 'yellow';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
};

export default MeetingDetailPage;
