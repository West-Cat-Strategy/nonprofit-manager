/**
 * ContactDetail Page
 * Page for viewing a contact's full details with neo-brutalist styling
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact, fetchContactNotes } from '../../../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../../../store/slices/casesSlice';
import { BrutalBadge, BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import PaymentHistory from '../../../components/PaymentHistory';
import ContactPhoneNumbers from '../../../components/ContactPhoneNumbers';
import ContactEmailAddresses from '../../../components/ContactEmailAddresses';
import ContactRelationships from '../../../components/ContactRelationships';
import ContactNotes from '../../../components/ContactNotes';
import ContactDocuments from '../../../components/ContactDocuments';
import ContactTags from '../../../components/ContactTags';
import ContactTasks from '../../../components/ContactTasks';
import ContactActivityTimeline from '../../../components/ContactActivityTimeline';
import { formatDate } from '../../../utils/format';

type TabType = 'overview' | 'notes' | 'tasks' | 'activity' | 'documents' | 'payments';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error, contactNotes } = useAppSelector((state) => state.contacts);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [openNoteForm, setOpenNoteForm] = useState(false);

  // Get cases for this contact
  const contactCases = useAppSelector((state) => (id ? selectCasesByContact(state, id) : []));

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(id));
      dispatch(fetchCases({}));
      dispatch(fetchContactNotes(id));
    }
    return () => {
      dispatch(clearCurrentContact());
    };
  }, [id, dispatch]);

  // Show alert modal when alert notes exist
  const alertNotes = contactNotes.filter((n) => n.is_alert);
  useEffect(() => {
    if (alertNotes.length > 0) {
      setShowAlertModal(true);
    }
  }, [alertNotes.length]);

  if (loading) {
    return (
      <div className="p-6">
        <BrutalCard color="white" className="p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent mb-4" />
            <p className="font-bold text-black">Loading contact...</p>
          </div>
        </BrutalCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <BrutalCard color="pink" className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-black uppercase text-black mb-2">Error</h2>
            <p className="font-bold text-black/70 mb-4">{error}</p>
            <BrutalButton onClick={() => navigate('/contacts')} variant="secondary">
              Back to People
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

  if (!currentContact) {
    return (
      <div className="p-6">
        <BrutalCard color="yellow" className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-black uppercase text-black mb-2">Contact Not Found</h2>
            <p className="font-bold text-black/70 mb-4">
              The contact you're looking for doesn't exist or has been removed.
            </p>
            <BrutalButton onClick={() => navigate('/contacts')} variant="primary">
              Back to People
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

  const displayFirstName = currentContact.preferred_name || currentContact.first_name;
  const fullName = `${currentContact.salutation ? currentContact.salutation + ' ' : ''}${displayFirstName} ${currentContact.middle_name ? currentContact.middle_name + ' ' : ''}${currentContact.last_name}`;

  const formatDateOrDash = (dateString: string | null) => {
    return dateString ? formatDate(dateString) : '-';
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notes', label: 'Notes', count: currentContact.note_count || 0 },
    { id: 'tasks', label: 'Tasks' },
    { id: 'activity', label: 'Activity' },
    { id: 'documents', label: 'Documents' },
    { id: 'payments', label: 'Payments' },
  ];

  const snapshotItems = [
    { label: 'Notes', value: currentContact.note_count || 0 },
    { label: 'Cases', value: contactCases.length },
    { label: 'Relationships', value: currentContact.relationship_count || 0 },
    { label: 'Emails', value: currentContact.email_count || 0 },
    { label: 'Phones', value: currentContact.phone_count || 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="purple" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              onClick={() => navigate('/contacts')}
              className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
              aria-label="Back to people"
            >
              ← Back to People
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                {fullName}
              </h1>
              {currentContact.pronouns && (
                <BrutalBadge color="gray" size="sm">
                  {currentContact.pronouns}
                </BrutalBadge>
              )}
              <BrutalBadge color={currentContact.is_active ? 'green' : 'gray'} size="sm">
                {currentContact.is_active ? 'Active' : 'Inactive'}
              </BrutalBadge>
              {currentContact.roles && currentContact.roles.length > 0 && currentContact.roles.map((role) => (
                <BrutalBadge
                  key={role}
                  color={
                    role === 'Donor' ? 'green'
                    : role === 'Staff' || role === 'Executive Director' ? 'blue'
                    : role === 'Volunteer' ? 'purple'
                    : role === 'Board Member' ? 'yellow'
                    : role === 'Client' ? 'red'
                    : 'gray'
                  }
                  size="sm"
                >
                  {role}
                </BrutalBadge>
              ))}
            </div>
            {currentContact.job_title && (
              <p className="mt-1 font-bold text-black/70">
                {currentContact.job_title}
                {currentContact.department && ` - ${currentContact.department}`}
              </p>
            )}
            {currentContact.account_name && (
              <p className="text-sm font-bold text-black/60">
                Organization: {currentContact.account_name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <BrutalButton
              onClick={() => {
                setActiveTab('notes');
                setOpenNoteForm(true);
              }}
              variant="secondary"
            >
              Add Note
            </BrutalButton>
            <BrutalButton onClick={() => navigate(`/contacts/${id}/edit`)} variant="primary">
              Edit Contact
            </BrutalButton>
          </div>
        </div>
        {currentContact.tags && currentContact.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentContact.tags.map((tag) => (
              <BrutalBadge key={tag} color="yellow" size="sm">
                {tag}
              </BrutalBadge>
            ))}
          </div>
        )}
      </BrutalCard>

      {/* Tabs */}
      <div
        className="flex flex-wrap gap-2 border-b-4 border-black pb-2"
        role="tablist"
        aria-label="Contact sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-black uppercase transition-all border-2 border-black ${
              activeTab === tab.id
                ? 'bg-black text-white shadow-[2px_2px_0px_var(--shadow-color)]'
                : 'bg-white text-black hover:bg-[var(--loop-yellow)] shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={activeTab}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Snapshot */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  Snapshot
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {snapshotItems.map((item) => (
                    <div key={item.label} className="border-2 border-black p-3 bg-white">
                      <div className="text-xs font-black uppercase text-black/60">{item.label}</div>
                      <div className="text-2xl font-black text-black">{item.value}</div>
                    </div>
                  ))}
                  <div className="border-2 border-black p-3 bg-white">
                    <div className="text-xs font-black uppercase text-black/60">Last Updated</div>
                    <div className="text-sm font-black text-black">
                      {formatDate(currentContact.updated_at)}
                    </div>
                  </div>
                </div>
              </BrutalCard>

              {/* Personal Information */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  Personal Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-black/60">
                      Date of Birth
                    </label>
                    <p className="mt-1 font-bold text-black">
                      {formatDateOrDash(currentContact.birth_date)}
                      {currentContact.birth_date && calculateAge(currentContact.birth_date) !== null && (
                        <span className="text-black/60 ml-1">
                          (Age: {calculateAge(currentContact.birth_date)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-black/60">
                      Gender
                    </label>
                    <p className="mt-1 font-bold text-black">{currentContact.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-black/60">
                      Pronouns
                    </label>
                    <p className="mt-1 font-bold text-black">{currentContact.pronouns || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-black/60">
                      Preferred Contact Method
                    </label>
                    <p className="mt-1 font-bold text-black capitalize">
                      {currentContact.preferred_contact_method || '-'}
                    </p>
                  </div>
                </div>

                {/* Communication Preferences */}
                {(currentContact.do_not_email || currentContact.do_not_phone) && (
                  <div className="mt-4 p-3 bg-[var(--loop-yellow)] border-2 border-black">
                    <p className="text-sm font-black uppercase text-black">
                      Communication Preferences:
                    </p>
                    <ul className="mt-1 text-sm font-bold text-black/80">
                      {currentContact.do_not_email && <li>• Do not contact via email</li>}
                      {currentContact.do_not_phone && <li>• Do not contact via phone</li>}
                    </ul>
                  </div>
                )}
              </BrutalCard>

              {/* Address */}
              {(currentContact.no_fixed_address || currentContact.address_line1 || currentContact.city) && (
                <BrutalCard color="white" className="p-6">
                  <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                    Address
                  </h2>
                  {currentContact.no_fixed_address ? (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border-2 border-yellow-300">
                      <span className="text-xl">📍</span>
                      <span className="font-bold text-black">No fixed address</span>
                    </div>
                  ) : (
                    <p className="font-bold text-black">
                      {currentContact.address_line1 && (
                        <>
                          {currentContact.address_line1}
                          <br />
                        </>
                      )}
                      {currentContact.address_line2 && (
                        <>
                          {currentContact.address_line2}
                          <br />
                        </>
                      )}
                      {currentContact.city && <>{currentContact.city}, </>}
                      {currentContact.state_province} {currentContact.postal_code}
                      {currentContact.country && (
                        <>
                          <br />
                          {currentContact.country}
                        </>
                      )}
                    </p>
                  )}
                </BrutalCard>
              )}

              {/* Associated Cases */}
              <BrutalCard color="white" className="p-6">
                <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                  <h2 className="text-lg font-black uppercase text-black">Associated Cases</h2>
                  <Link
                    to={`/cases/new?contact_id=${id}`}
                    className="text-sm font-black uppercase text-black hover:text-[var(--loop-green)] transition"
                  >
                    + Create Case
                  </Link>
                </div>

                {contactCases.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-black/30">
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-sm font-bold text-black/70">No associated cases</p>
                    <Link
                      to={`/cases/new?contact_id=${id}`}
                      className="mt-3 inline-block px-4 py-2 text-sm font-black uppercase text-black bg-[var(--loop-green)] border-2 border-black shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                    >
                      Create Case
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contactCases.slice(0, 5).map((case_) => (
                      <Link
                        key={case_.id}
                        to={`/cases/${case_.id}`}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-[var(--loop-yellow)] transition-colors"
                      >
                        <div>
                          <div className="font-black text-black">{case_.title}</div>
                          <div className="text-sm font-bold text-black/70">
                            {case_.case_number} • {case_.case_type_name || 'General'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BrutalBadge
                            color={
                              case_.status_type === 'closed'
                                ? 'gray'
                                : case_.status_type === 'active'
                                  ? 'green'
                                  : 'blue'
                            }
                            size="sm"
                          >
                            {case_.status_name || case_.status_type}
                          </BrutalBadge>
                          {case_.is_urgent && (
                            <span className="text-red-600" aria-label="Urgent">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                    {contactCases.length > 5 && (
                      <Link
                        to={`/cases?contact_id=${id}`}
                        className="block text-center text-sm font-black uppercase text-black hover:text-[var(--loop-green)] pt-2"
                      >
                        View all {contactCases.length} cases →
                      </Link>
                    )}
                  </div>
                )}
              </BrutalCard>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Tags */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  Tags
                </h2>
                {id && <ContactTags contactId={id} tags={currentContact.tags || []} />}
              </BrutalCard>

              {/* Phone Numbers */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  Phone Numbers
                </h2>
                {id && <ContactPhoneNumbers contactId={id} />}
              </BrutalCard>

              {/* Email Addresses */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  Email Addresses
                </h2>
                {id && <ContactEmailAddresses contactId={id} />}
              </BrutalCard>

              {/* Associated People */}
              <BrutalCard color="white" className="p-6">
                <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                  {currentContact.first_name}'s People
                </h2>
                {id && <ContactRelationships contactId={id} />}
              </BrutalCard>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <BrutalCard color="white" className="p-6">
            <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
              Notes Timeline
            </h2>
            {id && (
              <ContactNotes
                contactId={id}
                openOnMount={openNoteForm}
                onOpenHandled={() => setOpenNoteForm(false)}
              />
            )}
          </BrutalCard>
        )}

        {activeTab === 'tasks' && (
          <BrutalCard color="white" className="p-6">
            {id && <ContactTasks contactId={id} />}
          </BrutalCard>
        )}

        {activeTab === 'activity' && (
          <BrutalCard color="white" className="p-6">
            <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
              Activity Timeline
            </h2>
            {id && <ContactActivityTimeline contactId={id} />}
          </BrutalCard>
        )}

        {activeTab === 'documents' && (
          <BrutalCard color="white" className="p-6">
            <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
              Documents
            </h2>
            {id && <ContactDocuments contactId={id} />}
          </BrutalCard>
        )}

        {activeTab === 'payments' && (
          <BrutalCard color="white" className="p-6">
            <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
              Payment History
            </h2>
            {id && <PaymentHistory contactId={id} limit={20} showViewAll={false} />}
          </BrutalCard>
        )}
      </div>

      {/* Alert Notes Modal */}
      {showAlertModal && alertNotes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-red-500 border-b-4 border-black p-4 flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-black uppercase text-white">Alert Notes</h2>
            </div>
            <div className="p-6 space-y-4">
              {alertNotes.map((note) => (
                <div key={note.id} className="border-2 border-red-300 bg-red-50 p-4 rounded">
                  {note.subject && (
                    <div className="font-black text-black mb-1">{note.subject}</div>
                  )}
                  <div className="text-sm text-black/80 whitespace-pre-wrap">{note.content}</div>
                  <div className="text-xs text-black/50 mt-2">
                    {note.created_by_first_name} {note.created_by_last_name} &bull;{' '}
                    {new Date(note.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-6 py-2 font-black uppercase text-black bg-[var(--loop-yellow)] border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactDetail;
