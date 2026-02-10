/**
 * Email Marketing Page
 * Mailchimp integration settings and contact sync
 */

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
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
} from '../../store/slices/mailchimpSlice';
import { fetchContacts } from '../../store/slices/contactsSlice';
import type {
  MailchimpList,
  MailchimpCampaign,
  CreateCampaignRequest,
  MailchimpSegment,
} from '../../types/mailchimp';
import type { Contact } from '../../store/slices/contactsSlice';

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    sent: 'bg-green-100 text-green-800',
    sending: 'bg-blue-100 text-blue-800',
    schedule: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-gray-100 text-gray-800',
    save: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Campaign Card Component
 */
function CampaignCard({ campaign }: { campaign: MailchimpCampaign }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{campaign.title}</h4>
          {campaign.subject && (
            <p className="text-sm text-gray-500 mt-1">{campaign.subject}</p>
          )}
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.reportSummary && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{campaign.emailsSent}</p>
            <p className="text-xs text-gray-500">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {(campaign.reportSummary.openRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Open Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {(campaign.reportSummary.clickRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Click Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {campaign.reportSummary.unsubscribes}
            </p>
            <p className="text-xs text-gray-500">Unsubscribes</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        Created: {new Date(campaign.createdAt).toLocaleDateString()}
        {campaign.sendTime && ` | Sent: ${new Date(campaign.sendTime).toLocaleDateString()}`}
      </div>
    </div>
  );
}

/**
 * List Card Component
 */
function ListCard({ list, isSelected, onSelect }: {
  list: MailchimpList;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border rounded-lg p-4 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900">{list.name}</h4>
        {isSelected && (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
        <span>{list.memberCount.toLocaleString()} subscribers</span>
        {list.doubleOptIn && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Double Opt-in
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Sync Result Modal
 */
function SyncResultModal({
  result,
  onClose
}: {
  result: { total: number; added: number; updated: number; skipped: number; errors: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Sync Complete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{result.total}</p>
            <p className="text-sm text-gray-500">Total Processed</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{result.added}</p>
            <p className="text-sm text-gray-500">Added</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
            <p className="text-sm text-gray-500">Updated</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
            <p className="text-sm text-gray-500">Skipped</p>
          </div>
        </div>

        {result.errors > 0 && (
          <div className="mt-4 bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{result.errors}</p>
            <p className="text-sm text-gray-500">Errors</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Campaign Create Modal
 */
function CampaignCreateModal({
  lists,
  segments,
  onClose,
  onSubmit,
}: {
  lists: MailchimpList[];
  segments: MailchimpSegment[];
  onClose: () => void;
  onSubmit: (data: CreateCampaignRequest, sendNow: boolean) => void;
}) {
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    listId: lists[0]?.id || '',
    title: '',
    subject: '',
    previewText: '',
    fromName: '',
    replyTo: '',
    htmlContent: '',
    plainTextContent: '',
    segmentId: undefined,
    sendTime: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (shouldSendNow: boolean): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.listId) newErrors.listId = 'Please select an audience';
    if (!formData.title.trim()) newErrors.title = 'Campaign title is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject line is required';
    if (!formData.fromName.trim()) newErrors.fromName = 'From name is required';
    if (!formData.replyTo.trim()) {
      newErrors.replyTo = 'Reply-to email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.replyTo)) {
      newErrors.replyTo = 'Invalid email address';
    }

    if (!shouldSendNow && formData.sendTime) {
      const sendDate = new Date(formData.sendTime);
      if (sendDate <= new Date()) {
        newErrors.sendTime = 'Send time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, shouldSendNow: boolean) => {
    e.preventDefault();
    if (validateForm(shouldSendNow)) {
      onSubmit(
        {
          ...formData,
          sendTime: shouldSendNow ? undefined : formData.sendTime,
        },
        shouldSendNow
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-medium text-gray-900">Create Email Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Audience Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.listId}
              onChange={(e) => setFormData({ ...formData, listId: e.target.value, segmentId: undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.memberCount.toLocaleString()} subscribers)
                </option>
              ))}
            </select>
            {errors.listId && <p className="mt-1 text-sm text-red-600">{errors.listId}</p>}
          </div>

          {/* Segment Selection (Optional) */}
          {segments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment (Optional)
              </label>
              <select
                value={formData.segmentId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, segmentId: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All subscribers</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name} ({segment.memberCount.toLocaleString()} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Internal campaign name"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What subscribers will see in their inbox"
            />
            {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
          </div>

          {/* Preview Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview Text (Optional)
            </label>
            <input
              type="text"
              value={formData.previewText}
              onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Text displayed after subject in inbox preview"
            />
          </div>

          {/* From Name and Reply-To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Organization"
              />
              {errors.fromName && <p className="mt-1 text-sm text-red-600">{errors.fromName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply-To Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="contact@organization.org"
              />
              {errors.replyTo && <p className="mt-1 text-sm text-red-600">{errors.replyTo}</p>}
            </div>
          </div>

          {/* HTML Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Content (Optional)
            </label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="<h1>Welcome!</h1><p>Your email content here...</p>"
            />
            <p className="mt-1 text-xs text-gray-500">You can edit this later in Mailchimp's editor</p>
          </div>

          {/* Plain Text Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plain Text Content (Optional)
            </label>
            <textarea
              value={formData.plainTextContent}
              onChange={(e) => setFormData({ ...formData, plainTextContent: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Plain text version for email clients that don't support HTML"
            />
          </div>

          {/* Schedule Send Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Send Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.sendTime || ''}
              onChange={(e) => setFormData({ ...formData, sendTime: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.sendTime && <p className="mt-1 text-sm text-red-600">{errors.sendTime}</p>}
            <p className="mt-1 text-xs text-gray-500">Leave empty to save as draft</p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={(e) => handleSubmit(e, false)}
              className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Email Marketing Page Component
 */
export default function EmailMarketing() {
  const dispatch = useAppDispatch();
  const { status, lists, selectedList, campaigns, segments, syncResult, isLoading, isSyncing, error } =
    useAppSelector((state) => state.mailchimp);
  const { contacts } = useAppSelector((state) => state.contacts);

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignListId, setCampaignListId] = useState<string>('');

  // Fetch Mailchimp status and lists on mount
  useEffect(() => {
    dispatch(fetchMailchimpStatus());
    dispatch(fetchMailchimpLists());
    dispatch(fetchCampaigns());
  }, [dispatch]);

  // Fetch contacts for sync
  useEffect(() => {
    dispatch(fetchContacts({ page: 1, limit: 100 }));
  }, [dispatch]);

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
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Handle sync
  const handleSync = () => {
    if (!selectedList || selectedContactIds.length === 0) return;

    dispatch(bulkSyncContacts({
      contactIds: selectedContactIds,
      listId: selectedList.id,
    }));
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h2 className="text-lg font-medium text-yellow-800">Mailchimp Not Configured</h2>
              <p className="mt-2 text-sm text-yellow-700">
                To use email marketing features, please configure your Mailchimp integration by setting the following environment variables:
              </p>
              <ul className="mt-3 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li><code className="bg-yellow-100 px-1 rounded">MAILCHIMP_API_KEY</code> - Your Mailchimp API key</li>
                <li><code className="bg-yellow-100 px-1 rounded">MAILCHIMP_SERVER_PREFIX</code> - Your datacenter (e.g., us1, us2)</li>
              </ul>
              <p className="mt-3 text-sm text-yellow-700">
                You can find your API key at{' '}
                <a href="https://admin.mailchimp.com/account/api/" target="_blank" rel="noopener noreferrer" className="underline">
                  admin.mailchimp.com/account/api
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your Mailchimp integration and sync contacts
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Account Status */}
      {status?.configured && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-green-800">Connected to Mailchimp</p>
              <p className="text-sm text-green-700">
                Account: {status.accountName} | {status.listCount} audience{status.listCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Audiences Column */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Audiences</h2>

          {isLoading && lists.length === 0 ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map(list => (
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
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Sync Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select contacts to sync with {selectedList?.name || 'a Mailchimp audience'}
              </p>
            </div>

            {!selectedList ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2">Select an audience to sync contacts</p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Select all ({contacts.filter((c: Contact) => c.email && !c.do_not_email).length} contacts with email)
                    </span>
                  </label>

                  <button
                    onClick={handleSync}
                    disabled={selectedContactIds.length === 0 || isSyncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSyncing ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync {selectedContactIds.length} Contact{selectedContactIds.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>

                {/* Contact List */}
                <div className="max-h-96 overflow-y-auto">
                  {contacts.filter((c: Contact) => c.email).map((contact: Contact) => (
                    <label
                      key={contact.contact_id}
                      className={`flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        contact.do_not_email ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(contact.contact_id)}
                        onChange={() => handleContactSelect(contact.contact_id)}
                        disabled={contact.do_not_email}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                      </div>
                      {contact.do_not_email && (
                        <span className="text-xs text-red-500">Do not email</span>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            {campaigns.length > 0 ? 'Recent Campaigns' : 'Campaigns'}
          </h2>
          <button
            onClick={handleOpenCampaignModal}
            disabled={lists.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>

        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.slice(0, 6).map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first email campaign to start engaging with your audience
            </p>
            {lists.length > 0 && (
              <button
                onClick={handleOpenCampaignModal}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
  );
}
