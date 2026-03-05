import {
  createSavedReport,
  deleteSavedReport,
  getSavedReportById,
  getSavedReports,
  updateSavedReport,
} from './savedReport.handlers';
import {
  getSharePrincipals,
  generatePublicLink,
  removeShare,
  revokePublicLink,
  shareReport,
} from './reportSharing.handlers';
import { SavedReportsUseCase } from '../usecases/savedReports.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createSavedReportsController = (
  useCase: SavedReportsUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

  return {
    getSavedReports,
    getSavedReportById,
    createSavedReport,
    updateSavedReport,
    deleteSavedReport,
    getSharePrincipals,
    shareReport,
    removeShare,
    generatePublicLink,
    revokePublicLink,
  };
};
