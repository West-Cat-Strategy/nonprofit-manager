import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsApiClient } from '../../contacts/api/contactsApiClient';
import type { ContactLookupItem } from '../../contacts/types/contracts';

export type StaffQuickLookupResult = ContactLookupItem;

export interface UseStaffQuickLookupOptions {
  limit?: number;
  activeOnly?: boolean;
  debounceMs?: number;
  navigateOnSelect?: boolean;
}

export function useStaffQuickLookup(options: UseStaffQuickLookupOptions = {}) {
  const {
    limit = 8,
    activeOnly = true,
    debounceMs = 300,
    navigateOnSelect = false,
  } = options;

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<StaffQuickLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const activeSearchController = useRef<AbortController | null>(null);
  const latestSearchRequestId = useRef(0);

  const performSearch = useCallback(
    async (term: string) => {
      const normalizedTerm = term.trim();
      if (normalizedTerm.length < 2) {
        activeSearchController.current?.abort();
        setResults([]);
        setIsOpen(false);
        return;
      }

      latestSearchRequestId.current += 1;
      const requestId = latestSearchRequestId.current;
      activeSearchController.current?.abort();
      const controller = new AbortController();
      activeSearchController.current = controller;

      setIsLoading(true);
      try {
        const response = await contactsApiClient.lookupContacts(
          {
            q: normalizedTerm,
            limit,
            isActive: activeOnly ? true : undefined,
          },
          {
            signal: controller.signal,
          }
        );

        if (requestId !== latestSearchRequestId.current || controller.signal.aborted) {
          return;
        }

        setResults(Array.isArray(response.items) ? response.items : []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setResults([]);
        setIsOpen(false);
      } finally {
        if (requestId === latestSearchRequestId.current) {
          setIsLoading(false);
        }
        if (activeSearchController.current === controller) {
          activeSearchController.current = null;
        }
      }
    },
    [activeOnly, limit]
  );

  const handleSearchChange = (eventOrValue: React.ChangeEvent<HTMLInputElement> | string) => {
    const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
    setSearchTerm(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      void performSearch(value);
    }, debounceMs);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((previous) => (previous < results.length - 1 ? previous + 1 : previous));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((previous) => (previous > 0 ? previous - 1 : previous));
        break;
      case 'Enter':
        event.preventDefault();
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

  const selectResult = (displayText?: string) => {
    if (displayText !== undefined) {
      setSearchTerm(displayText);
    }
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

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

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      activeSearchController.current?.abort();
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

export default useStaffQuickLookup;
