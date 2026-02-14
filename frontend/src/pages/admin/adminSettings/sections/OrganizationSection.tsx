import type { OrganizationConfig, SaveStatus } from '../types';
import { currencies, dateFormats, months, provinces, timezones } from '../constants';
import { validatePostalCode } from '../utils';
import SaveBar from '../components/SaveBar';

interface OrganizationSectionProps {
  config: OrganizationConfig;
  onChange: (field: string, value: string) => void;
  onAddressChange: (field: string, value: string) => void;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: SaveStatus;
}

export default function OrganizationSection({
  config,
  onChange,
  onAddressChange,
  onPhoneChange,
  onSave,
  isSaving,
  saveStatus,
}: OrganizationSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Organization Profile</h2>
          <p className="text-sm text-app-text-muted mt-1">Basic information about your organization</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Your Nonprofit Name"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="contact@nonprofit.org"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={config.phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(604) 555-1234"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Website
            </label>
            <input
              type="url"
              value={config.website}
              onChange={(e) => onChange('website', e.target.value)}
              placeholder="https://www.nonprofit.org"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Address</h2>
          <p className="text-sm text-app-text-muted mt-1">Your organization&apos;s physical address</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={config.address.line1}
              onChange={(e) => onAddressChange('line1', e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              value={config.address.line2}
              onChange={(e) => onAddressChange('line2', e.target.value)}
              placeholder="Suite 100"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-app-text-label mb-1">
                City
              </label>
              <input
                type="text"
                value={config.address.city}
                onChange={(e) => onAddressChange('city', e.target.value)}
                placeholder="Vancouver"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Province/State
              </label>
              {config.address.country === 'Canada' ? (
                <select
                  value={config.address.province}
                  onChange={(e) => onAddressChange('province', e.target.value)}
                  title="Select province"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {provinces.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.address.province}
                  onChange={(e) => onAddressChange('province', e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                {config.address.country === 'Canada' ? 'Postal Code' : 'ZIP Code'}
              </label>
              <input
                type="text"
                value={config.address.postalCode}
                onChange={(e) => onAddressChange('postalCode', e.target.value)}
                placeholder={config.address.country === 'Canada' ? 'V6B 1A1' : '12345'}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent ${
                  config.address.postalCode && !validatePostalCode(config.address.postalCode, config.address.country)
                    ? 'border-red-300'
                    : 'border-app-input-border'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Country
              </label>
              <select
                value={config.address.country}
                onChange={(e) => onAddressChange('country', e.target.value)}
                title="Select country"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                <option value="Canada">Canada</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Regional Settings</h2>
          <p className="text-sm text-app-text-muted mt-1">Configure timezone, date format, and currency</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) => onChange('timezone', e.target.value)}
                title="Select timezone"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Date Format
              </label>
              <select
                value={config.dateFormat}
                onChange={(e) => onChange('dateFormat', e.target.value)}
                title="Select date format"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {dateFormats.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Currency
              </label>
              <select
                value={config.currency}
                onChange={(e) => onChange('currency', e.target.value)}
                title="Select currency"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {currencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Fiscal Year Starts
              </label>
              <select
                value={config.fiscalYearStart}
                onChange={(e) => onChange('fiscalYearStart', e.target.value)}
                title="Select fiscal year start month"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Measurement System
              </label>
              <select
                value={config.measurementSystem}
                onChange={(e) => onChange('measurementSystem', e.target.value)}
                title="Select measurement system"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                <option value="metric">Metric (km, kg, L)</option>
                <option value="imperial">Imperial (mi, lb, gal)</option>
              </select>
            </div>
          </div>
        </div>

        <SaveBar isSaving={isSaving} saveStatus={saveStatus} onSave={onSave} />
      </div>
    </div>
  );
}
