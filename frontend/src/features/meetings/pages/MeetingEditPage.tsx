import React from 'react';
import {
  BrutalCard,
  BrutalButton,
  BrutalFormInput,
  BrutalFormSelect,
  NeoBrutalistLayout,
} from '../../../components/neo-brutalist';
import { useMeetingForm } from '../hooks/useMeetingForm';
import { LoadingState } from '../../../components/ui/State';

const MeetingEditPage: React.FC = () => {
  const { formData, committees, loading, submitting, handleChange, handleSubmit, onCancel } = useMeetingForm(true);

  if (loading) return <LoadingState />;

  return (
    <NeoBrutalistLayout pageTitle="Edit Meeting">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase mb-2">Edit Meeting</h1>
        <p className="text-xl font-bold opacity-80">Updating: {formData.title}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <BrutalCard>
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase mb-6">Update Meeting Details</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <BrutalFormInput
              label="Meeting Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BrutalFormSelect
                label="Meeting Type"
                name="meeting_type"
                value={formData.meeting_type}
                onChange={handleChange}
                options={[
                  { label: 'Committee', value: 'committee' },
                  { label: 'Board', value: 'board' },
                  { label: 'AGM', value: 'agm' },
                ]}
              />

              <BrutalFormSelect
                label="Status"
                name="status"
                value={formData.status || 'draft'}
                onChange={handleChange}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Scheduled', value: 'scheduled' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
            </div>

            <BrutalFormSelect
              label="Committee"
              name="committee_id"
              value={formData.committee_id || ''}
              onChange={handleChange}
              options={[
                { label: 'None / External', value: '' },
                ...committees.map(c => ({ label: c.name, value: c.id }))
              ]}
            />

            <BrutalFormInput
              label="Starts At"
              name="starts_at"
              type="datetime-local"
              value={formData.starts_at}
              onChange={handleChange}
              required
            />

            <BrutalFormInput
              label="Location"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
            />

            <div className="flex gap-4 mt-4">
              <BrutalButton variant="secondary" onClick={onCancel} type="button">
                Cancel
              </BrutalButton>
              <BrutalButton variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </BrutalButton>
            </div>
          </form>
        </div>
        </BrutalCard>
      </div>
    </NeoBrutalistLayout>
  );
};

export default MeetingEditPage;
