import { useCallback, useMemo, useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type {
  ComponentType,
  PageComponent,
  PageSection,
  TemplatePage,
} from '../../../types/websiteBuilder';
import { createNewComponent } from './pageEditorUtils';
import {
  applyDragEndToSections,
  type BuilderMoveDirection,
  type ComponentDropPlacement,
  createSectionDraft,
  deleteComponentFromSections,
  deleteSectionFromSections,
  duplicateComponentInSections,
  duplicateSectionInSections,
  moveComponentWithinSection,
  moveSectionInSections,
  updateComponentInSections,
  updateSectionInSections,
} from './pageEditorControllerHelpers';

type UsePageSectionEditingParams = {
  currentPage: TemplatePage | null | undefined;
  historySections: PageSection[];
  setHistorySections: (sections: PageSection[]) => void;
};

const getDropPlacementFromEvent = (
  event: DragEndEvent
): ComponentDropPlacement | undefined => {
  const activeRect =
    event.active.rect?.current.translated || event.active.rect?.current.initial;
  const overRect = event.over?.rect;

  if (!activeRect || !overRect) {
    return undefined;
  }

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const overMiddleY = overRect.top + overRect.height / 2;

  return activeCenterY <= overMiddleY ? 'before' : 'after';
};

export function usePageSectionEditing({
  currentPage,
  historySections,
  setHistorySections,
}: UsePageSectionEditingParams) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId || !currentPage) return null;

    for (const section of historySections) {
      const component = section.components.find((entry) => entry.id === selectedComponentId);
      if (component) return component;
    }

    return null;
  }, [currentPage, historySections, selectedComponentId]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !currentPage) return null;
    return historySections.find((section) => section.id === selectedSectionId) || null;
  }, [currentPage, historySections, selectedSectionId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !currentPage) return;

      const activeId = active.id as string;
      const paletteComponent = activeId.startsWith('palette-')
        ? createNewComponent(activeId.replace('palette-', '') as ComponentType)
        : undefined;
      const updatedSections = applyDragEndToSections({
        sections: historySections,
        activeId,
        overId: over.id as string,
        paletteComponent,
        placement: getDropPlacementFromEvent(event),
      });

      setHistorySections(updatedSections);
      if (paletteComponent) {
        setSelectedComponentId(paletteComponent.id);
      }
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateComponent = useCallback(
    (componentId: string, updates: Partial<PageComponent>) => {
      if (!currentPage) return;
      setHistorySections(updateComponentInSections(historySections, componentId, updates));
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<PageSection>) => {
      if (!currentPage) return;
      setHistorySections(updateSectionInSections(historySections, sectionId, updates));
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      if (!currentPage) return;
      setHistorySections(deleteComponentFromSections(historySections, componentId));
      setSelectedComponentId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleDuplicateComponent = useCallback(
    (componentId: string) => {
      if (!currentPage) return;
      const result = duplicateComponentInSections(historySections, componentId);
      if (!result) return;

      setHistorySections(result.sections);
      setSelectedSectionId(null);
      setSelectedComponentId(result.componentId);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleMoveComponent = useCallback(
    (componentId: string, direction: BuilderMoveDirection) => {
      if (!currentPage) return;
      setHistorySections(moveComponentWithinSection(historySections, componentId, direction));
      setSelectedSectionId(null);
      setSelectedComponentId(componentId);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleAddSection = useCallback(() => {
    if (!currentPage) return;

    const newSection = createSectionDraft(historySections, `section-${Date.now()}`);
    setHistorySections([...historySections, newSection]);
    setSelectedSectionId(newSection.id);
  }, [currentPage, historySections, setHistorySections]);

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!currentPage || historySections.length <= 1) return;
      setHistorySections(deleteSectionFromSections(historySections, sectionId));
      setSelectedSectionId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleDuplicateSection = useCallback(
    (sectionId: string) => {
      if (!currentPage) return;
      const result = duplicateSectionInSections(historySections, sectionId);
      if (!result) return;

      setHistorySections(result.sections);
      setSelectedComponentId(null);
      setSelectedSectionId(result.sectionId);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleMoveSection = useCallback(
    (sectionId: string, direction: BuilderMoveDirection) => {
      if (!currentPage) return;
      setHistorySections(moveSectionInSections(historySections, sectionId, direction));
      setSelectedComponentId(null);
      setSelectedSectionId(sectionId);
    },
    [currentPage, historySections, setHistorySections]
  );

  return {
    activeId,
    handleAddSection,
    handleDeleteComponent,
    handleDeleteSection,
    handleDuplicateComponent,
    handleDuplicateSection,
    handleDragEnd,
    handleDragStart,
    handleMoveComponent,
    handleMoveSection,
    handleUpdateComponent,
    handleUpdateSection,
    selectedComponent,
    selectedComponentId,
    selectedSection,
    selectedSectionId,
    setSelectedComponentId,
    setSelectedSectionId,
  };
}
