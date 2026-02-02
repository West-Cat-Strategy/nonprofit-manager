import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchContactById, clearCurrentContact } from '../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../store/slices/casesSlice';
import PaymentHistory from '../components/PaymentHistory';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);

  // Get cases for this contact
  const contactCases = useAppSelector((state) =>
    id ? selectCasesByContact(state, id) : []
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(id));
      dispatch(fetchCases({})); // Fetch cases to populate the selector
    }
    return () => {
      dispatch(clearCurrentContact());
    };
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (error || !currentContact) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Contact not found'}
          </div>
          <button
            onClick={() => navigate('/contacts')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${currentContact.first_name} ${currentContact.last_name}`;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link to="/contacts" className="text-blue-600 hover:text-blue-900 mb-2 inline-block">
              ← Back to Contacts
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            {currentContact.job_title && (
              <p className="text-gray-500">{currentContact.job_title}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/contacts/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Edit Contact
          </button>
        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Account</label>
              <p className="mt-1">{currentContact.account_name || 'Not associated'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Role</label>
              <p className="mt-1 capitalize">{currentContact.contact_role}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1">{currentContact.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1">{currentContact.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Mobile</label>
              <p className="mt-1">{currentContact.mobile_phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Department</label>
              <p className="mt-1">{currentContact.department || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    currentContact.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {currentContact.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Preferred Contact Method
              </label>
              <p className="mt-1">{currentContact.preferred_contact_method || '-'}</p>
            </div>
          </div>

          {/* Communication Preferences */}
          {(currentContact.do_not_email || currentContact.do_not_phone) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 font-medium">Communication Preferences:</p>
              <ul className="mt-1 text-sm text-yellow-700">
                {currentContact.do_not_email && <li>• Do not contact via email</li>}
                {currentContact.do_not_phone && <li>• Do not contact via phone</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Address */}
        {(currentContact.address_line1 || currentContact.city) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Address</h2>
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

        {/* Notes */}
        {currentContact.notes && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{currentContact.notes}</p>
          </div>
        )}

        {/* Associated Cases */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Associated Cases</h2>
            <Link
              to={`/cases/new?contact_id=${id}`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Create Case
            </Link>
          </div>

          {contactCases.length === 0 ? (
            <div className="text-center py-6">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No associated cases</p>
              <Link
                to={`/cases/new?contact_id=${id}`}
                className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition"
              >
                Create Case for Contact
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Case #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opened
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contactCases.slice(0, 5).map((case_) => (
                      <tr key={case_.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {case_.case_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <Link
                            to={`/cases/${case_.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {case_.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {case_.case_type_name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              case_.status_type === 'closed'
                                ? 'bg-gray-100 text-gray-800'
                                : case_.status_type === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {case_.status_name || case_.status_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              case_.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : case_.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : case_.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {case_.is_urgent && <span className="mr-1">⚠️</span>}
                            {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {case_.opened_date
                            ? new Date(case_.opened_date).toLocaleDateString()
                            : 'Not opened'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/cases/${case_.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {contactCases.length > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    to={`/cases?contact_id=${id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {contactCases.length} cases →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment History */}
        <PaymentHistory contactId={id} limit={5} showViewAll={true} />
      </div>
    </div>
  );
};

export default ContactDetail;
