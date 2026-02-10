/**
 * ContactList Page
 * Displays list of all contacts with neo-brutalist styling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchContacts,
  deleteContact,
  setFilters,
  clearFilters,
  fetchContactTags,
} from '../../../store/slices/contactsSlice';
import type { Contact } from '../../../store/slices/contactsSlice';
import { useToast } from '../../../contexts/useToast';
import { BrutalBadge, BrutalButton, BrutalCard, BrutalInput } from '../../../components/neo-brutalist';

const ContactList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { contacts, loading, error, pagination, filters, availableTags } = useAppSelector(
    (state) => state.contacts
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [tagInput, setTagInput] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(() => {
    dispatch(
      fetchContacts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.is_active,
        tags: filters.tags.length ? filters.tags : undefined,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  // Quick lookup: debounce server-side search as the user types
  useEffect(() => {
    if (searchInput === filters.search) return;

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    const timer = setTimeout(() => {
      dispatch(setFilters({ search: searchInput }));
    }, 250);

    searchDebounceTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (searchDebounceTimerRef.current === timer) {
        searchDebounceTimerRef.current = null;
      }
    };
  }, [dispatch, filters.search, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchInput }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setTagInput('');
    dispatch(clearFilters());
  };

  const handleDelete = async (contactId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await dispatch(deleteContact(contactId)).unwrap();
        showSuccess(`${name} deleted successfully`);
        loadContacts();
      } catch {
        showError('Failed to delete contact');
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    dispatch(
      fetchContacts({
        page: newPage,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.is_active,
        tags: filters.tags.length ? filters.tags : undefined,
      })
    );
  };

  const handleAddTagFilter = (value?: string) => {
    const nextTag = (value ?? tagInput).trim();
    if (!nextTag) return;
    const existing = filters.tags || [];
    if (existing.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setTagInput('');
      return;
    }
    dispatch(setFilters({ tags: [...existing, nextTag] }));
    setTagInput('');
  };

  const handleRemoveTagFilter = (tag: string) => {
    dispatch(setFilters({ tags: (filters.tags || []).filter((item) => item !== tag) }));
  };

  const formatName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`;
  };

  // Pagination helpers
  const totalPages = pagination.total_pages;
  const currentPage = pagination.page;
  const windowSize = 5;
  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(1, Math.min(currentPage - halfWindow, totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const paginationPages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    paginationPages.push(page);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="purple" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">People</h1>
            <p className="mt-1 font-bold text-black/70">
              {pagination.total} {pagination.total === 1 ? 'person' : 'people'} found
            </p>
          </div>
          <BrutalButton onClick={() => navigate('/contacts/new')} variant="primary">
            + New Person
          </BrutalButton>
        </div>
      </BrutalCard>

      {/* Filters */}
      <BrutalCard color="white" className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
            <BrutalInput
              type="text"
              placeholder="Quick lookup (name, email, phone)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search contacts"
            />
          </div>
            <div className="flex gap-2">
            <BrutalButton type="submit" variant="primary">
              Search
            </BrutalButton>
            <BrutalButton type="button" onClick={handleClearFilters} variant="secondary">
              Clear
            </BrutalButton>
          </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {filters.tags.length === 0 && (
                <span className="text-sm font-bold text-black/60">No tag filters</span>
              )}
              {filters.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTagFilter(tag)}
                  className="px-2 py-1 text-xs font-black uppercase border-2 border-black bg-[var(--loop-yellow)]"
                >
                  {tag} ×
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTagFilter();
                  }
                }}
                list="contact-tag-filter-options"
                placeholder="Filter by tag..."
                className="flex-1 min-w-[200px] px-3 py-2 border-2 border-black text-sm font-bold"
              />
              <BrutalButton type="button" onClick={() => handleAddTagFilter()} variant="secondary">
                Add Tag Filter
              </BrutalButton>
            </div>
            <datalist id="contact-tag-filter-options">
              {availableTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </form>
      </BrutalCard>

      {/* Error Message */}
      {error && (
        <BrutalCard color="pink" className="p-4">
          <p className="font-bold text-black">{error}</p>
        </BrutalCard>
      )}

      {/* Loading State */}
      {loading && (
        <BrutalCard color="white" className="p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent mb-4" />
            <p className="font-bold text-black">Loading contacts...</p>
          </div>
        </BrutalCard>
      )}

      {/* Contacts Table - Desktop */}
      {!loading && contacts.length > 0 && (
        <>
          <BrutalCard color="white" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse" role="grid" aria-label="Contacts table">
                <thead className="bg-[var(--loop-purple)] border-b-2 border-black">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Organization
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.contact_id}
                      className="border-b-2 border-black dark:border-slate-700 hover:bg-[var(--loop-yellow)] dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => navigate(`/contacts/${contact.contact_id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/contacts/${contact.contact_id}`);
                        }
                      }}
                      role="row"
                      aria-label={`Contact: ${formatName(contact)}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-black dark:text-white">
                            {formatName(contact)}
                          </span>
                          {contact.pronouns && (
                            <span className="text-xs text-black/50 dark:text-white/50">
                              ({contact.pronouns})
                            </span>
                          )}
                          {contact.roles && contact.roles.length > 0 && contact.roles.map((role) => (
                            <BrutalBadge
                              key={role}
                              color={
                                role === 'Donor' ? 'green'
                                : role === 'Staff' || role === 'Executive Director' ? 'blue'
                                : role === 'Volunteer' ? 'purple'
                                : role === 'Board Member' ? 'yellow'
                                : role === 'Client' ? 'red'
                                : 'gray'
                              }
                              size="sm"
                            >
                              {role}
                            </BrutalBadge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black/70 dark:text-white/70">
                        {contact.account_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black/70 dark:text-white/70">
                        {contact.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black/70 dark:text-white/70">
                        {contact.phone || contact.mobile_phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <BrutalBadge color={contact.is_active ? 'green' : 'gray'} size="sm">
                          {contact.is_active ? 'Active' : 'Inactive'}
                        </BrutalBadge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/${contact.contact_id}/edit`);
                            }}
                            className="border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                            aria-label={`Edit ${formatName(contact)}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contact.contact_id, formatName(contact));
                            }}
                            className="border-2 border-black bg-[var(--loop-pink)] text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                            aria-label={`Delete ${formatName(contact)}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BrutalCard>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden" role="list" aria-label="Contacts list">
            {contacts.map((contact) => (
              <div
                key={contact.contact_id}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/contacts/${contact.contact_id}`);
                  }
                }}
                aria-label={`Contact: ${formatName(contact)}`}
              >
                <BrutalCard
                  color="white"
                  className="p-4 cursor-pointer hover:bg-[var(--loop-yellow)] transition-colors"
                  onClick={() => navigate(`/contacts/${contact.contact_id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-black text-black">{formatName(contact)}</div>
                      {contact.pronouns && (
                        <span className="text-xs text-black/50">({contact.pronouns})</span>
                      )}
                      {contact.roles && contact.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.roles.map((role) => (
                            <BrutalBadge
                              key={role}
                              color={
                                role === 'Donor' ? 'green'
                                : role === 'Staff' || role === 'Executive Director' ? 'blue'
                                : role === 'Volunteer' ? 'purple'
                                : role === 'Board Member' ? 'yellow'
                                : role === 'Client' ? 'red'
                                : 'gray'
                              }
                              size="sm"
                            >
                              {role}
                            </BrutalBadge>
                          ))}
                        </div>
                      )}
                      {contact.account_name && (
                        <div className="text-sm font-bold text-black/70">{contact.account_name}</div>
                      )}
                    </div>
                    <BrutalBadge color={contact.is_active ? 'green' : 'gray'} size="sm">
                      {contact.is_active ? 'Active' : 'Inactive'}
                    </BrutalBadge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm font-bold text-black/70">
                    {contact.email && <div>{contact.email}</div>}
                    {(contact.phone || contact.mobile_phone) && (
                      <div>{contact.phone || contact.mobile_phone}</div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contacts/${contact.contact_id}/edit`);
                      }}
                      className="flex-1 border-2 border-black bg-white text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contacts/${contact.contact_id}`);
                      }}
                      className="flex-1 border-2 border-black bg-[var(--loop-green)] text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                    >
                      View
                    </button>
                  </div>
                </BrutalCard>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && contacts.length === 0 && (
        <BrutalCard color="white" className="p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-black uppercase mb-2 text-black dark:text-white">No people found</h3>
          <p className="text-black/70 dark:text-white/70 font-bold mb-6">
            {filters.search
              ? 'Try adjusting your search'
              : 'Get started by adding your first person'}
          </p>
          <div className="flex justify-center">
            <BrutalButton onClick={() => navigate('/contacts/new')} variant="primary">
              Add First Person
            </BrutalButton>
          </div>
        </BrutalCard>
      )}

      {/* Pagination */}
      {!loading && contacts.length > 0 && totalPages > 1 && (
        <nav
          className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center"
          role="navigation"
          aria-label="Contacts pagination"
        >
          <div className="text-sm font-bold text-black dark:text-white">
            Showing page {currentPage} of {totalPages} ({pagination.total} total)
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-black transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>

            {paginationPages[0] !== 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="border-2 border-black dark:border-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] bg-white dark:bg-black text-black dark:text-white hover:bg-[var(--loop-yellow)] transition-colors"
                  aria-label="Go to page 1"
                >
                  1
                </button>
                <span className="text-sm font-black text-black/60 dark:text-white/60 self-center">…</span>
              </>
            )}

            {paginationPages.map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`border-2 border-black dark:border-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-colors ${
                  currentPage === page
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black text-black dark:text-white hover:bg-[var(--loop-yellow)]'
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}

            {paginationPages[paginationPages.length - 1] !== totalPages && (
              <>
                <span className="text-sm font-black text-black/60 dark:text-white/60 self-center">…</span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="border-2 border-black dark:border-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] bg-white dark:bg-black text-black dark:text-white hover:bg-[var(--loop-yellow)] transition-colors"
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-black transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default ContactList;
