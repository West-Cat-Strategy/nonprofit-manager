import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchCaseById,
  fetchCaseNotes,
  updateCaseStatus,
  deleteCase,
  clearCurrentCase,
  fetchCaseStatuses,
} from '../../../store/slices/casesSlice';
import CaseNotes from '../../../components/CaseNotes';
import CaseDocuments from '../../../components/CaseDocuments';
import type { CasePriority } from '../../../types/case';

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentCase, caseStatuses, loading, error } = useAppSelector((state) => state.cases);

  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'documents'>('overview');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatusId, setNewStatusId] = useState('');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchCaseById(id));
      dispatch(fetchCaseNotes(id));
      dispatch(fetchCaseStatuses());
    }

    return () => {
      dispatch(clearCurrentCase());
    };
  }, [dispatch, id]);

  const handleStatusChange = async () => {
    if (!id || !newStatusId) return;

    try {
      await dispatch(
        updateCaseStatus({
          id,
          data: {
            new_status_id: newStatusId,
            notes: statusChangeNotes,
          },
        })
      ).unwrap();

      setIsChangingStatus(false);
      setNewStatusId('');
      setStatusChangeNotes('');
      dispatch(fetchCaseNotes(id)); // Refresh notes to show status change note
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      return;
    }

    try {
      await dispatch(deleteCase(id)).unwrap();
      navigate('/cases');
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  };

  const getPriorityColor = (priority: CasePriority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority];
  };

  if (loading && !currentCase) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Case not found</p>
          <button
            onClick={() => navigate('/cases')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/cases')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{currentCase.case_number}</h1>
              {currentCase.is_urgent && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  ⚠️ Urgent
                </span>
              )}
            </div>
            <h2 className="text-xl text-gray-700">{currentCase.title}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/cases/${id}/edit`)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <span
                className="px-3 py-1 text-sm font-medium rounded-full inline-block"
                style={{
                  backgroundColor: currentCase.status_color || '#e5e7eb',
                  color: '#1f2937',
                }}
              >
                {currentCase.status_name}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Priority</div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full inline-block ${getPriorityColor(
                  currentCase.priority
                )}`}
              >
                {currentCase.priority}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Type</div>
              <span
                className="px-3 py-1 text-sm font-medium rounded-full inline-block"
                style={{
                  backgroundColor: currentCase.case_type_color || '#e5e7eb',
                  color: '#1f2937',
                }}
              >
                {currentCase.case_type_name}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsChangingStatus(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Change Status
          </button>
        </div>
      </div>

      {/* Status Change Modal */}
      {isChangingStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Case Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatusId}
                  onChange={(e) => setNewStatusId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new status...</option>
                  {caseStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason for status change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsChangingStatus(false);
                    setNewStatusId('');
                    setStatusChangeNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!newStatusId || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Notes ({currentCase.notes_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Documents ({currentCase.documents_count || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Case Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Client</dt>
                  <dd className="text-sm text-gray-900">
                    {currentCase.contact_first_name} {currentCase.contact_last_name}
                  </dd>
                </div>
                {currentCase.contact_email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Email</dt>
                    <dd className="text-sm text-gray-900">{currentCase.contact_email}</dd>
                  </div>
                )}
                {currentCase.contact_phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Phone</dt>
                    <dd className="text-sm text-gray-900">{currentCase.contact_phone}</dd>
                  </div>
                )}
                {currentCase.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Description</dt>
                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                      {currentCase.description}
                    </dd>
                  </div>
                )}
                {currentCase.source && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Source</dt>
                    <dd className="text-sm text-gray-900">{currentCase.source}</dd>
                  </div>
                )}
                {currentCase.referral_source && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Referral Source</dt>
                    <dd className="text-sm text-gray-900">{currentCase.referral_source}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Dates and Assignment */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Dates & Assignment</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Intake Date</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(currentCase.intake_date).toLocaleDateString()}
                  </dd>
                </div>
                {currentCase.opened_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Opened Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(currentCase.opened_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {currentCase.due_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Due Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(currentCase.due_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {currentCase.closed_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Closed Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(currentCase.closed_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {currentCase.assigned_first_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Assigned To</dt>
                    <dd className="text-sm text-gray-900">
                      {currentCase.assigned_first_name} {currentCase.assigned_last_name}
                    </dd>
                  </div>
                )}
                {currentCase.tags && currentCase.tags.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600 mb-2">Tags</dt>
                    <dd className="flex flex-wrap gap-2">
                      {currentCase.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && id && <CaseNotes caseId={id} />}

        {/* Documents Tab */}
        {activeTab === 'documents' && id && (
          <CaseDocuments caseId={id} contactId={currentCase.contact_id} />
        )}
      </div>
    </div>
  );
};

export default CaseDetail;
