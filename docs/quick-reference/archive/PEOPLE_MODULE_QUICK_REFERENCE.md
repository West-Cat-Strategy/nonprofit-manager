# People Module - Quick Reference & Implementation Guide

**Last Updated:** 2026-04-20

This file is a historical implementation snapshot for the earlier people-module UI package, not the source of truth for the current frontend structure. For active contributor guidance, start with [../README.md](../README.md), [../../../frontend/README.md](../../../frontend/README.md), [../../development/CONVENTIONS.md](../../development/CONVENTIONS.md), and [../../features/FEATURE_MATRIX.md](../../features/FEATURE_MATRIX.md).

## Quick Links

- 📋 **Full Enhancement Plan**: [../../features/archive/PEOPLE_MODULE_ENHANCEMENTS.md](../../features/archive/PEOPLE_MODULE_ENHANCEMENTS.md)
- 📝 **Implementation Summary**: [../../features/archive/PEOPLE_MODULE_IMPLEMENTATION_SUMMARY.md](../../features/archive/PEOPLE_MODULE_IMPLEMENTATION_SUMMARY.md)
- 🔧 **Backend Refactoring Reference**: [../../backend/BACKEND_SERVICE_REFACTORING_GUIDE.md](../../backend/BACKEND_SERVICE_REFACTORING_GUIDE.md)
- 🎨 **Types**: `frontend/src/types/people.ts`

If a current implementation detail disagrees with an example below, trust the active frontend feature ownership and route structure instead of this snapshot.

---

## Components Quick Reference

### 1. PeopleListContainer
Main wrapper for list pages (volunteers, accounts, contacts)

```tsx
import { PeopleListContainer } from '@/components/people';

<PeopleListContainer
  title="Volunteers"
  description="Manage volunteer profiles"
  loading={loading}
  error={error}
  data={volunteers}
  columns={[
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'email', label: 'Email' },
  ]}
  pagination={pagination}
  onPageChange={(page) => dispatch(fetchPage(page))}
  onCreateNew={() => navigate('/volunteers/new')}
  createButtonLabel="New Volunteer"
  selectedRows={selectedIds}
  onSelectRow={(id) => toggleRow(id)}
  onSelectAll={(all) => all ? selectAll(ids) : deselectAll()}
  bulkActions={<BulkActionBar selectedCount={3} actions={actions} />}
  emptyStateTitle="No volunteers found"
  emptyStateAction={{
    label: 'Create First Volunteer',
    onClick: () => navigate('/volunteers/new')
  }}
/>
```

**Available Props**:
- `title` - Page title
- `description` - Optional subtitle
- `data` - Array of items to display
- `columns` - Table column definitions
- `loading` - Show loading spinner
- `error` - Display error message
- `pagination` - Pagination state with onPageChange
- `selectedRows` - Selected row IDs (Set)
- `onSelectRow` - Row checkbox handler
- `onSelectAll` - Select all checkbox handler
- `bulkActions` - Bulk action UI component
- `filters` - Filter UI component
- `emptyStateTitle` - Title when no data
- `emptyStateAction` - Action button for empty state

---

### 2. PeopleDetailContainer
Wrapper for detail/show pages

```tsx
import { PeopleDetailContainer } from '@/components/people';

<PeopleDetailContainer
  title={`${volunteer.first_name} ${volunteer.last_name}`}
  subtitle="Volunteer since Jan 2023 • 150 hours"
  breadcrumb={[
    { label: 'Volunteers', path: '/volunteers' },
    { label: volunteer.first_name }
  ]}
  metadata={[
    { label: 'Email', value: volunteer.email },
    { label: 'Phone', value: volunteer.phone },
    { label: 'Status', value: <BadgeComponent /> },
    { label: 'Hours', value: '150' }
  ]}
  tabs={[
    {
      id: 'info',
      label: 'Information',
      content: <InfoTab />
    },
    {
      id: 'assignments',
      label: 'Assignments',
      badge: 5,
      content: <AssignmentsTab />
    }
  ]}
  onEdit={() => navigate('./edit')}
  onDelete={() => handleDelete()}
/>
```

