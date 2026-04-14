import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  deleteContactDocument,
  fetchContactDocuments,
  updateContactDocument,
  uploadContactDocument,
} from '../state';
import { selectContactCasesByContact } from '../state/contactCases';
import type { CreateContactDocumentDTO, DocumentType, ContactDocument } from '../../../types/contact';
import { DOCUMENT_TYPES } from '../../../types/contact';
import api from '../../../services/api';
import { formatDate, formatBytes } from '../../../utils/format';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';

interface ContactDocumentsPanelProps {
  contactId: string;
}

const emptyDocumentDraft = (): CreateContactDocumentDTO => ({
  document_type: 'other',
  title: '',
  description: '',
  case_id: undefined,
  is_portal_visible: false,
});

const ContactDocumentsPanel = ({ contactId }: ContactDocumentsPanelProps) => {
  const dispatch = useAppDispatch();
  const { documents, documentsLoading } = useAppSelector((state) => state.contacts.documents);
  const contactCases = useAppSelector((state) => selectContactCasesByContact(state, contactId));
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState<CreateContactDocumentDTO>(emptyDocumentDraft);
  const [editingDocument, setEditingDocument] = useState<ContactDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchContactDocuments(contactId));
  }, [dispatch, contactId]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setNewDocument((prev) => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
      }));
      setUploadError(null);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setNewDocument(emptyDocumentDraft());

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await dispatch(
        uploadContactDocument({
          contactId,
          file: selectedFile,
          data: newDocument,
        })
      ).unwrap();

      resetUploadForm();
    } catch (error) {
      setUploadError(getErrorMessage(error, 'Failed to upload document'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Document'));
    if (!confirmed) return;

    try {
      await dispatch(deleteContactDocument(documentId)).unwrap();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

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
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleUpdateDocument = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDocument) return;

    try {
      await dispatch(
        updateContactDocument({
          documentId: editingDocument.id,
          data: {
            document_type: editingDocument.document_type,
            title: editingDocument.title || undefined,
            description: editingDocument.description || undefined,
            is_portal_visible: editingDocument.is_portal_visible,
          },
        })
      ).unwrap();
      setEditingDocument(null);
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
    if (mimeType.startsWith('text/')) return '📄';
    return '📎';
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const found = DOCUMENT_TYPES.find((t) => t.value === type);
    return found?.label || 'Other';
  };

  if (documentsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-app-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="rounded-lg bg-app-surface-muted p-4">
        <h3 className="docpanel-sm docpanel-label mb-3 font-medium">Upload Document</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="doc-upload-file" className="docpanel-label mb-1 block text-sm font-medium">
              Select File
            </label>
            <input
              id="doc-upload-file"
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
              className="block w-full text-sm text-app-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-app-accent-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-app-accent-text hover:file:bg-app-accent-soft"
              title="Select a file to upload"
            />
            <p className="docpanel-muted mt-1 text-xs">
              Supported: PDF, Word, Excel, Images, Text (max 10MB)
            </p>
          </div>

          {selectedFile && (
            <>
              <div>
                <label htmlFor="doc-title" className="docpanel-label mb-1 block text-sm font-medium">
                  Title
                </label>
                <input
                  id="doc-title"
                  type="text"
                  value={newDocument.title || ''}
                  onChange={(e) => setNewDocument((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 text-sm focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <div>
                <label htmlFor="doc-type" className="docpanel-label mb-1 block text-sm font-medium">
                  Document Type
                </label>
                <select
                  id="doc-type"
                  value={newDocument.document_type || 'other'}
                  onChange={(e) =>
                    setNewDocument((prev) => ({
                      ...prev,
                      document_type: e.target.value as DocumentType,
                    }))
                  }
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 text-sm focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                  title="Select document type"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {contactCases.length > 0 && (
                <div>
                  <label htmlFor="doc-case" className="docpanel-label mb-1 block text-sm font-medium">
                    Associate with Case (Optional)
                  </label>
                  <select
                    id="doc-case"
                    value={newDocument.case_id || ''}
                    onChange={(e) =>
                      setNewDocument((prev) => ({
                        ...prev,
                        case_id: e.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-app-input-border px-3 py-2 text-sm focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                    title="Select case to associate"
                  >
                    <option value="">No case (profile document)</option>
                    {contactCases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="doc-desc" className="mb-1 block text-sm font-medium text-app-text-label">
                  Description (Optional)
                </label>
                <textarea
                  id="doc-desc"
                  value={newDocument.description || ''}
                  onChange={(e) => setNewDocument((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the document"
                  rows={2}
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 text-sm focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(newDocument.is_portal_visible)}
                  onChange={(e) =>
                    setNewDocument((prev) => ({
                      ...prev,
                      is_portal_visible: e.target.checked,
                    }))
                  }
                  className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                />
                <span className="text-sm text-app-text-muted">Visible in client portal</span>
              </label>
            </>
          )}

          {uploadError && (
            <div className="rounded-lg border border-app-border bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {uploadError}
            </div>
          )}

          {selectedFile && (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
              <button
                type="button"
                onClick={resetUploadForm}
                className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-hover"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted">
          <div className="mb-2 text-4xl">📁</div>
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-app-border bg-app-surface p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getDocumentIcon(doc.mime_type)}</div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium text-app-text">{doc.title || doc.original_name}</h4>
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {getDocumentTypeLabel(doc.document_type)}
                    </span>
                    {doc.is_portal_visible && (
                      <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                        Shared in portal
                      </span>
                    )}
                  </div>

                  <p className="truncate text-sm text-app-text-muted">{doc.original_name}</p>

                  <div className="mt-1 flex items-center gap-3 text-xs text-app-text-subtle">
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.created_by_first_name && (
                      <>
                        <span>•</span>
                        <span>
                          by {doc.created_by_first_name} {doc.created_by_last_name}
                        </span>
                      </>
                    )}
                  </div>

                  {doc.case_id && doc.case_number && (
                    <div className="mt-2">
                      <Link
                        to={`/cases/${doc.case_id}`}
                        className="inline-flex items-center gap-1 text-xs text-app-accent hover:text-app-accent-hover"
                      >
                        <span>📁</span>
                        <span>
                          {doc.case_number}: {doc.case_title}
                        </span>
                      </Link>
                    </div>
                  )}

                  {doc.description && <p className="mt-2 text-sm text-app-text-muted">{doc.description}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded-lg p-2 text-app-accent transition hover:bg-app-accent-soft"
                    title="Download"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingDocument(doc)}
                    className="rounded-lg p-2 text-app-text-muted transition hover:bg-app-surface-muted"
                    title="Edit"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg p-2 text-app-accent transition hover:bg-app-accent-soft"
                    title="Delete"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingDocument && (
        <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-md rounded-lg bg-app-surface p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Edit Document</h3>
            <form onSubmit={handleUpdateDocument} className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="mb-1 block text-sm font-medium text-app-text-label">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editingDocument.title || ''}
                  onChange={(e) =>
                    setEditingDocument((prev) => (prev ? { ...prev, title: e.target.value } : null))
                  }
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <div>
                <label htmlFor="edit-type" className="mb-1 block text-sm font-medium text-app-text-label">
                  Document Type
                </label>
                <select
                  id="edit-type"
                  value={editingDocument.document_type}
                  onChange={(e) =>
                    setEditingDocument((prev) =>
                      prev ? { ...prev, document_type: e.target.value as DocumentType } : null
                    )
                  }
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                  title="Select document type"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-desc" className="mb-1 block text-sm font-medium text-app-text-label">
                  Description
                </label>
                <textarea
                  id="edit-desc"
                  value={editingDocument.description || ''}
                  onChange={(e) =>
                    setEditingDocument((prev) => (prev ? { ...prev, description: e.target.value } : null))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingDocument.is_portal_visible}
                  onChange={(e) =>
                    setEditingDocument((prev) =>
                      prev ? { ...prev, is_portal_visible: e.target.checked } : null
                    )
                  }
                  className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                />
                <span className="text-sm text-app-text-muted">Visible in client portal</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDocument(null)}
                  className="rounded-lg bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-hover"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactDocumentsPanel;
