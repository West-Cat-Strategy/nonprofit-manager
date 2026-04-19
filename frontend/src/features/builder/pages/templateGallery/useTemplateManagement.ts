import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../../store/hooks';
import type { TemplateListItem } from '../../../../types/websiteBuilder';
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  searchTemplates,
} from '../../state';
import { getTemplateCopyName } from './helpers';

export function useTemplateManagement() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateListItem | null>(null);

  const openNewTemplateModal = useCallback(() => {
    setShowNewModal(true);
  }, []);

  const closeNewTemplateModal = useCallback(() => {
    setShowNewModal(false);
  }, []);

  const handleStartFromScratch = useCallback(async () => {
    try {
      const createdTemplate = await dispatch(
        createTemplate({
          name: 'Untitled Website',
          description: 'New website template',
          category: 'multi-page',
          tags: [],
        })
      ).unwrap();
      setShowNewModal(false);
      navigate(`/website-builder/${createdTemplate.id}`);
    } catch {
      return;
    }
  }, [dispatch, navigate]);

  const handleDuplicateTemplate = useCallback(
    async (template: TemplateListItem) => {
      try {
        await dispatch(
          duplicateTemplate({
            id: template.id,
            name: getTemplateCopyName(template),
          })
        ).unwrap();
        void dispatch(searchTemplates());
      } catch {
        return;
      }
    },
    [dispatch]
  );

  const handleDeleteTemplate = useCallback((template: TemplateListItem) => {
    setDeleteConfirm(template);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) {
      return;
    }

    void dispatch(deleteTemplate(deleteConfirm.id));
    setDeleteConfirm(null);
  }, [deleteConfirm, dispatch]);

  const handleSelectTemplate = useCallback(
    async (template: TemplateListItem) => {
      if (template.isSystemTemplate) {
        try {
          const duplicatedTemplate = await dispatch(
            duplicateTemplate({
              id: template.id,
              name: getTemplateCopyName(template),
            })
          ).unwrap();
          navigate(`/website-builder/${duplicatedTemplate.id}`);
        } catch {
          return;
        }

        return;
      }

      navigate(`/website-builder/${template.id}`);
    },
    [dispatch, navigate]
  );

  return {
    showNewModal,
    deleteConfirm,
    openNewTemplateModal,
    closeNewTemplateModal,
    handleStartFromScratch,
    handleDuplicateTemplate,
    handleDeleteTemplate,
    handleCancelDelete,
    confirmDelete,
    handleSelectTemplate,
  };
}
