import type { ContactFormErrors, ContactFormValues } from '../types';

interface AddressSectionProps {
  formData: ContactFormValues;
  errors: ContactFormErrors;
  noFixedAddress: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNoFixedAddressChange: (checked: boolean) => void;
}

export default function AddressSection({
  formData,
  errors,
  noFixedAddress,
  onChange,
  onNoFixedAddressChange,
}: AddressSectionProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Address</h2>
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="no_fixed_address"
            checked={noFixedAddress}
            onChange={(e) => onNoFixedAddressChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">No fixed address</span>
        </label>
        <p className="mt-1 text-xs text-gray-500 ml-6">Check if this person does not have a fixed address</p>
      </div>
      {!noFixedAddress && (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
            Address Line 1
          </label>
          <input
            type="text"
            name="address_line1"
            id="address_line1"
            value={formData.address_line1 ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
            Address Line 2
          </label>
          <input
            type="text"
            name="address_line2"
            id="address_line2"
            value={formData.address_line2 ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            name="city"
            id="city"
            value={formData.city ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="state_province" className="block text-sm font-medium text-gray-700">
            State/Province
          </label>
          <input
            type="text"
            name="state_province"
            id="state_province"
            value={formData.state_province ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
            Postal Code
          </label>
          <input
            type="text"
            name="postal_code"
            id="postal_code"
            value={formData.postal_code ?? ''}
            onChange={onChange}
            className={`mt-1 block w-full border ${
              errors.postal_code ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>
          )}
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            type="text"
            name="country"
            id="country"
            value={formData.country ?? ''}
            onChange={onChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
      )}
    </div>
  );
}