**Available Props**:
- `title` - Main heading
- `subtitle` - Secondary text (status, dates)
- `breadcrumb` - Navigation breadcrumbs
- `metadata` - Quick stats/info cards
- `tabs` - Tab configuration
- `defaultTab` - Initial tab id
- `loading` - Loading state
- `error` - Error message
- `onEdit` - Edit button handler
- `onDelete` - Delete button handler

---

### 3. FilterPanel
Advanced filtering UI

```tsx
import { FilterPanel } from '@/components/people';

<FilterPanel
  fields={[
    {
      id: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Name or email...',
      value: searchInput
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      value: statusFilter,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      id: 'skills',
      label: 'Skills',
      type: 'multi-select',
      value: selectedSkills,
      options: skillOptions
    }
  ]}
  onFilterChange={(fieldId, value) => {
    if (fieldId === 'search') setSearch(value);
    else if (fieldId === 'status') setStatus(value);
  }}
  onApply={() => dispatch(applyFilters())}
  onClear={() => dispatch(clearFilters())}
  isCollapsed={filterCollapsed}
  onToggleCollapse={() => setFilterCollapsed(!filterCollapsed)}
  activeFilterCount={3}
/>
```

**Filter Types**:
- `text` - Text input
- `select` - Dropdown
- `date` - Date picker
- `checkbox` - Single toggle
- `multi-select` - Multiple checkboxes
- `date-range` - Date range picker

---

### 4. BulkActionBar
Action buttons for selected items

```tsx
import { BulkActionBar } from '@/components/people';

<BulkActionBar
  selectedCount={5}
  actions={[
    {
      id: 'export',
      label: 'Export',
      icon: <DownloadIcon />,
      onClick: () => handleExport(selectedIds)
    },
    {
      id: 'delete',
      label: 'Delete',
      variant: 'danger',
      icon: <TrashIcon />,
      onClick: () => handleDelete(selectedIds),
      requiresConfirmation: true,
      confirmMessage: 'Delete 5 volunteers?'
    }
  ]}
  onClearSelection={() => clearSelection()}
/>
```

---

### 5. ActivityTimeline
Event/activity history visualization

```tsx
import { ActivityTimeline } from '@/components/people';

<ActivityTimeline
  events={[
    {
      id: '1',
      type: 'created',
      title: 'Volunteer Created',
      user: { name: 'Jane Smith' },
      timestamp: new Date(),
      description: 'Created by Jane Smith'
    },
    {
      id: '2',
      type: 'updated',
      title: 'Profile Updated',
      user: { name: 'Jane Smith' },
      timestamp: new Date(Date.now() - 86400000),
      details: {
        email: { oldValue: 'old@email.com', newValue: 'new@email.com' }
      }
    }
  ]}
  loading={false}
/>
```

**Event Types**:
- `created` - Record created
- `updated` - Record updated
- `deleted` - Record deleted
- `status_changed` - Status changed
- `comment` - Comment added
- `assigned` - Assigned to something
- `field_changed` - Specific field changed

---

### 6. ImportExportModal
CSV import/export interface

```tsx
import { ImportExportModal } from '@/components/people';

const [showModal, setShowModal] = useState(false);

<ImportExportModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  entityType="volunteers"
  sampleData={volunteers}
  onExport={(format) => handleExport(format)} // format: 'csv'
  onImport={async (data) => {
    await dispatch(importVolunteers(data));
  }}
/>
```

---

## Hooks Quick Reference

### 1. useBulkSelect
Manage row selection

```tsx
import { useBulkSelect } from '@/hooks';

const {
  selectedIds,           // Set<string>
  selectedCount,         // number
  isAllSelected,         // boolean
  isSomeSelected,        // boolean
  selectRow,            // (id: string) => void
  deselectRow,          // (id: string) => void
  toggleRow,            // (id: string) => void
  selectAll,            // (ids: string[]) => void
  deselectAll,          // () => void
  toggleAll,            // (ids: string[]) => void
  setSelected,          // (ids: string[]) => void
  getSelected,          // () => string[]
} = useBulkSelect();

// Usage
<input
  type="checkbox"
  checked={selectedIds.has(row.id)}
  onChange={() => toggleRow(row.id)}
/>

// Select all
<input
  type="checkbox"
  checked={isAllSelected}
  onChange={() => toggleAll(allRowIds)}
/>
```

