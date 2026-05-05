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

export type ComponentDropPlacement = 'before' | 'after';

type ComponentLocation = {
  sectionIndex: number;
  componentIndex: number;
  componentId: string;
};

type DropTarget =
  | { kind: 'section'; sectionIndex: number }
  | ({ kind: 'component' } & ComponentLocation);

const COMPONENT_WRAPPER_PREFIX = 'component-';
const BUILDER_ID_COLLECTION_KEYS = new Set(['components', 'columns', 'fields', 'sections']);

export type BuilderMoveDirection = 'up' | 'down';

type DuplicateComponentResult = {
  sections: PageSection[];
  componentId: string;
};

type DuplicateSectionResult = {
  sections: PageSection[];
  sectionId: string;
};

type ComponentUpdatePatch = Omit<Partial<PageComponent>, 'id' | 'type'> & {
  id?: PageComponent['id'];
  type?: PageComponent['type'];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const collectIds = (value: unknown, ids: Set<string>): void => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectIds(entry, ids));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    if (key === 'id' && typeof entry === 'string') {
      ids.add(entry);
      return;
    }

    collectIds(entry, ids);
  });
};

const createUniqueCopyId = (sourceId: string, usedIds: Set<string>): string => {
  const baseId = `${sourceId}-copy`;
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
};

const cloneWithUniqueIds = <T>(value: T, usedIds: Set<string>, rewriteRecordId = true): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneWithUniqueIds(entry, usedIds, rewriteRecordId)) as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      rewriteRecordId && key === 'id' && typeof entry === 'string'
        ? createUniqueCopyId(entry, usedIds)
        : cloneWithUniqueIds(entry, usedIds, BUILDER_ID_COLLECTION_KEYS.has(key)),
    ])
  ) as T;
};

const collectSectionIds = (sections: PageSection[]): Set<string> => {
  const ids = new Set<string>();
  collectIds(sections, ids);
  return ids;
};

const findComponentLocation = (
  sections: PageSection[],
  componentId: string
): ComponentLocation | null => {
  for (const [sectionIndex, section] of sections.entries()) {
    const componentIndex = section.components.findIndex((component) => component.id === componentId);
    if (componentIndex !== -1) {
      return {
        sectionIndex,
        componentIndex,
        componentId,
      };
    }
  }

  return null;
};

const resolveComponentTarget = (sections: PageSection[], overId: string): ComponentLocation | null => {
  const exactMatch = findComponentLocation(sections, overId);
  if (exactMatch) {
    return exactMatch;
  }

  if (!overId.startsWith(COMPONENT_WRAPPER_PREFIX)) {
    return null;
  }

  return findComponentLocation(sections, overId.slice(COMPONENT_WRAPPER_PREFIX.length));
};

const resolveDropTarget = (sections: PageSection[], overId: string): DropTarget | null => {
  const sectionIndex = sections.findIndex((section) => section.id === overId);
  if (sectionIndex !== -1) {
    return {
      kind: 'section',
      sectionIndex,
    };
  }

  const componentTarget = resolveComponentTarget(sections, overId);
  if (!componentTarget) {
    return null;
  }

  return {
    kind: 'component',
    ...componentTarget,
  };
};

const insertComponentIntoSections = (
  sections: PageSection[],
  overId: string,
  component: PageComponent,
  placement: ComponentDropPlacement
): PageSection[] => {
  const target = resolveDropTarget(sections, overId);
  if (!target) {
    return sections;
  }

  return sections.map((section, sectionIndex) => {
    if (target.kind === 'section') {
      return sectionIndex === target.sectionIndex
        ? {
            ...section,
            components: [...section.components, component],
          }
        : section;
    }

    if (sectionIndex !== target.sectionIndex) {
      return section;
    }

    const insertIndex = placement === 'after' ? target.componentIndex + 1 : target.componentIndex;
    const components = [...section.components];
    components.splice(insertIndex, 0, component);

    return {
      ...section,
      components,
    };
  });
};

const moveComponentInSections = (
  sections: PageSection[],
  activeComponentId: string,
  overId: string,
  placement: ComponentDropPlacement
): PageSection[] => {
  const activeLocation = findComponentLocation(sections, activeComponentId);
  const target = resolveDropTarget(sections, overId);

  if (!activeLocation || !target) {
    return sections;
  }

  if (target.kind === 'component' && target.componentId === activeComponentId) {
    return sections;
  }

  const nextSections = sections.map((section) => ({
    ...section,
    components: [...section.components],
  }));
  const [movedComponent] = nextSections[activeLocation.sectionIndex].components.splice(
    activeLocation.componentIndex,
    1
  );

  if (!movedComponent) {
    return sections;
  }

  if (target.kind === 'section') {
    nextSections[target.sectionIndex].components.push(movedComponent);
    return nextSections;
  }

  const targetAfterRemoval = findComponentLocation(nextSections, target.componentId);
  if (!targetAfterRemoval) {
    return sections;
  }

  const insertIndex =
    placement === 'after'
      ? targetAfterRemoval.componentIndex + 1
      : targetAfterRemoval.componentIndex;
  nextSections[targetAfterRemoval.sectionIndex].components.splice(insertIndex, 0, movedComponent);

  return nextSections;
};

