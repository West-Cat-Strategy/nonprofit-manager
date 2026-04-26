import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PagePropertyEditor from '../PagePropertyEditor';
import type { TemplatePage } from '../../../../../../types/websiteBuilder';

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

describe('PagePropertyEditor', () => {
  it('surfaces publish and preview actions and sends the current draft to publish', () => {
    const onUpdatePage = vi.fn();
    const onPublishPage = vi.fn();

    render(
      <PagePropertyEditor
        currentPage={currentPage}
        onUpdatePage={onUpdatePage}
        onPublishPage={onPublishPage}
        previewHref="https://preview.example.org"
        canPublish
      />
    );

    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'href',
      'https://preview.example.org'
    );
    expect(screen.getByText(/collection pages reuse the builder layout/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Page Name'), {
      target: { value: 'About' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'about-us' },
    });
    fireEvent.blur(screen.getByLabelText('Slug'));

    expect(onUpdatePage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'About',
        slug: 'about-us',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(onPublishPage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'About',
        slug: 'about-us',
        pageType: 'static',
        routePattern: '/',
        isHomepage: true,
      })
    );
  });

  it('disables publish and preview when publishing context is unavailable', () => {
    render(
      <PagePropertyEditor
        currentPage={currentPage}
        onUpdatePage={vi.fn()}
        canPublish={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
  });
});
