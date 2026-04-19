import React from 'react';
import {
  BrutalCard,
  BrutalButton,
  BrutalBadge,
  NeoBrutalistLayout,
} from '../../../components/neo-brutalist';
import { useMeetingDetailPage } from '../hooks/useMeetingDetailPage';
import { LoadingState, ErrorState } from '../../../components/ui/State';

const MeetingDetailPage: React.FC = () => {
  const { meeting, loading, error, onEdit, onBack, generateMinutes } = useMeetingDetailPage();

  if (loading) return <LoadingState />;
  if (error || !meeting) return <ErrorState message={error || 'Meeting not found'} />;

  return (
    <NeoBrutalistLayout pageTitle={meeting.meeting.title}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase mb-2">{meeting.meeting.title}</h1>
          <p className="text-xl font-bold opacity-80">
            {meeting.meeting.meeting_type.toUpperCase()} Meeting - {new Date(meeting.meeting.starts_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-4">
          <BrutalButton variant="secondary" onClick={onBack}>
            Back
          </BrutalButton>
          <BrutalButton variant="primary" onClick={onEdit}>
            Edit Meeting
          </BrutalButton>
          <BrutalButton variant="success" onClick={generateMinutes}>
            Draft Minutes
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
                    <div key={item.id} className="p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold">{index + 1}. {item.title}</h4>
                        <BrutalBadge color="gray">{item.duration_minutes}m</BrutalBadge>
                      </div>
                      {item.description && <p className="text-sm mt-2">{item.description}</p>}
                      
                      {/* Motions for this item */}
                      {meeting.motions.filter(m => m.agenda_item_id === item.id).map(motion => (
                        <div key={motion.id} className="mt-3 pl-4 border-l-4 border-black">
                          <p className="text-sm font-bold">Motion: {motion.text}</p>
                          <BrutalBadge color={motion.status === 'passed' ? 'green' : 'gray'} className="mt-1">
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
        </div>

        {/* Right Column: Info & Action Items */}
        <div className="flex flex-col gap-8">
          <BrutalCard>
            <div className="p-6">
              <h2 className="text-xl font-black uppercase mb-4">Meeting Info</h2>
              <div className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Location</label>
                  <p className="font-bold">{meeting.meeting.location || 'Not specified'}</p>
                </div>
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Status</label>
                  <BrutalBadge color={getStatusColor(meeting.meeting.status)}>{meeting.meeting.status}</BrutalBadge>
                </div>
                <div>
                  <label className="font-bold block uppercase text-xs opacity-60">Committee</label>
                  <p className="font-bold">{meeting.committee?.name || 'None'}</p>
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
                  {meeting.action_items.map(item => (
                    <div key={item.id} className="text-sm p-3 border-2 border-black bg-app-surface shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <p className="font-bold">{item.subject}</p>
                      <p className="opacity-70 mt-1">Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}</p>
                      <BrutalBadge color={item.status === 'completed' ? 'green' : 'yellow'} size="sm" className="mt-2">
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

const getStatusColor = (status: string): 'yellow' | 'green' | 'red' | 'gray' | 'purple' | 'blue' => {
  switch (status) {
    case 'scheduled': return 'blue';
    case 'in_progress': return 'yellow';
    case 'completed': return 'green';
    case 'cancelled': return 'red';
    default: return 'gray';
  }
};

export default MeetingDetailPage;
