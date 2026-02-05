import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import portalApi from '../services/portalApi';
import { formatApiErrorMessage } from '../utils/apiError';
import ErrorBanner from '../components/ErrorBanner';
import { useAppDispatch } from '../store/hooks';
import { portalLogin } from '../store/slices/portalAuthSlice';

interface InvitationInfo {
  email: string;
  contactId: string | null;
  expiresAt: string;
}

export default function PortalAcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
  });

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await portalApi.get(`/portal/auth/invitations/validate/${token}`);
        setInvitation(response.data.invitation);
      } catch (err: any) {
        setError(formatApiErrorMessage(err, 'Invitation is invalid or expired'));
      }
    };
    if (token) {
      loadInvite();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await portalApi.post(`/portal/auth/invitations/accept/${token}`, formData);
      await dispatch(portalLogin({ email: invitation!.email, password: formData.password })).unwrap();
      navigate('/portal');
    } catch (err: any) {
      setError(formatApiErrorMessage(err, 'Failed to accept invitation'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Accept Portal Invitation</h1>
        <ErrorBanner message={error} className="mt-4" />
        {invitation && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Activate Portal Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
