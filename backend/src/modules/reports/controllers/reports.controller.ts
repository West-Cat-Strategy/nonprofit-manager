import {
  createExportJob,
  downloadExportJob,
  exportReport,
  generateReport,
  getExportJob,
  getAvailableFields,
  listExportJobs,
} from './report.handlers';
import { getOutcomesReport } from './outcomeReport.handlers';
import { getWorkflowCoverageReport } from './workflowCoverageReport.handlers';
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
    getWorkflowCoverageReport,
    getAvailableFields,
    exportReport,
    createExportJob,
    listExportJobs,
    getExportJob,
    downloadExportJob,
    getTemplates,
    getTemplateById,
    createTemplate,
    instantiateTemplate,
    deleteTemplate,
  };
};
