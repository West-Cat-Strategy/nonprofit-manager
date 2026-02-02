import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SortBuilder from '../SortBuilder';
import type { ReportSort } from '../../types/report';

describe('SortBuilder', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('shows message when no fields are selected', () => {
    render(
      <SortBuilder
        entity="contacts"
        selectedFields={[]}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/select fields first to add sorting/i)).toBeInTheDocument();
  });

  it('renders add sort button when fields are available', () => {
    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('button', { name: /add sort/i })).toBeInTheDocument();
  });

  it('adds new sort when Add Sort button is clicked', () => {
    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={[]}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add sort/i });
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

    render(
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
      { field: 'email', direction: 'desc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const removeButtons = screen.getAllByTitle(/remove sort/i);
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'email', direction: 'desc' },
    ]);
  });

  it('moves sort up when up arrow is clicked', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const upButtons = screen.getAllByTitle(/move up/i);
    fireEvent.click(upButtons[1]); // Click up on second item

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'email', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
  });

  it('moves sort down when down arrow is clicked', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const downButtons = screen.getAllByTitle(/move down/i);
    fireEvent.click(downButtons[0]); // Click down on first item

    expect(mockOnChange).toHaveBeenCalledWith([
      { field: 'email', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
  });

  it('disables move up button for first item', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const upButtons = screen.getAllByTitle(/move up/i);
    expect(upButtons[0]).toBeDisabled();
  });

  it('disables move down button for last item', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
      { field: 'email', direction: 'desc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    const downButtons = screen.getAllByTitle(/move down/i);
    expect(downButtons[1]).toBeDisabled();
  });

  it('shows sorting order tip when sorts exist', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/sorting order:/i)).toBeInTheDocument();
  });

  it('renders ascending and descending options', () => {
    const sorts: ReportSort[] = [
      { field: 'name', direction: 'asc' },
    ];

    render(
      <SortBuilder
        entity="contacts"
        selectedFields={['name', 'email']}
        sorts={sorts}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/ascending \(a-z, 0-9\)/i)).toBeInTheDocument();
    expect(screen.getByText(/descending \(z-a, 9-0\)/i)).toBeInTheDocument();
  });
});
