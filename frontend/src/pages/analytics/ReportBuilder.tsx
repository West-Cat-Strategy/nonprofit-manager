import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { generateReport } from '../../store/slices/reportsSlice';
import { createSavedReport, fetchSavedReportById } from '../../store/slices/savedReportsSlice';
import FieldSelector from '../../components/FieldSelector';
import FilterBuilder from '../../components/FilterBuilder';
import SortBuilder from '../../components/SortBuilder';
import type { ReportEntity, ReportFilter, ReportSort, ReportAggregation, AggregateFunction } from '../../types/report';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import ReportChart from '../../components/ReportChart';
import { useMemo } from 'react';

const ENTITIES: { value: ReportEntity; label: string }[] = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'donations', label: 'Donations' },
  { value: 'events', label: 'Events' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'grants', label: 'Grants' },
  { value: 'programs', label: 'Programs' },
];

function ReportBuilder() {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { currentReport, loading, availableFields } = useAppSelector((state) => state.reports);
  const reportRows = currentReport?.data ?? [];
  const { currentSavedReport } = useAppSelector((state) => state.savedReports);

  const [entity, setEntity] = useState<ReportEntity>('contacts');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorts, setSorts] = useState<ReportSort[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<ReportAggregation[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedReportName, setSavedReportName] = useState('');
  const [savedReportDescription, setSavedReportDescription] = useState('');

  // Visualization state
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [xAxisField, setXAxisField] = useState('');
  const [yAxisField, setYAxisField] = useState('');

  // Load saved report or template if ID is in URL
  useEffect(() => {
    const loadId = searchParams.get('load');
    const templateId = searchParams.get('template');

    if (loadId) {
      dispatch(fetchSavedReportById(loadId));
    } else if (templateId) {
      loadTemplate(templateId);
    }
  }, [searchParams, dispatch]);

  const loadTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/reports/templates/${templateId}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const definition = await response.json();

      setEntity(definition.entity);
      setSelectedFields(definition.fields || []);
      setFilters(definition.filters || []);
      setSorts(definition.sort || []);
      setGroupBy(definition.groupBy || []);
      setAggregations(definition.aggregations || []);
      setSavedReportName(definition.name);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    }
  };

  // When saved report is loaded, populate the form
  useEffect(() => {
    if (currentSavedReport) {
      setEntity(currentSavedReport.entity);
      setSelectedFields(currentSavedReport.report_definition.fields);
      setFilters(currentSavedReport.report_definition.filters || []);
      setSorts(currentSavedReport.report_definition.sort || []);
      setGroupBy(currentSavedReport.report_definition.groupBy || []);
      setAggregations(currentSavedReport.report_definition.aggregations || []);
      setSavedReportName(currentSavedReport.name);
      setSavedReportDescription(currentSavedReport.description || '');
    }
  }, [currentSavedReport]);

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0 && aggregations.length === 0) {
      alert('Please select at least one field or aggregation');
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
        groupBy: groupBy.length > 0 ? groupBy : undefined,
        aggregations: aggregations.length > 0 ? aggregations : undefined,
      })
    );
  };

  const handleExportCSV = () => {
    if (!currentReport || currentReport.data.length === 0) {
      alert('No report data to export');
      return;
    }

    const allHeaders = [...groupBy, ...selectedFields, ...aggregations.map(a => a.alias || `${a.function}_${a.field}`)];
    const headers = allHeaders.join(',');
    const rows = currentReport.data.map((row) =>
      allHeaders.map((field) => {
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

  const handleExportXLSX = async () => {
    const { default: api } = await import('../../services/api');
    try {
      const response = await api.post('/reports/export', {
        definition: {
          name: savedReportName || 'Custom Report',
          entity,
          fields: selectedFields,
          filters,
          sort: sorts,
          groupBy: groupBy.length > 0 ? groupBy : undefined,
          aggregations: aggregations.length > 0 ? aggregations : undefined,
        },
        format: 'xlsx'
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entity}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export to Excel');
    }
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.text(`${entity.toUpperCase()} REPORT`, 14, 15);

    const allHeaders = [...groupBy, ...selectedFields, ...aggregations.map(a => a.alias || `${a.function}_${a.field}`)];
    const body = currentReport?.data.map(row => allHeaders.map(h => String(row[h] ?? ''))) || [];

    autoTable(doc, {
      head: [allHeaders.map(h => h.replace(/_/g, ' ').toUpperCase())],
      body: body,
      startY: 20,
    });

    doc.save(`${entity}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSaveReport = async () => {
    if (!savedReportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    if (selectedFields.length === 0 && aggregations.length === 0) {
      alert('Please select at least one field or aggregation before saving');
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
          groupBy: groupBy.length > 0 ? groupBy : undefined,
          aggregations: aggregations.length > 0 ? aggregations : undefined,
        },
      })
    );

    setShowSaveDialog(false);
    setSavedReportName('');
    setSavedReportDescription('');
    alert('Report saved successfully!');
  };

  const fieldLabelMap = useMemo(() => (availableFields[entity] || []).reduce<Record<string, string>>(
    (acc, field) => {
      acc[field.field] = field.label;
      return acc;
    },
    {}
  ), [availableFields, entity]);

  const handleEntityChange = (newEntity: ReportEntity) => {
    setEntity(newEntity);
    setSelectedFields([]);
    setFilters([]);
    setSorts([]);
    setGroupBy([]);
    setAggregations([]);
    setShowChart(false);
  };

  return (
    <NeoBrutalistLayout pageTitle="REPORTS">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[var(--app-text)]">Report Builder</h1>
          <p className="mt-2 text-[var(--app-text-muted)]">
            Create custom reports by selecting entity, fields, filters, and sorting options
          </p>
        </div>

        {/* Entity Selector */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">1. Select Entity</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ENTITIES.map((ent) => (
              <button
                key={ent.value}
                onClick={() => handleEntityChange(ent.value)}
                className={`px-4 py-3 border-2 border-[var(--app-border)] font-bold transition-all shadow-[2px_2px_0px_0px_var(--shadow-color)] ${entity === ent.value
                  ? 'bg-[var(--loop-yellow)] text-black'
                  : 'bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
                  }`}
              >
                {ent.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field Selector */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">2. Select Fields</h2>
          <FieldSelector
            entity={entity}
            selectedFields={selectedFields}
            onChange={setSelectedFields}
          />
        </div>

        {/* Group By (Optional) */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">3. Group By (Optional)</h2>
          <div className="flex flex-wrap gap-3">
            {(availableFields[entity] || []).filter(f => f.type === 'string' || f.type === 'date').map(field => {
              const isActive = groupBy.includes(field.field);
              return (
                <button
                  key={field.field}
                  onClick={() => {
                    if (isActive) setGroupBy(groupBy.filter(g => g !== field.field));
                    else setGroupBy([...groupBy, field.field]);
                  }}
                  className={`px-4 py-2 border-2 border-[var(--app-border)] font-bold transition-all shadow-[2px_2px_0px_0px_var(--shadow-color)] ${isActive ? 'bg-[var(--loop-blue)] text-black' : 'bg-[var(--app-surface)] text-[var(--app-text)]'
                    }`}
                >
                  {field.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aggregations (Optional) */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">4. Aggregations (Optional)</h2>
          <div className="space-y-4">
            {(availableFields[entity] || []).filter(f => ['number', 'currency'].includes(f.type)).map(field => (
              <div key={field.field} className="flex items-center gap-4">
                <span className="font-bold uppercase w-32">{field.label}:</span>
                <div className="flex gap-2">
                  {(['sum', 'avg', 'count', 'min', 'max'] as AggregateFunction[]).map(func => {
                    const isActive = aggregations.some(a => a.field === field.field && a.function === func);
                    return (
                      <button
                        key={func}
                        onClick={() => {
                          if (isActive) {
                            setAggregations(aggregations.filter(a => !(a.field === field.field && a.function === func)));
                          } else {
                            setAggregations([...aggregations, { field: field.field, function: func }]);
                          }
                        }}
                        className={`px-3 py-1 border-2 border-[var(--app-border)] font-bold text-xs uppercase transition-all shadow-[1px_1px_0px_0px_var(--shadow-color)] ${isActive ? 'bg-[var(--loop-green)] text-black' : 'bg-[var(--app-surface)] text-[var(--app-text)]'
                          }`}
                      >
                        {func}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Builder */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">5. Add Filters (Optional)</h2>
          <FilterBuilder entity={entity} filters={filters} onChange={setFilters} />
        </div>

        {/* Sort Builder */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">6. Add Sorting (Optional)</h2>
          <SortBuilder
            entity={entity}
            selectedFields={[...groupBy, ...selectedFields]}
            sorts={sorts}
            onChange={setSorts}
          />
        </div>

        {/* Actions */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">7. Generate & Export</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGenerateReport}
              disabled={loading || (selectedFields.length === 0 && aggregations.length === 0)}
              className="px-6 py-3 bg-[var(--loop-blue)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedFields.length === 0 && aggregations.length === 0}
              className="px-6 py-3 bg-[var(--loop-yellow)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
            >
              Save Definition
            </button>
            {reportRows.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="px-6 py-3 bg-[var(--loop-green)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleExportXLSX}
                  className="px-6 py-3 bg-[var(--loop-green)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Export Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-6 py-3 bg-[var(--loop-purple)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => setShowChart(!showChart)}
                  className={`px-6 py-3 text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${showChart ? 'bg-[var(--loop-red)]' : 'bg-[var(--loop-yellow)]'}`}
                >
                  {showChart ? 'Hide Chart' : 'Show Chart'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Visualization Settings */}
        {showChart && reportRows.length > 0 && (
          <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6 mb-6">
            <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">Visualization Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="w-full border-2 border-black p-2 font-bold bg-white"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">X-Axis (Label)</label>
                <select
                  value={xAxisField}
                  onChange={(e) => setXAxisField(e.target.value)}
                  className="w-full border-2 border-black p-2 font-bold bg-white"
                >
                  <option value="">Select Field</option>
                  {[...groupBy, ...selectedFields].map(f => (
                    <option key={f} value={f}>{f.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Y-Axis (Value)</label>
                <select
                  value={yAxisField}
                  onChange={(e) => setYAxisField(e.target.value)}
                  className="w-full border-2 border-black p-2 font-bold bg-white"
                >
                  <option value="">Select Field</option>
                  {[...selectedFields, ...aggregations.map(a => a.alias || `${a.function}_${a.field}`)].map(f => (
                    <option key={f} value={f}>{f.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {xAxisField && yAxisField && (
              <div className="mt-8">
                <ReportChart
                  data={reportRows}
                  chartType={chartType}
                  xAxisField={xAxisField}
                  yAxisField={yAxisField}
                  title={`${entity.toUpperCase()} VISUALIZATION`}
                />
              </div>
            )}
          </div>
        )}

        {/* Report Preview */}
        {reportRows.length > 0 && (
          <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
            <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">Data Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-2 border-black">
                <thead className="bg-[var(--app-surface-muted)]">
                  <tr>
                    {[...groupBy, ...selectedFields, ...aggregations.map(a => a.alias || `${a.function}_${a.field}`)].map((field) => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-2 border-black"
                      >
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--app-surface)]">
                  {reportRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="border-b-2 border-black hover:bg-gray-50">
                      {[...groupBy, ...selectedFields, ...aggregations.map(a => a.alias || `${a.function}_${a.field}`)].map((field) => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-r-2 border-black">
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
            {reportRows.length > 50 && (
              <p className="mt-4 text-sm font-bold text-[var(--app-text-muted)] uppercase italic">
                Showing first 50 of {reportRows.length} records. Export to view all
                data.
              </p>
            )}
          </div>
        )}

        {currentReport && reportRows.length === 0 && (
          <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
            <p className="font-bold uppercase text-[var(--app-text-muted)]">No data found matching your criteria.</p>
          </div>
        )}

        {/* Save Report Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--app-surface)] border-4 border-black shadow-[12px_12px_0px_0px_var(--shadow-color)] p-8 w-full max-w-md">
              <h3 className="text-2xl font-black text-[var(--app-text)] mb-6 uppercase italic">Save Report Definition</h3>

              <div className="mb-4">
                <label className="block text-sm font-bold text-[var(--app-text)] mb-2 uppercase">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={savedReportName}
                  onChange={(e) => setSavedReportName(e.target.value)}
                  className="block w-full px-3 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--loop-yellow)]"
                  placeholder="e.g., Monthly Donor Report"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-[var(--app-text)] mb-2 uppercase">
                  Description (Optional)
                </label>
                <textarea
                  value={savedReportDescription}
                  onChange={(e) => setSavedReportDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--loop-yellow)]"
                  placeholder="Describe what this report is for..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveReport}
                  className="flex-1 px-4 py-3 bg-[var(--loop-blue)] text-black border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSavedReportName('');
                    setSavedReportDescription('');
                  }}
                  className="flex-1 px-4 py-3 bg-[var(--app-surface-muted)] text-[var(--app-text)] border-2 border-[var(--app-border)] shadow-[2px_2px_0px_0px_var(--shadow-color)] font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}

export default ReportBuilder;
