import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogin } from '../store/slices/portalAuthSlice';

export default function PortalLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.portalAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(portalLogin({ email, password })).unwrap();
      navigate('/portal');
    } catch {
      // handled by state
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-surface-muted px-4">
      <div className="bg-app-surface shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-app-text">Client Portal Login</h1>
        <p className="text-sm text-app-text-muted mt-2">Access your portal to manage your information.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-app-input-border rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-sm text-app-text-muted">
          New here?{' '}
          <Link to="/portal/signup" className="text-app-accent hover:underline">
            Request access
          </Link>
        </div>
      </div>
    </div>
  );
}
