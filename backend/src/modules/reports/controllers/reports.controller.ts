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
