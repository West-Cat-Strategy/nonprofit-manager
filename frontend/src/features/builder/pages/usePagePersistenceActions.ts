import { useCallback, useState } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import type { AppDispatch } from '../../../store';
import type {
  PageSection,
  Template,
  TemplatePage,
  UpdatePageRequest,
} from '../../../types/websiteBuilder';
import type { BuilderSiteContext } from '../lib/siteAwareEditor';
import {
  createTemplateVersion,
  updateTemplatePage,
} from '../state';
import {
  fetchWebsiteDeployment,
  fetchWebsiteOverview,
  fetchWebsiteVersions,
  publishWebsiteSite,
} from '../../websites/state';
import { buildPageUpdatePayload } from './pageEditorControllerHelpers';

type PublishNotice = {
  tone: 'success' | 'error';
  message: string;
} | null;

type UsePagePersistenceActionsParams = {
  autoSaveEnabled: boolean;
  currentPage: TemplatePage | null | undefined;
  currentTemplate: Template | null | undefined;
  dispatch: AppDispatch;
  historySections: PageSection[];
  resolvedTemplateId: string | null;
  siteContext: BuilderSiteContext | null;
};

const getPublishErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Failed to publish the live site.';
};

export function usePagePersistenceActions({
  autoSaveEnabled,
  currentPage,
  currentTemplate,
  dispatch,
  historySections,
  resolvedTemplateId,
  siteContext,
}: UsePagePersistenceActionsParams) {
  const [publishNotice, setPublishNotice] = useState<PublishNotice>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAutoSave = useCallback(
    async (sections: PageSection[]) => {
      if (!resolvedTemplateId || !currentPage) return;

      await dispatch(
        updateTemplatePage({
          templateId: resolvedTemplateId,
          pageId: currentPage.id,
          data: { sections },
        })
      ).unwrap();
    },
    [currentPage, dispatch, resolvedTemplateId]
  );

  const {
    isSaving: isAutoSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
  } = useAutoSave({
    data: historySections,
    onSave: handleAutoSave,
    debounceMs: 3000,
    enabled: autoSaveEnabled && !!resolvedTemplateId && !!currentPage,
  });

  const commitPageUpdate = useCallback(
    async (updates: UpdatePageRequest) => {
      if (!resolvedTemplateId || !currentPage) return;

      await dispatch(
        updateTemplatePage({
          templateId: resolvedTemplateId,
          pageId: currentPage.id,
          data: buildPageUpdatePayload(currentPage, updates),
        })
      ).unwrap();
    },
    [currentPage, dispatch, resolvedTemplateId]
  );

  const handleSave = useCallback(async () => {
    if (!resolvedTemplateId || !currentTemplate || !currentPage) return;

    try {
      await saveNow();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, [currentPage, currentTemplate, resolvedTemplateId, saveNow]);

  const handleSaveVersion = useCallback(async () => {
    if (!resolvedTemplateId) return;

    await handleSave();
    await dispatch(
      createTemplateVersion({ templateId: resolvedTemplateId, changes: 'Manual save' })
    );
  }, [dispatch, handleSave, resolvedTemplateId]);

  const handleUpdatePage = useCallback(
    async (updates: UpdatePageRequest) => {
      try {
        await commitPageUpdate(updates);
      } catch (error) {
        console.error('Failed to update page settings:', error);
      }
    },
    [commitPageUpdate]
  );

  const handlePublishPage = useCallback(
    async (updates: UpdatePageRequest) => {
      if (!resolvedTemplateId || !currentPage || !siteContext) return;

      setPublishNotice(null);
      setIsPublishing(true);

      try {
        await saveNow();
        await commitPageUpdate(updates);

        const result = await dispatch(
          publishWebsiteSite({
            siteId: siteContext.siteId,
            templateId: resolvedTemplateId,
            target: 'live',
          })
        ).unwrap();

        void dispatch(fetchWebsiteDeployment(siteContext.siteId));
        void dispatch(fetchWebsiteOverview({ siteId: siteContext.siteId, period: 30 }));
        void dispatch(fetchWebsiteVersions({ siteId: siteContext.siteId, limit: 10 }));

        setPublishNotice({
          tone: 'success',
          message: result.url ? `Published live at ${result.url}.` : 'Published live successfully.',
        });
      } catch (error) {
        setPublishNotice({
          tone: 'error',
          message: getPublishErrorMessage(error),
        });
      } finally {
        setIsPublishing(false);
      }
    },
    [commitPageUpdate, currentPage, dispatch, resolvedTemplateId, saveNow, siteContext]
  );

  return {
    handlePublishPage,
    handleSave,
    handleSaveVersion,
    handleUpdatePage,
    hasUnsavedChanges,
    isAutoSaving,
    isPublishing,
    lastSaved,
    publishNotice,
    saveNow,
  };
}
