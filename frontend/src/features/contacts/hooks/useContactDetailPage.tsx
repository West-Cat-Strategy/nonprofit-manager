import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { clearCurrentContact, fetchContactById, fetchContactNotes } from '../state';
import type { Contact } from '../state';
import { fetchCasesByContact, selectCasesByContact } from '../../cases/state';
import type { ContactNote } from '../../../types/contact';
import { BrutalBadge, BrutalButton } from '../../../components/neo-brutalist';
import { isUuid } from '../../../utils/uuid';

export type ContactDetailTab =
  | 'overview'
  | 'notes'
  | 'tasks'
  | 'activity'
  | 'communications'
  | 'followups'
  | 'documents'
  | 'payments';

type ContactTabConfig = {
  id: ContactDetailTab;
  label: string;
  count?: number;
};

type ContactSnapshotItem = {
  label: string;
  value: number;
};

type ContactDetailState = {
  core?: {
    currentContact?: Contact | null;
    loading?: boolean;
    error?: string | null;
  };
  currentContact?: Contact | null;
  loading?: boolean;
  error?: string | null;
  notes?: {
    contactNotes?: ContactNote[];
  };
  contactNotes?: ContactNote[];
};

export const useContactDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const hasValidId = isUuid(id);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => {
    const contactsModule = state.contacts as ContactDetailState;
    const core = contactsModule?.core ?? {};
    return {
      currentContact: core.currentContact ?? contactsModule?.currentContact ?? null,
      loading: core.loading ?? contactsModule?.loading ?? false,
      error: core.error ?? contactsModule?.error ?? null,
    };
  });
  const { contactNotes } = useAppSelector((state) => {
    const contactsModule = state.contacts as ContactDetailState;
    const notes = contactsModule?.notes ?? {};
    return {
      contactNotes: notes.contactNotes ?? contactsModule?.contactNotes ?? [],
    };
  });
  const contactCases = useAppSelector((state) => (hasValidId && id ? selectCasesByContact(state, id) : []));

  const [activeTab, setActiveTab] = useState<ContactDetailTab>('overview');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [openNoteForm, setOpenNoteForm] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  useEffect(() => {
    if (!hasValidId || !id) {
      return;
    }

    dispatch(fetchContactById(id));
    dispatch(fetchCasesByContact(id));
    dispatch(fetchContactNotes(id));
  }, [dispatch, hasValidId, id]);

  useEffect(() => {
    return () => {
      dispatch(clearCurrentContact());
    };
  }, [dispatch]);

  const alertNotes = useMemo(
    () => contactNotes.filter((note: ContactNote) => note.is_alert),
    [contactNotes]
  );

  useEffect(() => {
    if (alertNotes.length > 0) {
      setShowAlertModal(true);
    }
  }, [alertNotes.length]);

  const roleBadgeColor = useCallback((role: string): 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'gray' => {
    if (role === 'Donor') return 'green';
    if (role === 'Staff' || role === 'Executive Director') return 'blue';
    if (role === 'Volunteer') return 'purple';
    if (role === 'Board Member') return 'yellow';
    if (role === 'Client') return 'red';
    return 'gray';
  }, []);

  const tabs = useMemo<ContactTabConfig[]>(() => {
    if (!currentContact) {
      return [];
    }

    return [
      { id: 'overview', label: 'Overview' },
      { id: 'notes', label: 'Notes', count: currentContact.note_count || 0 },
      { id: 'tasks', label: 'Tasks' },
      { id: 'activity', label: 'Activity' },
      { id: 'communications', label: 'Communications' },
      { id: 'followups', label: 'Follow-ups' },
      { id: 'documents', label: 'Documents' },
      { id: 'payments', label: 'Payments' },
    ];
  }, [currentContact]);

  const snapshotItems = useMemo<ContactSnapshotItem[]>(() => {
    if (!currentContact) {
      return [];
    }

    return [
      { label: 'Notes', value: currentContact.note_count || 0 },
      { label: 'Cases', value: contactCases.length },
      { label: 'Relationships', value: currentContact.relationship_count || 0 },
      { label: 'Emails', value: currentContact.email_count || 0 },
      { label: 'Phones', value: currentContact.phone_count || 0 },
    ];
  }, [contactCases.length, currentContact]);

  const fullName = useMemo(() => {
    if (!currentContact) {
      return '';
    }

    const displayFirstName = currentContact.preferred_name || currentContact.first_name;
    return `${currentContact.salutation ? `${currentContact.salutation} ` : ''}${displayFirstName} ${currentContact.middle_name ? `${currentContact.middle_name} ` : ''}${currentContact.last_name}`;
  }, [currentContact]);

  const contactDescription = useMemo(() => {
    if (!currentContact) {
      return null;
    }

    return (
      <div className="space-y-1">
        {currentContact.job_title ? (
          <p>
            {currentContact.job_title}
            {currentContact.department ? ` - ${currentContact.department}` : ''}
          </p>
        ) : null}
        {currentContact.account_name ? (
          <p className="text-black/60 dark:text-white/70">
            Organization: {currentContact.account_name}
          </p>
        ) : null}
      </div>
    );
  }, [currentContact]);

  const contactMetadata = useMemo(() => {
    if (!currentContact) {
      return null;
    }

    return (
      <>
        <BrutalBadge color={currentContact.is_active ? 'green' : 'gray'} size="sm">
          {currentContact.is_active ? 'Active' : 'Inactive'}
        </BrutalBadge>
        {currentContact.pronouns ? (
          <BrutalBadge color="gray" size="sm">
            {currentContact.pronouns}
          </BrutalBadge>
        ) : null}
        {currentContact.roles?.map((role: string) => (
          <BrutalBadge key={role} color={roleBadgeColor(role)} size="sm">
            {role}
          </BrutalBadge>
        ))}
      </>
    );
  }, [currentContact, roleBadgeColor]);

  const contactActions = useMemo(() => {
    if (!currentContact) {
      return null;
    }

    return (
      <>
        <BrutalButton
          onClick={() => {
            if (!id) {
              return;
            }

            window.open(`/contacts/${id}/print`, '_blank', 'noopener,noreferrer');
          }}
          variant="secondary"
        >
          Print / Export
        </BrutalButton>
        <BrutalButton
          onClick={() => {
            setActiveTab('notes');
            setOpenNoteForm(true);
          }}
          variant="secondary"
        >
          Add Note
        </BrutalButton>
        <BrutalButton onClick={() => setActiveTab('followups')} variant="secondary">
          Schedule Follow-up
        </BrutalButton>
        <BrutalButton onClick={() => setActiveTab('communications')} variant="secondary">
          Communications
        </BrutalButton>
        <BrutalButton onClick={() => setShowMergeDialog(true)} variant="secondary">
          Merge Contact
        </BrutalButton>
        <BrutalButton onClick={() => navigate(`/contacts/${id}/edit`)} variant="primary">
          Edit Contact
        </BrutalButton>
      </>
    );
  }, [currentContact, id, navigate]);

  const handleNavigateBack = useCallback(() => {
    navigate('/contacts');
  }, [navigate]);

  return {
    id,
    hasValidId,
    currentContact,
    loading,
    error,
    contactNotes,
    contactCases,
    activeTab,
    setActiveTab,
    showAlertModal,
    setShowAlertModal,
    openNoteForm,
    setOpenNoteForm,
    showMergeDialog,
    setShowMergeDialog,
    alertNotes,
    tabs,
    snapshotItems,
    fullName,
    contactDescription,
    contactMetadata,
    contactActions,
    handleNavigateBack,
  };
};
