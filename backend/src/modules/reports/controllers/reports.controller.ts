import {
  exportReport,
  generateReport,
  getAvailableFields,
} from './report.handlers';
import { getOutcomesReport } from './outcomeReport.handlers';
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  instantiateTemplate,
} from './reportTemplate.handlers';

export const createReportsController = () => {
  return {
    generateReport,
    getOutcomesReport,
    getAvailableFields,
    exportReport,
    getTemplates,
    getTemplateById,
    createTemplate,
    instantiateTemplate,
    deleteTemplate,
  };
};
