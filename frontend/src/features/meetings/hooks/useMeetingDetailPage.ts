import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingsApiClient } from '../api/meetingsApiClient';
import type { MeetingDetail } from '../types/meeting';

export const useMeetingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await meetingsApiClient.getMeetingDetail(id);
      setMeeting(data);
      setError(null);
    } catch (err) {
      setError('Failed to load meeting details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onEdit = () => {
    navigate(`/meetings/${id}/edit`);
  };

  const onBack = () => {
    navigate('/meetings');
  };

  const generateMinutes = async () => {
    if (!id) return;
    try {
      const { markdown } = await meetingsApiClient.generateMinutesDraft(id);
      // In a real app, we'd probably open a modal or navigate to a preview page
      console.log('Minutes Draft:', markdown);
      alert('Minutes draft generated! Check console for markdown.');
    } catch {
      alert('Failed to generate minutes');
    }
  };

  return {
    meeting,
    loading,
    error,
    onEdit,
    onBack,
    generateMinutes,
    refresh: fetchDetail,
  };
};
