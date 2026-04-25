import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { contactsApiClient } from '../api/contactsApiClient';
import type { DonorProfile, DonorReceiptFrequency } from '../../../types/contact';

type DonorPreferencesFormState = {
  receipt_frequency: DonorReceiptFrequency;
  receipt_each_gift: boolean;
  email_gift_statement: boolean;
  anonymous_donor: boolean;
  no_solicitations: boolean;
  notes: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const defaultFormState: DonorPreferencesFormState = {
  receipt_frequency: 'per_gift',
  receipt_each_gift: true,
  email_gift_statement: false,
  anonymous_donor: false,
  no_solicitations: false,
  notes: '',
};

const toFormState = (profile: DonorProfile): DonorPreferencesFormState => ({
  receipt_frequency: profile.receipt_frequency,
  receipt_each_gift: profile.receipt_each_gift,
  email_gift_statement: profile.email_gift_statement,
  anonymous_donor: profile.anonymous_donor,
  no_solicitations: profile.no_solicitations,
  notes: profile.notes ?? '',
});

const getReceiptSummary = (form: DonorPreferencesFormState): string => {
  if (form.receipt_frequency === 'none') {
    return 'No automatic receipt email';
  }
  if (!form.email_gift_statement) {
    return 'PDF download by default';
  }
  if (form.receipt_frequency === 'annual') {
    return 'Email annual receipts';
  }
  if (!form.receipt_each_gift) {
    return 'PDF download by default';
  }
  return 'Email each gift receipt';
};

const ContactDonorPreferencesPanel = ({ contactId }: { contactId: string }) => {
  const [form, setForm] = useState<DonorPreferencesFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await contactsApiClient.getDonorProfile(contactId);
        if (isMounted) {
          setForm(toFormState(profile));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load donor preferences');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [contactId]);

  const receiptSummary = useMemo(() => getReceiptSummary(form), [form]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setError(null);

    try {
      const profile = await contactsApiClient.updateDonorProfile(contactId, {
        receipt_frequency: form.receipt_frequency,
        receipt_each_gift: form.receipt_each_gift,
        email_gift_statement: form.email_gift_statement,
        anonymous_donor: form.anonymous_donor,
        no_solicitations: form.no_solicitations,
        notes: form.notes.trim() ? form.notes.trim() : null,
      });
      setForm(toFormState(profile));
      setStatus('saved');
    } catch (saveError) {
      setStatus('error');
      setError(saveError instanceof Error ? saveError.message : 'Failed to save donor preferences');
    }
  };

  if (loading) {
    return <p className="text-sm font-bold text-black/70">Loading donor preferences...</p>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="border-2 border-black bg-white p-3">
        <div className="text-xs font-black uppercase text-black/60">Receipt Default</div>
        <div className="mt-1 text-sm font-black text-black">{receiptSummary}</div>
      </div>

      <div>
        <label
          className="block text-xs font-black uppercase text-black/60"
          htmlFor="donor-receipt-frequency"
        >
          Receipt Frequency
        </label>
        <select
          id="donor-receipt-frequency"
          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black"
          value={form.receipt_frequency}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              receipt_frequency: event.target.value as DonorReceiptFrequency,
            }))
          }
        >
          <option value="per_gift">Per gift</option>
          <option value="annual">Annual</option>
          <option value="none">None</option>
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm font-bold text-black">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 border-2 border-black"
          checked={form.email_gift_statement}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              email_gift_statement: event.target.checked,
            }))
          }
        />
        Email gift statements
      </label>

      <label className="flex items-start gap-2 text-sm font-bold text-black">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 border-2 border-black"
          checked={form.receipt_each_gift}
          disabled={form.receipt_frequency !== 'per_gift'}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              receipt_each_gift: event.target.checked,
            }))
          }
        />
        Receipt each gift
      </label>

      <label className="flex items-start gap-2 text-sm font-bold text-black">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 border-2 border-black"
          checked={form.no_solicitations}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              no_solicitations: event.target.checked,
            }))
          }
        />
        No solicitations
      </label>

      <label className="flex items-start gap-2 text-sm font-bold text-black">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 border-2 border-black"
          checked={form.anonymous_donor}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              anonymous_donor: event.target.checked,
            }))
          }
        />
        Anonymous donor
      </label>

      <div>
        <label className="block text-xs font-black uppercase text-black/60" htmlFor="donor-notes">
          Notes
        </label>
        <textarea
          id="donor-notes"
          className="mt-1 min-h-20 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black"
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
        />
      </div>

      {error ? <p className="text-sm font-bold text-app-accent">{error}</p> : null}
      {status === 'saved' ? (
        <p className="text-sm font-bold text-black">Donor preferences saved.</p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="w-full border-2 border-black bg-[var(--loop-green)] px-4 py-2 text-sm font-black uppercase text-black shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'saving' ? 'Saving...' : 'Save Donor Preferences'}
      </button>
    </form>
  );
};

export default ContactDonorPreferencesPanel;
