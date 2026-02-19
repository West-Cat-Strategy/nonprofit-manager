import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import SortBuilder from '../SortBuilder';
import type { ReportSort } from '../../types/report';
import { renderWithProviders } from '../../test/testUtils';

describe('SortBuilder', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('shows message when no fields are selected', () => {
    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={[]}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/select fields first/i)).toBeInTheDocument();
  });

  it('renders add sort button when fields are available', () => {
    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/\+ add sorting rule/i)).toBeInTheDocument();
  });

  it('adds new sort when Add Sort button is clicked', () => {
    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByText(/\+ add sorting rule/i);
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'name', direction: 'asc' },
    ]);
  });

  it('renders existing sorts with priority badges', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email', 'phone']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('removes sort when remove button is clicked', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
    ];

    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    // SVG remove button has the correct testid now
    const removeButton = screen.getByTestId('remove-sort-0');
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('moves items correctly', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    // Move second item up (from index 1 to 0)
    const moveUpButton = screen.getByTestId('move-up-1');
    fireEvent.click(moveUpButton);
    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'email', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);

    mockOnChange.mockClear();

    // Move first item down (from index 0 to 1)
    const moveDownButton = screen.getByTestId('move-down-0');
    fireEvent.click(moveDownButton);
    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'email', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
  });


  it('updates sort field when select value changes', () => {
    const sorts: ReportSort[] = [{ field: 'name', direction: 'asc' }];
    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'email' } });

    expect(mockOnChange).toHaveBeenCalledWith([{ field: 'email', direction: 'asc' }]);
  });

  it('updates sort direction when select value changes', () => {
    const sorts: ReportSort[] = [{ field: 'name', direction: 'asc' }];
    renderWithProviders(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'desc' } });

    expect(mockOnChange).toHaveBeenCalledWith([{ field: 'name', direction: 'desc' }]);
  });
});
