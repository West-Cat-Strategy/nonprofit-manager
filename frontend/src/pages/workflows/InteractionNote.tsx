import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import api from '../../services/api';
import { ContactForm } from '../../components/contactForm';
import { fetchCases, selectCasesByContact } from '../../store/slices/casesSlice';
import { createContactNote } from '../../store/slices/contactsSlice';
import type { Contact } from '../../store/slices/contactsSlice';
import type { ContactNoteType, CreateContactNoteDTO } from '../../types/contact';
import { NOTE_TYPES } from '../../types/contact';

type Step = 'select' | 'create' | 'note';

const emailRegex = /\S+@\S+\.\S+/;

export default function InteractionNote() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [emailCopies, setEmailCopies] = useState('');
  const [sendCopies, setSendCopies] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const contactCases = useAppSelector((state) =>
    selectedContact ? selectCasesByContact(state, selectedContact.contact_id) : []
  );

  const [noteForm, setNoteForm] = useState<CreateContactNoteDTO>({
    note_type: 'note',
    subject: '',
    content: '',
    is_internal: false,
    is_important: false,
    is_pinned: false,
    case_id: undefined,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      dispatch(fetchCases({ contact_id: selectedContact.contact_id, limit: 50 }));
    }
  }, [dispatch, selectedContact]);

  const normalizedEmails = useMemo(() => {
    if (!emailCopies.trim()) return [];
    return emailCopies
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }, [emailCopies]);

  const hasInvalidEmails = useMemo(
    () => normalizedEmails.some((email) => !emailRegex.test(email)),
    [normalizedEmails]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 2) {
      setResults([]);
      setSearchOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get('/contacts', {
          params: { search: value.trim(), limit: 8, is_active: true },
        });
        setResults(response.data.contacts || []);
        setSearchOpen(true);
      } catch {
        setResults([]);
        setSearchOpen(false);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSearchTerm(`${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`);
    setSearchOpen(false);
    setResults([]);
    setStep('note');
  };

  const handleCreateContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSearchTerm(`${contact.first_name} ${contact.last_name}${contact.email ? ` • ${contact.email}` : ''}`);
    setStep('note');
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedContact) {
      setFormError('Please select a person first.');
      return;
    }

    if (!noteForm.content?.trim()) {
      setFormError('Please enter note content.');
      return;
    }

    if (sendCopies && hasInvalidEmails) {
      setFormError('Please fix invalid email addresses.');
      return;
    }

    const payload: CreateContactNoteDTO = {
      ...noteForm,
      attachments: sendCopies && normalizedEmails.length
        ? {
            email_copies: normalizedEmails,
          }
        : noteForm.attachments,
    };

    try {
      setSaving(true);
      await dispatch(
        createContactNote({
          contactId: selectedContact.contact_id,
          data: payload,
        })
      ).unwrap();

      navigate(`/contacts/${selectedContact.contact_id}`);
    } catch (error) {
      console.error('Failed to save note:', error);
      setFormError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Note an Interaction</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capture interactions with people and attach them to their records.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {step === 'select' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Find a person</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchTerm.trim().length >= 2 && setSearchOpen(true)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchLoading && (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                  </div>
                )}
                {searchOpen && results.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto"
                  >
                    {results.map((contact) => (
                      <button
                        type="button"
                        key={contact.contact_id}
                        onClick={() => handleSelectContact(contact)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {contact.email || contact.phone || contact.mobile_phone || 'No contact info'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Can't find them?</p>
              <button
                type="button"
                onClick={() => setStep('create')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Create new person
              </button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create new person</h2>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Back to search
              </button>
            </div>
            <ContactForm mode="create" onCreated={handleCreateContact} onCancel={() => setStep('select')} />
          </div>
        )}

        {step === 'note' && selectedContact && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add interaction note</h2>
                <p className="text-sm text-gray-500">
                  For {selectedContact.first_name} {selectedContact.last_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Change person
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
                <select
                  value={noteForm.note_type}
                  onChange={(e) =>
                    setNoteForm((prev) => ({ ...prev, note_type: e.target.value as ContactNoteType }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {contactCases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associate with Case (Optional)
                  </label>
                  <select
                    value={noteForm.case_id || ''}
                    onChange={(e) =>
                      setNoteForm((prev) => ({
                        ...prev,
                        case_id: e.target.value || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No case (general note)</option>
                    {contactCases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={noteForm.subject || ''}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief summary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interaction Details
                </label>
                <textarea
                  value={noteForm.content}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={5}
                  placeholder="Record the interaction details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={noteForm.is_internal || false}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, is_internal: e.target.checked }))}
                  />
                  Internal only
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={noteForm.is_important || false}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, is_important: e.target.checked }))}
                  />
                  Mark important
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={noteForm.is_pinned || false}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, is_pinned: e.target.checked }))}
                  />
                  Pin note
                </label>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={sendCopies}
                      onChange={(e) => setSendCopies(e.target.checked)}
                    />
                    Send copies by email
                  </label>
                  <span className="text-xs text-gray-500">Optional</span>
                </div>

                {sendCopies && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={emailCopies}
                      onChange={(e) => setEmailCopies(e.target.value)}
                      placeholder="Add emails, separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {hasInvalidEmails && (
                      <p className="text-xs text-red-600 mt-1">One or more email addresses look invalid.</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Copies will be stored with this note. Configure an email provider to send automatically.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to={`/contacts/${selectedContact.contact_id}`}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  View contact
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