---

### 2. useImportExport
Handle CSV operations

```tsx
import { useImportExport } from '@/hooks';

const {
  exportToCSV,      // <T>(data: T[], columns: (keyof T)[], options) => void
  importFromCSV,    // (file: File) => Promise<Record[]>
  parseCSVContent,  // (content: string) => Record[]
  isLoading,        // boolean
  error,            // string | null
} = useImportExport();

// Export
<button onClick={() => {
  exportToCSV(volunteers, ['first_name', 'last_name', 'email'], {
    filename: 'volunteers',
    includeHeaders: true
  });
}}>
  Download CSV
</button>

// Import
<input
  type="file"
  accept=".csv"
  onChange={async (e) => {
    const data = await importFromCSV(e.target.files[0]);
    await dispatch(bulkImport(data));
  }}
/>
```

---

### 3. Feature-Owned Filtering State
Manage list filters inside the owning page or feature-owned page hook

```tsx
const [searchInput, setSearchInput] = useState(searchParams.get('search') || filters.search || '');
const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');

const handleFilterChange = (filterId: string, value: string | string[]) => {
  if (filterId === 'search' && typeof value === 'string') {
    setSearchInput(value);
  } else if (filterId === 'status' && typeof value === 'string') {
    setStatusFilter(value === 'inactive' ? 'inactive' : 'active');
  }
};

const handleApplyFilters = () => {
  dispatch(setFilters({ search: searchInput, is_active: statusFilter === 'active' }));
};

const handleClearFilters = () => {
  setSearchInput('');
  setStatusFilter('active');
  dispatch(clearFilters());
};

<FilterPanel
  fields={fields}
  onFilterChange={handleFilterChange}
  onApply={handleApplyFilters}
  onClear={handleClearFilters}
  activeFilterCount={searchInput ? 1 : 0}
/>
```

Canonical implementations keep filter state close to the route and persistence layer:
- `frontend/src/features/volunteers/pages/VolunteerListPage.tsx`
- `frontend/src/features/accounts/pages/AccountListPage.tsx`
- `frontend/src/features/contacts/hooks/useContactListPage.tsx`
- `frontend/src/utils/persistedFilters.ts`

---

## Form Components Quick Reference

### BrutalFormInput
```tsx
import { BrutalFormInput } from '@/components/neo-brutalist';

<BrutalFormInput
  label="Email"
  type="email"
  required
  error={errors.email}
  hint="We'll never share your email"
  placeholder="your@email.com"
  icon={<EnvelopeIcon />}
/>
```

### BrutalFormSelect
```tsx
import { BrutalFormSelect } from '@/components/neo-brutalist';

<BrutalFormSelect
  label="Role"
  required
  error={errors.role}
  options={[
    { value: 'admin', label: 'Administrator' },
    { value: 'volunteer', label: 'Volunteer' }
  ]}
/>
```

### BrutalFormTextarea
```tsx
import { BrutalFormTextarea } from '@/components/neo-brutalist';

<BrutalFormTextarea
  label="Biography"
  hint="Tell us about yourself"
  charLimit={500}
  error={errors.bio}
/>
```

### BrutalFormCheckbox
```tsx
import { BrutalFormCheckbox } from '@/components/neo-brutalist';

<BrutalFormCheckbox
  label="I agree to the terms"
  required
  error={errors.agree}
/>
```

### BrutalMultiSelect
```tsx
import { BrutalMultiSelect } from '@/components/neo-brutalist';

<BrutalMultiSelect
  label="Skills"
  value={selectedSkills}
  onChange={setSelectedSkills}
  options={[
    { value: 'teaching', label: 'Teaching' },
    { value: 'coding', label: 'Coding' }
  ]}
  placeholder="Select skills..."
/>
```

---

## Complete Example: Refactored Volunteer List

