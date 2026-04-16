import type { AdminDashboardStats } from '../repositories/adminDashboardStatsRepository';
import * as adminDashboardStatsRepository from '../repositories/adminDashboardStatsRepository';

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> =>
  adminDashboardStatsRepository.getAdminDashboardStats();
