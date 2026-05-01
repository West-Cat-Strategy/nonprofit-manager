/**
 * Email Marketing Page
 * Mailchimp integration settings and contact sync
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchMailchimpStatus,
  fetchMailchimpLists,
  fetchListTags,
  fetchCampaigns,
  fetchSavedAudiences,
  fetchCampaignRuns,
  fetchCampaignRunRecipients,
  createSavedAudience,
  archiveSavedAudience,
  fetchListSegments,
  bulkSyncContacts,
  createCampaign,
  previewCampaign,
  sendCampaignTest,
  sendCampaign,
  sendCampaignRun,
  refreshCampaignRunStatus,
  cancelCampaignRun,
  rescheduleCampaignRun,
  clearSavedAudienceMessage,
  clearSyncResult,
  setSelectedList,
} from '../../mailchimp/state';
import { fetchContacts } from '../../contacts/state';
import { useDebounce } from '../../../hooks/useVirtualList';
import type {
  MailchimpCampaign,
  MailchimpList,
  CampaignRun,
  CampaignRunRecipientStatus,
  CommunicationProvider,
  CreateCampaignRequest,
  CampaignTestSendRequest,
  CampaignTestSendResponse,
  MailchimpCampaignPreview,
} from '../../../types/mailchimp';
import type { Contact } from '../../contacts/state';
import AdminQuickActionsBar from '../../adminOps/components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../../adminOps/components/AdminWorkspaceShell';
import { CampaignCard, CampaignRunCard, ListCard } from '../components/EmailMarketingCards';
import { CampaignCreateModal, SyncResultModal } from '../components/EmailMarketingPageParts';
import EmailSettingsSection from '../../adminOps/pages/adminSettings/sections/EmailSettingsSection';

const CONTACT_SELECTOR_LIMIT = 25;
const LOCAL_AUDIENCE_ID = 'local_email:crm';

const getAudienceProvider = (
  audience: Pick<MailchimpList, 'provider' | 'id'>,
  isMailchimpConfigured: boolean
): CommunicationProvider => {
  if (audience.provider) {
    return audience.provider;
  }

  return isMailchimpConfigured && !audience.id.startsWith('local') ? 'mailchimp' : 'local_email';
};

/**
 * Email Marketing Page Component
 */
