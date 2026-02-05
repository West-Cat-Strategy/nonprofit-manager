import type { Task } from '../../types/schema';
import { mockTasks } from '../../utils/mockData';
import { delay, SIMULATED_LATENCY } from './latency';

export const getTasks = async (): Promise<Task[]> => {
  await delay(SIMULATED_LATENCY);

  console.log('[LoopApiService] getTasks:', mockTasks);
  return mockTasks;
};
