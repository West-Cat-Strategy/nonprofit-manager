import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SaveBar from '../SaveBar';

describe('SaveBar', () => {
  it('renders save actions with accent foreground tokens', () => {
    render(
      <SaveBar
        isSaving={false}
        saveStatus="idle"
        isDirty={true}
        lastSavedAt={null}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveClass(
      'text-[var(--app-accent-foreground)]'
    );
  });
});
