import { useState } from 'react';
import type {
  PortalActivity,
  PortalAdminAppointmentInboxItem,
  PortalAdminAppointmentReminderHistory,
  PortalContactLookup,
  PortalInvitation,
  PortalSignupRequest,
  PortalUser,
} from '../types';

export const usePortalSettings = () => {
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
  };
};

export type UsePortalSettingsReturn = ReturnType<typeof usePortalSettings>;
