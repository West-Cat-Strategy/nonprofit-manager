import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FilterBuilder from '../FilterBuilder';
import type { ReportFilter } from '../../types/report';

const mockFields = [
  { field: 'id', label: 'ID', type: 'string' as const },
  { field: 'name', label: 'Name', type: 'string' as const },
  { field: 'age', label: 'Age', type: 'number' as const },
  { field: 'created_at', label: 'Created At', type: 'date' as const },
  { field: 'active', label: 'Active', type: 'boolean' as const },
];

describe('FilterBuilder', () => {
  it('shows a message when no fields are available', () => {
    render(<FilterBuilder availableFields={[]} filters={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/select fields first to add filters/i)).toBeInTheDocument();
  });

  it('adds a new filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FilterBuilder availableFields={mockFields} filters={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add filter/i }));

    expect(onChange).toHaveBeenCalledWith([{ field: 'id', operator: 'eq', value: '' }]);
  });

  it('removes an existing filter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters: ReportFilter[] = [
      { field: 'name', operator: 'like', value: 'John' },
      { field: 'age', operator: 'gt', value: '18' },
    ];

    render(<FilterBuilder availableFields={mockFields} filters={filters} onChange={onChange} />);

    await user.click(screen.getAllByTitle(/remove filter/i)[0]);

    expect(onChange).toHaveBeenCalledWith([{ field: 'age', operator: 'gt', value: '18' }]);
  });

  it('renders the tip and range inputs for supported operators', () => {
    const filters: ReportFilter[] = [
      { field: 'name', operator: 'in', value: 'value1,value2' },
      { field: 'age', operator: 'between', value: ['10', '20'] },
      { field: 'active', operator: 'eq', value: '' },
    ];

    render(<FilterBuilder availableFields={mockFields} filters={filters} onChange={vi.fn()} />);

    expect(screen.getByText(/use comma-separated values for "in list"/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/from/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/to/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'True' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'False' })).toBeInTheDocument();
  });
});
