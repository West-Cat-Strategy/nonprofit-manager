import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrutalBadge, BrutalButton, BrutalCard, BrutalInput } from '../../../components/neo-brutalist';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchCases,
  fetchCaseTypes,
  fetchCaseStatuses,
  setFilters,
  clearFilters,
} from '../../../store/slices/casesSlice';
import type { CasePriority, CaseStatusType } from '../../../types/case';

const CaseList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { cases, total, loading, error, filters, caseTypes, caseStatuses } = useAppSelector(
    (state) => state.cases
  );

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedPriority, setSelectedPriority] = useState(filters.priority || '');
  const [selectedStatus, setSelectedStatus] = useState(filters.status_id || '');
  const [selectedType, setSelectedType] = useState(filters.case_type_id || '');
  const [showUrgentOnly, setShowUrgentOnly] = useState(filters.is_urgent || false);

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
    dispatch(fetchCases(filters));
  }, [dispatch, filters]);

  const handleSearch = () => {
    dispatch(
      setFilters({
        search: searchTerm,
        priority: selectedPriority || undefined,
        status_id: selectedStatus || undefined,
        case_type_id: selectedType || undefined,
        is_urgent: showUrgentOnly || undefined,
        page: 1,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedPriority('');
    setSelectedStatus('');
    setSelectedType('');
    setShowUrgentOnly(false);
    dispatch(clearFilters());
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const getPriorityBadgeColor = (priority: CasePriority) => {
    const colors: Record<CasePriority, 'gray' | 'blue' | 'yellow' | 'red'> = {
      low: 'gray',
      medium: 'blue',
      high: 'yellow',
      urgent: 'red',
    };
    return colors[priority];
  };

  const getStatusTypeBadgeColor = (statusType: CaseStatusType) => {
    const colors: Record<CaseStatusType, 'purple' | 'green' | 'yellow' | 'gray' | 'red'> = {
      intake: 'purple',
      active: 'green',
      review: 'yellow',
      closed: 'gray',
      cancelled: 'red',
    };
    return colors[statusType];
  };

  const totalPages = Math.ceil(total / (filters.limit || 20));
  const currentPage = filters.page || 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="yellow" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">Cases</h1>
            <p className="mt-1 font-bold text-black">
              {total} {total === 1 ? 'case' : 'cases'} found
            </p>
          </div>
          <BrutalButton onClick={() => navigate('/cases/new')} variant="primary">
            + New Case
          </BrutalButton>
        </div>
      </BrutalCard>

      {/* Filters */}
      <BrutalCard color="white" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <BrutalInput
              type="text"
              placeholder="Search by case number, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Case Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Types</option>
              {caseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Statuses</option>
              {caseStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showUrgentOnly}
              onChange={(e) => setShowUrgentOnly(e.target.checked)}
              className="w-5 h-5 border-2 border-black dark:border-white accent-black dark:accent-white"
            />
            <span className="text-sm font-bold text-black dark:text-white uppercase">
              Urgent only
            </span>
          </label>
          <div className="flex-1" />
          <BrutalButton onClick={handleClearFilters} variant="secondary" size="sm">
            Clear Filters
          </BrutalButton>
          <BrutalButton onClick={handleSearch} variant="primary" size="sm">
            Apply Filters
          </BrutalButton>
        </div>
      </BrutalCard>

      {/* Error Message */}
      {error && (
        <div className="border-2 border-black shadow-[6px_6px_0px_var(--shadow-color)] bg-red-200 text-black p-4 font-bold">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
        </div>
      )}

      {/* Cases Table */}
      {!loading && cases.length > 0 && (
        <BrutalCard color="white" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--loop-cyan)] border-b-2 border-black">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Case #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {cases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    className="border-b-2 border-black hover:bg-[var(--loop-yellow)] cursor-pointer transition-colors"
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {caseItem.is_urgent && (
                          <span className="text-black" title="Urgent">
                            ⚠️
                          </span>
                        )}
                        <span className="text-sm font-black text-black">
                          {caseItem.case_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-black">{caseItem.title}</div>
                      {caseItem.description && (
                        <div className="text-sm text-black/70 truncate max-w-xs">
                          {caseItem.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-black">
                        {caseItem.contact_first_name} {caseItem.contact_last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-block border-2 border-black px-3 py-1 text-xs font-black uppercase"
                        style={{
                          backgroundColor: caseItem.case_type_color || '#e5e7eb',
                          color: '#000000',
                        }}
                      >
                        {caseItem.case_type_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BrutalBadge
                        color={
                          caseItem.status_type
                            ? getStatusTypeBadgeColor(caseItem.status_type)
                            : 'gray'
                        }
                        size="sm"
                      >
                        {caseItem.status_name}
                      </BrutalBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BrutalBadge color={getPriorityBadgeColor(caseItem.priority)} size="sm">
                        {caseItem.priority}
                      </BrutalBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                      {new Date(caseItem.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${caseItem.id}/edit`);
                          }}
                          className="border-2 border-black bg-white text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${caseItem.id}`);
                          }}
                          className="border-2 border-black bg-[var(--loop-green)] text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BrutalCard>
      )}

      {/* Empty State */}
      {!loading && cases.length === 0 && (
        <BrutalCard color="white" className="p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-black uppercase mb-2 text-black">No cases found</h3>
          <p className="text-black/70 font-bold mb-6">
            {filters.search || filters.priority || filters.status_id
              ? 'Try adjusting your filters'
              : 'Get started by creating your first case'}
          </p>
          <div className="flex justify-center">
            <BrutalButton onClick={() => navigate('/cases/new')} variant="primary">
              Create First Case
            </BrutalButton>
          </div>
        </BrutalCard>
      )}

      {/* Pagination */}
      {!loading && cases.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm font-bold text-black">
            Showing {(currentPage - 1) * (filters.limit || 20) + 1} to{' '}
            {Math.min(currentPage * (filters.limit || 20), total)} of {total} cases
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-2 border-black bg-white text-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`border-2 border-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-colors ${
                      currentPage === page
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-2 border-black bg-white text-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseList;
