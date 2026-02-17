import { Link } from 'react-router-dom';
import { useQuickLookup, highlightMatch } from './useQuickLookup';

interface QuickLookupWidgetProps {
  className?: string;
}

export default function QuickLookupWidget({ className = '' }: QuickLookupWidgetProps) {
  const {
    searchTerm,
    results,
    isLoading,
    isOpen,
    selectedIndex,
    inputRef,
    dropdownRef,
    handleSearchChange,
    handleKeyDown,
    handleFocus,
    clearSearch,
    closeDropdown,
  } = useQuickLookup({ navigateOnSelect: true });

  return (
    <div className={`rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-app-text">Quick Lookup</h3>
        <span className="text-xs text-app-text-subtle">Search people</span>
      </div>

      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Search by name, email, or phone..."
            className="block w-full pl-10 pr-10 py-2.5 border border-app-input-border rounded-xl text-sm placeholder-app-text-subtle focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg
                className="animate-spin h-5 w-5 text-app-text-subtle"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {!isLoading && searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-text-subtle hover:text-app-text-muted"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-app-surface rounded-xl shadow-lg border border-app-border max-h-80 overflow-auto"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-app-text-muted text-sm">
                No people found for &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              <ul className="py-1">
                {results.map((contact, index) => (
                  <li key={contact.contact_id}>
                    <Link
                      to={`/contacts/${contact.contact_id}`}
                      className={`block px-4 py-3 hover:bg-app-surface-muted transition-colors ${
                        index === selectedIndex ? 'bg-app-surface-muted' : ''
                      }`}
                      onClick={closeDropdown}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-app-text truncate">
                            {highlightMatch(`${contact.first_name} ${contact.last_name}`, searchTerm)}
                          </p>
                          {contact.email && (
                            <p className="text-xs text-app-text-muted truncate mt-0.5">
                              {highlightMatch(contact.email, searchTerm)}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {(contact.phone || contact.mobile_phone) && (
                              <p className="text-xs text-app-text-muted">
                                {highlightMatch(contact.phone || contact.mobile_phone || '', searchTerm)}
                              </p>
                            )}
                            {contact.account_name && (
                              <p className="text-xs text-sky-600 truncate">
                                {contact.account_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="h-4 w-4 text-app-text-subtle ml-2 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {results.length > 0 && (
              <div className="border-t border-app-border-muted p-2">
                <Link
                  to={`/contacts?search=${encodeURIComponent(searchTerm)}`}
                  className="block text-center text-xs text-sky-600 hover:text-sky-800 py-1"
                  onClick={closeDropdown}
                >
                  View all results in People
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-app-text-muted">
        <span>Tip:</span>
        <span className="bg-app-surface-muted px-1.5 py-0.5 rounded">Enter</span>
        <span>to select</span>
        <span className="bg-app-surface-muted px-1.5 py-0.5 rounded">Esc</span>
        <span>to close</span>
      </div>
    </div>
  );
}
