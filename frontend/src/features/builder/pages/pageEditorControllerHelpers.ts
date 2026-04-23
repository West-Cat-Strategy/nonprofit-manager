import type {
  CreatePageRequest,
  PageComponent,
  PageSection,
  TemplatePage,
  UpdatePageRequest,
} from '../../../types/websiteBuilder';
import {
  getDefaultRoutePattern,
  normalizePageSlug,
  normalizeRoutePattern,
} from './pageEditorUtils';

const moveItem = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, item);
  return nextItems;
};

const resolvePaletteDropTargetSectionId = (sections: PageSection[], overId: string): string => {
  let targetSectionId = overId;

  if (overId.startsWith('component-')) {
    for (const section of sections) {
      if (section.components.some((component) => component.id === overId.replace('component-', ''))) {
        targetSectionId = section.id;
        break;
      }
    }
  }

  return targetSectionId;
};

const insertPaletteComponentIntoSections = (
  sections: PageSection[],
  overId: string,
  component: PageComponent
): PageSection[] => {
  const targetSectionId = resolvePaletteDropTargetSectionId(sections, overId);

  return sections.map((section) => {
    if (section.id === targetSectionId || section.id === overId) {
      return {
        ...section,
        components: [...section.components, component],
      };
    }

    return section;
  });
};

const reorderComponentsInSections = (
  sections: PageSection[],
  activeComponentId: string,
  overComponentId: string
): PageSection[] => {
  if (activeComponentId === overComponentId) {
    return sections;
  }

  return sections.map((section) => {
    const oldIndex = section.components.findIndex((component) => component.id === activeComponentId);
    const newIndex = section.components.findIndex((component) => component.id === overComponentId);

    if (oldIndex !== -1 && newIndex !== -1) {
      return {
        ...section,
        components: moveItem(section.components, oldIndex, newIndex),
      };
    }

    return section;
  });
};

export const buildPageUpdatePayload = (
  currentPage: TemplatePage | null | undefined,
  updates: UpdatePageRequest
): UpdatePageRequest => {
  if (!currentPage) {
    return updates;
  }

  const nextSlug =
    updates.slug !== undefined
      ? normalizePageSlug(updates.slug) || currentPage.slug
      : currentPage.slug;
  const nextPageType = updates.pageType || currentPage.pageType || 'static';
  const nextCollection =
    nextPageType === 'static'
      ? undefined
      : updates.collection || currentPage.collection || 'events';
  const nextIsHomepage = updates.isHomepage ?? currentPage.isHomepage;
  const previousDefaultRoute = getDefaultRoutePattern(
    currentPage.pageType || 'static',
    currentPage.collection,
    currentPage.slug,
    currentPage.isHomepage
  );
  const nextDefaultRoute = getDefaultRoutePattern(
    nextPageType,
    nextCollection,
    nextSlug,
    nextIsHomepage
  );

  const payload: UpdatePageRequest = {
    ...updates,
    pageType: nextPageType,
    collection: nextCollection,
  };

  if (updates.name !== undefined) {
    payload.name = updates.name.trim() || currentPage.name;
  }

  if (updates.slug !== undefined) {
    payload.slug = nextSlug;
  }

  if (updates.routePattern !== undefined) {
    payload.routePattern = normalizeRoutePattern(updates.routePattern);
  } else if (
    updates.slug !== undefined ||
    updates.pageType !== undefined ||
    updates.collection !== undefined ||
    updates.isHomepage !== undefined
  ) {
    if (!currentPage.routePattern || currentPage.routePattern === previousDefaultRoute) {
      payload.routePattern = nextDefaultRoute;
    }
  }

  return payload;
};

export const createPageDraft = (pages: TemplatePage[]): CreatePageRequest => {
  const baseIndex = pages.length + 1;
  const baseName = `New Page ${baseIndex}`;
  const existingSlugs = new Set(pages.map((page) => page.slug));
  let slug = `page-${baseIndex}`;
  let suffix = 1;

  while (existingSlugs.has(slug)) {
    slug = `page-${baseIndex}-${suffix}`;
    suffix += 1;
  }

  return {
    name: baseName,
    slug,
    pageType: 'static',
    routePattern: getDefaultRoutePattern('static', undefined, slug, false),
    sections: [],
  };
};

export const applyDragEndToSections = ({
  sections,
  activeId,
  overId,
  paletteComponent,
}: {
  sections: PageSection[];
  activeId: string;
  overId: string | null | undefined;
  paletteComponent?: PageComponent;
}): PageSection[] => {
  if (!overId) {
    return sections;
  }

  if (activeId.startsWith('palette-')) {
    if (!paletteComponent) {
      return sections;
    }

    return insertPaletteComponentIntoSections(sections, overId, paletteComponent);
  }

  return reorderComponentsInSections(sections, activeId, overId);
};

export const updateComponentInSections = (
  sections: PageSection[],
  componentId: string,
  updates: Partial<PageComponent>
): PageSection[] =>
  sections.map((section) => ({
    ...section,
    components: section.components.map((component) =>
      component.id === componentId ? { ...component, ...updates } : component
    ),
  })) as PageSection[];

export const updateSectionInSections = (
  sections: PageSection[],
  sectionId: string,
  updates: Partial<PageSection>
): PageSection[] =>
  sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section));

export const deleteComponentFromSections = (
  sections: PageSection[],
  componentId: string
): PageSection[] =>
  sections.map((section) => ({
    ...section,
    components: section.components.filter((component) => component.id !== componentId),
  }));

export const createSectionDraft = (sections: PageSection[], sectionId: string): PageSection => ({
  id: sectionId,
  name: `Section ${sections.length + 1}`,
  components: [],
  paddingTop: '4rem',
  paddingBottom: '4rem',
});

export const deleteSectionFromSections = (
  sections: PageSection[],
  sectionId: string
): PageSection[] => {
  if (sections.length <= 1) {
    return sections;
  }

  return sections.filter((section) => section.id !== sectionId);
};
