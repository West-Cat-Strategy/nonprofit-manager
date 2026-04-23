import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  PageComponent,
  PageSection,
  TemplatePage,
} from '../../../../types/websiteBuilder';
import { usePageSectionEditing } from '../usePageSectionEditing';

const createTextComponent = (
  id: string,
  overrides: Partial<Record<string, unknown>> = {}
): PageComponent =>
  ({
    id,
    type: 'text',
    content: `Content ${id}`,
    align: 'left',
    ...overrides,
  }) as PageComponent;

const createSection = (
  id: string,
  components: PageComponent[],
  overrides: Partial<PageSection> = {}
): PageSection => ({
  id,
  name: `Section ${id}`,
  components,
  ...overrides,
});

const createPage = (overrides: Partial<TemplatePage> = {}): TemplatePage =>
  ({
    id: 'page-home',
    name: 'Home',
    slug: 'home',
    isHomepage: true,
    pageType: 'static',
    routePattern: '/',
    seo: {
      title: 'Home',
      description: 'Home page',
    },
    sections: [],
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }) as TemplatePage;

const renderSectionEditingHook = ({
  currentPage,
  initialSections,
}: {
  currentPage: TemplatePage | undefined;
  initialSections: PageSection[];
}) =>
  renderHook(
    ({ page, sections }: { page: TemplatePage | undefined; sections: PageSection[] }) => {
      const [historySections, setHistorySections] = useState(sections);

      return {
        ...usePageSectionEditing({
          currentPage: page,
          historySections,
          setHistorySections,
        }),
        historySections,
      };
    },
    {
      initialProps: {
        page: currentPage,
        sections: initialSections,
      },
    }
  );

describe('usePageSectionEditing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks the active drag id, inserts palette components, and selects the new component', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1713820800000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [createSection('section-a', [createTextComponent('component-a')])],
    });

    act(() => {
      result.current.handleDragStart({
        active: { id: 'palette-heading' },
      } as DragStartEvent);
    });

    expect(result.current.activeId).toBe('palette-heading');

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'palette-heading' },
        over: { id: 'section-a' },
      } as DragEndEvent);
    });

    expect(result.current.activeId).toBeNull();
    expect(result.current.historySections[0].components).toHaveLength(2);
    expect(result.current.selectedComponentId).toMatch(/^component-/);
    expect(result.current.selectedComponent).toMatchObject({
      type: 'heading',
      content: 'Heading',
      level: 2,
    });
  });

  it('keeps component selection in sync while updating and deleting components', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [createSection('section-a', [createTextComponent('component-a')])],
    });

    act(() => {
      result.current.setSelectedComponentId('component-a');
    });

    expect(result.current.selectedComponent).toMatchObject({
      id: 'component-a',
      content: 'Content component-a',
    });

    act(() => {
      result.current.handleUpdateComponent('component-a', {
        content: 'Updated copy',
      });
    });

    expect(result.current.historySections[0].components[0]).toMatchObject({
      id: 'component-a',
      content: 'Updated copy',
    });
    expect(result.current.selectedComponent).toMatchObject({
      id: 'component-a',
      content: 'Updated copy',
    });

    act(() => {
      result.current.handleDeleteComponent('component-a');
    });

    expect(result.current.historySections[0].components).toEqual([]);
    expect(result.current.selectedComponentId).toBeNull();
    expect(result.current.selectedComponent).toBeNull();
  });

  it('adds and removes sections but preserves the final remaining section', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1713820801234);

    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [createSection('section-a', [createTextComponent('component-a')])],
    });

    act(() => {
      result.current.handleAddSection();
    });

    expect(result.current.historySections.map((section) => section.id)).toEqual([
      'section-a',
      'section-1713820801234',
    ]);
    expect(result.current.selectedSectionId).toBe('section-1713820801234');

    act(() => {
      result.current.handleDeleteSection('section-1713820801234');
    });

    expect(result.current.historySections.map((section) => section.id)).toEqual(['section-a']);
    expect(result.current.selectedSectionId).toBeNull();

    act(() => {
      result.current.handleDeleteSection('section-a');
    });

    expect(result.current.historySections.map((section) => section.id)).toEqual(['section-a']);
  });

  it('treats editor actions as no-ops until a current page is selected', () => {
    const initialSections = [createSection('section-a', [createTextComponent('component-a')])];
    const { result } = renderSectionEditingHook({
      currentPage: undefined,
      initialSections,
    });

    act(() => {
      result.current.handleUpdateComponent('component-a', {
        content: 'Should not apply',
      });
      result.current.handleAddSection();
      result.current.handleDeleteSection('section-a');
    });

    expect(result.current.historySections).toEqual(initialSections);
    expect(result.current.selectedComponent).toBeNull();
    expect(result.current.selectedSection).toBeNull();
  });
});
