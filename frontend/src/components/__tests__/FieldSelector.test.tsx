import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FieldSelector from '../FieldSelector';

const mockFields = [
  { field: 'id', label: 'ID', type: 'string' as const },
  { field: 'name', label: 'Name', type: 'string' as const },
  { field: 'email', label: 'Email', type: 'string' as const },
  { field: 'created_at', label: 'Created At', type: 'date' as const },
];

describe('FieldSelector', () => {
  it('renders loading state', () => {
    render(
      <FieldSelector
        availableFields={[]}
        fieldsLoading
        selectedFields={[]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders fields and selected count', () => {
    render(
      <FieldSelector
        availableFields={mockFields}
        selectedFields={['name', 'email']}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 4 fields selected/i)).toBeInTheDocument();
  });

  it('adds and removes individual fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <FieldSelector availableFields={mockFields} selectedFields={[]} onChange={onChange} />
    );

    await user.click(screen.getByLabelText(/name/i));
    expect(onChange).toHaveBeenCalledWith(['name']);

    rerender(
      <FieldSelector
        availableFields={mockFields}
        selectedFields={['name', 'email']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByLabelText(/name/i));
    expect(onChange).toHaveBeenLastCalledWith(['email']);
  });

  it('selects and clears all fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <FieldSelector availableFields={mockFields} selectedFields={[]} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: /select all/i }));
    expect(onChange).toHaveBeenCalledWith(['id', 'name', 'email', 'created_at']);

    rerender(
      <FieldSelector
        availableFields={mockFields}
        selectedFields={['id', 'name', 'email', 'created_at']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows empty state when no fields are available', () => {
    render(<FieldSelector availableFields={[]} selectedFields={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/no fields available for this entity/i)).toBeInTheDocument();
  });
});
