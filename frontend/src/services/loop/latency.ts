export const SIMULATED_LATENCY = 500;

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
