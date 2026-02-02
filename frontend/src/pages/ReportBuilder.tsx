import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { generateReport } from '../store/slices/reportsSlice';
import { createSavedReport, fetchSavedReportById } from '../store/slices/savedReportsSlice';
import MainLayout from '../components/MainLayout';
import FieldSelector from '../components/FieldSelector';
import FilterBuilder from '../components/FilterBuilder';
import SortBuilder from '../components/SortBuilder';
import type { ReportEntity, ReportFilter, ReportSort } from '../types/report';

const ENTITIES: { value: ReportEntity; label: string }[] = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'donations', label: 'Donations' },
  { value: 'events', label: 'Events' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'tasks', label: 'Tasks' },
];

function ReportBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { currentReport, loading } = useAppSelector((state) => state.reports);
  const { currentSavedReport } = useAppSelector((state) => state.savedReports);

  const [entity, setEntity] = useState<ReportEntity>('contacts');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorts, setSorts] = useState<ReportSort[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedReportName, setSavedReportName] = useState('');
  const [savedReportDescription, setSavedReportDescription] = useState('');

  // Load saved report if ID is in URL
  useEffect(() => {
    const loadId = searchParams.get('load');
    if (loadId) {
      dispatch(fetchSavedReportById(loadId));
    }
  }, [searchParams, dispatch]);

  // When saved report is loaded, populate the form
  useEffect(() => {
    if (currentSavedReport) {
      setEntity(currentSavedReport.entity);
      setSelectedFields(currentSavedReport.report_definition.fields);
      setFilters(currentSavedReport.report_definition.filters || []);
      setSorts(currentSavedReport.report_definition.sort || []);
      setSavedReportName(currentSavedReport.name);
      setSavedReportDescription(currentSavedReport.description || '');
    }
  }, [currentSavedReport]);

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field');
      return;
    }

    const reportName = `${entity}_report_${new Date().toISOString().split('T')[0]}`;

    await dispatch(
      generateReport({
        name: reportName,
        entity,
        fields: selectedFields,
        filters,
        sort: sorts,
      })
    );
  };

  const handleExportCSV = () => {
    if (!currentReport || currentReport.data.length === 0) {
      alert('No report data to export');
      return;
    }

    // Convert data to CSV
    const headers = selectedFields.join(',');
    const rows = currentReport.data.map((row) =>
      selectedFields.map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${entity}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveReport = async () => {
    if (!savedReportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Please select at least one field before saving');
      return;
    }

    await dispatch(
      createSavedReport({
        name: savedReportName,
        description: savedReportDescription || undefined,
        entity,
        report_definition: {
          name: savedReportName,
          entity,
          fields: selectedFields,
          filters,
          sort: sorts,
        },
      })
    );

    setShowSaveDialog(false);
    setSavedReportName('');
    setSavedReportDescription('');
    alert('Report saved successfully!');
  };

  const handleEntityChange = (newEntity: ReportEntity) => {
    setEntity(newEntity);
    setSelectedFields([]);
    setFilters([]);
    setSorts([]);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Report Builder</h1>
          <p className="mt-2 text-gray-600">
            Create custom reports by selecting entity, fields, filters, and sorting options
          </p>
        </div>

        {/* Entity Selector */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Entity</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ENTITIES.map((ent) => (
              <button
                key={ent.value}
                onClick={() => handleEntityChange(ent.value)}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                  entity === ent.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {ent.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field Selector */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Select Fields</h2>
          <FieldSelector
            entity={entity}
            selectedFields={selectedFields}
            onChange={setSelectedFields}
          />
        </div>

        {/* Filter Builder */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Add Filters (Optional)</h2>
          <FilterBuilder entity={entity} filters={filters} onChange={setFilters} />
        </div>

        {/* Sort Builder */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">4. Add Sorting (Optional)</h2>
          <SortBuilder
            entity={entity}
            selectedFields={selectedFields}
            sorts={sorts}
            onChange={setSorts}
          />
        </div>

        {/* Actions */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">5. Generate & Save Report</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGenerateReport}
              disabled={loading || selectedFields.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedFields.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              Save Report
            </button>
            <button
              onClick={() => navigate('/reports/saved')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              View Saved Reports
            </button>
            {currentReport && currentReport.data.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Export to CSV
              </button>
            )}
          </div>
        </div>

        {/* Report Preview */}
        {currentReport && currentReport.data.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectedFields.map((field) => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentReport.data.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {selectedFields.map((field) => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row[field] !== null && row[field] !== undefined
                            ? String(row[field])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {currentReport.data.length > 10 && (
              <p className="mt-4 text-sm text-gray-600">
                Showing first 10 of {currentReport.data.length} records. Export to CSV to view all
                data.
              </p>
            )}
          </div>
        )}

        {currentReport && currentReport.data.length === 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">No data found matching your criteria.</p>
          </div>
        )}

        {/* Save Report Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Report</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={savedReportName}
                  onChange={(e) => setSavedReportName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Monthly Donor Report"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={savedReportDescription}
                  onChange={(e) => setSavedReportDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what this report is for..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSavedReportName('');
                    setSavedReportDescription('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ReportBuilder;
