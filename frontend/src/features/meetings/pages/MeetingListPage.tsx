import React from 'react';
import {
  BrutalCard,
  BrutalButton,
  BrutalBadge,
  NeoBrutalistLayout,
} from '../../../components/neo-brutalist';
import { useMeetingListPage } from '../hooks/useMeetingListPage';
import { LoadingState, ErrorState } from '../../../components/ui/State';

const MeetingListPage: React.FC = () => {
  const { meetings, loading, error, onCreateNew, onRowClick } = useMeetingListPage();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <NeoBrutalistLayout pageTitle="Meetings">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase mb-2">Meetings</h1>
          <p className="text-xl font-bold opacity-80">Manage board, committee, and general meetings</p>
        </div>
        <BrutalButton variant="primary" onClick={onCreateNew}>
          Create Meeting
        </BrutalButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
          <BrutalCard className="col-span-full py-12 text-center">
            <p className="text-xl font-bold mb-4">No meetings scheduled</p>
            <BrutalButton variant="primary" onClick={onCreateNew}>
              Schedule your first meeting
            </BrutalButton>
          </BrutalCard>
        ) : (
          meetings.map((meeting) => (
            <BrutalCard
              key={meeting.id}
              onClick={() => onRowClick(meeting.id)}
              className="cursor-pointer hover:translate-x-1 hover:-translate-y-1 transition-transform"
            >
              <div className="p-6 flex flex-col gap-2">
                <h3 className="text-xl font-black uppercase mb-2">{meeting.title}</h3>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">
                    {new Date(meeting.starts_at).toLocaleDateString()}
                  </span>
                  <BrutalBadge color={getStatusColor(meeting.status)}>
                    {meeting.status}
                  </BrutalBadge>
                </div>
                <p className="text-sm opacity-80">
                  {meeting.location || 'No location set'}
                </p>
                <BrutalBadge color="gray" className="w-fit mt-2">
                  {meeting.meeting_type.toUpperCase()}
                </BrutalBadge>
              </div>
            </BrutalCard>
          ))
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

const getStatusColor = (status: string): 'yellow' | 'green' | 'red' | 'gray' | 'purple' | 'blue' => {
  switch (status) {
    case 'scheduled': return 'blue';
    case 'in_progress': return 'yellow';
    case 'completed': return 'green';
    case 'cancelled': return 'red';
    default: return 'gray';
  }
};

export default MeetingListPage;
