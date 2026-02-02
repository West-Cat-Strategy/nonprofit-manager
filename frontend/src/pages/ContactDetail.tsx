import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchContactById, clearCurrentContact } from '../store/slices/contactsSlice';
import PaymentHistory from '../components/PaymentHistory';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(id));
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

        {/* Payment History */}
        <PaymentHistory contactId={id} limit={5} showViewAll={true} />
      </div>
    </div>
  );
};

export default ContactDetail;
