import type { ContactFormErrors, ContactFormValues } from '../types';
import { GENDER_OPTIONS, PRONOUNS_OPTIONS } from '../constants';

interface PersonalInfoSectionProps {
  formData: ContactFormValues;
  errors: ContactFormErrors;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function PersonalInfoSection({ formData, errors, onChange }: PersonalInfoSectionProps) {
  return (
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">Personal Information</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="salutation" className="block text-sm font-medium text-app-text-muted">
            Salutation
          </label>
          <input
            type="text"
            name="salutation"
            id="salutation"
            placeholder="Mr., Ms., Dr., etc."
            value={formData.salutation ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div></div>

        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-app-text-muted">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            id="first_name"
            value={formData.first_name}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.first_name ? 'border-red-300' : 'border-app-input-border'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
          />
          {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
        </div>

        <div>
          <label htmlFor="middle_name" className="block text-sm font-medium text-app-text-muted">
            Middle Name
          </label>
          <input
            type="text"
            name="middle_name"
            id="middle_name"
            value={formData.middle_name ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-app-text-muted">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            id="last_name"
            value={formData.last_name}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.last_name ? 'border-red-300' : 'border-app-input-border'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
          />
          {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
        </div>

        <div>
          <label htmlFor="suffix" className="block text-sm font-medium text-app-text-muted">
            Suffix
          </label>
          <input
            type="text"
            name="suffix"
            id="suffix"
            placeholder="Jr., Sr., III, etc."
            value={formData.suffix ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="job_title" className="block text-sm font-medium text-app-text-muted">
            Job Title
          </label>
          <input
            type="text"
            name="job_title"
            id="job_title"
            value={formData.job_title ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-app-text-muted">
            Department
          </label>
          <input
            type="text"
            name="department"
            id="department"
            value={formData.department ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="birth_date" className="block text-sm font-medium text-app-text-muted">
            Date of Birth
          </label>
          <input
            type="date"
            name="birth_date"
            id="birth_date"
            value={formData.birth_date ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-app-text-muted">
            Gender
          </label>
          <select
            name="gender"
            id="gender"
            value={formData.gender ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pronouns" className="block text-sm font-medium text-app-text-muted">
            Pronouns
          </label>
          <select
            name="pronouns"
            id="pronouns"
            value={formData.pronouns ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          >
            {PRONOUNS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
