import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerFileDownload } from '../../../services/fileDownload';
import type {
  GrantActivityLog,
  GrantApplication,
  GrantApplicationAwardResult,
  GrantApplicationStatusUpdateDTO,
  GrantCalendarItem,
  GrantListFilters,
  GrantPagination,
  GrantSummary,
} from '../types/contracts';
import { grantsApiClient } from '../api/grantsApiClient';
import {
  buildApplicationPayload,
  buildAwardPayload,
  buildAwardPayloadFromApplication,
  buildDisbursementPayload,
  buildDocumentPayload,
  buildFundedProgramPayload,
  buildFunderPayload,
  buildProgramPayload,
  buildRecipientPayload,
  buildReportPayload,
  createBlankFormValues,
  recordToFormValues,
  toGrantJurisdiction,
} from '../lib/grantsPageMappers';
import {
  EMPTY_LOOKUPS,
  SECTION_DEFINITIONS,
  getSectionFromPath,
  sectionLabelById,
} from '../lib/grantsPageRegistry';
import type {
  EditableGrantRecord,
  FormState,
  GrantsLoadResult,
  GrantsLookupState,
  GrantsSectionId,
  GrantsTableRow,
} from '../lib/grantsPageTypes';

type FilterField =
  | 'searchInput'
  | 'statusFilter'
  | 'jurisdictionFilter'
  | 'funderFilter'
  | 'programFilter'
  | 'recipientFilter'
  | 'fundedProgramFilter'
  | 'fiscalYearFilter'
  | 'dueBeforeFilter'
  | 'dueAfterFilter'
  | 'minAmountFilter'
  | 'maxAmountFilter';

type LookupCache = {
  loaded: boolean;
  data: GrantsLookupState;
};

const EMPTY_FILTER_VALUE = '';
const LOOKUP_LIMIT = 250;

const createEmptyLookupCache = (): LookupCache => ({
  loaded: false,
  data: EMPTY_LOOKUPS,
});

