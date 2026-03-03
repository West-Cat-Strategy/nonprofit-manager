import {
  exportReport,
  generateReport,
  getAvailableFields,
} from '@controllers/reportController';
import { getOutcomesReport } from '@controllers/outcomeReportController';
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  instantiateTemplate,
} from '@controllers/reportTemplateController';
import { ReportsUseCase } from '../usecases/reports.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createReportsController = (
  useCase: ReportsUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

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
