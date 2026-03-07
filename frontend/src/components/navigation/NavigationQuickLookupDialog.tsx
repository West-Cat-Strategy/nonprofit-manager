import { Link, useNavigate } from 'react-router-dom';
import { useQuickLookup } from '../dashboard/useQuickLookup';

interface NavigationQuickLookupDialogProps {
  onClose: () => void;
}

export default function NavigationQuickLookupDialog({
  onClose,
}: NavigationQuickLookupDialogProps) {
  const navigate = useNavigate();
  const lookup = useQuickLookup({ debounceMs: 250 });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
      <div
        className="bg-app-surface rounded-lg shadow-xl w-full max-w-2xl mt-16"
        role="dialog"
        aria-modal="true"
        aria-label="Search people"
      >
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-app-text-heading">Search People</h2>
          <button
            onClick={onClose}
            className="p-1 text-app-text-subtle hover:text-app-text-muted rounded"
            type="button"
            aria-label="Close search dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <input
              ref={lookup.inputRef}
              autoFocus
              type="text"
              value={lookup.searchTerm}
              onChange={lookup.handleSearchChange}
              onKeyDown={lookup.handleKeyDown}
              onFocus={lookup.handleFocus}
              placeholder="Search by name, email, or phone..."
              className="w-full px-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent bg-app-input-bg text-app-text"
            />
            {lookup.isLoading && (
              <div className="absolute right-3 top-2.5 text-app-text-subtle text-sm">
                Searching...
              </div>
            )}
          </div>

          <div
            ref={lookup.dropdownRef}
            className="mt-4 max-h-80 overflow-auto border border-app-border rounded-lg"
          >
            {lookup.searchTerm.trim().length < 2 ? (
              <div className="p-4 text-sm text-app-text-muted">Type at least 2 characters to search.</div>
            ) : lookup.results.length === 0 ? (
              <div className="p-4 text-sm text-app-text-muted">
                No matches for &quot;{lookup.searchTerm}&quot;.
              </div>
            ) : (
              <ul className="divide-y divide-app-border">
                {lookup.results.map((result) => (
                  <li key={result.contact_id}>
                    <Link
                      to={`/contacts/${result.contact_id}`}
                      onClick={onClose}
                      className="block px-4 py-3 hover:bg-app-hover"
                    >
                      <div className="font-medium text-app-text">
                        {result.first_name} {result.last_name}
                      </div>
                      <div className="text-sm text-app-text-muted">
                        {result.email || result.mobile_phone || result.phone || 'No contact info'}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/contacts');
              }}
              className="px-4 py-2 border border-app-border rounded-lg text-sm text-app-text hover:bg-app-hover"
            >
              View All People
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
