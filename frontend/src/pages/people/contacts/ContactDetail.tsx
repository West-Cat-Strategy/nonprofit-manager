/**
 * ContactDetail Page
 * Page for viewing a contact's full details with neo-brutalist styling
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact } from '../../../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../../../store/slices/casesSlice';
import { BrutalBadge, BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import PaymentHistory from '../../../components/PaymentHistory';
import ContactPhoneNumbers from '../../../components/ContactPhoneNumbers';
import ContactEmailAddresses from '../../../components/ContactEmailAddresses';
import ContactRelationships from '../../../components/ContactRelationships';
import ContactNotes from '../../../components/ContactNotes';
import ContactDocuments from '../../../components/ContactDocuments';
import { formatDate } from '../../../utils/format';

type TabType = 'overview' | 'notes' | 'documents' | 'payments';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Get cases for this contact
  const contactCases = useAppSelector((state) => (id ? selectCasesByContact(state, id) : []));

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(id));
      dispatch(fetchCases({}));
    }
    return () => {
      dispatch(clearCurrentContact());
    };
  }, [id, dispatch]);

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

  const fullName = `${currentContact.salutation ? currentContact.salutation + ' ' : ''}${currentContact.first_name} ${currentContact.middle_name ? currentContact.middle_name + ' ' : ''}${currentContact.last_name}${currentContact.suffix ? ', ' + currentContact.suffix : ''}`;

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
    { id: 'documents', label: 'Documents' },
    { id: 'payments', label: 'Payments' },
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
            <BrutalButton onClick={() => navigate(`/contacts/${id}/edit`)} variant="primary">
              Edit Contact
            </BrutalButton>
          </div>
        </div>
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
              {(currentContact.address_line1 || currentContact.city) && (
                <BrutalCard color="white" className="p-6">
                  <h2 className="text-lg font-black uppercase text-black mb-4 border-b-2 border-black pb-2">
                    Address
                  </h2>
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
            {id && <ContactNotes contactId={id} />}
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
            <PaymentHistory contactId={id} limit={20} showViewAll={false} />
          </BrutalCard>
        )}
      </div>
    </div>
  );
};

export default ContactDetail;
