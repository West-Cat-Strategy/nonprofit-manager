import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createDefaultEmailBuilderContent } from '../../builder/components/emailCampaignBuilderDefaults';
import type {
  CampaignRun,
  CampaignTestSendRequest,
  CampaignTestSendResponse,
  CommunicationProvider,
  CreateCampaignRequest,
  MailchimpCampaignPreview,
  MailchimpList,
  MailchimpSegment,
  SavedAudience,
} from '../../../types/mailchimp';

export type CampaignCreateModalProps = {
  lists: MailchimpList[];
  segments: MailchimpSegment[];
  savedAudiences: SavedAudience[];
  campaignRuns: CampaignRun[];
  provider: CommunicationProvider;
  isDeliveryReady: boolean;
  deliveryReadinessMessage?: string;
  isCreatingCampaign: boolean;
  isSendingCampaign: boolean;
  isTestingCampaign: boolean;
  onClose: () => void;
  onListChange: (listId: string) => void;
  onPreview: (data: CreateCampaignRequest) => Promise<MailchimpCampaignPreview>;
  onTestSend: (data: CampaignTestSendRequest) => Promise<CampaignTestSendResponse>;
  onSubmit: (data: CreateCampaignRequest, sendNow: boolean) => Promise<void> | void;
};

export type TargetingMode = 'all' | 'provider_segment' | 'saved_audience';
export type SubmitIntent = 'draft_or_schedule' | 'send_now';

