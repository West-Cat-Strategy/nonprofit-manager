import type { DashboardStats } from '../../types/schema';
import { mockDashboardStats } from '../../utils/mockData';
import { delay, SIMULATED_LATENCY } from './latency';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  await delay(SIMULATED_LATENCY);

  const stats = mockDashboardStats;
  console.log('[LoopApiService] getDashboardStats:', stats);
  return stats;
};
