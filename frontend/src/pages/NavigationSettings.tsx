/**
 * Navigation Settings Page
 * Allows users to enable or disable navigation menu items
 */

import { Link } from 'react-router-dom';
import { useNavigationPreferences } from '../hooks/useNavigationPreferences';

export default function NavigationSettings() {
  const { allItems, toggleItem, resetToDefaults } = useNavigationPreferences();

  const enabledCount = allItems.filter((item) => item.enabled).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link to="/settings/api" className="hover:text-gray-700">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Navigation</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Navigation Settings</h1>
          <p className="mt-2 text-gray-600">
            Choose which modules appear in your navigation menu. Disabled modules are still
            accessible via direct URL.
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Navigation Menu Items</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {enabledCount} of {allItems.length} modules enabled
                </p>
              </div>
              <button
                onClick={resetToDefaults}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Items List */}
          <ul className="divide-y divide-gray-200">
            {allItems.map((item) => (
              <li
                key={item.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  item.isCore ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.isCore && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{item.path}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  {item.isCore ? (
                    <span className="text-sm text-gray-400">Always visible</span>
                  ) : (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleItem(item.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-700">
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Card Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start space-x-3">
              <svg
                className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700">How navigation works:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>
                    The first 4 enabled items appear in the main navigation bar
                  </li>
                  <li>Additional items appear under the "More" dropdown menu</li>
                  <li>Disabled modules can still be accessed via their direct URL</li>
                  <li>Changes are saved automatically and apply immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings Links */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Other Settings</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            <li>
              <Link
                to="/settings/api"
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-900">API & Integrations</span>
                    <p className="text-sm text-gray-500">Manage webhooks and API keys</p>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
