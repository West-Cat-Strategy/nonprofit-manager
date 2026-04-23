import { describe, expect, it } from 'vitest';
import type { PageComponent, PageSection, TemplatePage } from '../../../../types/websiteBuilder';
import {
  applyDragEndToSections,
  buildPageUpdatePayload,
  createPageDraft,
  createSectionDraft,
  deleteComponentFromSections,
  deleteSectionFromSections,
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
      });

      expect(updatedSections[0].components.map((component) => component.id)).toEqual([
        'component-a',
        'component-new',
      ]);
      expect(updatedSections[1].components.map((component) => component.id)).toEqual([
        'component-b',
      ]);
    });

    it('leaves sections unchanged when dragging across different sections', () => {
      const sections = [
        createSection('section-a', [createTextComponent('component-a')]),
        createSection('section-b', [createTextComponent('component-b')]),
      ];

      const updatedSections = applyDragEndToSections({
        sections,
        activeId: 'component-a',
        overId: 'component-b',
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
