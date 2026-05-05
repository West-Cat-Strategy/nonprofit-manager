import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingsApiClient } from '../api/meetingsApiClient';
import type { MeetingDetail } from '../types/meeting';

const slugifyForFilename = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'meeting';
};

const buildMinutesDraftFilename = (meetingDetail: MeetingDetail | null): string => {
  if (!meetingDetail) return 'meeting-minutes-draft.md';

  const date = meetingDetail.meeting.starts_at.slice(0, 10) || 'undated';
  const title = slugifyForFilename(meetingDetail.meeting.title);

  return `${date}-${title}-minutes-draft.md`;
};

export const useMeetingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minutesDraftMarkdown, setMinutesDraftMarkdown] = useState<string | null>(null);
  const [minutesDraftLoading, setMinutesDraftLoading] = useState(false);
  const [minutesDraftError, setMinutesDraftError] = useState<string | null>(null);
  const [minutesDraftCopied, setMinutesDraftCopied] = useState(false);
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
      setMinutesDraftLoading(true);
      setMinutesDraftError(null);
      setMinutesDraftCopied(false);
      const { markdown } = await meetingsApiClient.generateMinutesDraft(id);
      setMinutesDraftMarkdown(markdown);
    } catch {
      setMinutesDraftError('Failed to generate minutes draft');
    } finally {
      setMinutesDraftLoading(false);
    }
  };

  const copyMinutesDraft = async () => {
    if (!minutesDraftMarkdown) return;

    if (!navigator.clipboard?.writeText) {
      setMinutesDraftError('Clipboard copy is not available in this browser');
      return;
    }

    try {
      await navigator.clipboard.writeText(minutesDraftMarkdown);
      setMinutesDraftCopied(true);
      setMinutesDraftError(null);
    } catch {
      setMinutesDraftCopied(false);
      setMinutesDraftError('Failed to copy minutes draft');
    }
  };

  const downloadMinutesDraft = () => {
    if (!minutesDraftMarkdown) return;

    try {
      const blob = new Blob([minutesDraftMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = buildMinutesDraftFilename(meeting);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMinutesDraftError(null);
    } catch {
      setMinutesDraftError('Failed to download minutes draft');
    }
  };

  const closeMinutesDraft = () => {
    setMinutesDraftMarkdown(null);
    setMinutesDraftError(null);
    setMinutesDraftCopied(false);
  };

  return {
    meeting,
    loading,
    error,
    onEdit,
    onBack,
    generateMinutes,
    minutesDraftMarkdown,
    minutesDraftLoading,
    minutesDraftError,
    minutesDraftCopied,
    copyMinutesDraft,
    downloadMinutesDraft,
    closeMinutesDraft,
    refresh: fetchDetail,
  };
};
