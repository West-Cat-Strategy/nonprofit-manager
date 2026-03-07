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

export const createSavedReportsController = () => {
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