export default function EmailMarketing() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const pageTitle = 'Communications';
  const {
    status,
    lists,
    selectedList,
    tags,
    campaigns,
    savedAudiences,
    campaignRuns,
    segments,
    segmentsListId,
    syncResult,
    isLoading,
    isSyncing,
    isLoadingSavedAudiences,
    isCreatingSavedAudience,
    isArchivingSavedAudience,
    savedAudienceMessage,
    savedAudienceError,
    savedAudienceLoadError,
    savedAudienceCreateError,
    isLoadingCampaignRuns,
    campaignRunsError,
    campaignRunActionMessage,
    campaignRunActionError,
    campaignRunRecipients = {},
    isLoadingCampaignRunRecipients = {},
    campaignRunRecipientsError = {},
    isCreatingCampaign,
    isSendingCampaign,
    isTestingCampaign,
    error,
  } = useAppSelector((state) => state.mailchimp);
  const contactsListState = useAppSelector((state) => state.contacts.list);
  const contacts = contactsListState?.contacts || [];
  const isLoadingContacts = contactsListState?.loading || false;
  const contactsError = contactsListState?.error || null;
  const contactsPagination = contactsListState?.pagination || {
    total: 0,
    page: 1,
    limit: CONTACT_SELECTOR_LIMIT,
    total_pages: 1,
  };
  const localProviderStatus = status?.providers?.local_email || status?.localEmail;
  const mailchimpProviderStatus = status?.providers?.mailchimp || status?.mailchimp;
  const isMailchimpConfigured =
    mailchimpProviderStatus?.configured === true ||
    (status?.configured === true && status?.provider !== 'local_email');
  const isLocalEmailConfigured =
    localProviderStatus?.configured === true ||
    status?.defaultProvider === 'local_email' ||
    status?.provider === 'local_email';
  const isLocalSmtpReady = localProviderStatus?.ready === true;
  const localDeliveryReadinessMessage = isLocalSmtpReady
    ? `SMTP ready${localProviderStatus?.fromAddress ? ` from ${localProviderStatus.fromAddress}` : ''}.`
    : localProviderStatus?.message ||
      (isLocalEmailConfigured
        ? 'SMTP settings need a readiness check before test emails or live sends.'
        : 'Configure SMTP before sending local campaign tests or live sends.');

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CommunicationProvider>('local_email');
  const [selectAll, setSelectAll] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignListId, setCampaignListId] = useState<string>('');
  const [savedAudienceName, setSavedAudienceName] = useState('');
  const [localSavedAudienceError, setLocalSavedAudienceError] = useState<string | null>(null);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const debouncedContactSearch = useDebounce(contactSearchInput, 300);

  const localAudience = useMemo<MailchimpList>(
    () => ({
      id: LOCAL_AUDIENCE_ID,
      name: 'CRM Email Audience',
      memberCount: contactsPagination.total || contacts.length,
      doubleOptIn: false,
      provider: 'local_email',
      description: 'Eligible contacts with email addresses from the CRM.',
      isDefault: true,
    }),
    [contacts.length, contactsPagination.total]
  );

  const localAudiences = useMemo(
    () => {
      const providerLocalAudiences = lists.filter(
        (list) => getAudienceProvider(list, isMailchimpConfigured) === 'local_email'
      );
      return providerLocalAudiences.length > 0 ? providerLocalAudiences : [localAudience];
    },
    [isMailchimpConfigured, lists, localAudience]
  );
  const mailchimpAudiences = useMemo(
    () => lists.filter((list) => getAudienceProvider(list, isMailchimpConfigured) === 'mailchimp'),
    [isMailchimpConfigured, lists]
  );
  const displayedAudiences = selectedProvider === 'mailchimp' ? mailchimpAudiences : localAudiences;
  const selectedAudienceProvider = selectedList
    ? getAudienceProvider(selectedList, isMailchimpConfigured)
    : selectedProvider;
  const isSelectedProviderDeliveryReady =
    selectedProvider === 'local_email' ? isLocalSmtpReady : true;

  // Fetch communications status on mount, then load local-first workspace data.
  useEffect(() => {
    dispatch(fetchMailchimpStatus());
  }, [dispatch]);

  useEffect(() => {
    if (!status) {
      return;
    }

    dispatch(fetchMailchimpLists());
    dispatch(fetchCampaigns());
    dispatch(fetchSavedAudiences());
    dispatch(fetchCampaignRuns());
  }, [dispatch, status]);

  useEffect(() => {
    if (!isMailchimpConfigured && selectedProvider === 'mailchimp') {
      setSelectedProvider('local_email');
    }
  }, [isMailchimpConfigured, selectedProvider]);

  useEffect(() => {
    if (displayedAudiences.length === 0) {
      return;
    }

    if (
      !selectedList ||
      getAudienceProvider(selectedList, isMailchimpConfigured) !== selectedProvider
    ) {
      dispatch(setSelectedList(displayedAudiences[0]));
    }
  }, [dispatch, displayedAudiences, isMailchimpConfigured, selectedList, selectedProvider]);

  useEffect(() => {
    if (!status) {
      return;
    }

    dispatch(
      fetchContacts({
        page: contactPage,
        limit: CONTACT_SELECTOR_LIMIT,
        search: debouncedContactSearch || undefined,
      })
    );
  }, [contactPage, debouncedContactSearch, dispatch, status]);

  // Fetch tags when a list is selected
  useEffect(() => {
    if (selectedList && selectedAudienceProvider === 'mailchimp') {
      dispatch(fetchListTags(selectedList.id));
    }

    if (selectedList) {
      setSelectedContactIds([]);
      setSelectedTags([]);
      setSelectAll(false);
      setSavedAudienceName('');
      setLocalSavedAudienceError(null);
      dispatch(clearSavedAudienceMessage());
    }
  }, [dispatch, selectedAudienceProvider, selectedList]);

  // Fetch segments when campaign modal list changes
  useEffect(() => {
    if (campaignListId && selectedProvider === 'mailchimp') {
      dispatch(fetchListSegments(campaignListId));
    }
  }, [dispatch, campaignListId, selectedProvider]);

  const campaignSegments =
    segmentsListId === campaignListId
      ? segments.filter(
          (segment) =>
            segment.listId === campaignListId &&
            !/^NPM \d{4}-\d{2}-\d{2}T/.test(segment.name)
        )
      : [];
  const selectableContactsOnPage = contacts.filter((c: Contact) => c.email && !c.do_not_email);
  const selectedContactsOnPage = selectableContactsOnPage.filter((contact) =>
    selectedContactIds.includes(contact.contact_id)
  );

  // Show sync result modal
  useEffect(() => {
    if (syncResult) {
      setShowSyncModal(true);
    }
  }, [syncResult]);

  useEffect(() => {
    setSelectAll(
      selectableContactsOnPage.length > 0 &&
        selectedContactsOnPage.length === selectableContactsOnPage.length
    );
  }, [selectableContactsOnPage.length, selectedContactsOnPage.length]);

  // Handle select all contacts
  const handleSelectAll = () => {
    if (selectAll) {
      const currentPageIds = contacts
        .filter((c: Contact) => c.email && !c.do_not_email)
        .map((c: Contact) => c.contact_id);
      setSelectedContactIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      const contactsWithEmail = contacts.filter((c: Contact) => c.email && !c.do_not_email);
      setSelectedContactIds((prev) =>
        Array.from(new Set([...prev, ...contactsWithEmail.map((c: Contact) => c.contact_id)]))
      );
    }
    setSelectAll(!selectAll);
    setLocalSavedAudienceError(null);
    dispatch(clearSavedAudienceMessage());
  };

  // Handle individual contact selection
  const handleContactSelect = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
    setLocalSavedAudienceError(null);
    dispatch(clearSavedAudienceMessage());
  };

  // Handle sync
  const handleSync = () => {
    if (selectedProvider !== 'mailchimp' || !selectedList || selectedContactIds.length === 0) {
      return;
    }

    dispatch(
      bulkSyncContacts({
        contactIds: selectedContactIds,
        listId: selectedList.id,
        tags: selectedTags,
      })
    );
  };

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((name) => name !== tagName) : [...prev, tagName]
    );
  };

  const handleCreateSavedAudience = async () => {
    const trimmedName = savedAudienceName.trim();
    if (!selectedList) {
      setLocalSavedAudienceError('Select a delivery audience before saving this CRM audience.');
      return;
    }
    if (!trimmedName || selectedContactIds.length === 0) {
      return;
    }

    setLocalSavedAudienceError(null);
    try {
      await dispatch(
        createSavedAudience({
          name: trimmedName,
          description: 'Saved from the communications workspace CRM contact selection.',
          filters: {
            source: 'communications_selected_contacts',
            contactIds: selectedContactIds,
            listId: selectedList.id,
            provider: selectedAudienceProvider,
          },
        })
      ).unwrap();
      setSavedAudienceName('');
    } catch (error) {
      setLocalSavedAudienceError(
        typeof error === 'string' ? error : 'Failed to save this audience.'
      );
    }
  };

  // Close sync modal
  const handleCloseSyncModal = () => {
    setShowSyncModal(false);
    dispatch(clearSyncResult());
    setSelectedContactIds([]);
    setSelectAll(false);
  };

  // Open campaign creation modal
  const handleOpenCampaignModal = () => {
    if (displayedAudiences.length > 0) {
      setCampaignListId(displayedAudiences[0].id);
      setShowCampaignModal(true);
    }
  };

  // Close campaign modal
  const handleCloseCampaignModal = () => {
    setShowCampaignModal(false);
    setCampaignListId('');
  };

  // Submit campaign
  const handleCreateCampaign = async (data: CreateCampaignRequest, sendNow: boolean) => {
    if (selectedProvider === 'local_email' && !isLocalSmtpReady && (sendNow || data.sendTime)) {
      return;
    }

    try {
      const result = await dispatch(createCampaign({ ...data, provider: selectedProvider })).unwrap();

      const runId = result.campaignRunId || result.id;
      if (sendNow && runId) {
        await dispatch(sendCampaign(runId)).unwrap();
      }

      handleCloseCampaignModal();
      dispatch(fetchCampaigns());
      dispatch(fetchCampaignRuns());
    } catch (error) {
      // Error is handled by the slice
      console.error('Failed to create campaign:', error);
    }
  };

  const handlePreviewCampaign = async (
    data: CreateCampaignRequest
  ): Promise<MailchimpCampaignPreview> =>
    dispatch(previewCampaign({ ...data, provider: selectedProvider })).unwrap();

  const handleTestSendCampaign = async (
    data: CampaignTestSendRequest
  ): Promise<CampaignTestSendResponse> =>
    selectedProvider === 'local_email' && !isLocalSmtpReady
      ? Promise.reject('Configure SMTP before sending a local test email.')
      : dispatch(sendCampaignTest({ ...data, provider: selectedProvider })).unwrap();

  const handleArchiveSavedAudience = async (audienceId: string) => {
    try {
      await dispatch(archiveSavedAudience(audienceId)).unwrap();
    } catch {
      // The slice owns the displayable error state.
    }
  };

  const handleSendCampaignRun = async (runId: string) => {
    const run = campaignRuns.find((candidate) => candidate.id === runId);
    if (run?.provider === 'local_email' && !isLocalSmtpReady) {
      return;
    }

    try {
      await dispatch(sendCampaignRun(runId)).unwrap();
    } catch {
      // The slice owns the displayable error state.
    }
  };

  const handleRefreshCampaignRunStatus = async (runId: string) => {
    try {
      await dispatch(refreshCampaignRunStatus(runId)).unwrap();
    } catch {
      // The slice owns the displayable error state.
    }
  };

  const handleCancelCampaignRun = async (runId: string) => {
    try {
      await dispatch(cancelCampaignRun(runId)).unwrap();
      dispatch(fetchCampaignRunRecipients({ runId, status: 'all', limit: 8 }));
    } catch {
      // The slice owns the displayable error state.
    }
  };

  const handleRescheduleCampaignRun = async (runId: string, sendTime: string) => {
    try {
      await dispatch(rescheduleCampaignRun({ runId, sendTime })).unwrap();
    } catch {
      // The slice owns the displayable error state.
    }
  };

  const handleLoadCampaignRunRecipients = (
    runId: string,
    statusFilter: CampaignRunRecipientStatus | 'all' = 'all'
  ) => {
    dispatch(fetchCampaignRunRecipients({ runId, status: statusFilter, limit: 8 }));
  };

  return (
    <AdminWorkspaceShell
      title={pageTitle}
      description="Manage local email campaigns, CRM audiences, and optional provider sync from one admin workspace."
      currentPath={location.pathname}
    >
      <AdminQuickActionsBar role="admin" />
      <div className="space-y-8">
        {/* Error display */}
        {error && (
          <div className="mb-6 bg-app-accent-soft border border-app-border rounded-lg p-4">
            <p className="text-sm text-app-accent-text">{error}</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <p className="text-sm font-medium text-app-text-heading">Local Email</p>
            <p className="mt-1 text-sm text-app-text-muted">
              {isLocalSmtpReady
                ? localDeliveryReadinessMessage
                : `CRM audience building is available. ${localDeliveryReadinessMessage}`}
            </p>
          </div>
          {isMailchimpConfigured ? (
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <p className="text-sm font-medium text-app-text-heading">Mailchimp</p>
              <p className="mt-1 text-sm text-app-text-muted">
                Optional provider connected
                {mailchimpProviderStatus?.accountName || status?.accountName
                  ? `: ${mailchimpProviderStatus?.accountName || status?.accountName}`
                  : ''}
                .
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-4">
              <p className="text-sm font-medium text-app-text-heading">Mailchimp Optional</p>
              <p className="mt-1 text-sm text-app-text-muted">
                Mailchimp is not configured, so the workspace stays on local email and CRM audiences.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-app-border bg-app-surface p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selectedProvider === 'local_email'}
              onClick={() => setSelectedProvider('local_email')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                selectedProvider === 'local_email'
                  ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                  : 'border border-app-input-border text-app-text-muted'
              }`}
            >
              Local Email
            </button>
            {isMailchimpConfigured ? (
              <button
                type="button"
                aria-pressed={selectedProvider === 'mailchimp'}
                onClick={() => setSelectedProvider('mailchimp')}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  selectedProvider === 'mailchimp'
                    ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                    : 'border border-app-input-border text-app-text-muted'
                }`}
              >
                Mailchimp
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Audiences Column */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-medium text-app-text-heading mb-4">Delivery Audiences</h2>

            {isLoading && displayedAudiences.length === 0 ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-app-surface-muted rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedAudiences.map((list: MailchimpList) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    isSelected={selectedList?.id === list.id}
                    onSelect={() => dispatch(setSelectedList(list))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Contact Sync Column */}
          <div className="lg:col-span-2">
            <div className="bg-app-surface border border-app-border rounded-lg">
              <div className="p-4 border-b border-app-border">
                <h2 className="text-lg font-medium text-app-text-heading">
                  {selectedProvider === 'mailchimp' ? 'Sync Contacts' : 'CRM Audience Builder'}
                </h2>
                <p className="text-sm text-app-text-muted mt-1">
                  {selectedProvider === 'mailchimp'
                    ? `Select contacts to sync with ${selectedList?.name || 'a Mailchimp audience'}`
                    : `Select email-ready CRM contacts for ${selectedList?.name || 'local delivery'}`}
                </p>
              </div>

              {!selectedList ? (
                <div className="p-8 text-center text-app-text-muted">
                  <svg
                    className="w-12 h-12 mx-auto text-app-text-subtle"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="mt-2">Select a delivery audience to continue</p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="space-y-4 border-b border-app-border bg-app-surface-muted p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <label className="block text-sm font-medium text-app-text-label">
                          Search CRM contacts
                        </label>
                        <input
                          aria-label="Search CRM contacts"
                          type="search"
                          value={contactSearchInput}
                          onChange={(event) => {
                            setContactSearchInput(event.target.value);
                            setContactPage(1);
                          }}
                          className="mt-1 w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                          placeholder="Search by name, email, or phone"
                        />
                      </div>
                      {selectedProvider === 'mailchimp' ? (
                        <button
                          onClick={handleSync}
                          disabled={selectedContactIds.length === 0 || isSyncing}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed transition-colors"
                        >
                          {isSyncing ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Syncing...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Sync {selectedContactIds.length} Contact
                              {selectedContactIds.length !== 1 ? 's' : ''}
                              {selectedTags.length > 0
                                ? ` with ${selectedTags.length} tag${selectedTags.length === 1 ? '' : 's'}`
                                : ''}
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                        />
                        <span className="text-sm text-app-text-muted">
                          Select visible eligible contacts ({selectedContactsOnPage.length}/
                          {selectableContactsOnPage.length})
                        </span>
                      </label>
                      <p className="text-xs text-app-text-muted">
                        {selectedContactIds.length} selected across pages. Do-not-email contacts stay excluded.
                      </p>
                    </div>

                    {selectedProvider === 'mailchimp' ? (
                    <div>
                      <p className="text-sm font-medium text-app-text-label">Sync tags</p>
                      {tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <label
                              key={tag.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-app-input-border bg-app-surface px-3 py-1.5 text-xs text-app-text-muted"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag.name)}
                                onChange={() => handleToggleTag(tag.name)}
                                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                              />
                              {tag.name}
                              {typeof tag.memberCount === 'number'
                                ? ` (${tag.memberCount.toLocaleString()})`
                                : ''}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-app-text-muted">
                          No provider tags returned for this audience yet; tag and segment endpoints remain API-only until tags exist.
                        </p>
                      )}
                    </div>
                    ) : null}
                  </div>

                  <div className="border-b border-app-border bg-app-surface px-4 py-4">
                    <label className="block text-sm font-medium text-app-text-label">
                      Save current selection as audience
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Saved audience name"
                        type="text"
                        value={savedAudienceName}
                        onChange={(event) => {
                          setSavedAudienceName(event.target.value);
                          setLocalSavedAudienceError(null);
                          dispatch(clearSavedAudienceMessage());
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                        placeholder="Example: Spring appeal donors"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSavedAudience}
                        disabled={
                          isCreatingSavedAudience ||
                          !savedAudienceName.trim() ||
                          selectedContactIds.length === 0
                        }
                        className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-text-subtle"
                      >
                        {isCreatingSavedAudience ? 'Saving...' : 'Save Audience'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-app-text-muted">
                      Saves {selectedContactIds.length} selected CRM contact
                      {selectedContactIds.length === 1 ? '' : 's'} as an internal targeting
                      snapshot tied to {selectedList.name}.
                    </p>
                    {(localSavedAudienceError || savedAudienceCreateError) && (
                      <p className="mt-2 text-xs text-app-accent">
                        {localSavedAudienceError || savedAudienceCreateError}
                      </p>
                    )}
                    {savedAudienceMessage && !localSavedAudienceError && (
                      <p className="mt-2 text-xs text-app-accent-text">{savedAudienceMessage}</p>
                    )}
                  </div>

                  {/* Contact List */}
                  <div className="max-h-96 overflow-y-auto">
                    {contactsError ? (
                      <div className="p-4 text-sm text-app-accent">{contactsError}</div>
                    ) : isLoadingContacts ? (
                      <div className="p-4 text-sm text-app-text-muted">Loading CRM contacts...</div>
                    ) : contacts.filter((c: Contact) => c.email).length > 0 ? (
                      contacts
                        .filter((c: Contact) => c.email)
                        .map((contact: Contact) => (
                        <label
                          key={contact.contact_id}
                          className={`flex items-center gap-3 p-4 border-b border-app-border-muted hover:bg-app-surface-muted cursor-pointer ${
                            contact.do_not_email ? 'opacity-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact.contact_id)}
                            onChange={() => handleContactSelect(contact.contact_id)}
                            disabled={contact.do_not_email}
                            className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-app-text truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <p className="text-sm text-app-text-muted truncate">{contact.email}</p>
                          </div>
                          {contact.do_not_email && (
                            <span className="text-xs text-app-accent">Do not email</span>
                          )}
                        </label>
                        ))
                    ) : (
                      <div className="p-4 text-sm text-app-text-muted">
                        No email-ready contacts match this page and search.
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-app-border bg-app-surface px-4 py-3 text-sm text-app-text-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Page {contactsPagination.page || contactPage} of{' '}
                      {Math.max(contactsPagination.total_pages || 1, 1)} |{' '}
                      {contactsPagination.total.toLocaleString()} CRM contacts
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setContactPage((page) => Math.max(1, page - 1))}
                        disabled={contactPage <= 1 || isLoadingContacts}
                        className="rounded-lg border border-app-input-border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setContactPage((page) =>
                            Math.min(Math.max(contactsPagination.total_pages || 1, 1), page + 1)
                          )
                        }
                        disabled={
                          contactPage >= Math.max(contactsPagination.total_pages || 1, 1) ||
                          isLoadingContacts
                        }
                        className="rounded-lg border border-app-input-border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <h2 className="text-lg font-medium text-app-text-heading">Email Delivery</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Keep transactional email settings aligned with the newsletter workspace so delivery
              readiness stays visible in one system.
            </p>
          </div>
          <EmailSettingsSection />
        </div>

        {/* Campaigns Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-app-text-heading">
              {campaigns.length > 0 ? 'Recent Campaigns' : 'Campaigns'}
            </h2>
            <button
              onClick={handleOpenCampaignModal}
              disabled={displayedAudiences.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Campaign
            </button>
          </div>

          {campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.slice(0, 6).map((campaign: MailchimpCampaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="bg-app-surface border-2 border-dashed border-app-input-border rounded-lg p-12 text-center">
              <svg
                className="w-12 h-12 mx-auto text-app-text-subtle"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-app-text-heading">No campaigns yet</h3>
              <p className="mt-2 text-sm text-app-text-muted">
                Create your first local email campaign to start engaging with CRM audiences
              </p>
              {displayedAudiences.length > 0 && (
                <button
                  onClick={handleOpenCampaignModal}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Campaign
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-lg font-medium text-app-text-heading">Saved Audiences</h2>
            {savedAudienceMessage ? (
              <p className="mb-3 text-sm text-app-accent-text">{savedAudienceMessage}</p>
            ) : null}
            {isLoadingSavedAudiences ? (
              <div className="rounded-lg border border-app-border bg-app-surface p-6 text-sm text-app-text-muted">
                Loading saved audiences...
              </div>
            ) : savedAudienceLoadError ? (
              <div className="rounded-lg border border-app-border bg-app-accent-soft p-6 text-sm text-app-accent-text">
                {savedAudienceLoadError}
              </div>
            ) : savedAudiences.length > 0 ? (
              <div className="space-y-3">
                {savedAudiences.slice(0, 5).map((audience) => (
                  <div
                    key={audience.id}
                    className="rounded-lg border border-app-border bg-app-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-app-text-heading">
                          {audience.name}
                        </p>
                        <p className="mt-1 text-sm text-app-text-muted">
                          {(audience.sourceCount ?? 0).toLocaleString()} contacts in latest snapshot
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleArchiveSavedAudience(audience.id)}
                        disabled={isArchivingSavedAudience}
                        className="shrink-0 rounded-lg border border-app-input-border px-3 py-1.5 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Archive
                      </button>
                    </div>
                    {typeof audience.filters.listId === 'string' ? (
                      <p className="mt-2 text-xs text-app-text-subtle">
                        Delivery audience: {audience.filters.listId}
                      </p>
                    ) : null}
                  </div>
                ))}
                {savedAudienceError ? (
                  <p className="text-sm text-app-accent">{savedAudienceError}</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-6 text-sm text-app-text-muted">
                No saved audiences yet.
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-medium text-app-text-heading">Campaign Run History</h2>
            {campaignRunActionMessage ? (
              <p className="mb-3 text-sm text-app-accent-text">{campaignRunActionMessage}</p>
            ) : null}
            {campaignRunActionError ? (
              <p className="mb-3 text-sm text-app-accent">{campaignRunActionError}</p>
            ) : null}
            {isLoadingCampaignRuns ? (
              <div className="rounded-lg border border-app-border bg-app-surface p-6 text-sm text-app-text-muted">
                Loading campaign run history...
              </div>
            ) : campaignRunsError ? (
              <div className="rounded-lg border border-app-border bg-app-accent-soft p-6 text-sm text-app-accent-text">
                {campaignRunsError}
              </div>
            ) : campaignRuns.length > 0 ? (
              <div className="space-y-3">
                {campaignRuns.slice(0, 5).map((run: CampaignRun) => (
                  <CampaignRunCard
                    key={run.id}
                    run={run}
                    onSend={handleSendCampaignRun}
                    onRefreshStatus={handleRefreshCampaignRunStatus}
                    onCancel={handleCancelCampaignRun}
                    onReschedule={handleRescheduleCampaignRun}
                    onLoadRecipients={handleLoadCampaignRunRecipients}
                    recipients={campaignRunRecipients[run.id] ?? []}
                    isLoadingRecipients={Boolean(isLoadingCampaignRunRecipients[run.id])}
                    recipientsError={campaignRunRecipientsError[run.id]}
                    localDeliveryReady={isLocalSmtpReady}
                    localDeliveryBlockedReason={localDeliveryReadinessMessage}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-6 text-sm text-app-text-muted">
                Local campaign run history will appear after a draft, schedule, or send action.
              </div>
            )}
          </section>
        </div>

        {/* Sync Result Modal */}
        {showSyncModal && syncResult && (
          <SyncResultModal result={syncResult} onClose={handleCloseSyncModal} />
        )}

        {/* Campaign Create Modal */}
        {showCampaignModal && (
          <CampaignCreateModal
            lists={displayedAudiences}
            segments={campaignSegments}
            savedAudiences={savedAudiences}
            campaignRuns={campaignRuns}
            provider={selectedProvider}
            isDeliveryReady={isSelectedProviderDeliveryReady}
            deliveryReadinessMessage={localDeliveryReadinessMessage}
            isCreatingCampaign={isCreatingCampaign}
            isSendingCampaign={isSendingCampaign}
            isTestingCampaign={isTestingCampaign}
            onClose={handleCloseCampaignModal}
            onListChange={setCampaignListId}
            onPreview={handlePreviewCampaign}
            onTestSend={handleTestSendCampaign}
            onSubmit={handleCreateCampaign}
          />
        )}
      </div>
    </AdminWorkspaceShell>
  );
}
