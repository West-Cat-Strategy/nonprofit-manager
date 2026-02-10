/**
 * ContactList Page
 * Displays list of all contacts with neo-brutalist styling
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchContacts,
  deleteContact,
  setFilters,
  clearFilters,
  fetchContactTags,
  bulkUpdateContacts,
  createContact,
} from '../../../store/slices/contactsSlice';
import type { Contact } from '../../../store/slices/contactsSlice';
import { useToast } from '../../../contexts/useToast';
import { BrutalBadge, BrutalButton, BrutalCard, BrutalInput } from '../../../components/neo-brutalist';
import api from '../../../services/api';

const SEGMENT_STORAGE_KEY = 'crm_contact_segments';

type ContactSegment = {
  id: string;
  name: string;
  filters: {
    search: string;
    account_id: string;
    is_active: boolean | null;
    tags: string[];
    role: '' | 'staff' | 'volunteer' | 'board';
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
};

const ContactList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { contacts, loading, error, pagination, filters, availableTags } = useAppSelector(
    (state) => state.contacts
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [tagInput, setTagInput] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importRows, setImportRows] = useState<Array<Record<string, string | null>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFilename, setImportFilename] = useState<string>('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(() => {
    dispatch(
      fetchContacts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.is_active ?? undefined,
        tags: filters.tags.length ? filters.tags : undefined,
        role: filters.role || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  useEffect(() => {
    setSelectedContactIds(new Set());
  }, [contacts]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEGMENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ContactSegment[];
        setSegments(parsed);
      }
    } catch {
      setSegments([]);
    }
  }, []);

  useEffect(() => {
    if (!activeSegmentId) return;
    const activeSegment = segments.find((segment) => segment.id === activeSegmentId);
    if (!activeSegment) return;
    const current = JSON.stringify(filters);
    const saved = JSON.stringify(activeSegment.filters);
    if (current !== saved) {
      setActiveSegmentId(null);
    }
  }, [activeSegmentId, filters, segments]);

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
        is_active: filters.is_active ?? undefined,
        tags: filters.tags.length ? filters.tags : undefined,
        role: filters.role || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
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

  const toggleSelectAll = () => {
    if (selectedContactIds.size === contacts.length) {
      setSelectedContactIds(new Set());
      return;
    }
    setSelectedContactIds(new Set(contacts.map((contact) => contact.contact_id)));
  };

  const toggleSelectContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedContactIds(new Set());
  };

  const applyBulkTagUpdate = async (mode: 'add' | 'remove') => {
    const nextTag = bulkTagInput.trim();
    if (!nextTag || selectedContactIds.size === 0) return;
    try {
      await dispatch(
        bulkUpdateContacts({
          contactIds: Array.from(selectedContactIds),
          tags: { [mode]: [nextTag] },
        })
      ).unwrap();
      showSuccess(`Tag ${mode === 'add' ? 'added' : 'removed'} for ${selectedContactIds.size} people`);
      setBulkTagInput('');
      clearSelection();
      loadContacts();
    } catch {
      showError('Failed to update tags in bulk');
    }
  };

  const applyBulkStatus = async (isActive: boolean) => {
    if (selectedContactIds.size === 0) return;
    try {
      await dispatch(
        bulkUpdateContacts({
          contactIds: Array.from(selectedContactIds),
          is_active: isActive,
        })
      ).unwrap();
      showSuccess(`Updated ${selectedContactIds.size} people`);
      clearSelection();
      loadContacts();
    } catch {
      showError('Failed to update status in bulk');
    }
  };

  const segmentOptions = useMemo(
    () => segments.map((segment) => ({ value: segment.id, label: segment.name })),
    [segments]
  );

  const saveSegment = () => {
    const name = window.prompt('Name this segment');
    if (!name) return;
    const newSegment: ContactSegment = {
      id: `${Date.now()}`,
      name,
      filters,
    };
    const next = [...segments, newSegment];
    setSegments(next);
    setActiveSegmentId(newSegment.id);
    localStorage.setItem(SEGMENT_STORAGE_KEY, JSON.stringify(next));
    showSuccess(`Saved segment "${name}"`);
  };

  const applySegment = (segmentId: string) => {
    const segment = segments.find((item) => item.id === segmentId);
    if (!segment) return;
    setSearchInput(segment.filters.search);
    setActiveSegmentId(segmentId);
    dispatch(setFilters(segment.filters));
  };

  const deleteSegment = (segmentId: string) => {
    const next = segments.filter((segment) => segment.id !== segmentId);
    setSegments(next);
    localStorage.setItem(SEGMENT_STORAGE_KEY, JSON.stringify(next));
    if (activeSegmentId === segmentId) {
      setActiveSegmentId(null);
    }
  };

  const handleLimitChange = (value: number) => {
    dispatch(
      fetchContacts({
        page: 1,
        limit: value,
        search: filters.search || undefined,
        is_active: filters.is_active ?? undefined,
        tags: filters.tags.length ? filters.tags : undefined,
        role: filters.role || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
      })
    );
  };

  const buildCsv = (rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ];
    return lines.join('\n');
  };

  const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentView = async () => {
    setIsExporting(true);
    try {
      const allRows: Array<Record<string, unknown>> = [];
      let page = 1;
      const limit = 100;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await api.get('/contacts', {
          params: {
            page,
            limit,
            search: filters.search || undefined,
            is_active: filters.is_active ?? undefined,
            tags: filters.tags.length ? filters.tags.join(',') : undefined,
            role: filters.role || undefined,
            sort_by: filters.sort_by || undefined,
            sort_order: filters.sort_order || undefined,
          },
        });
        const data = response.data.data as Contact[];
        totalPages = response.data.pagination?.total_pages || totalPages;
        allRows.push(
          ...data.map((contact) => ({
            contact_id: contact.contact_id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            mobile_phone: contact.mobile_phone,
            job_title: contact.job_title,
            department: contact.department,
            preferred_contact_method: contact.preferred_contact_method,
            account_name: contact.account_name,
            tags: contact.tags?.join(', ') || '',
            is_active: contact.is_active,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
          }))
        );
        page += 1;
      }

      downloadCsv('contacts-export.csv', allRows);
      showSuccess('Export ready');
    } catch {
      showError('Failed to export contacts');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSelected = () => {
    if (selectedContactIds.size === 0) return;
    const rows = contacts
      .filter((contact) => selectedContactIds.has(contact.contact_id))
      .map((contact) => ({
        contact_id: contact.contact_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        mobile_phone: contact.mobile_phone,
        job_title: contact.job_title,
        department: contact.department,
        account_name: contact.account_name,
        tags: contact.tags?.join(', ') || '',
        is_active: contact.is_active,
      }));
    downloadCsv('contacts-selected.csv', rows);
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const rows: Array<Record<string, string | null>> = [];
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    if (!headerLine) return rows;
    const headers = headerLine.split(',').map((header) => header.trim());
    for (const line of lines) {
      const values = line.split(',').map((value) => value.trim());
      const row: Record<string, string | null> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? null;
      });
      rows.push(row);
    }
    return rows;
  };

  const handleImportFile = async (file: File) => {
    setImportErrors([]);
    setImportFilename(file.name);
    try {
      const rows = await parseCsv(file);
      setImportRows(rows);
    } catch {
      setImportErrors(['Failed to parse CSV file']);
    }
  };

  const runImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);
    const errors: string[] = [];
    for (const row of importRows) {
      const firstName = row.first_name || row.firstName;
      const lastName = row.last_name || row.lastName;
      if (!firstName || !lastName) {
        errors.push('Missing first_name or last_name in one or more rows');
        continue;
      }
      try {
        await dispatch(
          createContact({
            first_name: firstName,
            last_name: lastName,
            email: row.email || undefined,
            phone: row.phone || undefined,
            mobile_phone: row.mobile_phone || undefined,
            job_title: row.job_title || undefined,
            department: row.department || undefined,
            preferred_contact_method: row.preferred_contact_method || undefined,
            tags: row.tags ? row.tags.split(';').map((tag) => tag.trim()).filter(Boolean) : undefined,
            is_active: row.is_active ? row.is_active === 'true' || row.is_active === '1' : undefined,
          })
        ).unwrap();
      } catch {
        errors.push(`Failed to import ${firstName} ${lastName}`);
      }
    }
    setIsImporting(false);
    setImportErrors(errors);
    if (errors.length === 0) {
      showSuccess('Import completed');
      setImportRows([]);
      loadContacts();
    }
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-xs font-black uppercase text-black/60">Segment</label>
              <select
                value={activeSegmentId || ''}
                onChange={(e) => {
                  if (!e.target.value) {
                    setActiveSegmentId(null);
                    return;
                  }
                  applySegment(e.target.value);
                }}
                className="border-2 border-black px-3 py-2 text-xs font-black uppercase bg-white"
              >
                <option value="">All People</option>
                {segmentOptions.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label}
                  </option>
                ))}
              </select>
              {activeSegmentId && (
                <button
                  type="button"
                  onClick={() => deleteSegment(activeSegmentId)}
                  className="px-2 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-pink)]"
                >
                  Delete Segment
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <BrutalButton type="button" onClick={saveSegment} variant="secondary">
                Save Segment
              </BrutalButton>
              <BrutalButton type="button" onClick={exportCurrentView} variant="secondary" disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </BrutalButton>
            </div>
          </div>
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
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-black uppercase text-black/70">
              Status
              <select
                value={filters.is_active === null ? 'all' : filters.is_active ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value;
                  dispatch(
                    setFilters({
                      is_active: value === 'all' ? null : value === 'active',
                    })
                  );
                }}
                className="border-2 border-black px-3 py-2 text-sm font-bold bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-black uppercase text-black/70">
              Role
              <select
                value={filters.role || ''}
                onChange={(e) => dispatch(setFilters({ role: e.target.value as ContactSegment['filters']['role'] }))}
                className="border-2 border-black px-3 py-2 text-sm font-bold bg-white"
              >
                <option value="">All</option>
                <option value="staff">Staff</option>
                <option value="volunteer">Volunteer</option>
                <option value="board">Board</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-black uppercase text-black/70">
              Sort by
              <select
                value={filters.sort_by}
                onChange={(e) => dispatch(setFilters({ sort_by: e.target.value }))}
                className="border-2 border-black px-3 py-2 text-sm font-bold bg-white"
              >
                <option value="created_at">Created Date</option>
                <option value="updated_at">Last Updated</option>
                <option value="first_name">First Name</option>
                <option value="last_name">Last Name</option>
                <option value="email">Email</option>
                <option value="account_name">Organization</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-black uppercase text-black/70">
              Order / Page Size
              <div className="flex gap-2">
                <select
                  value={filters.sort_order}
                  onChange={(e) =>
                    dispatch(setFilters({ sort_order: e.target.value as ContactSegment['filters']['sort_order'] }))
                  }
                  className="border-2 border-black px-3 py-2 text-sm font-bold bg-white"
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="border-2 border-black px-3 py-2 text-sm font-bold bg-white"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </label>
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

      {selectedContactIds.size > 0 && (
        <BrutalCard color="white" className="p-4 border-4 border-black">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-black uppercase text-black">
              {selectedContactIds.size} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                list="contact-tag-filter-options"
                placeholder="Tag name"
                className="min-w-[160px] px-3 py-2 border-2 border-black text-sm font-bold"
              />
              <button
                type="button"
                onClick={() => applyBulkTagUpdate('add')}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-green)]"
              >
                Add Tag
              </button>
              <button
                type="button"
                onClick={() => applyBulkTagUpdate('remove')}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-pink)]"
              >
                Remove Tag
              </button>
              <button
                type="button"
                onClick={() => applyBulkStatus(true)}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
              >
                Set Active
              </button>
              <button
                type="button"
                onClick={() => applyBulkStatus(false)}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
              >
                Set Inactive
              </button>
              <button
                type="button"
                onClick={exportSelected}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-yellow)]"
              >
                Export Selected
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
              >
                Clear
              </button>
            </div>
          </div>
        </BrutalCard>
      )}

      <BrutalCard color="white" className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black uppercase text-black">Import Contacts</h2>
            <p className="text-sm font-bold text-black/60">
              CSV headers: first_name, last_name, email, phone, mobile_phone, job_title, department, preferred_contact_method, tags, is_active
            </p>
          </div>
          <label className="border-2 border-black px-4 py-2 font-black uppercase text-black cursor-pointer bg-white">
            Select CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
          </label>
        </div>
        {importFilename && (
          <div className="mt-3 text-sm font-bold text-black/70">
            Loaded file: {importFilename}
          </div>
        )}
        {importRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runImport}
                disabled={isImporting}
                className="px-4 py-2 border-2 border-black bg-[var(--loop-green)] font-black uppercase text-black"
              >
                {isImporting ? 'Importing...' : `Import ${importRows.length} rows`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportRows([]);
                  setImportFilename('');
                  setImportErrors([]);
                }}
                className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-black"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto border-2 border-black">
              <table className="min-w-full text-xs font-bold text-black">
                <thead className="bg-[var(--loop-yellow)]">
                  <tr>
                    {Object.keys(importRows[0]).map((header) => (
                      <th key={header} className="px-3 py-2 text-left uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-t-2 border-black">
                      {Object.keys(row).map((header) => (
                        <td key={header} className="px-3 py-2">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importRows.length > 5 && (
              <p className="text-xs font-bold text-black/60">
                Showing 5 of {importRows.length} rows
              </p>
            )}
          </div>
        )}
        {importErrors.length > 0 && (
          <div className="mt-3 text-sm font-bold text-red-600">
            {importErrors.slice(0, 3).map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        )}
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
                    <th scope="col" className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      <input
                        type="checkbox"
                        checked={contacts.length > 0 && selectedContactIds.size === contacts.length}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectAll();
                        }}
                        aria-label="Select all contacts on this page"
                        className="h-4 w-4 accent-black"
                      />
                    </th>
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
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(contact.contact_id)}
                          onChange={() => toggleSelectContact(contact.contact_id)}
                          aria-label={`Select ${formatName(contact)}`}
                          className="h-4 w-4 accent-black"
                        />
                      </td>
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
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.contact_id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectContact(contact.contact_id);
                      }}
                      aria-label={`Select ${formatName(contact)}`}
                      className="mt-1 h-4 w-4 accent-black"
                    />
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