export function useGrantsPageData() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<GrantsSectionId>(getSectionFromPath(location.pathname));
  const [summary, setSummary] = useState<GrantSummary | null>(null);
  const [rows, setRows] = useState<GrantsTableRow[]>([]);
  const [pagination, setPagination] = useState<GrantPagination | null>(null);
  const [lookups, setLookups] = useState<GrantsLookupState>(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormState>(createBlankFormValues(activeSection));
  const [searchInput, setSearchInput] = useState(EMPTY_FILTER_VALUE);
  const [appliedSearch, setAppliedSearch] = useState(EMPTY_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState(EMPTY_FILTER_VALUE);
  const [jurisdictionFilter, setJurisdictionFilter] = useState(EMPTY_FILTER_VALUE);
  const [funderFilter, setFunderFilter] = useState(EMPTY_FILTER_VALUE);
  const [programFilter, setProgramFilter] = useState(EMPTY_FILTER_VALUE);
  const [recipientFilter, setRecipientFilter] = useState(EMPTY_FILTER_VALUE);
  const [fundedProgramFilter, setFundedProgramFilter] = useState(EMPTY_FILTER_VALUE);
  const [fiscalYearFilter, setFiscalYearFilter] = useState(EMPTY_FILTER_VALUE);
  const [dueBeforeFilter, setDueBeforeFilter] = useState(EMPTY_FILTER_VALUE);
  const [dueAfterFilter, setDueAfterFilter] = useState(EMPTY_FILTER_VALUE);
  const [minAmountFilter, setMinAmountFilter] = useState(EMPTY_FILTER_VALUE);
  const [maxAmountFilter, setMaxAmountFilter] = useState(EMPTY_FILTER_VALUE);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [refreshCount, setRefreshCount] = useState(0);
  const lookupCacheRef = useRef<LookupCache>(createEmptyLookupCache());
  const lookupRequestRef = useRef<Promise<GrantsLookupState> | null>(null);
  const latestRequestIdRef = useRef(0);
  const lastLookupRefreshRef = useRef(0);

  useEffect(() => {
    setActiveSection(getSectionFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    setSelectedId(null);
    setFormValues(createBlankFormValues(activeSection));
    setPage(1);
    setError(null);
    setNotice(null);
  }, [activeSection]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  useEffect(() => {
    const matched = SECTION_DEFINITIONS.find((definition) => definition.id === activeSection);
    if (matched && location.pathname !== matched.path) {
      navigate(matched.path, { replace: true });
    }
  }, [activeSection, location.pathname, navigate]);

  const refreshData = () => {
    setRefreshCount((value) => value + 1);
  };

  const buildListQuery = (): GrantListFilters => ({
    search: appliedSearch || undefined,
    status: statusFilter || undefined,
    funder_id: funderFilter || undefined,
    program_id: programFilter || undefined,
    recipient_organization_id: recipientFilter || undefined,
    funded_program_id: fundedProgramFilter || undefined,
    jurisdiction: toGrantJurisdiction(jurisdictionFilter),
    fiscal_year: fiscalYearFilter || undefined,
    due_before: dueBeforeFilter || undefined,
    due_after: dueAfterFilter || undefined,
    min_amount: minAmountFilter ? Number(minAmountFilter) : undefined,
    max_amount: maxAmountFilter ? Number(maxAmountFilter) : undefined,
    page,
    limit,
  });

  const loadLookups = async (forceRefresh: boolean): Promise<GrantsLookupState> => {
    if (forceRefresh) {
      lookupCacheRef.current = createEmptyLookupCache();
      lookupRequestRef.current = null;
    }

    if (lookupCacheRef.current.loaded) {
      return lookupCacheRef.current.data;
    }

    if (lookupRequestRef.current) {
      return lookupRequestRef.current;
    }

    const request = Promise.all([
      grantsApiClient.listFunders({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listPrograms({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listRecipients({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listFundedPrograms({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listApplications({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listAwards({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listReports({ limit: LOOKUP_LIMIT }),
      grantsApiClient.listDocuments({ limit: LOOKUP_LIMIT }),
    ])
      .then((lookupRequests) => {
        const nextLookups: GrantsLookupState = {
          funders: lookupRequests[0].data,
          programs: lookupRequests[1].data,
          recipients: lookupRequests[2].data,
          fundedPrograms: lookupRequests[3].data,
          applications: lookupRequests[4].data,
          awards: lookupRequests[5].data,
          reports: lookupRequests[6].data,
          documents: lookupRequests[7].data,
        };

        lookupCacheRef.current = {
          loaded: true,
          data: nextLookups,
        };

        return nextLookups;
      })
      .finally(() => {
        lookupRequestRef.current = null;
      });

    lookupRequestRef.current = request;
    return request;
  };

  const loadCurrentRows = async (): Promise<Pick<GrantsLoadResult, 'rows' | 'pagination'>> => {
    if (activeSection === 'calendar') {
      const calendarRows = await grantsApiClient.getCalendar({
        start_date: dueAfterFilter || undefined,
        end_date: dueBeforeFilter || undefined,
        limit,
      });

      return {
        rows: calendarRows,
        pagination: null,
      };
    }

    if (activeSection === 'activities') {
      const result = await grantsApiClient.listActivities({
        ...buildListQuery(),
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      return {
        rows: result.data,
        pagination: result.pagination,
      };
    }

    if (activeSection === 'funders') {
      const result = await grantsApiClient.listFunders(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'programs') {
      const result = await grantsApiClient.listPrograms(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'recipients') {
      const result = await grantsApiClient.listRecipients(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'funded-programs') {
      const result = await grantsApiClient.listFundedPrograms(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'applications') {
      const result = await grantsApiClient.listApplications(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'awards') {
      const result = await grantsApiClient.listAwards(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'disbursements') {
      const result = await grantsApiClient.listDisbursements(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'reports') {
      const result = await grantsApiClient.listReports(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    if (activeSection === 'documents') {
      const result = await grantsApiClient.listDocuments(buildListQuery());
      return { rows: result.data, pagination: result.pagination };
    }

    return {
      rows: [],
      pagination: null,
    };
  };

  useEffect(() => {
    const run = async () => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const shouldRefreshLookups = refreshCount !== lastLookupRefreshRef.current;

      setLoading(true);
      setError(null);

      try {
        const [lookupResult, summaryResult, rowResult] = await Promise.all([
          loadLookups(shouldRefreshLookups),
          grantsApiClient.getSummary({
            jurisdiction: toGrantJurisdiction(jurisdictionFilter),
            fiscal_year: fiscalYearFilter || undefined,
          }),
          loadCurrentRows(),
        ]);

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        if (shouldRefreshLookups) {
          lastLookupRefreshRef.current = refreshCount;
        }

        setRows(rowResult.rows);
        setPagination(rowResult.pagination);
        setSummary(summaryResult);
        setLookups(lookupResult);
      } catch (loadError) {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load grants data.');
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void run();
  }, [
    activeSection,
    appliedSearch,
    dueAfterFilter,
    dueBeforeFilter,
    fiscalYearFilter,
    funderFilter,
    fundedProgramFilter,
    jurisdictionFilter,
    limit,
    maxAmountFilter,
    minAmountFilter,
    page,
    programFilter,
    recipientFilter,
    refreshCount,
    statusFilter,
  ]);

  const updateFilter = (field: FilterField, value: string) => {
    setPage(1);

    switch (field) {
      case 'searchInput':
        setSearchInput(value);
        return;
      case 'statusFilter':
        setStatusFilter(value);
        return;
      case 'jurisdictionFilter':
        setJurisdictionFilter(value);
        return;
      case 'funderFilter':
        setFunderFilter(value);
        return;
      case 'programFilter':
        setProgramFilter(value);
        return;
      case 'recipientFilter':
        setRecipientFilter(value);
        return;
      case 'fundedProgramFilter':
        setFundedProgramFilter(value);
        return;
      case 'fiscalYearFilter':
        setFiscalYearFilter(value);
        return;
      case 'dueBeforeFilter':
        setDueBeforeFilter(value);
        return;
      case 'dueAfterFilter':
        setDueAfterFilter(value);
        return;
      case 'minAmountFilter':
        setMinAmountFilter(value);
        return;
      case 'maxAmountFilter':
        setMaxAmountFilter(value);
        return;
      default:
        return;
    }
  };

  const clearFilters = () => {
    setSearchInput(EMPTY_FILTER_VALUE);
    setAppliedSearch(EMPTY_FILTER_VALUE);
    setStatusFilter(EMPTY_FILTER_VALUE);
    setJurisdictionFilter(EMPTY_FILTER_VALUE);
    setFunderFilter(EMPTY_FILTER_VALUE);
    setProgramFilter(EMPTY_FILTER_VALUE);
    setRecipientFilter(EMPTY_FILTER_VALUE);
    setFundedProgramFilter(EMPTY_FILTER_VALUE);
    setFiscalYearFilter(EMPTY_FILTER_VALUE);
    setDueBeforeFilter(EMPTY_FILTER_VALUE);
    setDueAfterFilter(EMPTY_FILTER_VALUE);
    setMinAmountFilter(EMPTY_FILTER_VALUE);
    setMaxAmountFilter(EMPTY_FILTER_VALUE);
    setPage(1);
  };

  const setPageSize = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    statusFilter.length > 0 ||
    jurisdictionFilter.length > 0 ||
    funderFilter.length > 0 ||
    programFilter.length > 0 ||
    recipientFilter.length > 0 ||
    fundedProgramFilter.length > 0 ||
    fiscalYearFilter.trim().length > 0 ||
    dueBeforeFilter.length > 0 ||
    dueAfterFilter.length > 0 ||
    minAmountFilter.trim().length > 0 ||
    maxAmountFilter.trim().length > 0;

  const handleNewRecord = () => {
    setSelectedId(null);
    setFormValues(createBlankFormValues(activeSection));
    setNotice(null);
  };

  const handleSelectRecord = (record: EditableGrantRecord) => {
    setSelectedId(record.id);
    setFormValues(recordToFormValues(activeSection, record));
    setNotice(null);
  };

  const handleFormChange = (name: string, value: string) => {
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const updateStatus = async (applicationId: string, payload: GrantApplicationStatusUpdateDTO) => {
    setSaving(true);
    setError(null);
    try {
      await grantsApiClient.updateApplicationStatus(applicationId, payload);
      setNotice('Application status updated.');
      refreshData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update application status.');
    } finally {
      setSaving(false);
    }
  };

  const handleAwardApplication = async (application: GrantApplication) => {
    setSaving(true);
    setError(null);
    try {
      const result: GrantApplicationAwardResult = await grantsApiClient.awardApplication(
        application.id,
        buildAwardPayloadFromApplication(application, lookups, formValues)
      );
      setNotice(`Award created for ${result.application.application_number}.`);
      refreshData();
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : 'Failed to create award.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeSection === 'calendar' || activeSection === 'activities') {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (activeSection === 'applications' && selectedId) {
        await grantsApiClient.updateApplication(selectedId, buildApplicationPayload(formValues));
        setNotice('Application updated.');
      } else if (activeSection === 'applications') {
        await grantsApiClient.createApplication(buildApplicationPayload(formValues));
        setNotice('Application created.');
      } else if (activeSection === 'awards' && selectedId) {
        await grantsApiClient.updateAward(selectedId, buildAwardPayload(formValues, lookups));
        setNotice('Award updated.');
      } else if (activeSection === 'awards') {
        await grantsApiClient.createAward(buildAwardPayload(formValues, lookups));
        setNotice('Award created.');
      } else if (activeSection === 'disbursements' && selectedId) {
        await grantsApiClient.updateDisbursement(selectedId, buildDisbursementPayload(formValues));
        setNotice('Disbursement updated.');
      } else if (activeSection === 'disbursements') {
        await grantsApiClient.createDisbursement(buildDisbursementPayload(formValues));
        setNotice('Disbursement created.');
      } else if (activeSection === 'reports' && selectedId) {
        await grantsApiClient.updateReport(selectedId, buildReportPayload(formValues));
        setNotice('Report updated.');
      } else if (activeSection === 'reports') {
        await grantsApiClient.createReport(buildReportPayload(formValues));
        setNotice('Report created.');
      } else if (activeSection === 'documents' && selectedId) {
        await grantsApiClient.updateDocument(selectedId, buildDocumentPayload(formValues));
        setNotice('Document updated.');
      } else if (activeSection === 'documents') {
        await grantsApiClient.createDocument(buildDocumentPayload(formValues));
        setNotice('Document created.');
      } else if (activeSection === 'funders' && selectedId) {
        await grantsApiClient.updateFunder(selectedId, buildFunderPayload(formValues));
        setNotice('Funder updated.');
      } else if (activeSection === 'funders') {
        await grantsApiClient.createFunder(buildFunderPayload(formValues));
        setNotice('Funder created.');
      } else if (activeSection === 'programs' && selectedId) {
        await grantsApiClient.updateProgram(selectedId, buildProgramPayload(formValues));
        setNotice('Program updated.');
      } else if (activeSection === 'programs') {
        await grantsApiClient.createProgram(buildProgramPayload(formValues));
        setNotice('Program created.');
      } else if (activeSection === 'recipients' && selectedId) {
        await grantsApiClient.updateRecipient(selectedId, buildRecipientPayload(formValues));
        setNotice('Recipient updated.');
      } else if (activeSection === 'recipients') {
        await grantsApiClient.createRecipient(buildRecipientPayload(formValues));
        setNotice('Recipient created.');
      } else if (activeSection === 'funded-programs' && selectedId) {
        await grantsApiClient.updateFundedProgram(selectedId, buildFundedProgramPayload(formValues));
        setNotice('Funded program updated.');
      } else if (activeSection === 'funded-programs') {
        await grantsApiClient.createFundedProgram(buildFundedProgramPayload(formValues));
        setNotice('Funded program created.');
      }

      setSelectedId(null);
      setFormValues(createBlankFormValues(activeSection));
      refreshData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save grant record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId?: string) => {
    const id = recordId ?? selectedId;
    if (!id) {
      return;
    }

    const confirmed = window.confirm(`Delete this ${sectionLabelById(activeSection).toLowerCase()} record?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (activeSection === 'funders') {
        await grantsApiClient.deleteFunder(id);
      } else if (activeSection === 'programs') {
        await grantsApiClient.deleteProgram(id);
      } else if (activeSection === 'recipients') {
        await grantsApiClient.deleteRecipient(id);
      } else if (activeSection === 'funded-programs') {
        await grantsApiClient.deleteFundedProgram(id);
      } else if (activeSection === 'applications') {
        await grantsApiClient.deleteApplication(id);
      } else if (activeSection === 'awards') {
        await grantsApiClient.deleteAward(id);
      } else if (activeSection === 'disbursements') {
        await grantsApiClient.deleteDisbursement(id);
      } else if (activeSection === 'reports') {
        await grantsApiClient.deleteReport(id);
      } else if (activeSection === 'documents') {
        await grantsApiClient.deleteDocument(id);
      }

      setNotice(`${sectionLabelById(activeSection)} deleted.`);
      setSelectedId(null);
      setFormValues(createBlankFormValues(activeSection));
      refreshData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete grant record.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    setError(null);
    try {
      const file = await grantsApiClient.exportGrants(buildListQuery(), format);
      triggerFileDownload(file);
      setNotice(`Exported grants as ${file.filename}.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export grants.');
    } finally {
      setExporting(false);
    }
  };

  return {
    activeSection,
    dueAfterFilter,
    dueBeforeFilter,
    error,
    exporting,
    fiscalYearFilter,
    formValues,
    funderFilter,
    fundedProgramFilter,
    handleAwardApplication,
    handleDeleteRecord,
    handleExport,
    handleFormChange,
    handleNewRecord,
    handleSelectRecord,
    handleSubmit,
    hasActiveFilters,
    jurisdictionFilter,
    limit,
    loading,
    lookups,
    maxAmountFilter,
    minAmountFilter,
    notice,
    pagination,
    programFilter,
    recipientFilter,
    refreshData,
    rows: rows as Array<EditableGrantRecord | GrantCalendarItem | GrantActivityLog>,
    saving,
    searchInput,
    selectedId,
    setPage,
    setPageSize,
    statusFilter,
    summary,
    updateFilter,
    updateStatus,
    clearFilters,
  };
}
