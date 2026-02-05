import type { ContactFormValues } from '../types';

interface NotesSectionProps {
  formData: ContactFormValues;
  mode: 'create' | 'edit';
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function NotesSection({ formData, mode, onChange }: NotesSectionProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Initial Notes</h2>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={4}
          value={formData.notes ?? ''}
          onChange={onChange}
          placeholder="Add any initial notes about this contact..."
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        <p className="mt-2 text-sm text-gray-500">
          For detailed notes with timestamps, use the Notes section on the contact detail page.
        </p>
      </div>

      {mode === 'edit' && (
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={onChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active Contact
          </label>
        </div>
      )}
    </div>
  );
}
