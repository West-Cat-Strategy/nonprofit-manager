import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { casesApiClient } from '../features/cases/api/casesApiClient';
import { useToast } from '../contexts/useToast';
import type { CaseDocument, UpdateCaseDocumentDTO } from '../types/case';

interface CaseDocumentsProps {
  caseId: string;
  contactId?: string | null;
  onChanged?: () => void;
}

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type || 'unknown'}`;
  }

  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return 'Unsupported file extension.';
  }

  return null;
};

const formatBytes = (value?: number | null): string => {
  if (!value || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const canInlinePreview = (mimeType?: string | null): boolean =>
  Boolean(mimeType && (mimeType === 'application/pdf' || mimeType.startsWith('image/')));

const CaseDocuments = ({ caseId, onChanged }: CaseDocumentsProps) => {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UpdateCaseDocumentDTO>({
    document_name: '',
    document_type: '',
    description: '',
    visible_to_client: false,
  });
  const [uploadDraft, setUploadDraft] = useState<{
    document_name: string;
    document_type: string;
    description: string;
    visible_to_client: boolean;
  }>({
    document_name: '',
    document_type: 'other',
    description: '',
    visible_to_client: false,
  });

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => {
        const aTime = new Date(a.created_at || a.uploaded_at || 0).getTime();
        const bTime = new Date(b.created_at || b.uploaded_at || 0).getTime();
        return bTime - aTime;
      }),
    [documents]
  );

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await casesApiClient.listCaseDocuments(caseId);
      setDocuments(rows || []);
    } catch {
      showError('Failed to load case documents');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Select a file first.');
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    try {
      setSaving(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', uploadDraft.document_type || 'other');
      if (uploadDraft.document_name.trim()) {
        formData.append('document_name', uploadDraft.document_name.trim());
      }
      if (uploadDraft.description.trim()) {
        formData.append('description', uploadDraft.description.trim());
      }
      formData.append('visible_to_client', String(uploadDraft.visible_to_client));

      await casesApiClient.uploadCaseDocument(caseId, formData);
      setUploadDraft({
        document_name: '',
        document_type: 'other',
        description: '',
        visible_to_client: false,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocuments();
      onChanged?.();
      showSuccess('Document uploaded');
    } catch {
      showError('Failed to upload document');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (document: CaseDocument) => {
    setEditingDocumentId(document.id);
    setEditDraft({
      document_name: document.document_name || '',
      document_type: document.document_type || 'other',
      description: document.description || '',
      visible_to_client: Boolean(document.visible_to_client),
    });
  };

  const saveEdit = async (documentId: string) => {
    try {
      setSaving(true);
      await casesApiClient.updateCaseDocument(caseId, documentId, {
        document_name: editDraft.document_name?.trim() || undefined,
        document_type: editDraft.document_type || undefined,
        description: editDraft.description?.trim() || undefined,
        visible_to_client: Boolean(editDraft.visible_to_client),
      });
      setEditingDocumentId(null);
      await loadDocuments();
      onChanged?.();
      showSuccess('Document updated');
    } catch {
      showError('Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    const confirmed = window.confirm('Delete this document?');
    if (!confirmed) return;

    try {
      setSaving(true);
      await casesApiClient.deleteCaseDocument(caseId, documentId);
      await loadDocuments();
      onChanged?.();
      showSuccess('Document deleted');
    } catch {
      showError('Failed to delete document');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = (documentId: string) => {
    const url = casesApiClient.getCaseDocumentDownloadUrl(caseId, documentId, 'inline');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const download = (documentId: string) => {
    const url = casesApiClient.getCaseDocumentDownloadUrl(caseId, documentId, 'attachment');
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-5">
      <h3 className="mb-3 text-lg font-semibold text-app-text">Documents</h3>

      <form onSubmit={handleUpload} className="mb-5 rounded-lg border border-app-border p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-app-text-muted">File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">Title</span>
            <input
              value={uploadDraft.document_name}
              onChange={(event) =>
                setUploadDraft((current) => ({ ...current, document_name: event.target.value }))
              }
              placeholder="Optional title"
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">Type</span>
            <input
              value={uploadDraft.document_type}
              onChange={(event) =>
                setUploadDraft((current) => ({ ...current, document_type: event.target.value }))
              }
              placeholder="report, assessment, consent..."
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-app-text-muted">Description</span>
            <textarea
              value={uploadDraft.description}
              onChange={(event) =>
                setUploadDraft((current) => ({ ...current, description: event.target.value }))
              }
              rows={2}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-app-text-muted">
          <input
            type="checkbox"
            checked={uploadDraft.visible_to_client}
            onChange={(event) =>
              setUploadDraft((current) => ({ ...current, visible_to_client: event.target.checked }))
            }
            className="rounded border-app-input-border"
          />
          Visible to client
        </label>
        {uploadError && <p className="mt-2 text-sm text-red-700">{uploadError}</p>}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-app-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>

      {loading && <p className="text-sm text-app-text-muted">Loading documents...</p>}

      {!loading && sortedDocuments.length === 0 && (
        <div className="rounded-lg border border-app-border bg-app-surface-muted p-8 text-center">
          <p className="text-sm text-app-text-muted">No documents yet.</p>
        </div>
      )}

      {!loading && sortedDocuments.length > 0 && (
        <div className="space-y-3">
          {sortedDocuments.map((doc) => {
            const isEditing = editingDocumentId === doc.id;
            return (
              <div key={doc.id} className="rounded-lg border border-app-border p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editDraft.document_name || ''}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, document_name: event.target.value }))
                      }
                      className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                    />
                    <input
                      value={editDraft.document_type || ''}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, document_type: event.target.value }))
                      }
                      className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editDraft.description || ''}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={2}
                      className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft.visible_to_client)}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            visible_to_client: event.target.checked,
                          }))
                        }
                        className="rounded border-app-input-border"
                      />
                      Visible to client
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded border border-app-input-border px-2 py-1 text-xs"
                        onClick={() => {
                          setEditingDocumentId(null);
                          setEditDraft({
                            document_name: '',
                            document_type: '',
                            description: '',
                            visible_to_client: false,
                          });
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded bg-app-accent px-2 py-1 text-xs font-semibold text-white"
                        disabled={saving}
                        onClick={() => void saveEdit(doc.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-app-text">
                        {doc.document_name || doc.original_filename || 'Document'}
                      </p>
                      <p className="text-xs text-app-text-muted">
                        {doc.original_filename || doc.file_name} · {formatBytes(doc.file_size)}
                      </p>
                      <p className="text-xs text-app-text-muted">
                        {doc.document_type || 'other'} ·{' '}
                        {new Date(doc.created_at || doc.uploaded_at || Date.now()).toLocaleString()}
                      </p>
                      {doc.visible_to_client ? (
                        <span className="mt-1 inline-flex rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Client visible
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          Internal only
                        </span>
                      )}
                      {doc.description && <p className="mt-1 text-sm text-app-text">{doc.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canInlinePreview(doc.mime_type) && (
                        <button
                          type="button"
                          className="rounded border border-app-input-border px-2 py-1 text-xs"
                          onClick={() => openPreview(doc.id)}
                        >
                          Preview
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded border border-app-input-border px-2 py-1 text-xs"
                        onClick={() => download(doc.id)}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="rounded border border-app-input-border px-2 py-1 text-xs"
                        onClick={() => startEdit(doc)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        onClick={() => void deleteDocument(doc.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaseDocuments;