See: `frontend/src/features/volunteers/pages/VolunteerListPage.tsx`

This file demonstrates:
- ✅ Using PeopleListContainer
- ✅ Implementing advanced filters
- ✅ Bulk selection and operations
- ✅ Redux integration
- ✅ Import/export modal
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

---

## Common Patterns

### Pattern 1: Complete List Page
```tsx
export const MyListPage = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error, pagination, filters } = useAppSelector(...);
  const { selectedIds, toggleRow, selectAll, deselectAll } = useBulkSelect();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  return (
    <PeopleListContainer {...listProps}>
      <FilterPanel {...filterProps} />
      <BulkActionBar {...bulkProps} />
    </PeopleListContainer>
  );
};
```

### Pattern 2: Detail Page with Tabs
```tsx
export const MyDetailPage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('info');

  return (
    <PeopleDetailContainer
      title={item.name}
      tabs={[
        { id: 'info', label: 'Info', content: <InfoTab /> },
        { id: 'history', label: 'History', content: <TimelineTab /> }
      ]}
      defaultTab={activeTab}
    />
  );
};
```

### Pattern 3: Form with Validation
```tsx
export const MyForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (validationErrors.length === 0) {
      dispatch(submitForm(formData));
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <BrutalFormInput
        label="Name"
        error={errors.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <BrutalFormSelect
        label="Status"
        error={errors.status}
        onChange={(e) => setFormData({...formData, status: e.target.value})}
      />
    </form>
  );
};
```

---

## Type Definitions

See `frontend/src/types/people.ts` for:
- Filter types
- Activity event types
- Volunteer/Account/Contact types
- Bulk operation types
- Validation types
- And more...

Example:
```tsx
import type { 
  FilterField, 
  ActivityEvent, 
  BulkAction 
} from '@/types/people';

const filters: FilterField[] = [...]
const events: ActivityEvent[] = [...]
const actions: BulkAction[] = [...]
```

---

## Styling & Customization

All components use the existing Tailwind CSS setup with neo-brutalist styling:
- Bold fonts (font-bold)
- Thick borders (border-2)
- High contrast (gray-900 on white)
- Monospace for data (font-mono)

Customize by modifying component className props:
```tsx
<BrutalCard className="p-8 bg-blue-50">
  Content
</BrutalCard>
```

---

## Performance Tips

1. **Large Lists**: Memoize components with React.memo
2. **Bulk Ops**: Show progress for operations > 100 items
3. **Filters**: Debounce search input
4. **Export**: Stream large CSV exports
5. **Selection**: Use Set instead of Array for O(1) lookups

---

## Testing Examples

```tsx
// Test useBulkSelect
it('toggles row selection', () => {
  const { result } = renderHook(() => useBulkSelect());
  act(() => result.current.toggleRow('1'));
  expect(result.current.selectedIds.has('1')).toBe(true);
});

// Test PeopleListContainer
it('renders data in table', () => {
  render(
    <PeopleListContainer
      data={[{ id: '1', name: 'John' }]}
      columns={[{ key: 'name', label: 'Name' }]}
    />
  );
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Issue: useBulkSelect not updating
- Ensure you're using `toggleRow()` not direct Set mutation
- Use fresh Set reference in state

### Issue: FilterPanel not applying filters
- Ensure `onApply()` calls dispatch(setFilters())
- Check filter field IDs match reducer action keys

### Issue: CSV export not triggering download
- Check browser console for errors
- Ensure data array is not empty
- Verify columns exist in data objects

---

## Resources

- **Component Source**: `frontend/src/components/people/`
- **Hooks Source**: `frontend/src/hooks/`
- **Form Components**: `frontend/src/components/neo-brutalist/`
- **Types**: `frontend/src/types/people.ts`
- **Example**: `frontend/src/features/volunteers/pages/VolunteerListPage.tsx`

---

## Next Steps

1. Review example implementation
2. Replace existing pages with new containers
3. Update Redux slices if needed
4. Implement backend refactoring
5. Add tests for new components
6. Deploy to staging for testing

---

*Last Updated: February 14, 2026*
