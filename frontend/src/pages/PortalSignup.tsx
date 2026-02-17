import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalSignup } from '../store/slices/portalAuthSlice';

export default function PortalSignup() {
  const dispatch = useAppDispatch();
  const { loading, error, signupStatus } = useAppSelector((state) => state.portalAuth);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(portalSignup(formData));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-surface-muted px-4">
      <div className="bg-app-surface shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-app-text">Request Portal Access</h1>
        <p className="text-sm text-app-text-muted mt-2">
          Submit your details and a staff member will approve your access.
        </p>

        {signupStatus === 'success' ? (
          <div className="mt-6">
            <p className="text-green-700 text-sm">
              Request submitted. A staff member will approve your access and share next steps.
            </p>
            <Link to="/portal/login" className="mt-4 inline-block text-app-accent hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
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
              <label className="block text-sm font-medium text-app-text-muted">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted">Phone (optional)</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
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
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <div className="mt-4 text-sm text-app-text-muted">
          Already have access?{' '}
          <Link to="/portal/login" className="text-app-accent hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
