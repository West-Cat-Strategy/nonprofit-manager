/**
 * Template Preview Page
 * Displays a live preview of a template
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const TemplatePreview: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageSlug = searchParams.get('page') || 'home';

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
    return `${baseUrl}/api/templates/${templateId}/preview?page=${encodeURIComponent(pageSlug)}`;
  }, [templateId, pageSlug]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!templateId || !isAuthenticated) {
        setError('Missing template ID or authentication');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const organizationId =
          localStorage.getItem('organizationId') || import.meta.env.VITE_DEFAULT_ORGANIZATION_ID;
        const response = await fetch(previewUrl, {
          credentials: 'include',
          headers: {
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }

        const html = await response.text();
        setPreviewHtml(html);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [templateId, isAuthenticated, previewUrl]);

  const handleClose = () => {
    navigate('/website-builder');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-app-surface-muted flex items-center justify-center">
        <div className="max-w-md w-full bg-app-surface shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-app-text text-center mb-2">Preview Error</h2>
          <p className="text-app-text-muted text-center mb-6">{error}</p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 px-4 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-app-text flex flex-col">
      {/* Header */}
      <div className="bg-app-text border-b border-app-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handleClose}
            className="text-app-text-subtle hover:text-white transition-colors"
            title="Close Preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-white">
            <h1 className="text-lg font-semibold">Template Preview</h1>
            <p className="text-sm text-app-text-subtle">Page: {pageSlug}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-app-text-subtle">Preview Mode</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors"
          >
            Exit Preview
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 bg-app-surface overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
          </div>
        ) : (
          <iframe
            title="Template Preview"
            className="w-full h-full border-0"
            srcDoc={previewHtml}
            // Avoid `allow-same-origin` so preview scripts cannot read app storage/tokens.
            // Removed `allow-popups` to prevent potential popup-based attacks.
            sandbox="allow-scripts"
          />
        )}
      </div>
    </div>
  );
};

export default TemplatePreview;
