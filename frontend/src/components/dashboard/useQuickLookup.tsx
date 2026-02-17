import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export interface SearchResult {
  contact_id: string;
  first_name: string;
  preferred_name?: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  account_name?: string;
  is_active: boolean;
}

export interface UseQuickLookupOptions {
  /** Max results to return (default: 8) */
  limit?: number;
  /** Only search active contacts (default: true) */
  activeOnly?: boolean;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Navigate to contact detail on keyboard Enter (default: false) */
  navigateOnSelect?: boolean;
}

export function useQuickLookup(options: UseQuickLookupOptions = {}) {
  const {
    limit = 8,
    activeOnly = true,
    debounceMs = 300,
    navigateOnSelect = false,
  } = options;

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { search: term, limit };
      if (activeOnly) params.is_active = true;
      const response = await api.get('/contacts', { params });
      setResults(response.data.contacts || response.data.data || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, activeOnly]);

  const handleSearchChange = (eventOrValue: React.ChangeEvent<HTMLInputElement> | string) => {
    const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
    setSearchTerm(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, debounceMs);
  };

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
        if (navigateOnSelect && selectedIndex >= 0 && results[selectedIndex]) {
          setIsOpen(false);
          navigate(`/contacts/${results[selectedIndex].contact_id}`);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (searchTerm.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  /**
   * Select a result and close the dropdown.
   * Optionally set a display text in the search input.
   */
  const selectResult = (displayText?: string) => {
    if (displayText !== undefined) setSearchTerm(displayText);
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
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

  return {
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
    selectResult,
  };
}

/**
 * Highlight matching text in search results
 */
export function highlightMatch(text: string, term: string): React.ReactNode {
  if (!term || term.length < 2) return text;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}
