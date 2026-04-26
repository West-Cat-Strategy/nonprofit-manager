import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditorHeader from '../EditorHeader';
import type { Template, TemplatePage } from '../../../../../types/websiteBuilder';

const template: Template = {
  id: 'template-1',
  userId: 'user-1',
  name: 'Community Template',
  description: 'A better site',
  category: 'landing-page',
  tags: [],
  status: 'draft',
  isSystemTemplate: false,
  theme: {
    colors: {
      primary: '#111111',
      secondary: '#222222',
      accent: '#005fcc',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#111111',
      textMuted: '#666666',
      border: '#d1d5db',
      error: '#b91c1c',
      success: '#15803d',
      warning: '#b45309',
    },
    typography: {
      fontFamily: 'Test Sans',
      headingFontFamily: 'Test Sans',
      baseFontSize: '16px',
      lineHeight: '1.5',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      full: '9999px',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    },
  },
  globalSettings: {
    language: 'en',
    header: { navigation: [] },
    footer: { columns: [] },
  },
  pages: [],
  metadata: {
    version: '1.0.0',
  },
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
};

const currentPage: TemplatePage = {
  id: 'page-1',
  name: 'Home',
  slug: 'home',
  isHomepage: true,
  pageType: 'static',
  routePattern: '/',
  seo: {
    title: 'Home',
    description: 'Homepage',
  },
  sections: [],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
};

describe('EditorHeader', () => {
  it('surfaces navigation, preview, publishing, and keyboard-accessible overflow actions', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onShowPages = vi.fn();
    const onSave = vi.fn();
    const onSaveVersion = vi.fn();
    const onOpenSettings = vi.fn();

    const { rerender } = render(
      <EditorHeader
        template={template}
        currentPage={currentPage}
        viewMode="desktop"
        isSaving={false}
        hasUnsavedChanges={true}
        onViewModeChange={vi.fn()}
        onSave={onSave}
        onSaveVersion={onSaveVersion}
        onBack={onBack}
        onShowPages={onShowPages}
        onOpenSettings={onOpenSettings}
        lastSaved={new Date('2026-03-05T11:55:00.000Z')}
        backLabel="Back to builder"
        contextLabel="Website builder"
        statusLabel="Draft"
        formsLabel="Managed forms: 1/2 live"
        previewHref="/preview/site-1"
        publishingHref="/websites/site-1/publishing"
        followUpHref="/websites/site-1/forms"
        followUpLabel="Open forms workspace"
      />
    );

    expect(screen.getByRole('button', { name: 'Back to builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute('href', '/preview/site-1');
    expect(screen.getByText('Managed forms: 1/2 live')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open forms workspace' })).toHaveAttribute(
      'href',
      '/websites/site-1/forms'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    rerender(
      <EditorHeader
        template={template}
        currentPage={currentPage}
        viewMode="desktop"
        isSaving={false}
        hasUnsavedChanges={false}
        onViewModeChange={vi.fn()}
        onSave={onSave}
        onSaveVersion={onSaveVersion}
        onBack={onBack}
        onShowPages={onShowPages}
        onOpenSettings={onOpenSettings}
        lastSaved={new Date('2026-03-05T11:55:00.000Z')}
        backLabel="Back to builder"
        contextLabel="Website builder"
        statusLabel="Draft"
        formsLabel="Managed forms: 1/2 live"
        previewHref="/preview/site-1"
        publishingHref="/websites/site-1/publishing"
        followUpHref="/websites/site-1/forms"
        followUpLabel="Open forms workspace"
      />
    );

    expect(screen.getByText(/^Saved\s+/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Back to builder' })).toHaveFocus();

    screen.getByRole('button', { name: 'More options' }).focus();
    expect(screen.getByRole('button', { name: 'More options' })).toHaveFocus();

    expect(await screen.findByRole('button', { name: 'Save version' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Template settings' })).toBeInTheDocument();
  });
});
