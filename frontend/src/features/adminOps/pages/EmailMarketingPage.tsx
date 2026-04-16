/**
 * Email Marketing Page
 * Mailchimp integration settings and contact sync
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchMailchimpStatus,
  fetchMailchimpLists,
  fetchListTags,
  fetchCampaigns,
  fetchListSegments,
  bulkSyncContacts,
  createCampaign,
  sendCampaign,
  clearSyncResult,
  setSelectedList,
} from '../../mailchimp/state';
import { fetchContacts } from '../../../features/contacts/state';
import type {
  MailchimpCampaign,
  MailchimpList,
  CreateCampaignRequest,
} from '../../../types/mailchimp';
import type { Contact } from '../../../features/contacts/state';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../components/AdminWorkspaceShell';
import {
  CampaignCard,
  CampaignCreateModal,
  ListCard,
  SyncResultModal,
} from '../components/EmailMarketingPageParts';
import EmailSettingsSection from './adminSettings/sections/EmailSettingsSection';

/**
 * Email Marketing Page Component
 */
export default function EmailMarketing() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const pageTitle = 'Newsletter Campaigns';
  const {
    status,
    lists,
    selectedList,
    campaigns,
    segments,
    syncResult,
    isLoading,
    isSyncing,
    error,
  } = useAppSelector((state) => state.mailchimp);
  const { contacts } = useAppSelector((state) => state.contacts.list);
  const isMailchimpConfigured = status?.configured === true;

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignListId, setCampaignListId] = useState<string>('');

  // Fetch Mailchimp status on mount, then load dependent data only when configured.
  useEffect(() => {
    dispatch(fetchMailchimpStatus());
  }, [dispatch]);

  useEffect(() => {
    if (!isMailchimpConfigured) {
      return;
    }

    dispatch(fetchMailchimpLists());
    dispatch(fetchCampaigns());
    dispatch(fetchContacts({ page: 1, limit: 100 }));
  }, [dispatch, isMailchimpConfigured]);

  // Fetch tags when a list is selected
  useEffect(() => {
    if (selectedList) {
      dispatch(fetchListTags(selectedList.id));
    }
  }, [dispatch, selectedList]);

  // Fetch segments when campaign modal list changes
  useEffect(() => {
    if (campaignListId) {
      dispatch(fetchListSegments(campaignListId));
    }
  }, [dispatch, campaignListId]);

  // Show sync result modal
  useEffect(() => {
    if (syncResult) {
      setShowSyncModal(true);
    }
  }, [syncResult]);

  // Handle select all contacts
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContactIds([]);
    } else {
      const contactsWithEmail = contacts.filter((c: Contact) => c.email && !c.do_not_email);
      setSelectedContactIds(contactsWithEmail.map((c: Contact) => c.contact_id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual contact selection
  const handleContactSelect = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  // Handle sync
  const handleSync = () => {
    if (!selectedList || selectedContactIds.length === 0) return;

    dispatch(
      bulkSyncContacts({
        contactIds: selectedContactIds,
        listId: selectedList.id,
      })
    );
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
    if (lists.length > 0) {
      setCampaignListId(lists[0].id);
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
    try {
      const result = await dispatch(createCampaign(data)).unwrap();

      if (sendNow && result.id) {
        await dispatch(sendCampaign(result.id)).unwrap();
      }

      handleCloseCampaignModal();
      dispatch(fetchCampaigns());
    } catch (error) {
      // Error is handled by the slice
      console.error('Failed to create campaign:', error);
    }
  };

  // Not configured state
  if (status && !status.configured) {
    return (
      <AdminWorkspaceShell
        title={pageTitle}
        description="Manage newsletter audiences, campaign sync, and the shared email delivery stack from one admin workspace."
        currentPath={location.pathname}
      >
        <AdminQuickActionsBar role="admin" />
        <div className="bg-app-accent-soft border border-app-border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <svg
              className="w-8 h-8 text-app-accent flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h2 className="text-lg font-medium text-app-accent-text">
                Newsletter provider not configured
              </h2>
              <p className="mt-2 text-sm text-app-accent-text">
                To use the newsletter campaigns workspace, configure a provider before sending
                campaigns or syncing contacts:
              </p>
              <ul className="mt-3 text-sm text-app-accent-text list-disc list-inside space-y-1">
                <li>
                  <code className="bg-app-accent-soft px-1 rounded">MAILCHIMP_API_KEY</code> - Your
                  Mailchimp API key
                </li>
                <li>
                  <code className="bg-app-accent-soft px-1 rounded">MAILCHIMP_SERVER_PREFIX</code> -
                  Your datacenter (e.g., us1, us2)
                </li>
              </ul>
              <p className="mt-3 text-sm text-app-accent-text">
                You can find your API key at{' '}
                <a
                  href="https://admin.mailchimp.com/account/api/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  admin.mailchimp.com/account/api
                </a>
              </p>
            </div>
          </div>
        </div>
      </AdminWorkspaceShell>
    );
  }

  return (
    <AdminWorkspaceShell
      title={pageTitle}
      description="Manage newsletter audiences, campaign sync, and the shared email delivery stack from one admin workspace."
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

        {/* Account Status */}
        {status?.configured && (
          <div className="mb-8 bg-app-accent-soft border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-app-accent" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-app-accent-text">Connected to Mailchimp</p>
                <p className="text-sm text-app-accent-text">
                  Account: {status.accountName} | {status.listCount} audience
                  {status.listCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Audiences Column */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-medium text-app-text-heading mb-4">Audiences</h2>

            {isLoading && lists.length === 0 ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-app-surface-muted rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map((list: MailchimpList) => (
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
                <h2 className="text-lg font-medium text-app-text-heading">Sync Contacts</h2>
                <p className="text-sm text-app-text-muted mt-1">
                  Select contacts to sync with {selectedList?.name || 'a Mailchimp audience'}
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
                  <p className="mt-2">Select an audience to sync contacts</p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="p-4 bg-app-surface-muted border-b border-app-border flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                      />
                      <span className="text-sm text-app-text-muted">
                        Select all (
                        {contacts.filter((c: Contact) => c.email && !c.do_not_email).length}{' '}
                        contacts with email)
                      </span>
                    </label>

                    <button
                      onClick={handleSync}
                      disabled={selectedContactIds.length === 0 || isSyncing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed transition-colors"
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
                        </>
                      )}
                    </button>
                  </div>

                  {/* Contact List */}
                  <div className="max-h-96 overflow-y-auto">
                    {contacts
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
                      ))}
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
              disabled={lists.length === 0}
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
                Create your first email campaign to start engaging with your audience
              </p>
              {lists.length > 0 && (
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

        {/* Sync Result Modal */}
        {showSyncModal && syncResult && (
          <SyncResultModal result={syncResult} onClose={handleCloseSyncModal} />
        )}

        {/* Campaign Create Modal */}
        {showCampaignModal && (
          <CampaignCreateModal
            lists={lists}
            segments={segments}
            onClose={handleCloseCampaignModal}
            onSubmit={handleCreateCampaign}
          />
        )}
      </div>
    </AdminWorkspaceShell>
  );
}