export function useCampaignCreateModalForm({
  lists,
  segments,
  savedAudiences,
  campaignRuns,
  provider,
  isDeliveryReady,
  deliveryReadinessMessage,
  isCreatingCampaign,
  isSendingCampaign,
  isTestingCampaign,
  onClose,
  onListChange,
  onPreview,
  onTestSend,
  onSubmit,
}: CampaignCreateModalProps) {
  const dialogTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const previewResultRef = useRef<MailchimpCampaignPreview | null>(null);
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    listId: lists[0]?.id || '',
    title: '',
    subject: '',
    previewText: '',
    fromName: '',
    replyTo: '',
    htmlContent: '',
    plainTextContent: '',
    builderContent: createDefaultEmailBuilderContent(),
    segmentId: undefined,
    sendTime: undefined,
    includeAudienceId: undefined,
    exclusionAudienceIds: [],
    priorRunSuppressionIds: [],
    suppressionSnapshot: [],
    testRecipients: [],
    audienceSnapshot: {},
  });
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [compositionMode, setCompositionMode] = useState<'builder' | 'html'>('builder');
  const [previewResult, setPreviewResult] = useState<MailchimpCampaignPreview | null>(null);
  const [testSendResult, setTestSendResult] = useState<CampaignTestSendResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isCampaignSubmitPending = isCreatingCampaign || isSendingCampaign;
  const isCampaignActionPending = isPreviewing || isTestingCampaign || isCampaignSubmitPending;
  const isLocalDeliveryBlocked = provider === 'local_email' && !isDeliveryReady;
  const localDeliveryBlockedMessage =
    deliveryReadinessMessage ||
    'Configure SMTP before sending local campaign tests or live sends.';

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previewResultRef.current = previewResult;
  }, [previewResult]);

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !previewResultRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (!isCampaignSubmitPending) {
      setSubmitIntent(null);
    }
  }, [isCampaignSubmitPending]);

  useEffect(() => {
    if (!formData.listId && lists[0]?.id) {
      setFormData((prev) => ({ ...prev, listId: lists[0].id }));
      onListChange(lists[0].id);
    }
  }, [formData.listId, lists, onListChange]);

  const savedAudiencesForList = useMemo(
    () =>
      savedAudiences.filter(
        (audience) =>
          audience.status === 'active' &&
          typeof audience.filters.listId === 'string' &&
          audience.filters.listId === formData.listId
      ),
    [formData.listId, savedAudiences]
  );

  const selectedIncludeAudience = savedAudiencesForList.find(
    (audience) => audience.id === formData.includeAudienceId
  );

  const suppressiblePriorRuns = useMemo(
    () =>
      campaignRuns.filter(
        (run) =>
          run.listId === formData.listId &&
          Array.isArray(run.audienceSnapshot.targetContactIds) &&
          run.audienceSnapshot.targetContactIds.length > 0
      ),
    [campaignRuns, formData.listId]
  );

  const selectedExclusionAudiences = (formData.exclusionAudienceIds || [])
    .map((audienceId) => savedAudiencesForList.find((audience) => audience.id === audienceId))
    .filter((audience): audience is SavedAudience => Boolean(audience));
  const cleanedTestRecipients = (formData.testRecipients || [])
    .map((recipient) => recipient.trim())
    .filter(Boolean);
  const selectedList = lists.find((list) => list.id === formData.listId);
  const preflightAudienceLabel =
    targetingMode === 'saved_audience'
      ? selectedIncludeAudience
        ? `${selectedIncludeAudience.name} (${selectedIncludeAudience.sourceCount.toLocaleString()} contacts)`
        : 'Saved audience not selected'
      : targetingMode === 'provider_segment'
        ? segments.find((segment) => segment.id === formData.segmentId)?.name || 'Provider segment not selected'
        : selectedList
          ? `${provider === 'local_email' ? 'All eligible CRM contacts' : 'All subscribers'} in ${selectedList.name}`
          : 'Delivery audience not selected';

  const hasBuilderContent = (data: CreateCampaignRequest): boolean =>
    Boolean(
      data.builderContent?.blocks.some((block) => {
        switch (block.type) {
          case 'heading':
          case 'paragraph':
            return Boolean(block.content.trim());
          case 'button':
            return Boolean(block.label.trim() && block.url.trim());
          case 'image':
            return Boolean(block.src.trim());
          case 'divider':
            return true;
        }
      })
    );

  const buildRequest = (shouldSendNow: boolean): CreateCampaignRequest => {
    const sendTime = shouldSendNow ? undefined : formData.sendTime;
    const testRecipients = (formData.testRecipients || [])
      .map((recipient) => recipient.trim())
      .filter(Boolean);
    const audienceSnapshot = {
      ...(formData.audienceSnapshot || {}),
      listId: formData.listId,
      provider,
      targetingMode:
        targetingMode === 'saved_audience'
          ? 'saved_audience'
          : targetingMode === 'provider_segment'
            ? 'provider_segment'
            : 'all_subscribers',
      testRecipientCount: testRecipients.length,
    };

    if (compositionMode === 'builder') {
      return {
        ...formData,
        provider,
        htmlContent: undefined,
        plainTextContent: undefined,
        builderContent: formData.builderContent,
        sendTime,
        testRecipients,
        audienceSnapshot,
      };
    }

    return {
      ...formData,
      provider,
      builderContent: undefined,
      htmlContent: formData.htmlContent?.trim() || undefined,
      plainTextContent: formData.plainTextContent?.trim() || undefined,
      sendTime,
      testRecipients,
      audienceSnapshot,
    };
  };

  const validateForm = (shouldSendNow: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    const isScheduledDelivery = !shouldSendNow && Boolean(formData.sendTime);

    if (!formData.listId) newErrors.listId = 'Please select a delivery audience';
    if (!formData.title.trim()) newErrors.title = 'Campaign title is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject line is required';
    if (!formData.fromName.trim()) newErrors.fromName = 'From name is required';
    if (!formData.replyTo.trim()) {
      newErrors.replyTo = 'Reply-to email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.replyTo)) {
      newErrors.replyTo = 'Invalid email address';
    }

    if (compositionMode === 'builder') {
      if (!hasBuilderContent(formData)) {
        newErrors.content = 'Add at least one meaningful builder block before sending or previewing.';
      }
    } else if (!formData.htmlContent?.trim() && !formData.plainTextContent?.trim()) {
      newErrors.content = 'Add HTML or plain text content before sending or previewing.';
    }

    if (!shouldSendNow && formData.sendTime) {
      const sendDate = new Date(formData.sendTime);
      if (sendDate <= new Date()) {
        newErrors.sendTime = 'Send time must be in the future';
      }
    }

    if (isLocalDeliveryBlocked && (shouldSendNow || isScheduledDelivery)) {
      newErrors.delivery = localDeliveryBlockedMessage;
    }

    if (targetingMode === 'provider_segment' && provider !== 'mailchimp') {
      newErrors.targeting = 'Provider segments are available only when Mailchimp is selected.';
    } else if (targetingMode === 'provider_segment' && !formData.segmentId) {
      newErrors.targeting = 'Choose a provider segment or use all subscribers.';
    }

    if (targetingMode === 'saved_audience' && !formData.includeAudienceId) {
      newErrors.targeting = 'Choose a saved audience for campaign delivery.';
    }

    if (
      targetingMode === 'saved_audience' &&
      formData.includeAudienceId &&
      formData.exclusionAudienceIds?.includes(formData.includeAudienceId)
    ) {
      newErrors.targeting = 'A saved audience cannot suppress itself.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent, shouldSendNow: boolean) => {
    e.preventDefault();
    if (!isCampaignActionPending && validateForm(shouldSendNow)) {
      setSubmitIntent(shouldSendNow ? 'send_now' : 'draft_or_schedule');
      onSubmit(buildRequest(shouldSendNow), shouldSendNow);
    }
  };

  const handlePreview = async () => {
    if (isCampaignActionPending) {
      return;
    }

    if (!validateForm(false)) {
      return;
    }

    try {
      setIsPreviewing(true);
      const preview = await onPreview(buildRequest(false));
      setErrors((prev) => ({ ...prev, content: '' }));
      setPreviewResult(preview);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        content: typeof error === 'string' ? error : 'Failed to render preview.',
      }));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleTestSend = async () => {
    if (isCampaignActionPending) {
      return;
    }

    if (isLocalDeliveryBlocked) {
      setErrors((prev) => ({
        ...prev,
        delivery: localDeliveryBlockedMessage,
      }));
      return;
    }

    if (!validateForm(false)) {
      return;
    }

    const request = buildRequest(false);
    const recipients = (request.testRecipients || [])
      .map((recipient) => recipient.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setErrors((prev) => ({
        ...prev,
        testRecipients: 'Add at least one test recipient before sending a test email.',
      }));
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, testRecipients: '' }));
      const result = await onTestSend({
        ...request,
        provider,
        testRecipients: recipients,
      });
      setTestSendResult(result);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        testRecipients:
          typeof error === 'string'
            ? error
            : 'Failed to send the campaign test email.',
      }));
    }
  };

  return {
    cleanedTestRecipients,
    closeButtonRef,
    compositionMode,
    dialogTitleId,
    errors,
    formData,
    handlePreview,
    handleSubmit,
    handleTestSend,
    isCampaignActionPending,
    isCampaignSubmitPending,
    isLocalDeliveryBlocked,
    isPreviewing,
    localDeliveryBlockedMessage,
    preflightAudienceLabel,
    previewResult,
    savedAudiencesForList,
    selectedExclusionAudiences,
    selectedIncludeAudience,
    selectedList,
    setCompositionMode,
    setFormData,
    setPreviewResult,
    setTargetingMode,
    submitIntent,
    suppressiblePriorRuns,
    targetingMode,
    testSendResult,
  };
}
