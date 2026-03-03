import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDashboards,
  getDefaultDashboard,
  updateDashboard,
  updateDashboardLayout,
} from '@controllers/dashboardController';
import { DashboardUseCase } from '../usecases/dashboard.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createDashboardController = (
  useCase: DashboardUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

  return {
    getDashboards,
    getDashboard,
    getDefaultDashboard,
    createDashboard,
    updateDashboard,
    updateDashboardLayout,
    deleteDashboard,
  };
};
