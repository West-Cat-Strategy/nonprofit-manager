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

const createDragEndEvent = ({
  activeId,
  overId,
  activeTop,
  overTop,
  activeHeight = 20,
  overHeight = 40,
}: {
  activeId: string;
  overId: string;
  activeTop: number;
  overTop: number;
  activeHeight?: number;
  overHeight?: number;
}): DragEndEvent =>
  ({
    active: {
      id: activeId,
      rect: {
        current: {
          initial: null,
          translated: {
            top: activeTop,
            bottom: activeTop + activeHeight,
            height: activeHeight,
            left: 0,
            right: 100,
            width: 100,
          },
        },
      },
    },
    over: {
      id: overId,
      rect: {
        top: overTop,
        bottom: overTop + overHeight,
        height: overHeight,
        left: 0,
        right: 100,
        width: 100,
      },
    },
  }) as DragEndEvent;

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

  it('uses drag geometry to place palette drops before hovered components', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1713820800000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
      ],
    });

    act(() => {
      result.current.handleDragEnd(
        createDragEndEvent({
          activeId: 'palette-heading',
          overId: 'component-b',
          activeTop: 80,
          overTop: 100,
        })
      );
    });

    expect(result.current.historySections[0].components.map((component) => component.id)).toEqual([
      'component-a',
      expect.stringMatching(/^component-/),
      'component-b',
    ]);
    expect(result.current.selectedComponent).toMatchObject({
      type: 'heading',
      content: 'Heading',
    });
  });

  it('uses drag geometry to place palette drops after hovered components', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1713820800000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
      ],
    });

    act(() => {
      result.current.handleDragEnd(
        createDragEndEvent({
          activeId: 'palette-heading',
          overId: 'component-a',
          activeTop: 140,
          overTop: 100,
        })
      );
    });

    expect(result.current.historySections[0].components.map((component) => component.id)).toEqual([
      'component-a',
      expect.stringMatching(/^component-/),
      'component-b',
    ]);
    expect(result.current.selectedComponentId).toMatch(/^component-/);
  });

  it('keeps selected moved components derivable after cross-section moves', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
      ],
    });

    act(() => {
      result.current.setSelectedComponentId('component-a');
    });

    act(() => {
      result.current.handleDragEnd(
        createDragEndEvent({
          activeId: 'component-a',
          overId: 'component-c',
          activeTop: 140,
          overTop: 100,
        })
      );
    });

    expect(result.current.historySections[0].components).toEqual([]);
    expect(result.current.historySections[1].components.map((component) => component.id)).toEqual([
      'component-b',
      'component-c',
      'component-a',
    ]);
    expect(result.current.selectedComponent).toMatchObject({
      id: 'component-a',
      content: 'Content component-a',
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

  it('duplicates components after the source and anchors selection on the duplicate', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
      ],
    });

    act(() => {
      result.current.setSelectedSectionId('section-a');
    });

    act(() => {
      result.current.handleDuplicateComponent('component-a');
    });

    expect(result.current.historySections[0].components.map((component) => component.id)).toEqual([
      'component-a',
      'component-a-copy',
      'component-b',
    ]);
    expect(result.current.selectedComponentId).toBe('component-a-copy');
    expect(result.current.selectedSectionId).toBeNull();
    expect(result.current.selectedComponent).toMatchObject({
      id: 'component-a-copy',
      content: 'Content component-a',
    });
  });

  it('moves components within their section while keeping selection on the moved item', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
      ],
    });

    act(() => {
      result.current.handleMoveComponent('component-b', 'down');
    });

    expect(result.current.historySections[0].components.map((component) => component.id)).toEqual([
      'component-a',
      'component-c',
      'component-b',
    ]);
    expect(result.current.selectedComponentId).toBe('component-b');
    expect(result.current.selectedComponent).toMatchObject({
      id: 'component-b',
    });
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

  it('duplicates sections after the source and anchors selection on the duplicate', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', []),
      ],
    });

    act(() => {
      result.current.setSelectedComponentId('component-a');
    });

    act(() => {
      result.current.handleDuplicateSection('section-a');
    });

    expect(result.current.historySections.map((section) => section.id)).toEqual([
      'section-a',
      'section-a-copy',
      'section-b',
    ]);
    expect(result.current.historySections[1].components.map((component) => component.id)).toEqual([
      'component-a-copy',
    ]);
    expect(result.current.selectedComponentId).toBeNull();
    expect(result.current.selectedSectionId).toBe('section-a-copy');
    expect(result.current.selectedSection).toMatchObject({
      id: 'section-a-copy',
      name: 'Section section-a Copy',
    });
  });

  it('moves sections while keeping selection on the moved section', () => {
    const { result } = renderSectionEditingHook({
      currentPage: createPage(),
      initialSections: [
        createSection('section-a', []),
        createSection('section-b', []),
        createSection('section-c', []),
      ],
    });

    act(() => {
      result.current.handleMoveSection('section-b', 'down');
    });

    expect(result.current.historySections.map((section) => section.id)).toEqual([
      'section-a',
      'section-c',
      'section-b',
    ]);
    expect(result.current.selectedSectionId).toBe('section-b');
    expect(result.current.selectedSection).toMatchObject({
      id: 'section-b',
    });
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
      result.current.handleDuplicateComponent('component-a');
      result.current.handleMoveComponent('component-a', 'down');
      result.current.handleAddSection();
      result.current.handleDuplicateSection('section-a');
      result.current.handleMoveSection('section-a', 'down');
      result.current.handleDeleteSection('section-a');
    });

    expect(result.current.historySections).toEqual(initialSections);
    expect(result.current.selectedComponent).toBeNull();
    expect(result.current.selectedSection).toBeNull();
  });
});
