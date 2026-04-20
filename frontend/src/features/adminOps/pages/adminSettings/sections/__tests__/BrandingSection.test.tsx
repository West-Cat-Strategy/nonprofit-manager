import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import BrandingSection from '../BrandingSection';
import { renderWithProviders } from '../../../../../../test/testUtils';

describe('BrandingSection', () => {
  it('renders the branding controls and live preview', () => {
    renderWithProviders(
      <BrandingSection
        branding={{
          appName: 'Nonprofit Manager',
          appIcon: null,
          favicon: null,
          primaryColour: '#2563eb',
          secondaryColour: '#7c3aed',
        }}
        onBrandingChange={vi.fn()}
        onImageUpload={vi.fn()}
        onRemoveIcon={vi.fn()}
        onRemoveFavicon={vi.fn()}
        iconInputRef={{ current: null }}
        faviconInputRef={{ current: null }}
        onSave={vi.fn()}
        isSaving={false}
        saveStatus="idle"
        isDirty={false}
        lastSavedAt={null}
      />
    );

    expect(screen.getByRole('heading', { name: /application branding/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/application name/i)).toHaveValue('Nonprofit Manager');
    expect(screen.getByLabelText(/primary colour value/i)).toHaveValue('#2563eb');
    expect(screen.getByLabelText(/secondary colour value/i)).toHaveValue('#7c3aed');
    expect(screen.getByText(/this preview mirrors the live header chrome/i)).toBeInTheDocument();
    expect(screen.getByText(/no pending changes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
