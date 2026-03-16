import type { OrganizationConfig, SaveStatus } from '../types';
import { currencies, dateFormats, months, provinces, timezones } from '../constants';
import { validatePostalCode } from '../utils';
import SaveBar from '../components/SaveBar';

interface OrganizationSectionProps {
  config: OrganizationConfig;
  onChange: (field: string, value: string) => void;
  onAddressChange: (field: string, value: string) => void;
  onTaxReceiptChange: (field: string, value: string) => void;
  onTaxReceiptAddressChange: (field: string, value: string) => void;
  onPhoneChange: (value: string) => void;
  onTaxReceiptPhoneChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: SaveStatus;
  isDirty: boolean;
  lastSavedAt: Date | null;
  isTaxReceiptComplete: boolean;
  taxReceiptMissingFields: string[];
}

const sectionCardClassName =
  'bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden';
const sectionHeaderClassName =
  'px-6 py-4 border-b border-app-border bg-app-surface-muted';
const inputClassName =
  'w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent';

export default function OrganizationSection({
  config,
  onChange,
  onAddressChange,
  onTaxReceiptChange,
  onTaxReceiptAddressChange,
  onPhoneChange,
  onTaxReceiptPhoneChange,
  onSave,
  isSaving,
  saveStatus,
  isDirty,
  lastSavedAt,
  isTaxReceiptComplete,
  taxReceiptMissingFields,
}: OrganizationSectionProps) {
  return (
    <div className="space-y-6">
      <div
        className={`rounded-lg border p-4 ${
          isTaxReceiptComplete
            ? 'border-app-border bg-app-accent-soft'
            : 'border-app-accent bg-app-accent-soft'
        }`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-app-text-heading">
              CRA Tax Receipt Readiness
            </h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Official receipting uses the shared organization settings below for every staff user.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-app-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text">
            {isTaxReceiptComplete ? 'Ready to issue receipts' : 'Setup incomplete'}
          </span>
        </div>

        {isTaxReceiptComplete ? (
          <p className="mt-3 text-sm text-app-text">
            CRA receipt fields are complete. v1 official receipting is limited to cash-equivalent
            donations and defaults the advantage amount to 0.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-app-text">
              Fill these receipting fields before staff can issue official tax receipts:
            </p>
            <ul className="list-disc pl-5 text-sm text-app-text-muted">
              {taxReceiptMissingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">Organization Profile</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Basic information about your organization
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="organization-name"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Organization Name
            </label>
            <input
              id="organization-name"
              type="text"
              value={config.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Your Nonprofit Name"
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="organization-email"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Contact Email
              </label>
              <input
                id="organization-email"
                type="email"
                value={config.email}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="contact@nonprofit.org"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="organization-phone"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Phone Number
              </label>
              <input
                id="organization-phone"
                type="tel"
                value={config.phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(604) 555-1234"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="organization-website"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Website
            </label>
            <input
              id="organization-website"
              type="url"
              value={config.website}
              onChange={(e) => onChange('website', e.target.value)}
              placeholder="https://www.nonprofit.org"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">Address</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Your organization&apos;s physical address
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="organization-address-line1"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Address Line 1
            </label>
            <input
              id="organization-address-line1"
              type="text"
              value={config.address.line1}
              onChange={(e) => onAddressChange('line1', e.target.value)}
              placeholder="400 West Georgia Street"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="organization-address-line2"
              className="block text-sm font-medium text-app-text-label mb-1"
            >
              Address Line 2
            </label>
            <input
              id="organization-address-line2"
              type="text"
              value={config.address.line2}
              onChange={(e) => onAddressChange('line2', e.target.value)}
              placeholder="Suite 100"
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label
                htmlFor="organization-city"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                City
              </label>
              <input
                id="organization-city"
                type="text"
                value={config.address.city}
                onChange={(e) => onAddressChange('city', e.target.value)}
                placeholder="Vancouver"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="organization-province"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Province/State
              </label>
              {config.address.country === 'Canada' ? (
                <select
                  id="organization-province"
                  value={config.address.province}
                  onChange={(e) => onAddressChange('province', e.target.value)}
                  title="Select province"
                  className={inputClassName}
                >
                  <option value="">Select...</option>
                  {provinces.map((province) => (
                    <option key={province.value} value={province.value}>
                      {province.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="organization-province"
                  type="text"
                  value={config.address.province}
                  onChange={(e) => onAddressChange('province', e.target.value)}
                  placeholder="State"
                  className={inputClassName}
                />
              )}
            </div>
            <div>
              <label
                htmlFor="organization-postal-code"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                {config.address.country === 'Canada' ? 'Postal Code' : 'ZIP Code'}
              </label>
              <input
                id="organization-postal-code"
                type="text"
                value={config.address.postalCode}
                onChange={(e) => onAddressChange('postalCode', e.target.value)}
                placeholder={config.address.country === 'Canada' ? 'V6B 1A1' : '12345'}
                className={`${inputClassName} ${
                  config.address.postalCode &&
                  !validatePostalCode(config.address.postalCode, config.address.country)
                    ? 'border-app-accent'
                    : ''
                }`}
              />
            </div>
            <div>
              <label
                htmlFor="organization-country"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Country
              </label>
              <select
                id="organization-country"
                value={config.address.country}
                onChange={(e) => onAddressChange('country', e.target.value)}
                title="Select country"
                className={inputClassName}
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

      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">Regional Settings</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Configure timezone, date format, and currency
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="organization-timezone"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Timezone
              </label>
              <select
                id="organization-timezone"
                value={config.timezone}
                onChange={(e) => onChange('timezone', e.target.value)}
                title="Select timezone"
                className={inputClassName}
              >
                {timezones.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="organization-date-format"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Date Format
              </label>
              <select
                id="organization-date-format"
                value={config.dateFormat}
                onChange={(e) => onChange('dateFormat', e.target.value)}
                title="Select date format"
                className={inputClassName}
              >
                {dateFormats.map((dateFormat) => (
                  <option key={dateFormat.value} value={dateFormat.value}>
                    {dateFormat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="organization-currency"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Currency
              </label>
              <select
                id="organization-currency"
                value={config.currency}
                onChange={(e) => onChange('currency', e.target.value)}
                title="Select currency"
                className={inputClassName}
              >
                {currencies.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="organization-fiscal-year-start"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Fiscal Year Starts
              </label>
              <select
                id="organization-fiscal-year-start"
                value={config.fiscalYearStart}
                onChange={(e) => onChange('fiscalYearStart', e.target.value)}
                title="Select fiscal year start month"
                className={inputClassName}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="organization-measurement-system"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Measurement System
              </label>
              <select
                id="organization-measurement-system"
                value={config.measurementSystem}
                onChange={(e) => onChange('measurementSystem', e.target.value)}
                title="Select measurement system"
                className={inputClassName}
              >
                <option value="metric">Metric (km, kg, L)</option>
                <option value="imperial">Imperial (mi, lb, gal)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={sectionCardClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-lg font-semibold text-app-text-heading">CRA Tax Receipt Issuer</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Shared organization data used on official Canadian donation receipts
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tax-receipt-legal-name"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Legal Charity Name
              </label>
              <input
                id="tax-receipt-legal-name"
                type="text"
                value={config.taxReceipt.legalName}
                onChange={(e) => onTaxReceiptChange('legalName', e.target.value)}
                placeholder="Registered legal name"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="tax-receipt-registration-number"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Charitable Registration Number
              </label>
              <input
                id="tax-receipt-registration-number"
                type="text"
                value={config.taxReceipt.charitableRegistrationNumber}
                onChange={(e) =>
                  onTaxReceiptChange('charitableRegistrationNumber', e.target.value)
                }
                placeholder="12345 6789 RR0001"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="tax-receipt-issue-location"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Receipt Issue Location
              </label>
              <input
                id="tax-receipt-issue-location"
                type="text"
                value={config.taxReceipt.receiptIssueLocation}
                onChange={(e) => onTaxReceiptChange('receiptIssueLocation', e.target.value)}
                placeholder="Vancouver, BC"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="tax-receipt-signer-name"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Authorized Signer
              </label>
              <input
                id="tax-receipt-signer-name"
                type="text"
                value={config.taxReceipt.authorizedSignerName}
                onChange={(e) => onTaxReceiptChange('authorizedSignerName', e.target.value)}
                placeholder="Jordan Lee"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="tax-receipt-signer-title"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Signer Title
              </label>
              <input
                id="tax-receipt-signer-title"
                type="text"
                value={config.taxReceipt.authorizedSignerTitle}
                onChange={(e) => onTaxReceiptChange('authorizedSignerTitle', e.target.value)}
                placeholder="Executive Director"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tax-receipt-contact-email"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Receipt Contact Email
              </label>
              <input
                id="tax-receipt-contact-email"
                type="email"
                value={config.taxReceipt.contactEmail}
                onChange={(e) => onTaxReceiptChange('contactEmail', e.target.value)}
                placeholder="receipts@nonprofit.org"
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="tax-receipt-contact-phone"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Receipt Contact Phone
              </label>
              <input
                id="tax-receipt-contact-phone"
                type="tel"
                value={config.taxReceipt.contactPhone}
                onChange={(e) => onTaxReceiptPhoneChange(e.target.value)}
                placeholder="(604) 555-1234"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
            <h3 className="text-sm font-semibold text-app-text-heading">
              Receipting Address
            </h3>
            <p className="mt-1 text-sm text-app-text-muted">
              This should match the CRA-filed mailing address shown on official receipts.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="tax-receipt-address-line1"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Address Line 1
              </label>
              <input
                id="tax-receipt-address-line1"
                type="text"
                value={config.taxReceipt.receiptingAddress.line1}
                onChange={(e) => onTaxReceiptAddressChange('line1', e.target.value)}
                placeholder="400 West Georgia Street"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="tax-receipt-address-line2"
                className="block text-sm font-medium text-app-text-label mb-1"
              >
                Address Line 2
              </label>
              <input
                id="tax-receipt-address-line2"
                type="text"
                value={config.taxReceipt.receiptingAddress.line2}
                onChange={(e) => onTaxReceiptAddressChange('line2', e.target.value)}
                placeholder="Suite 100"
                className={inputClassName}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label
                  htmlFor="tax-receipt-city"
                  className="block text-sm font-medium text-app-text-label mb-1"
                >
                  City
                </label>
                <input
                  id="tax-receipt-city"
                  type="text"
                  value={config.taxReceipt.receiptingAddress.city}
                  onChange={(e) => onTaxReceiptAddressChange('city', e.target.value)}
                  placeholder="Vancouver"
                  className={inputClassName}
                />
              </div>
              <div>
                <label
                  htmlFor="tax-receipt-province"
                  className="block text-sm font-medium text-app-text-label mb-1"
                >
                  Province/State
                </label>
                {config.taxReceipt.receiptingAddress.country === 'Canada' ? (
                  <select
                    id="tax-receipt-province"
                    value={config.taxReceipt.receiptingAddress.province}
                    onChange={(e) => onTaxReceiptAddressChange('province', e.target.value)}
                    title="Select province"
                    className={inputClassName}
                  >
                    <option value="">Select...</option>
                    {provinces.map((province) => (
                      <option key={province.value} value={province.value}>
                        {province.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="tax-receipt-province"
                    type="text"
                    value={config.taxReceipt.receiptingAddress.province}
                    onChange={(e) => onTaxReceiptAddressChange('province', e.target.value)}
                    placeholder="State"
                    className={inputClassName}
                  />
                )}
              </div>
              <div>
                <label
                  htmlFor="tax-receipt-postal-code"
                  className="block text-sm font-medium text-app-text-label mb-1"
                >
                  {config.taxReceipt.receiptingAddress.country === 'Canada'
                    ? 'Postal Code'
                    : 'ZIP Code'}
                </label>
                <input
                  id="tax-receipt-postal-code"
                  type="text"
                  value={config.taxReceipt.receiptingAddress.postalCode}
                  onChange={(e) => onTaxReceiptAddressChange('postalCode', e.target.value)}
                  placeholder={
                    config.taxReceipt.receiptingAddress.country === 'Canada'
                      ? 'V6B 1A1'
                      : '12345'
                  }
                  className={`${inputClassName} ${
                    config.taxReceipt.receiptingAddress.postalCode &&
                    !validatePostalCode(
                      config.taxReceipt.receiptingAddress.postalCode,
                      config.taxReceipt.receiptingAddress.country
                    )
                      ? 'border-app-accent'
                      : ''
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="tax-receipt-country"
                  className="block text-sm font-medium text-app-text-label mb-1"
                >
                  Country
                </label>
                <select
                  id="tax-receipt-country"
                  value={config.taxReceipt.receiptingAddress.country}
                  onChange={(e) => onTaxReceiptAddressChange('country', e.target.value)}
                  title="Select country"
                  className={inputClassName}
                >
                  <option value="Canada">Canada</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-app-border bg-app-surface p-4">
            <p className="text-sm text-app-text-muted">
              Advantage amount is fixed at 0 in this first CRA receipting release. Non-cash and
              split-advantage receipting will be added in a follow-up.
            </p>
          </div>
        </div>

        <SaveBar
          isSaving={isSaving}
          saveStatus={saveStatus}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
