import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDashboards,
  getDefaultDashboard,
  updateDashboard,
  updateDashboardLayout,
} from './dashboard.handlers';

export const createDashboardController = () => {
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
