import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchAccountById, clearCurrentAccount } from '../../../store/slices/accountsSlice';
import PaymentHistory from '../../../components/PaymentHistory';

const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentAccount, loading, error } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    if (id) {
      dispatch(fetchAccountById(id));
    }
    return () => {
      dispatch(clearCurrentAccount());
    };
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-surface-muted p-6">
        <div className="max-w-4xl mx-auto bg-app-surface rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-text-muted">Loading account...</p>
        </div>
      </div>
    );
  }

  if (error || !currentAccount) {
    return (
      <div className="min-h-screen bg-app-surface-muted p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Account not found'}
          </div>
          <button
            onClick={() => navigate('/accounts')}
            className="mt-4 text-app-accent hover:text-app-accent-text"
          >
            ← Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-surface-muted p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link to="/accounts" className="text-app-accent hover:text-app-accent-text mb-2 inline-block">
              ← Back to Accounts
            </Link>
            <h1 className="text-3xl font-bold text-app-text">{currentAccount.account_name}</h1>
            <p className="text-app-text-muted">{currentAccount.account_number}</p>
          </div>
          <button
            onClick={() => navigate(`/accounts/${id}/edit`)}
            className="bg-app-accent text-white px-4 py-2 rounded-lg hover:bg-app-accent-hover transition"
          >
            Edit Account
          </button>
        </div>

        {/* Account Details */}
        <div className="bg-app-surface rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Type</label>
              <p className="mt-1 capitalize">{currentAccount.account_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Category</label>
              <p className="mt-1 capitalize">{currentAccount.category}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Email</label>
              <p className="mt-1">{currentAccount.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Phone</label>
              <p className="mt-1">{currentAccount.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Website</label>
              <p className="mt-1">
                {currentAccount.website ? (
                  <a
                    href={currentAccount.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-app-accent hover:text-app-accent-text"
                  >
                    {currentAccount.website}
                  </a>
                ) : (
                  '-'
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Status</label>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    currentAccount.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-app-surface-muted text-app-text'
                  }`}
                >
                  {currentAccount.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>

          {currentAccount.description && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-app-text-muted">Description</label>
              <p className="mt-1 text-app-text-muted">{currentAccount.description}</p>
            </div>
          )}
        </div>

        {/* Address */}
        {(currentAccount.address_line1 || currentAccount.city) && (
          <div className="bg-app-surface rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Address</h2>
            <p className="text-app-text-muted">
              {currentAccount.address_line1 && (
                <>
                  {currentAccount.address_line1}
                  <br />
                </>
              )}
              {currentAccount.address_line2 && (
                <>
                  {currentAccount.address_line2}
                  <br />
                </>
              )}
              {currentAccount.city && <>{currentAccount.city}, </>}
              {currentAccount.state_province} {currentAccount.postal_code}
              {currentAccount.country && (
                <>
                  <br />
                  {currentAccount.country}
                </>
              )}
            </p>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-app-surface rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Tax ID</label>
              <p className="mt-1">{currentAccount.tax_id || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Created</label>
              <p className="mt-1">{new Date(currentAccount.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <PaymentHistory accountId={id} limit={5} showViewAll={true} />
      </div>
    </div>
  );
};

export default AccountDetail;
