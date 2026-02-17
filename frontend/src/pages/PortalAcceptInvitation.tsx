import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import portalApi from '../services/portalApi';
import { useApiError } from '../hooks/useApiError';
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
  const { error, details, setFromError, clear } = useApiError({ notify: true });
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
        clear();
      } catch (err) {
        setFromError(err, 'Invitation is invalid or expired');
      }
    };
    if (token) {
      loadInvite();
    }
  }, [token, clear, setFromError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await portalApi.post(`/portal/auth/invitations/accept/${token}`, formData);
      if (!invitation?.email) {
        setFromError(new Error('Invitation details are missing'), 'Invitation details are missing');
        return;
      }
      await dispatch(portalLogin({ email: invitation.email, password: formData.password })).unwrap();
      navigate('/portal');
    } catch (err) {
      setFromError(err, 'Failed to accept invitation');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-surface-muted px-4">
      <div className="bg-app-surface shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-app-text">Accept Portal Invitation</h1>
        <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-4" />
        {invitation && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Email</label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="mt-1 w-full px-3 py-2 border border-app-border rounded-md bg-app-surface-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
            >
              Activate Portal Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
