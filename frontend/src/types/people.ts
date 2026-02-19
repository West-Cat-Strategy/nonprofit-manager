/**
 * People Module Type Definitions
 * Shared types and interfaces for the people module (volunteers, accounts, contacts)
 */

// ============================================================================
// Filter Types
// ============================================================================

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'checkbox' | 'multi-select' | 'date-range';
  value?: string | string[];
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  entityType: 'volunteers' | 'accounts' | 'contacts';
  filters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (selectedIds: string[]) => Promise<void> | void;
  disabled?: boolean;
  tooltip?: string;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface ImportExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  columns?: string[];
  delimiter?: string;
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: unknown;
  error: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportValidationError[];
}

// ============================================================================
// Timeline/Activity Types
// ============================================================================

export type ActivityEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'comment'
  | 'assigned'
  | 'unassigned'
  | 'status_updated'
  | 'field_changed';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  timestamp: Date;
  details?: Record<string, {
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  metadata?: unknown;
}

// ============================================================================
// Volunteer Specific Types
// ============================================================================

export type VolunteerAvailabilityStatus = 'available' | 'unavailable' | 'limited';
export type BackgroundCheckStatus =
  | 'not_required'
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface VolunteerFilter {
  search?: string;
  availability_status?: VolunteerAvailabilityStatus;
  background_check_status?: BackgroundCheckStatus;
  skills?: string[];
  minHours?: number;
  maxHours?: number;
  dateRange?: { start: Date; end: Date };
}

export interface VolunteerStats {
  totalVolunteers: number;
  availableCount: number;
  unavailableCount: number;
  limitedCount: number;
  totalHours: number;
  averageHours: number;
  skillsCount: Record<string, number>;
}

// ============================================================================
// Account/Contact Specific Types
// ============================================================================

export type ContactRole = 'staff' | 'volunteer' | 'board' | 'donor';

export interface ContactFilter {
  search?: string;
  role?: ContactRole;
  account_id?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface AccountStats {
  totalAccounts: number;
  activeCount: number;
  contactCount: number;
  typeDistribution: Record<string, number>;
}

// ============================================================================
// List Page Types
// ============================================================================

export interface TableColumn<T = unknown> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface ListPageState {
  data: unknown[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: Record<string, unknown>;
  selectedIds: Set<string>;
}

// ============================================================================
// Detail Page Types
// ============================================================================

export interface DetailTab {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: number | string;
  icon?: React.ReactNode;
}

export interface DetailPageMetadata {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
}

// ============================================================================
// Form Validation Types
// ============================================================================

export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
}

export type FieldValidator = (value: unknown) => string | null;

// ============================================================================
// Search Types
// ============================================================================

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'entity' | 'filter' | 'action';
  icon?: React.ReactNode;
  metadata?: unknown;
}

export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
  executionTime: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Redux Action Payload Types
// ============================================================================

export interface CrudPayloads {
  success: unknown;
  failure: string;
}

export type AsyncThunkState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

// ============================================================================
// Event Handler Types
// ============================================================================

export type OnRowSelect = (id: string, selected: boolean) => void;
export type OnSelectAll = (selected: boolean) => void;
export type OnPageChange = (page: number) => void;
export type OnFilterChange = (filterId: string, value: unknown) => void;
export type OnSort = (column: string, order: 'asc' | 'desc') => void;
export type OnBulkAction = (selectedIds: string[], action: string) => Promise<void>;

// ============================================================================
// Component Props Types
// ============================================================================

export interface ListContainerProps<T = unknown> {
  title: string;
  description?: string;
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  pagination?: PaginationState;
  selectedRows?: Set<string>;
  filters?: React.ReactNode;
  onCreateNew?: () => void;
  onPageChange?: OnPageChange;
  onSelectRow?: OnRowSelect;
  onSelectAll?: OnSelectAll;
  bulkActions?: React.ReactNode;
}

export interface DetailContainerProps {
  title: string;
  subtitle?: string;
  tabs?: DetailTab[];
  metadata?: DetailPageMetadata[];
  loading?: boolean;
  error?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  breadcrumb?: Array<{ label: string; path?: string }>;
}
