import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { portalSignup } from '../../portalAuth/state';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';

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
    <AuthHeroShell
      badge="Client portal"
      title="Request Portal Access"
      description="Submit your details and staff will review your request."
      highlights={[
        'Use the same email tied to your client contact.',
        'Approval keeps portal access aligned with case visibility rules.',
        'You will sign in immediately once approved.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Access request</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        Request your portal account
      </h2>

      {signupStatus === 'success' ? (
        <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-4 text-sm text-app-accent-text">
          <p>Request submitted. A staff member will review and share next steps.</p>
          <Link to="/portal/login" className="mt-3 inline-block font-medium text-app-text-heading hover:underline">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text" role="alert" aria-live="polite">
              {error}
            </div>
          )}
          <FormField
            id="portal-signup-first-name"
            type="text"
            name="firstName"
            label="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
            autoComplete="given-name"
          />
          <FormField
            id="portal-signup-last-name"
            type="text"
            name="lastName"
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
            autoComplete="family-name"
          />
          <FormField
            id="portal-signup-email"
            type="email"
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          <FormField
            id="portal-signup-phone"
            type="text"
            name="phone"
            label="Phone"
            helperText="Optional"
            value={formData.phone}
            onChange={handleChange}
            autoComplete="tel"
          />
          <FormField
            id="portal-signup-password"
            type="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
            {loading ? 'Submitting...' : 'Submit Request'}
          </PrimaryButton>
        </form>
      )}

      <p className="mt-4 text-sm text-app-text-muted">
        Already have access?{' '}
        <Link to="/portal/login" className="font-medium text-app-text-heading hover:underline">
          Sign in
        </Link>
      </p>
    </AuthHeroShell>
  );
}
