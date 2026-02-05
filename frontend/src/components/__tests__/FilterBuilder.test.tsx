import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import FilterBuilder from '../FilterBuilder';
import { renderWithProviders, createTestStore } from '../../test/testUtils';
import type { ReportFilter } from '../../types/report';

// Mock API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Create a test store
// Wrapper component
describe('FilterBuilder', () => {
  const mockOnChange = vi.fn();
  const mockFields = [
    { field: 'id', label: 'ID', type: 'string' },
    { field: 'name', label: 'Name', type: 'string' },
    { field: 'age', label: 'Age', type: 'number' },
    { field: 'created_at', label: 'Created At', type: 'date' },
    { field: 'active', label: 'Active', type: 'boolean' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

const renderFilterBuilder = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return renderWithProviders(component, { store });
};

  it('shows message when no fields are available', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: [], accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={[]} onChange={mockOnChange} />,
      initialState
    );

    expect(screen.getByText(/select fields first to add filters/i)).toBeInTheDocument();
  });

  it('renders add filter button', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={[]} onChange={mockOnChange} />,
      initialState
    );

    expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument();
  });

  it('adds new filter when Add Filter button is clicked', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={[]} onChange={mockOnChange} />,
      initialState
    );

    const addButton = screen.getByRole('button', { name: /add filter/i });
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'id', operator: 'eq', value: '' },
    ]);
  });

  it('renders existing filters', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    const filters: ReportFilter[] = [
      { field: 'name', operator: 'like', value: 'John' },
      { field: 'age', operator: 'gt', value: '18' },
    ];

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={filters} onChange={mockOnChange} />,
      initialState
    );

    // Check that filters are rendered
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('removes filter when remove button is clicked', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    const filters: ReportFilter[] = [
      { field: 'name', operator: 'like', value: 'John' },
      { field: 'age', operator: 'gt', value: '18' },
    ];

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={filters} onChange={mockOnChange} />,
      initialState
    );

    const removeButtons = screen.getAllByTitle(/remove filter/i);
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'age', operator: 'gt', value: '18' },
    ]);
  });

  it('shows tip for In List operator', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    const filters: ReportFilter[] = [
      { field: 'name', operator: 'in', value: 'value1,value2' },
    ];

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={filters} onChange={mockOnChange} />,
      initialState
    );

    expect(screen.getByText(/tip:/i)).toBeInTheDocument();
    expect(screen.getByText(/comma-separated values/i)).toBeInTheDocument();
  });

  it('renders appropriate input for boolean field type', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    const filters: ReportFilter[] = [
      { field: 'active', operator: 'eq', value: '' },
    ];

    renderFilterBuilder(
      <FilterBuilder entity="contacts" filters={filters} onChange={mockOnChange} />,
      initialState
    );

    // Should have a select with True/False options
    const selects = screen.getAllByRole('combobox');
    // At least one select should have "Select..." option for boolean field
    const hasSelectOption = Array.from(selects).some((select) =>
      select.querySelector('option[value=""]')
    );
    expect(hasSelectOption).toBe(true);
  });
});
