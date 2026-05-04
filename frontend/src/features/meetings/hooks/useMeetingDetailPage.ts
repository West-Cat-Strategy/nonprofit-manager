import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingsApiClient } from '../api/meetingsApiClient';
import type { MeetingDetail } from '../types/meeting';

type MinutesDraftStatus = 'idle' | 'generating' | 'ready' | 'copied' | 'downloaded' | 'error';

const getMinutesDraftFilename = (meeting: MeetingDetail | null, id: string | undefined): string => {
  const title = meeting?.meeting.title || (id ? `meeting-${id}` : 'meeting');
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'meeting'}-minutes-draft.md`;
};

export const useMeetingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minutesDraftMarkdown, setMinutesDraftMarkdown] = useState<string | null>(null);
  const [minutesDraftStatus, setMinutesDraftStatus] = useState<MinutesDraftStatus>('idle');
  const [minutesDraftMessage, setMinutesDraftMessage] = useState<string | null>(null);
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
      setMinutesDraftStatus('generating');
      setMinutesDraftMessage(null);
      const { markdown } = await meetingsApiClient.generateMinutesDraft(id);
      setMinutesDraftMarkdown(markdown);
      setMinutesDraftStatus('ready');
      setMinutesDraftMessage('Minutes draft ready for review.');
    } catch {
      setMinutesDraftStatus('error');
      setMinutesDraftMessage('Failed to generate minutes draft.');
    }
  };

  const copyMinutesDraft = async () => {
    if (!minutesDraftMarkdown) return;

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setMinutesDraftStatus('error');
      setMinutesDraftMessage('Clipboard is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(minutesDraftMarkdown);
      setMinutesDraftStatus('copied');
      setMinutesDraftMessage('Minutes markdown copied.');
    } catch {
      setMinutesDraftStatus('error');
      setMinutesDraftMessage('Failed to copy minutes markdown.');
    }
  };

  const downloadMinutesDraft = () => {
    if (!minutesDraftMarkdown || typeof document === 'undefined') return;

    const url = window.URL.createObjectURL(
      new Blob([minutesDraftMarkdown], { type: 'text/markdown;charset=utf-8' })
    );

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = getMinutesDraftFilename(meeting, id);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMinutesDraftStatus('downloaded');
      setMinutesDraftMessage('Minutes markdown download started.');
    } catch {
      setMinutesDraftStatus('error');
      setMinutesDraftMessage('Failed to download minutes markdown.');
    } finally {
      window.URL.revokeObjectURL(url);
    }
  };

  return {
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
    refresh: fetchDetail,
  };
};
