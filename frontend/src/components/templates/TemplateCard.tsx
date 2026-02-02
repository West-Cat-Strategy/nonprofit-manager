/**
 * Template Card Component
 * Displays a template preview in the gallery
 */

import React from 'react';
import type { TemplateListItem, TemplateCategory } from '../../types/websiteBuilder';

interface TemplateCardProps {
  template: TemplateListItem;
  onSelect: (template: TemplateListItem) => void;
  onPreview?: (template: TemplateListItem) => void;
  onDuplicate?: (template: TemplateListItem) => void;
  onDelete?: (template: TemplateListItem) => void;
  showActions?: boolean;
}

const categoryColors: Record<TemplateCategory, string> = {
  'landing-page': 'bg-blue-100 text-blue-800',
  event: 'bg-purple-100 text-purple-800',
  donation: 'bg-green-100 text-green-800',
  blog: 'bg-yellow-100 text-yellow-800',
  'multi-page': 'bg-indigo-100 text-indigo-800',
  portfolio: 'bg-pink-100 text-pink-800',
  contact: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<TemplateCategory, string> = {
  'landing-page': 'Landing Page',
  event: 'Event',
  donation: 'Donation',
  blog: 'Blog',
  'multi-page': 'Multi-Page',
  portfolio: 'Portfolio',
  contact: 'Contact',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-600',
  archived: 'bg-red-100 text-red-600',
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onPreview,
  onDuplicate,
  onDelete,
  showActions = true,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Thumbnail */}
      <div
        className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative cursor-pointer"
        onClick={() => onSelect(template)}
      >
        {template.thumbnailImage ? (
          <img
            src={template.thumbnailImage}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
        )}

        {/* System template badge */}
        {template.isSystemTemplate && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Starter
          </div>
        )}

        {/* Status badge (only for user templates) */}
        {!template.isSystemTemplate && (
          <div
            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded capitalize ${statusColors[template.status]}`}
          >
            {template.status}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
            onClick={() => onSelect(template)}
            title={template.name}
          >
            {template.name}
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={template.description}>
          {template.description || 'No description'}
        </p>

        {/* Category and page count */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs px-2 py-1 rounded ${categoryColors[template.category]}`}
          >
            {categoryLabels[template.category]}
          </span>
          <span className="text-xs text-gray-500">
            {template.pageCount} {template.pageCount === 1 ? 'page' : 'pages'}
          </span>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => onSelect(template)}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              {template.isSystemTemplate ? 'Use Template' : 'Edit'}
            </button>

            {onPreview && (
              <button
                onClick={() => onPreview(template)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Preview"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            )}

            {onDuplicate && (
              <button
                onClick={() => onDuplicate(template)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Duplicate"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}

            {onDelete && !template.isSystemTemplate && (
              <button
                onClick={() => onDelete(template)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateCard;
