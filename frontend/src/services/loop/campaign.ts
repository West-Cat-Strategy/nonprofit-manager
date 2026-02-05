import type { CampaignEvent, CampaignStats } from '../../types/schema';
import { mockCampaignEvents, mockCampaignStats } from '../../utils/mockData';
import { delay, SIMULATED_LATENCY } from './latency';

export const getCampaignStats = async (): Promise<CampaignStats> => {
  await delay(SIMULATED_LATENCY);

  console.log('[LoopApiService] getCampaignStats:', mockCampaignStats);
  return mockCampaignStats;
};

export const getCampaignEvents = async (): Promise<CampaignEvent[]> => {
  await delay(SIMULATED_LATENCY);

  console.log('[LoopApiService] getCampaignEvents:', mockCampaignEvents);
  return mockCampaignEvents;
};
