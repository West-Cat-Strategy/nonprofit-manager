/**
 * QuickLookupWidget - Dashboard widget for quick contact search
 * Search by name, email, or phone number
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface SearchResult {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  account_name?: string;
  is_active: boolean;
}

interface QuickLookupWidgetProps {
  className?: string;
}

export default function QuickLookupWidget({ className = '' }: QuickLookupWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('/contacts', {
        params: {
          search: term,
          limit: 8,
          is_active: true,
        },
      });
      setResults(response.data.contacts || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          window.location.href = `/contacts/${results[selectedIndex].contact_id}`;
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Format phone for display
  const formatPhone = (phone: string | null): string => {
    if (!phone) return '';
    return phone;
  };

  // Highlight matching text
  const highlightMatch = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm || searchTerm.length < 2) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Quick Lookup</h3>
        <span className="text-xs text-gray-500">Search contacts</span>
      </div>

      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
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
            onFocus={() => searchTerm.length >= 2 && results.length > 0 && setIsOpen(true)}
            placeholder="Search by name, email, or phone..."
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg
                className="animate-spin h-5 w-5 text-gray-400"
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
              onClick={() => {
                setSearchTerm('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
            className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-auto"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No contacts found for "{searchTerm}"
              </div>
            ) : (
              <ul className="py-1">
                {results.map((contact, index) => (
                  <li key={contact.contact_id}>
                    <Link
                      to={`/contacts/${contact.contact_id}`}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${
                        index === selectedIndex ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {highlightMatch(`${contact.first_name} ${contact.last_name}`, searchTerm)}
                          </p>
                          {contact.email && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {highlightMatch(contact.email, searchTerm)}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {(contact.phone || contact.mobile_phone) && (
                              <p className="text-xs text-gray-500">
                                {highlightMatch(formatPhone(contact.phone || contact.mobile_phone), searchTerm)}
                              </p>
                            )}
                            {contact.account_name && (
                              <p className="text-xs text-blue-600 truncate">
                                {contact.account_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0"
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
              <div className="border-t border-gray-100 p-2">
                <Link
                  to={`/contacts?search=${encodeURIComponent(searchTerm)}`}
                  className="block text-center text-xs text-blue-600 hover:text-blue-800 py-1"
                  onClick={() => setIsOpen(false)}
                >
                  View all results in Contacts
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Tip:</span>
        <span className="bg-gray-100 px-1.5 py-0.5 rounded">Enter</span>
        <span>to select</span>
        <span className="bg-gray-100 px-1.5 py-0.5 rounded">Esc</span>
        <span>to close</span>
      </div>
    </div>
  );
}
