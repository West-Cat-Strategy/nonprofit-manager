import { useEffect, useState, type FormEvent } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import {
  fetchContactMergePreview,
  mergeContact,
  searchContactsForMerge,
} from '../state';
import type {
  Contact,
  ContactMergePreview,
  ContactMergeResolution,
  ContactMergeResult,
} from '../../../types/contact';

interface ContactMergeDialogProps {
  isOpen: boolean;
  sourceContact: Contact;
  onClose: () => void;
  onSuccess: (result: ContactMergeResult) => void;
}

const formatMergeValue = (value: ContactMergePreview['fields'][number]['source_value']): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

const getContactDisplayName = (contact: Contact): string => {
  const preferred = contact.preferred_name?.trim() || contact.first_name;
  return `${preferred} ${contact.last_name}`.trim();
};

const defaultResolutions = (preview: ContactMergePreview): Record<string, ContactMergeResolution> =>
  preview.fields.reduce<Record<string, ContactMergeResolution>>((acc, field) => {
    if (field.conflict) {
      acc[field.field] = 'target';
    }
    return acc;
  }, {});

export default function ContactMergeDialog({
  isOpen,
  sourceContact,
  onClose,
  onSuccess,
}: ContactMergeDialogProps) {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [preview, setPreview] = useState<ContactMergePreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ContactMergeResolution>>({});
  const [searching, setSearching] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchTerm('');
    setSearchResults([]);
    setSelectedTargetId('');
    setPreview(null);
    setResolutions({});
    setSearching(false);
    setLoadingPreview(false);
    setSubmitting(false);
    setSearchError(null);
    setPreviewError(null);
    setSubmitError(null);
  }, [isOpen, sourceContact.contact_id]);

  if (!isOpen) {
    return null;
  }

  const handleSearch = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchError('Enter at least 2 characters to search.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setPreviewError(null);
    setSubmitError(null);
    try {
      const results = await dispatch(
        searchContactsForMerge({ search: term, limit: 10 })
      ).unwrap();
      setSearchResults(results.filter((contact) => contact.contact_id !== sourceContact.contact_id));
    } catch (error) {
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : 'Failed to search contacts.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTarget = async (target: Contact): Promise<void> => {
    setSelectedTargetId(target.contact_id);
    setPreview(null);
    setResolutions({});
    setPreviewError(null);
    setSubmitError(null);
    setLoadingPreview(true);

    try {
      const nextPreview = await dispatch(
        fetchContactMergePreview({
          contactId: sourceContact.contact_id,
          targetContactId: target.contact_id,
        })
      ).unwrap();
      setPreview(nextPreview);
      setResolutions(defaultResolutions(nextPreview));
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load merge preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleResolutionChange = (field: string, resolution: ContactMergeResolution): void => {
    setResolutions((current) => ({
      ...current,
      [field]: resolution,
    }));
  };

  const handleMerge = async (): Promise<void> => {
    if (!selectedTargetId) {
      setSubmitError('Choose a target contact first.');
      return;
    }

    if (!preview) {
      setSubmitError('Load a preview before merging.');
      return;
    }

    const unresolved = preview.fields.filter((field) => field.conflict && !resolutions[field.field]);
    if (unresolved.length > 0) {
      setSubmitError(`Resolve ${unresolved.length} remaining field conflict${unresolved.length === 1 ? '' : 's'}.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await dispatch(
        mergeContact({
          contactId: sourceContact.contact_id,
          payload: {
            target_contact_id: selectedTargetId,
            resolutions,
          },
        })
      ).unwrap();
      onSuccess(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to merge contacts.');
    } finally {
      setSubmitting(false);
    }
  };

  const conflictFields = preview?.fields.filter((field) => field.conflict) ?? [];
<<<<<<< HEAD
  const selectedTarget =
    searchResults.find((contact) => contact.contact_id === selectedTargetId) ??
    preview?.target_contact ??
    null;
  const hasSearchAttempt = searchTerm.trim().length >= 2 || searchResults.length > 0 || searchError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4"
=======
  const selectedTarget = searchResults.find((contact) => contact.contact_id === selectedTargetId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
>>>>>>> origin/main
      role="dialog"
      aria-modal="true"
      aria-label="Merge contact"
    >
      <BrutalCard color="white" className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase text-black">Merge Contact</h2>
            <p className="mt-1 text-sm font-bold text-black/70">
              Merge {getContactDisplayName(sourceContact)} into another contact and keep the target as the survivor.
            </p>
          </div>
          <BrutalButton onClick={onClose} variant="secondary">
            Close
          </BrutalButton>
        </div>

        <form onSubmit={handleSearch} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-sm font-black uppercase text-black">
            Find target contact
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, phone, or email"
              className="border-2 border-black bg-white px-3 py-2 text-base font-normal text-black outline-none"
            />
          </label>
          <div className="flex items-end">
            <BrutalButton type="submit" variant="primary" className="w-full md:w-auto">
              {searching ? 'Searching...' : 'Search'}
            </BrutalButton>
          </div>
        </form>

        {searchError && (
          <p className="mt-3 border-2 border-black bg-red-100 px-3 py-2 text-sm font-bold text-black">
            {searchError}
          </p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase text-black/80">Matches</h3>
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="border-2 border-dashed border-black/40 bg-white px-3 py-3 text-sm font-bold text-black/60">
<<<<<<< HEAD
                  {hasSearchAttempt
                    ? 'No matching contacts found. Try a different name, phone number, or email.'
                    : 'Search for a contact to merge into. Inactive contacts are included.'}
=======
                  Search for a contact to merge into. Inactive contacts are included.
>>>>>>> origin/main
                </p>
              ) : (
                searchResults.map((contact) => {
                  const isSelected = contact.contact_id === selectedTargetId;
                  return (
                    <button
                      key={contact.contact_id}
                      type="button"
                      onClick={() => void handleSelectTarget(contact)}
<<<<<<< HEAD
                      aria-pressed={isSelected}
=======
>>>>>>> origin/main
                      className={`w-full border-2 border-black px-3 py-3 text-left transition ${
                        isSelected ? 'bg-yellow-200' : 'bg-white hover:bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-black">{getContactDisplayName(contact)}</p>
                          <p className="text-sm font-bold text-black/70">
                            {contact.email || contact.phone || contact.mobile_phone || 'No contact details'}
                          </p>
                        </div>
                        <span className="text-xs font-black uppercase text-black/60">
                          {contact.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
<<<<<<< HEAD
            <div className="border-2 border-black bg-[var(--loop-yellow)] p-4">
              <p className="text-xs font-black uppercase text-black/60">Selected target</p>
=======
            <div className="border-2 border-black bg-white p-4">
              <h3 className="text-sm font-black uppercase text-black/80">Survivor</h3>
>>>>>>> origin/main
              <p className="mt-1 text-lg font-black text-black">
                {selectedTarget ? getContactDisplayName(selectedTarget) : 'Pick a target contact'}
              </p>
              <p className="text-sm font-bold text-black/70">
<<<<<<< HEAD
                {selectedTarget
                  ? `${selectedTarget.email || selectedTarget.phone || selectedTarget.mobile_phone || 'No contact details'}${selectedTarget.account_name ? ` • ${selectedTarget.account_name}` : ''}`
                  : 'Search and select the contact you want to keep after the merge.'}
=======
                {selectedTarget?.account_name || preview?.target_contact.account_name || 'Target contact will survive the merge'}
>>>>>>> origin/main
              </p>
            </div>

            {previewError && (
              <p className="border-2 border-black bg-red-100 px-3 py-2 text-sm font-bold text-black">
                {previewError}
              </p>
            )}

            {loadingPreview && (
              <p className="border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black">
                Loading merge preview...
              </p>
            )}

<<<<<<< HEAD
            {!preview && selectedTarget && !loadingPreview ? (
              <p className="border-2 border-dashed border-black/40 bg-white px-3 py-3 text-sm font-bold text-black/60">
                The merge preview is loading or unavailable. Try selecting the target contact again.
              </p>
            ) : null}

=======
>>>>>>> origin/main
            {preview && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="border-2 border-black bg-white p-3">
                    <h4 className="text-xs font-black uppercase text-black/70">Source summary</h4>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold text-black">
                      <div>Phones</div>
                      <div>{preview.source_summary.phones}</div>
                      <div>Emails</div>
                      <div>{preview.source_summary.emails}</div>
                      <div>Relationships</div>
                      <div>{preview.source_summary.relationships}</div>
                      <div>Notes</div>
                      <div>{preview.source_summary.notes}</div>
                      <div>Documents</div>
                      <div>{preview.source_summary.documents}</div>
                      <div>Roles</div>
                      <div>{preview.source_summary.roles}</div>
                    </dl>
                  </div>
                  <div className="border-2 border-black bg-white p-3">
                    <h4 className="text-xs font-black uppercase text-black/70">Target summary</h4>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold text-black">
                      <div>Phones</div>
                      <div>{preview.target_summary.phones}</div>
                      <div>Emails</div>
                      <div>{preview.target_summary.emails}</div>
                      <div>Relationships</div>
                      <div>{preview.target_summary.relationships}</div>
                      <div>Notes</div>
                      <div>{preview.target_summary.notes}</div>
                      <div>Documents</div>
                      <div>{preview.target_summary.documents}</div>
                      <div>Roles</div>
                      <div>{preview.target_summary.roles}</div>
                    </dl>
                  </div>
                </div>

                <div className="border-2 border-black bg-white p-4">
                  <h3 className="text-sm font-black uppercase text-black/80">Conflicting fields</h3>
                  {conflictFields.length === 0 ? (
                    <p className="mt-2 text-sm font-bold text-black/70">
                      No conflicting scalar fields were found. The merge can proceed with the defaults.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {conflictFields.map((field) => (
                        <fieldset key={field.field} className="border-2 border-black p-3">
                          <legend className="px-1 text-sm font-black uppercase text-black">{field.label}</legend>
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => handleResolutionChange(field.field, 'source')}
                              className={`border-2 border-black px-3 py-3 text-left ${
                                resolutions[field.field] === 'source' ? 'bg-yellow-200' : 'bg-white'
                              }`}
                            >
                              <div className="text-xs font-black uppercase text-black/60">Source</div>
                              <div className="mt-1 text-sm font-bold text-black">{formatMergeValue(field.source_value)}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolutionChange(field.field, 'target')}
                              className={`border-2 border-black px-3 py-3 text-left ${
                                resolutions[field.field] === 'target' ? 'bg-yellow-200' : 'bg-white'
                              }`}
                            >
                              <div className="text-xs font-black uppercase text-black/60">Target</div>
                              <div className="mt-1 text-sm font-bold text-black">{formatMergeValue(field.target_value)}</div>
                            </button>
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {submitError && (
              <p className="border-2 border-black bg-red-100 px-3 py-2 text-sm font-bold text-black">
                {submitError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t-2 border-black pt-4">
          <BrutalButton onClick={onClose} variant="secondary" disabled={submitting}>
            Cancel
          </BrutalButton>
          <BrutalButton onClick={() => void handleMerge()} variant="primary" disabled={submitting || !preview}>
            {submitting ? 'Merging...' : 'Merge Contacts'}
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
}
