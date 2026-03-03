import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import type {
  PortalActivity,
  PortalAdminAppointmentInboxItem,
  PortalAdminAppointmentReminderHistory,
  PortalContactLookup,
  PortalInvitation,
  PortalSignupRequest,
  PortalUser,
} from '../types';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type UsePortalSettingsParams = {
  activeSection: string;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  notifyError: (error: unknown, fallbackMessage?: string) => void;
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
};

const toIsoDateTime = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const usePortalSettings = ({
  activeSection,
  showSuccess,
  showError,
  notifyError,
  confirm,
  setFormErrorFromError,
  clearFormError,
}: UsePortalSettingsParams) => {
  const [portalRequests, setPortalRequests] = useState<PortalSignupRequest[]>([]);
  const [portalInvitations, setPortalInvitations] = useState<PortalInvitation[]>([]);
  const [portalInviteEmail, setPortalInviteEmail] = useState('');
  const [portalInviteContactId, setPortalInviteContactId] = useState('');
  const [portalInviteUrl, setPortalInviteUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [portalUsersLoading, setPortalUsersLoading] = useState(false);
  const [portalUserSearch, setPortalUserSearch] = useState('');
  const [portalUserActivity, setPortalUserActivity] = useState<PortalActivity[]>([]);
  const [portalActivityLoading, setPortalActivityLoading] = useState(false);
  const [selectedPortalUser, setSelectedPortalUser] = useState<PortalUser | null>(null);
  const [portalResetTarget, setPortalResetTarget] = useState<PortalUser | null>(null);
  const [portalResetPassword, setPortalResetPassword] = useState('');
  const [portalResetConfirmPassword, setPortalResetConfirmPassword] = useState('');
  const [portalResetLoading, setPortalResetLoading] = useState(false);
  const [showPortalResetModal, setShowPortalResetModal] = useState(false);
  const [portalContactSearch, setPortalContactSearch] = useState('');
  const [portalContactResults, setPortalContactResults] = useState<PortalContactLookup[]>([]);
  const [portalContactLoading, setPortalContactLoading] = useState(false);
  const [selectedPortalContact, setSelectedPortalContact] = useState<PortalContactLookup | null>(null);
  const [portalAppointments, setPortalAppointments] = useState<PortalAdminAppointmentInboxItem[]>([]);
  const [portalAppointmentsLoading, setPortalAppointmentsLoading] = useState(false);
  const [portalAppointmentsPagination, setPortalAppointmentsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [portalAppointmentFilters, setPortalAppointmentFilters] = useState({
    status: 'all' as 'all' | 'requested' | 'confirmed' | 'cancelled' | 'completed',
    requestType: 'all' as 'all' | 'manual_request' | 'slot_booking',
    caseId: '',
    pointpersonUserId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [portalSelectedAppointmentId, setPortalSelectedAppointmentId] = useState<string | null>(null);
  const [portalAppointmentReminders, setPortalAppointmentReminders] =
    useState<PortalAdminAppointmentReminderHistory | null>(null);
  const [portalAppointmentRemindersLoading, setPortalAppointmentRemindersLoading] = useState(false);
  const [portalAppointmentActionLoading, setPortalAppointmentActionLoading] = useState(false);
  const [portalReminderCustomMessage, setPortalReminderCustomMessage] = useState('');

  const portalAppointmentRefreshTimerRef = useRef<number | null>(null);
  const portalAppointmentRefreshPageRef = useRef(1);

  const fetchPortalUsers = useCallback(async (searchTerm?: string) => {
    try {
      setPortalUsersLoading(true);
      const response = await api.get('/portal/admin/users', {
        params: searchTerm ? { search: searchTerm } : undefined,
      });
      setPortalUsers(response.data.users || []);
    } finally {
      setPortalUsersLoading(false);
    }
  }, []);

  const fetchPortalData = useCallback(async () => {
    try {
      setPortalLoading(true);
      setPortalUsersLoading(true);
      const [requestsResponse, invitationsResponse, usersResponse] =
        await Promise.all([
          api.get('/portal/admin/requests').catch(() => ({ data: { requests: [] } })),
          api.get('/portal/admin/invitations').catch(() => ({ data: { invitations: [] } })),
          api.get('/portal/admin/users').catch(() => ({ data: { users: [] } })),
        ]);

      setPortalRequests(requestsResponse.data.requests || []);
      setPortalInvitations(invitationsResponse.data.invitations || []);
      setPortalUsers(usersResponse.data.users || []);
    } finally {
      setPortalLoading(false);
      setPortalUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'portal') {
      void fetchPortalData();
    }
  }, [activeSection, fetchPortalData]);

  const fetchPortalAppointments = useCallback(
    async (page = 1) => {
      if (activeSection !== 'portal') return;

      try {
        setPortalAppointmentsLoading(true);
        const response = await api.get('/portal/admin/appointments', {
          params: {
            status:
              portalAppointmentFilters.status !== 'all'
                ? portalAppointmentFilters.status
                : undefined,
            request_type:
              portalAppointmentFilters.requestType !== 'all'
                ? portalAppointmentFilters.requestType
                : undefined,
            case_id: portalAppointmentFilters.caseId.trim() || undefined,
            pointperson_user_id: portalAppointmentFilters.pointpersonUserId.trim() || undefined,
            date_from: toIsoDateTime(portalAppointmentFilters.dateFrom),
            date_to: toIsoDateTime(portalAppointmentFilters.dateTo),
            page,
            limit: portalAppointmentsPagination.limit,
          },
        });

        setPortalAppointments(response.data.data || []);
        setPortalAppointmentsPagination(
          response.data.pagination || {
            page,
            limit: portalAppointmentsPagination.limit,
            total: 0,
            total_pages: 0,
          }
        );
      } finally {
        setPortalAppointmentsLoading(false);
      }
    },
    [
      activeSection,
      portalAppointmentFilters.caseId,
      portalAppointmentFilters.dateFrom,
      portalAppointmentFilters.dateTo,
      portalAppointmentFilters.pointpersonUserId,
      portalAppointmentFilters.requestType,
      portalAppointmentFilters.status,
      portalAppointmentsPagination.limit,
    ]
  );

  useEffect(() => {
    portalAppointmentRefreshPageRef.current = portalAppointmentsPagination.page;
  }, [portalAppointmentsPagination.page]);

  useEffect(() => {
    return () => {
      if (portalAppointmentRefreshTimerRef.current !== null) {
        window.clearTimeout(portalAppointmentRefreshTimerRef.current);
      }
    };
  }, []);

  const onAppointmentUpdated = useCallback(() => {
    if (portalAppointmentRefreshTimerRef.current !== null) {
      window.clearTimeout(portalAppointmentRefreshTimerRef.current);
    }

    portalAppointmentRefreshTimerRef.current = window.setTimeout(() => {
      portalAppointmentRefreshTimerRef.current = null;
      void fetchPortalAppointments(portalAppointmentRefreshPageRef.current);
    }, 300);
  }, [fetchPortalAppointments]);

  const refreshPortalData = useCallback(async (options?: {
    refreshConversations?: () => Promise<void>;
    refreshSlots?: () => Promise<void>;
  }) => {
    try {
      setPortalLoading(true);
      const [requestsResponse, invitationsResponse] = await Promise.all([
        api.get('/portal/admin/requests').catch(() => ({ data: { requests: [] } })),
        api.get('/portal/admin/invitations').catch(() => ({ data: { invitations: [] } })),
      ]);
      setPortalRequests(requestsResponse.data.requests || []);
      setPortalInvitations(invitationsResponse.data.invitations || []);
    } finally {
      setPortalLoading(false);
    }

    await Promise.all([
      fetchPortalUsers(portalUserSearch),
      options?.refreshConversations ? options.refreshConversations() : Promise.resolve(),
      options?.refreshSlots ? options.refreshSlots() : Promise.resolve(),
      fetchPortalAppointments(1),
    ]);
  }, [fetchPortalAppointments, fetchPortalUsers, portalUserSearch]);

  const handleApprovePortalRequest = useCallback(async (requestId: string) => {
    try {
      await api.post(`/portal/admin/requests/${requestId}/approve`);
      showSuccess('Portal signup request approved');
      await refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to approve request');
    }
  }, [notifyError, refreshPortalData, showSuccess]);

  const handleRejectPortalRequest = useCallback(async (requestId: string) => {
    const confirmed = await confirm({
      title: 'Reject Portal Request',
      message: 'Reject this portal request?',
      confirmLabel: 'Reject',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.post(`/portal/admin/requests/${requestId}/reject`);
      showSuccess('Portal signup request rejected');
      await refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to reject request');
    }
  }, [confirm, notifyError, refreshPortalData, showSuccess]);

  const handleCreatePortalInvite = useCallback(async () => {
    if (!portalInviteEmail) {
      setFormErrorFromError(
        new Error('Portal invite email is required'),
        'Portal invite email is required'
      );
      return;
    }

    try {
      clearFormError();
      const response = await api.post('/portal/admin/invitations', {
        email: portalInviteEmail,
        contact_id: portalInviteContactId || undefined,
      });
      setPortalInviteUrl(response.data.inviteUrl);
      setPortalInviteEmail('');
      setPortalInviteContactId('');
      setSelectedPortalContact(null);
      showSuccess('Portal invitation created');
      await refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to create portal invitation');
    }
  }, [
    clearFormError,
    notifyError,
    portalInviteContactId,
    portalInviteEmail,
    refreshPortalData,
    setFormErrorFromError,
    showSuccess,
  ]);

  const searchPortalContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPortalContactResults([]);
      return;
    }
    setPortalContactLoading(true);
    try {
      const response = await api.get('/contacts', { params: { search: query, limit: 5 } });
      setPortalContactResults(response.data.data || []);
    } catch {
      setPortalContactResults([]);
    } finally {
      setPortalContactLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection !== 'portal') return;
    const debounceTimer = setTimeout(() => {
      void fetchPortalUsers(portalUserSearch);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [activeSection, portalUserSearch, fetchPortalUsers]);

  useEffect(() => {
    if (activeSection !== 'portal') return;
    const debounceTimer = setTimeout(() => {
      void searchPortalContacts(portalContactSearch);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [activeSection, portalContactSearch, searchPortalContacts]);

  useEffect(() => {
    if (activeSection !== 'portal') return;
    void fetchPortalAppointments(1);
  }, [
    activeSection,
    fetchPortalAppointments,
    portalAppointmentFilters.caseId,
    portalAppointmentFilters.dateFrom,
    portalAppointmentFilters.dateTo,
    portalAppointmentFilters.pointpersonUserId,
    portalAppointmentFilters.requestType,
    portalAppointmentFilters.status,
  ]);

  const handlePortalAppointmentFilterChange = useCallback(
    (
      field: 'status' | 'requestType' | 'caseId' | 'pointpersonUserId' | 'dateFrom' | 'dateTo',
      value: string
    ) => {
      setPortalAppointmentFilters((prev) => ({ ...prev, [field]: value }));
      setPortalAppointmentsPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  const handlePortalAppointmentReminderHistory = useCallback(
    async (appointmentId: string) => {
      try {
        setPortalSelectedAppointmentId(appointmentId);
        setPortalAppointmentRemindersLoading(true);
        const response = await api.get(`/portal/admin/appointments/${appointmentId}/reminders`);
        setPortalAppointmentReminders(response.data || { jobs: [], deliveries: [] });
      } catch (error: unknown) {
        notifyError(error, 'Failed to load appointment reminders');
      } finally {
        setPortalAppointmentRemindersLoading(false);
      }
    },
    [notifyError]
  );

  const handlePortalAppointmentStatusChange = useCallback(
    async (appointmentId: string, status: 'requested' | 'confirmed' | 'cancelled' | 'completed') => {
      try {
        setPortalAppointmentActionLoading(true);
        await api.patch(`/portal/admin/appointments/${appointmentId}/status`, { status });
        showSuccess('Appointment status updated');
        await fetchPortalAppointments(portalAppointmentsPagination.page);
        if (portalSelectedAppointmentId === appointmentId) {
          await handlePortalAppointmentReminderHistory(appointmentId);
        }
      } catch (error: unknown) {
        notifyError(error, 'Failed to update appointment status');
      } finally {
        setPortalAppointmentActionLoading(false);
      }
    },
    [
      fetchPortalAppointments,
      handlePortalAppointmentReminderHistory,
      notifyError,
      portalAppointmentsPagination.page,
      portalSelectedAppointmentId,
      showSuccess,
    ]
  );

  const handlePortalAppointmentCheckIn = useCallback(
    async (appointmentId: string) => {
      try {
        setPortalAppointmentActionLoading(true);
        await api.post(`/portal/admin/appointments/${appointmentId}/check-in`);
        showSuccess('Appointment marked as checked in');
        await fetchPortalAppointments(portalAppointmentsPagination.page);
        if (portalSelectedAppointmentId === appointmentId) {
          await handlePortalAppointmentReminderHistory(appointmentId);
        }
      } catch (error: unknown) {
        notifyError(error, 'Failed to check in appointment');
      } finally {
        setPortalAppointmentActionLoading(false);
      }
    },
    [
      fetchPortalAppointments,
      handlePortalAppointmentReminderHistory,
      notifyError,
      portalAppointmentsPagination.page,
      portalSelectedAppointmentId,
      showSuccess,
    ]
  );

  const handlePortalSendAppointmentReminder = useCallback(
    async (appointmentId: string, options: { sendEmail?: boolean; sendSms?: boolean }) => {
      try {
        setPortalAppointmentActionLoading(true);
        const response = await api.post(`/portal/admin/appointments/${appointmentId}/reminders/send`, {
          ...options,
          customMessage: portalReminderCustomMessage.trim() || undefined,
        });
        const summary = response.data.summary as {
          email?: { sent?: number };
          sms?: { sent?: number };
        } | null;
        const emailSent = summary?.email?.sent ?? 0;
        const smsSent = summary?.sms?.sent ?? 0;
        showSuccess(`Reminder send complete (email: ${emailSent}, sms: ${smsSent})`);
        await fetchPortalAppointments(portalAppointmentsPagination.page);
        await handlePortalAppointmentReminderHistory(appointmentId);
      } catch (error: unknown) {
        notifyError(error, 'Failed to send appointment reminder');
      } finally {
        setPortalAppointmentActionLoading(false);
      }
    },
    [
      fetchPortalAppointments,
      handlePortalAppointmentReminderHistory,
      notifyError,
      portalAppointmentsPagination.page,
      portalReminderCustomMessage,
      showSuccess,
    ]
  );

  const handlePortalUserStatusChange = useCallback(
    async (user: PortalUser, status: string) => {
      try {
        await api.patch(`/portal/admin/users/${user.id}`, { status });
        showSuccess(`Portal user ${status === 'active' ? 'reactivated' : 'suspended'}`);
        await fetchPortalUsers(portalUserSearch);
        if (selectedPortalUser?.id === user.id) {
          setSelectedPortalUser({ ...selectedPortalUser, status });
        }
      } catch (error: unknown) {
        notifyError(error, 'Failed to update portal user status');
      }
    },
    [fetchPortalUsers, notifyError, portalUserSearch, selectedPortalUser, showSuccess]
  );

  const handlePortalUserActivity = useCallback(async (user: PortalUser) => {
    try {
      setSelectedPortalUser(user);
      setPortalActivityLoading(true);
      const response = await api.get(`/portal/admin/users/${user.id}/activity`);
      setPortalUserActivity(response.data.activity || []);
    } finally {
      setPortalActivityLoading(false);
    }
  }, []);

  const handlePortalPasswordReset = useCallback(async () => {
    if (!portalResetTarget || !portalResetPassword) {
      showError('Password is required');
      return;
    }
    if (portalResetPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }
    if (portalResetPassword !== portalResetConfirmPassword) {
      showError('Passwords do not match');
      return;
    }
    try {
      setPortalResetLoading(true);
      await api.post('/portal/admin/reset-password', {
        portalUserId: portalResetTarget.id,
        password: portalResetPassword,
      });
      setPortalResetPassword('');
      setPortalResetConfirmPassword('');
      setPortalResetTarget(null);
      setShowPortalResetModal(false);
      showSuccess('Portal user password updated');
    } catch (error: unknown) {
      notifyError(error, 'Failed to reset password');
    } finally {
      setPortalResetLoading(false);
    }
  }, [
    notifyError,
    portalResetConfirmPassword,
    portalResetPassword,
    portalResetTarget,
    showError,
    showSuccess,
  ]);

  return {
    portalRequests,
    setPortalRequests,
    portalInvitations,
    setPortalInvitations,
    portalInviteEmail,
    setPortalInviteEmail,
    portalInviteContactId,
    setPortalInviteContactId,
    portalInviteUrl,
    setPortalInviteUrl,
    portalLoading,
    setPortalLoading,
    portalUsers,
    setPortalUsers,
    portalUsersLoading,
    setPortalUsersLoading,
    portalUserSearch,
    setPortalUserSearch,
    portalUserActivity,
    setPortalUserActivity,
    portalActivityLoading,
    setPortalActivityLoading,
    selectedPortalUser,
    setSelectedPortalUser,
    portalResetTarget,
    setPortalResetTarget,
    portalResetPassword,
    setPortalResetPassword,
    portalResetConfirmPassword,
    setPortalResetConfirmPassword,
    portalResetLoading,
    setPortalResetLoading,
    showPortalResetModal,
    setShowPortalResetModal,
    portalContactSearch,
    setPortalContactSearch,
    portalContactResults,
    setPortalContactResults,
    portalContactLoading,
    setPortalContactLoading,
    selectedPortalContact,
    setSelectedPortalContact,
    portalAppointments,
    setPortalAppointments,
    portalAppointmentsLoading,
    setPortalAppointmentsLoading,
    portalAppointmentsPagination,
    setPortalAppointmentsPagination,
    portalAppointmentFilters,
    setPortalAppointmentFilters,
    portalSelectedAppointmentId,
    setPortalSelectedAppointmentId,
    portalAppointmentReminders,
    setPortalAppointmentReminders,
    portalAppointmentRemindersLoading,
    setPortalAppointmentRemindersLoading,
    portalAppointmentActionLoading,
    setPortalAppointmentActionLoading,
    portalReminderCustomMessage,
    setPortalReminderCustomMessage,
    onAppointmentUpdated,
    fetchPortalData,
    refreshPortalData,
    fetchPortalUsers,
    searchPortalContacts,
    fetchPortalAppointments,
    handleApprovePortalRequest,
    handleRejectPortalRequest,
    handleCreatePortalInvite,
    handlePortalAppointmentFilterChange,
    handlePortalAppointmentStatusChange,
    handlePortalAppointmentCheckIn,
    handlePortalAppointmentReminderHistory,
    handlePortalSendAppointmentReminder,
    handlePortalUserStatusChange,
    handlePortalUserActivity,
    handlePortalPasswordReset,
  };
};

export type UsePortalSettingsReturn = ReturnType<typeof usePortalSettings>;
