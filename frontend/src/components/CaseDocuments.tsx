/**
 * CaseDocuments Component
 * Displays documents linked to a case
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import type { ContactDocument } from '../types/contact';
import { DOCUMENT_TYPES } from '../types/contact';

interface CaseDocumentsProps {
  caseId: string;
  contactId?: string | null;
}

const CaseDocuments = ({ caseId, contactId }: CaseDocumentsProps) => {
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState({
    document_type: 'other',
    title: '',
    description: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases/${caseId}/documents`);
      setDocuments(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadDocuments();
    }
    return () => {
      isMounted = false;
    };
  }, [loadDocuments]);

  const handleDownload = async (doc: ContactDocument) => {
    try {
      const response = await api.get(`/contacts/documents/${doc.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      setUploadError('Contact is required to upload documents.');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('document_type', newDocument.document_type);
      if (newDocument.title.trim()) {
        formData.append('title', newDocument.title.trim());
      }
      if (newDocument.description.trim()) {
        formData.append('description', newDocument.description.trim());
      }

      await api.post(`/contacts/${contactId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNewDocument({ document_type: 'other', title: '', description: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-500 mt-3">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-2">📄</div>
          <p className="text-gray-600">No documents for this case yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <span className="text-sm text-gray-500">{documents.length} total</span>
      </div>

      <form onSubmit={handleUpload} className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="w-full text-sm text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={newDocument.document_type}
              onChange={(e) =>
                setNewDocument((prev) => ({ ...prev, document_type: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={newDocument.title}
              onChange={(e) =>
                setNewDocument((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Optional title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newDocument.description}
              onChange={(e) =>
                setNewDocument((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Optional description"
            />
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
            {uploadError}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {doc.title || doc.original_name}
                  </div>
                  <div className="text-xs text-gray-500">{doc.original_name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                  {doc.document_type?.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CaseDocuments;
