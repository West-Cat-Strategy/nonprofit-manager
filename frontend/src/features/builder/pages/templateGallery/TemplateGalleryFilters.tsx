import { templateCategoryOptions, templateStatusOptions, type TemplateGalleryTab } from './options';

type TemplateGalleryFiltersProps = {
  activeTab: TemplateGalleryTab;
  category: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: string) => void;
  searchInput: string;
  status: string;
};

export default function TemplateGalleryFilters({
  activeTab,
  category,
  onCategoryChange,
  onSearchChange,
  onStatusChange,
  searchInput,
  status,
}: TemplateGalleryFiltersProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              aria-label="Search templates"
              placeholder="Search templates..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-lg border border-app-input-border py-2 pl-10 pr-4 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
            />
          </div>
        </div>

        <select
          aria-label="Filter templates by category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="rounded-lg border border-app-input-border px-4 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
        >
          {templateCategoryOptions.map((categoryOption) => (
            <option key={categoryOption.value} value={categoryOption.value}>
              {categoryOption.label}
            </option>
          ))}
        </select>

        {activeTab === 'my-templates' ? (
          <select
            aria-label="Filter templates by status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="rounded-lg border border-app-input-border px-4 py-2 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
          >
            {templateStatusOptions.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