const applyComponentUpdate = (
  component: PageComponent,
  updates: Partial<PageComponent>
): PageComponent => {
  const { id: _ignoredId, type: _ignoredType, ...patch } = updates as ComponentUpdatePatch;

  return {
    ...component,
    ...patch,
    id: component.id,
    type: component.type,
  } as PageComponent;
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
  placement,
}: {
  sections: PageSection[];
  activeId: string;
  overId: string | null | undefined;
  paletteComponent?: PageComponent;
  placement?: ComponentDropPlacement;
}): PageSection[] => {
  if (!overId) {
    return sections;
  }

  const resolvedPlacement = placement || (activeId.startsWith('palette-') ? 'after' : 'before');

  if (activeId.startsWith('palette-')) {
    if (!paletteComponent) {
      return sections;
    }

    return insertComponentIntoSections(sections, overId, paletteComponent, resolvedPlacement);
  }

  return moveComponentInSections(sections, activeId, overId, resolvedPlacement);
};

export const updateComponentInSections = (
  sections: PageSection[],
  componentId: string,
  updates: Partial<PageComponent>
): PageSection[] =>
  sections.map((section) => ({
    ...section,
    components: section.components.map((component) =>
      component.id === componentId ? applyComponentUpdate(component, updates) : component
    ),
  }));

export const updateSectionInSections = (
  sections: PageSection[],
  sectionId: string,
  updates: Partial<PageSection>
): PageSection[] =>
  sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section));

export const duplicateComponentInSections = (
  sections: PageSection[],
  componentId: string
): DuplicateComponentResult | null => {
  const location = findComponentLocation(sections, componentId);
  if (!location) {
    return null;
  }

  const usedIds = collectSectionIds(sections);
  const duplicate = cloneWithUniqueIds(
    sections[location.sectionIndex].components[location.componentIndex],
    usedIds
  );
  const updatedSections = sections.map((section, sectionIndex) => {
    if (sectionIndex !== location.sectionIndex) {
      return section;
    }

    const components = [...section.components];
    components.splice(location.componentIndex + 1, 0, duplicate);
    return {
      ...section,
      components,
    };
  });

  return {
    sections: updatedSections,
    componentId: duplicate.id,
  };
};

export const duplicateSectionInSections = (
  sections: PageSection[],
  sectionId: string
): DuplicateSectionResult | null => {
  const sectionIndex = sections.findIndex((section) => section.id === sectionId);
  if (sectionIndex === -1) {
    return null;
  }

  const usedIds = collectSectionIds(sections);
  const duplicate = cloneWithUniqueIds(sections[sectionIndex], usedIds);
  duplicate.name = `${sections[sectionIndex].name} Copy`;

  const updatedSections = [...sections];
  updatedSections.splice(sectionIndex + 1, 0, duplicate);

  return {
    sections: updatedSections,
    sectionId: duplicate.id,
  };
};

export const moveComponentWithinSection = (
  sections: PageSection[],
  componentId: string,
  direction: BuilderMoveDirection
): PageSection[] => {
  const location = findComponentLocation(sections, componentId);
  if (!location) {
    return sections;
  }

  const nextIndex =
    direction === 'up' ? location.componentIndex - 1 : location.componentIndex + 1;
  const currentSection = sections[location.sectionIndex];
  if (nextIndex < 0 || nextIndex >= currentSection.components.length) {
    return sections;
  }

  return sections.map((section, sectionIndex) => {
    if (sectionIndex !== location.sectionIndex) {
      return section;
    }

    const components = [...section.components];
    const [component] = components.splice(location.componentIndex, 1);
    components.splice(nextIndex, 0, component);

    return {
      ...section,
      components,
    };
  });
};

export const moveSectionInSections = (
  sections: PageSection[],
  sectionId: string,
  direction: BuilderMoveDirection
): PageSection[] => {
  const sectionIndex = sections.findIndex((section) => section.id === sectionId);
  if (sectionIndex === -1) {
    return sections;
  }

  const nextIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
  if (nextIndex < 0 || nextIndex >= sections.length) {
    return sections;
  }

  const updatedSections = [...sections];
  const [section] = updatedSections.splice(sectionIndex, 1);
  updatedSections.splice(nextIndex, 0, section);
  return updatedSections;
};

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
