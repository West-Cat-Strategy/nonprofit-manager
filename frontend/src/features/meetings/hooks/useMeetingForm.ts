import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingsApiClient } from '../api/meetingsApiClient';
import type { Meeting, Committee } from '../types/meeting';

export const useMeetingForm = (isEdit = false) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Meeting>>({
    title: '',
    meeting_type: 'committee',
    starts_at: new Date().toISOString().slice(0, 16),
    location: '',
    committee_id: '',
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const comms = await meetingsApiClient.listCommittees();
        setCommittees(comms);

        if (isEdit && id) {
          const meetingDetail = await meetingsApiClient.getMeetingDetail(id);
          const meeting = meetingDetail.meeting;
          setFormData({
            ...meeting,
            starts_at: new Date(meeting.starts_at).toISOString().slice(0, 16),
            ends_at: meeting.ends_at ? new Date(meeting.ends_at).toISOString().slice(0, 16) : '',
          });
        }
      } catch (err) {
        console.error('Failed to load form data', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isEdit, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit && id) {
        await meetingsApiClient.updateMeeting(id, formData);
        navigate(`/meetings/${id}`);
      } else {
        const newMeeting = await meetingsApiClient.createMeeting(formData);
        navigate(`/meetings/${newMeeting.id}`);
      }
    } catch (err) {
      alert('Failed to save meeting');
      setSubmitting(false);
    }
  };

  const onCancel = () => {
    if (isEdit) {
      navigate(`/meetings/${id}`);
    } else {
      navigate('/meetings');
    }
  };

  return {
    formData,
    committees,
    loading,
    submitting,
    handleChange,
    handleSubmit,
    onCancel,
  };
};
