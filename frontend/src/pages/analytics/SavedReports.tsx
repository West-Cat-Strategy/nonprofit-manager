import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSavedReports, deleteSavedReport } from '../../store/slices/savedReportsSlice';
import type { SavedReport } from '../../types/savedReport';
import ConfirmDialog from '../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../hooks/useConfirmDialog';

function SavedReports() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { reports, loading, error } = useAppSelector((state) => state.savedReports);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [filterEntity, setFilterEntity] = useState<string>('');

  useEffect(() => {
    dispatch(fetchSavedReports());
  }, [dispatch]);

  const handleLoadReport = (report: SavedReport) => {
    // Navigate to report builder with the saved report ID
    navigate(`/reports/builder?load=${report.id}`);
  };

  const handleDeleteReport = async (id: string, name: string) => {
    const confirmed = await confirm(confirmPresets.delete(`Saved Report "${name}"`));
    if (!confirmed) return;
    await dispatch(deleteSavedReport(id));
  };

  const filteredReports = filterEntity
    ? reports.filter((r) => r.entity === filterEntity)
    : reports;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-app-text">Saved Reports</h1>
          <button
            type="button"
            onClick={() => navigate('/reports/builder')}
            className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
          >
            Create New Report
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-app-surface shadow rounded-lg p-4 mb-6">
          <label htmlFor="filter-entity" className="block text-sm font-medium text-app-text-muted mb-2">
            Filter by Entity
          </label>
          <select
            id="filter-entity"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="block w-full px-3 py-2 border border-app-input-border rounded-md shadow-sm focus:outline-none focus:ring-app-accent focus:border-app-accent"
          >
            <option value="">All Entities</option>
            <option value="accounts">Accounts</option>
            <option value="contacts">Contacts</option>
            <option value="donations">Donations</option>
            <option value="events">Events</option>
            <option value="volunteers">Volunteers</option>
            <option value="tasks">Tasks</option>
          </select>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
            <p className="mt-2 text-app-text-muted">Loading saved reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-app-surface shadow rounded-lg p-12 text-center">
            <p className="text-app-text-muted mb-4">No saved reports found</p>
            <button
              type="button"
              onClick={() => navigate('/reports/builder')}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
            >
              Create Your First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-app-surface shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-app-text flex-1">
                    {report.name}
                  </h3>
                  {report.is_public && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Public
                    </span>
                  )}
                </div>

                {report.description && (
                  <p className="text-sm text-app-text-muted mb-3">{report.description}</p>
                )}

                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-app-surface-muted text-app-text-muted text-sm rounded-full capitalize">
                    {report.entity}
                  </span>
                </div>

                <div className="text-xs text-app-text-muted mb-4">
                  <div>
                    Created: {new Date(report.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    Updated: {new Date(report.updated_at).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    Fields: {report.report_definition.fields.length}
                    {report.report_definition.filters &&
                      report.report_definition.filters.length > 0 &&
                      ` • Filters: ${report.report_definition.filters.length}`}
                    {report.report_definition.sort &&
                      report.report_definition.sort.length > 0 &&
                      ` • Sorting: ${report.report_definition.sort.length}`}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadReport(report)}
                    className="flex-1 px-3 py-2 bg-app-accent text-white text-sm rounded hover:bg-app-accent-hover"
                  >
                    Load & Run
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(report.id, report.name)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

export default SavedReports;
