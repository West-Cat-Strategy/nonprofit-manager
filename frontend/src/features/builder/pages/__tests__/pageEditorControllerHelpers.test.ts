import { describe, expect, it } from 'vitest';
import type { PageComponent, PageSection, TemplatePage } from '../../../../types/websiteBuilder';
import {
  applyDragEndToSections,
  buildPageUpdatePayload,
  createPageDraft,
  createSectionDraft,
  deleteComponentFromSections,
  deleteSectionFromSections,
  duplicateComponentInSections,
  duplicateSectionInSections,
  moveComponentWithinSection,
  moveSectionInSections,
  updateComponentInSections,
  updateSectionInSections,
} from '../pageEditorControllerHelpers';

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
    id: 'page-about',
    name: 'About',
    slug: 'about',
    isHomepage: false,
    pageType: 'static',
    routePattern: '/about',
    seo: {
      title: 'About',
      description: 'About page',
    },
    sections: [],
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }) as TemplatePage;

describe('pageEditorControllerHelpers', () => {
  describe('buildPageUpdatePayload', () => {
    it('normalizes slug input and recomputes the default route when the current route is defaulted', () => {
      const payload = buildPageUpdatePayload(createPage(), {
        name: '  About Us  ',
        slug: '  Mission & Impact  ',
      });

      expect(payload).toEqual({
        name: 'About Us',
        slug: 'mission-impact',
        pageType: 'static',
        collection: undefined,
        routePattern: '/mission-impact',
      });
    });

    it('normalizes explicit route patterns and falls back to current values when trimmed fields become empty', () => {
      const payload = buildPageUpdatePayload(createPage(), {
        name: '   ',
        slug: '   ',
        routePattern: '   ',
      });

      expect(payload).toEqual({
        name: 'About',
        slug: 'about',
        pageType: 'static',
        collection: undefined,
        routePattern: '/',
      });
    });

    it('preserves custom routes when slug changes without an explicit routePattern update', () => {
      const payload = buildPageUpdatePayload(
        createPage({
          routePattern: '/our-story',
        }),
        {
          slug: ' Team ',
        }
      );

      expect(payload).toMatchObject({
        slug: 'team',
        pageType: 'static',
        collection: undefined,
      });
      expect(payload).not.toHaveProperty('routePattern');
    });

    it('defaults collection pages to events and derives the matching default route', () => {
      const payload = buildPageUpdatePayload(createPage(), {
        pageType: 'collectionDetail',
      });

      expect(payload).toEqual({
        pageType: 'collectionDetail',
        collection: 'events',
        routePattern: '/events/:slug',
      });
    });
  });

  describe('createPageDraft', () => {
    it('creates a default static page draft from the current page count', () => {
      const draft = createPageDraft([createPage(), createPage({ id: 'page-home', slug: 'home' })]);

      expect(draft).toEqual({
        name: 'New Page 3',
        slug: 'page-3',
        pageType: 'static',
        routePattern: '/page-3',
        sections: [],
      });
    });

    it('increments the slug suffix until it finds an unused slug', () => {
      const draft = createPageDraft([
        createPage({ id: 'page-home', slug: 'home' }),
        createPage({ id: 'page-4', slug: 'page-4' }),
        createPage({ id: 'page-4-1', slug: 'page-4-1' }),
      ]);

      expect(draft).toEqual({
        name: 'New Page 4',
        slug: 'page-4-2',
        pageType: 'static',
        routePattern: '/page-4-2',
        sections: [],
      });
    });
  });

  describe('applyDragEndToSections', () => {
    it('reorders components inside the same section', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-b',
        overId: 'component-a',
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-b',
        'component-a',
      ]);
    });

    it('reorders components after the hovered component when placement is after', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-a',
        overId: 'component-b',
        placement: 'after',
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-b',
        'component-a',
        'component-c',
      ]);
    });

    it('drops palette components into the section that owns the hovered component wrapper', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [createTextComponent('component-b')]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'palette-heading',
        overId: 'component-component-a',
        paletteComponent: createTextComponent('component-new', {
          type: 'heading',
          content: 'New heading',
          level: 2,
        }),
        placement: 'after',
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-new',
      ]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-b',
      ]);
    });

    it('inserts palette components before a hovered raw component target', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'palette-text',
        overId: 'component-b',
        placement: 'before',
        paletteComponent: createTextComponent('component-new'),
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-new',
        'component-b',
      ]);
    });

    it('moves components before hovered components across sections', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-a',
        overId: 'component-b',
        placement: 'before',
      });

      expect(updatedSections[0].components).toEqual([]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-b',
        'component-c',
      ]);
    });

    it('moves components after hovered components across sections', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-a',
        overId: 'component-b',
        placement: 'after',
      });

      expect(updatedSections[0].components).toEqual([]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-b',
        'component-a',
        'component-c',
      ]);
    });

    it('drops palette components into empty sections', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', []),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'palette-heading',
        overId: 'section-b',
        paletteComponent: createTextComponent('component-new', {
          type: 'heading',
        }),
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-a',
      ]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-new',
      ]);
    });

    it('leaves sections unchanged for unknown drag targets and active components', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [createTextComponent('component-b')]),
      ];

      expect(
        applyDragEndToSections({
          sections,
          activeId: 'component-a',
          overId: 'component-missing',
        })
      ).toEqual(sections);
      expect(
        applyDragEndToSections({
          sections,
          activeId: 'component-missing',
          overId: 'component-b',
        })
      ).toEqual(sections);
      expect(
        applyDragEndToSections({
          sections,
          activeId: 'palette-heading',
          overId: 'component-b',
        })
      ).toEqual(sections);
    });

    it('leaves sections unchanged when dropping a component over itself', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [createTextComponent('component-b')]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-a',
        overId: 'component-a',
      });

      expect(updatedSections).toEqual(sections);
    });
  });

  describe('section and component mutations', () => {
    it('updates a matching component in place across sections', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [createTextComponent('component-b')]),
      ];

      const updatedSections = updateComponentInSections(sections, 'component-b', {
        content: 'Updated copy',
      });

      expect(updatedSections[0].components[0]).toMatchObject({
        id: 'component-a',
        content: 'Content component-a',
      });
      expect(updatedSections[1].components[0]).toMatchObject({
        id: 'component-b',
        content: 'Updated copy',
      });
    });

    it('updates a matching section and preserves the rest', () => {
      const sections = [
        createSection('section-a', [], {
          backgroundColor: '#ffffff',
        }),
        createSection('section-b', []),
      ];

      const updatedSections = updateSectionInSections(sections, 'section-a', {
        hidden: true,
        backgroundColor: '#000000',
      });

      expect(updatedSections[0]).toMatchObject({
        id: 'section-a',
        hidden: true,
        backgroundColor: '#000000',
      });
      expect(updatedSections[1]).toEqual(sections[1]);
    });

    it('duplicates a component after itself and rewrites nested ids', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          {
            id: 'component-form',
            type: 'form',
            submitText: 'Submit',
            submitAction: '',
            successMessage: 'Done',
            errorMessage: 'Try again',
            fields: [
              {
                id: 'field-email',
                name: 'email',
                label: 'Email',
                type: 'email',
              },
            ],
          } as PageComponent,
        ]),
      ];

      const result = duplicateComponentInSections(sections, 'component-form');

      expect(result?.componentId).toBe('component-form-copy');
      expect(result?.sections[0].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-form',
        'component-form-copy',
      ]);
      expect(result?.sections[0].components[2]).toMatchObject({
        id: 'component-form-copy',
        fields: [
          {
            id: 'field-email-copy',
            name: 'email',
          },
        ],
      });
      expect(sections[0].components[1]).toMatchObject({
        id: 'component-form',
        fields: [{ id: 'field-email' }],
      });
    });

    it('keeps non-builder nested domain ids when duplicating a component', () => {
      const sections = [
        createSection('section-a', [
          {
            id: 'component-event',
            type: 'event-registration',
            event: {
              id: 'event-123',
              title: 'Community clinic',
            },
            fields: [{ id: 'field-email', name: 'email' }],
          } as unknown as PageComponent,
        ]),
      ];

      const result = duplicateComponentInSections(sections, 'component-event');

      expect(result?.sections[0].components[1]).toMatchObject({
        id: 'component-event-copy',
        event: {
          id: 'event-123',
        },
        fields: [{ id: 'field-email-copy' }],
      });
    });

    it('duplicates a section after itself and rewrites every nested id', () => {
      const sections = [
        createSection('section-a', [
          {
            id: 'component-columns',
            type: 'columns',
            columns: [
              {
                id: 'column-left',
                width: '1/2',
                components: [createTextComponent('nested-text')],
              },
            ],
          } as PageComponent,
        ]),
        createSection('section-b', []),
      ];

      const result = duplicateSectionInSections(sections, 'section-a');

      expect(result?.sectionId).toBe('section-a-copy');
      expect(result?.sections.map((section) => section.id)).toEqual([
        'section-a',
        'section-a-copy',
        'section-b',
      ]);
      expect(result?.sections[1]).toMatchObject({
        id: 'section-a-copy',
        name: 'Section section-a Copy',
        components: [
          {
            id: 'component-columns-copy',
            columns: [
              {
                id: 'column-left-copy',
                components: [{ id: 'nested-text-copy' }],
              },
            ],
          },
        ],
      });
    });

    it('increments duplicate ids when copy ids already exist', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-a-copy'),
        ]),
      ];

      const result = duplicateComponentInSections(sections, 'component-a');

      expect(result?.componentId).toBe('component-a-copy-2');
      expect(result?.sections[0].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-a-copy-2',
        'component-a-copy',
      ]);
    });

    it('moves components up and down only within their current section', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
          createTextComponent('component-c'),
        ]),
        createSection('section-b', [createTextComponent('component-d')]),
      ];

      expect(
        moveComponentWithinSection(sections, 'component-b', 'up')[0].components.map(
          (component) => component.id
        )
      ).toEqual(['component-b', 'component-a', 'component-c']);
      expect(
        moveComponentWithinSection(sections, 'component-b', 'down')[0].components.map(
          (component) => component.id
        )
      ).toEqual(['component-a', 'component-c', 'component-b']);
      expect(moveComponentWithinSection(sections, 'component-a', 'up')).toBe(sections);
      expect(moveComponentWithinSection(sections, 'component-d', 'down')).toBe(sections);
    });

    it('moves sections up and down while preserving boundary no-ops', () => {
      const sections = [
        createSection('section-a', []),
        createSection('section-b', []),
        createSection('section-c', []),
      ];

      expect(moveSectionInSections(sections, 'section-b', 'up').map((section) => section.id)).toEqual([
        'section-b',
        'section-a',
        'section-c',
      ]);
      expect(
        moveSectionInSections(sections, 'section-b', 'down').map((section) => section.id)
      ).toEqual(['section-a', 'section-c', 'section-b']);
      expect(moveSectionInSections(sections, 'section-a', 'up')).toBe(sections);
      expect(moveSectionInSections(sections, 'section-c', 'down')).toBe(sections);
    });

    it('removes the matching component from every section', () => {
      const sections = [
        createSection('section-a', [
          createTextComponent('component-a'),
          createTextComponent('component-b'),
        ]),
        createSection('section-b', [createTextComponent('component-c')]),
      ];

      const updatedSections = deleteComponentFromSections(sections, 'component-b');

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-a',
      ]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-c',
      ]);
    });

    it('creates numbered section drafts with the current default spacing', () => {
      const draft = createSectionDraft(
        [
          createSection('section-a', []),
          createSection('section-b', []),
        ],
        'section-c'
      );

      expect(draft).toEqual({
        id: 'section-c',
        name: 'Section 3',
        components: [],
        paddingTop: '4rem',
        paddingBottom: '4rem',
      });
    });

    it('does not delete the last remaining section', () => {
      const singleSection = [createSection('section-a', [])];
      const multipleSections = [createSection('section-a', []), createSection('section-b', [])];

      expect(deleteSectionFromSections(singleSection, 'section-a')).toEqual(singleSection);
      expect(deleteSectionFromSections(multipleSections, 'section-a')).toEqual([
        multipleSections[1],
      ]);
    });
  });
});
