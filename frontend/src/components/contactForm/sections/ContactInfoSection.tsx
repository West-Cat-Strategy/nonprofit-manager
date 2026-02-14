import type { ContactFormErrors, ContactFormValues } from '../types';

interface ContactInfoSectionProps {
  formData: ContactFormValues;
  errors: ContactFormErrors;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function ContactInfoSection({ formData, errors, onChange }: ContactInfoSectionProps) {
  return (
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">Contact Information</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-app-text-muted">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email ?? ''}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.email ? 'border-red-300' : 'border-app-input-border'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label
            htmlFor="preferred_contact_method"
            className="block text-sm font-medium text-app-text-muted"
          >
            Preferred Contact Method
          </label>
          <select
            name="preferred_contact_method"
            id="preferred_contact_method"
            value={formData.preferred_contact_method ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="mobile">Mobile</option>
            <option value="mail">Mail</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-app-text-muted">
            Phone
          </label>
          <input
            type="text"
            name="phone"
            id="phone"
            value={formData.phone ?? ''}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.phone ? 'border-red-300' : 'border-app-input-border'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="mobile_phone" className="block text-sm font-medium text-app-text-muted">
            Mobile Phone
          </label>
          <input
            type="text"
            name="mobile_phone"
            id="mobile_phone"
            value={formData.mobile_phone ?? ''}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.mobile_phone ? 'border-red-300' : 'border-app-input-border'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
          />
          {errors.mobile_phone && (
            <p className="mt-1 text-sm text-red-600">{errors.mobile_phone}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="do_not_email"
                id="do_not_email"
                checked={formData.do_not_email}
                onChange={onChange}
                className="h-4 w-4 text-app-accent focus:ring-app-accent border-app-input-border rounded"
              />
              <label htmlFor="do_not_email" className="ml-2 block text-sm text-app-text">
                Do Not Email
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="do_not_phone"
                id="do_not_phone"
                checked={formData.do_not_phone}
                onChange={onChange}
                className="h-4 w-4 text-app-accent focus:ring-app-accent border-app-input-border rounded"
              />
              <label htmlFor="do_not_phone" className="ml-2 block text-sm text-app-text">
                Do Not Phone
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
