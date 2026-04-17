import type { ChangeEventHandler } from 'react';
import { EditorSection } from './EditorSection';
import type { EventEditorFormData } from '../../model';
import { inputClassName } from '../../styles';

interface LocationSectionProps {
  formData: Pick<
    EventEditorFormData,
    'location_name' | 'address_line1' | 'address_line2' | 'city' | 'state_province' | 'postal_code' | 'country'
  >;
  onInputChange: ChangeEventHandler<HTMLInputElement>;
}

export function LocationSection({ formData, onInputChange }: LocationSectionProps) {
  return (
    <EditorSection
      title="Location"
      description="Add the venue or leave the event virtual or to-be-confirmed for now."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-app-text">Location name</span>
          <input
            type="text"
            id="location_name"
            name="location_name"
            value={formData.location_name}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="Community centre or online meeting room"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-app-text">Address line 1</span>
          <input
            type="text"
            id="address_line1"
            name="address_line1"
            value={formData.address_line1}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="400 West Georgia Street"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-app-text">Address line 2</span>
          <input
            type="text"
            id="address_line2"
            name="address_line2"
            value={formData.address_line2}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="Suite or building details"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">City</span>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="Vancouver"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">State or province</span>
          <input
            type="text"
            id="state_province"
            name="state_province"
            value={formData.state_province}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="BC"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">Postal code</span>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="V6B 1A1"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">Country</span>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={onInputChange}
            className={inputClassName}
            placeholder="Canada"
          />
        </label>
      </div>
    </EditorSection>
  );
}
