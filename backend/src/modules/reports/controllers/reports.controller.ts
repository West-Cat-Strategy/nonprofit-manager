import {
  createExportJob,
  exportReport,
  generateReport,
  getExportJob,
  getAvailableFields,
  listExportJobs,
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
    createExportJob,
    listExportJobs,
    getExportJob,
    getTemplates,
    getTemplateById,
    createTemplate,
    instantiateTemplate,
    deleteTemplate,
  };
};
