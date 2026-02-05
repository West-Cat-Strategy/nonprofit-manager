import type { Organization } from '../../types/schema';
import { mockOrganizations } from '../../utils/mockData';
import { delay, SIMULATED_LATENCY } from './latency';

export const getOrganizations = async (): Promise<Organization[]> => {
  await delay(SIMULATED_LATENCY);

  console.log('[LoopApiService] getOrganizations:', mockOrganizations);
  return mockOrganizations;
};
