import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact } from '../../../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../../../store/slices/casesSlice';
import PaymentHistory from '../../../components/PaymentHistory';
import ContactPhoneNumbers from '../../../components/ContactPhoneNumbers';
import ContactEmailAddresses from '../../../components/ContactEmailAddresses';
import ContactRelationships from '../../../components/ContactRelationships';
import ContactNotes from '../../../components/ContactNotes';
import ContactDocuments from '../../../components/ContactDocuments';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'documents' | 'payments'>('overview');

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
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (error || !currentContact) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Contact not found'}
          </div>
          <button onClick={() => navigate('/contacts')} className="mt-4 text-blue-600 hover:text-blue-900">
            &larr; Back to People
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${currentContact.salutation ? currentContact.salutation + ' ' : ''}${currentContact.first_name} ${currentContact.middle_name ? currentContact.middle_name + ' ' : ''}${currentContact.last_name}${currentContact.suffix ? ', ' + currentContact.suffix : ''}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <Link to="/contacts" className="text-blue-600 hover:text-blue-900 mb-2 inline-block">
              &larr; Back to People
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
              {currentContact.pronouns && (
                <span className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded">
                  {currentContact.pronouns}
                </span>
              )}
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  currentContact.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {currentContact.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {currentContact.job_title && (
              <p className="text-gray-500 mt-1">
                {currentContact.job_title}
                {currentContact.department && ` - ${currentContact.department}`}
              </p>
            )}
            {currentContact.account_name && (
              <p className="text-sm text-gray-500">
                Organization: {currentContact.account_name}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/contacts/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Edit Contact
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes {currentContact.note_count ? `(${currentContact.note_count})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="mt-1">
                      {formatDate(currentContact.birth_date)}
                      {currentContact.birth_date && calculateAge(currentContact.birth_date) !== null && (
                        <span className="text-gray-400 ml-1">
                          (Age: {calculateAge(currentContact.birth_date)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Gender</label>
                    <p className="mt-1">{currentContact.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Pronouns</label>
                    <p className="mt-1">{currentContact.pronouns || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Preferred Contact Method
                    </label>
                    <p className="mt-1 capitalize">{currentContact.preferred_contact_method || '-'}</p>
                  </div>
                </div>

                {/* Communication Preferences */}
                {(currentContact.do_not_email || currentContact.do_not_phone) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800 font-medium">Communication Preferences:</p>
                    <ul className="mt-1 text-sm text-yellow-700">
                      {currentContact.do_not_email && <li>&#8226; Do not contact via email</li>}
                      {currentContact.do_not_phone && <li>&#8226; Do not contact via phone</li>}
                    </ul>
                  </div>
                )}
              </div>

              {/* Address */}
              {(currentContact.address_line1 || currentContact.city) && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Address</h2>
                  <p className="text-gray-700">
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
                </div>
              )}

              {/* Associated Cases */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Associated Cases</h2>
                  <Link
                    to={`/cases/new?contact_id=${id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Create Case
                  </Link>
                </div>

                {contactCases.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-gray-400 text-4xl mb-2">📁</div>
                    <p className="text-sm text-gray-500">No associated cases</p>
                    <Link
                      to={`/cases/new?contact_id=${id}`}
                      className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition"
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
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{case_.title}</div>
                          <div className="text-sm text-gray-500">
                            {case_.case_number} &bull; {case_.case_type_name || 'General'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              case_.status_type === 'closed'
                                ? 'bg-gray-100 text-gray-800'
                                : case_.status_type === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {case_.status_name || case_.status_type}
                          </span>
                          {case_.is_urgent && <span className="text-red-500">&#9888;</span>}
                        </div>
                      </Link>
                    ))}
                    {contactCases.length > 5 && (
                      <Link
                        to={`/cases?contact_id=${id}`}
                        className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium pt-2"
                      >
                        View all {contactCases.length} cases &rarr;
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Phone Numbers */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Phone Numbers</h2>
                {id && <ContactPhoneNumbers contactId={id} />}
              </div>

              {/* Email Addresses */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Email Addresses</h2>
                {id && <ContactEmailAddresses contactId={id} />}
              </div>

              {/* Associated People */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">{currentContact.first_name}'s People</h2>
                {id && <ContactRelationships contactId={id} />}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Notes Timeline</h2>
            {id && <ContactNotes contactId={id} />}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            {id && <ContactDocuments contactId={id} />}
          </div>
        )}

        {activeTab === 'payments' && (
          <PaymentHistory contactId={id} limit={20} showViewAll={false} />
        )}
      </div>
    </div>
  );
};

export default ContactDetail;
