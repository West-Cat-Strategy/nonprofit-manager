import { useState, useEffect, useCallback } from 'react';
import { meetingsApiClient } from '../api/meetingsApiClient';
import type { Meeting } from '../types/meeting';
import { useNavigate } from 'react-router-dom';

export const useMeetingListPage = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await meetingsApiClient.listMeetings();
      setMeetings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load meetings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const onCreateNew = () => {
    navigate('/meetings/new');
  };

  const onRowClick = (meetingId: string) => {
    navigate(`/meetings/${meetingId}`);
  };

  return {
    meetings,
    loading,
    error,
    onCreateNew,
    onRowClick,
    refresh: fetchMeetings,
  };
};
