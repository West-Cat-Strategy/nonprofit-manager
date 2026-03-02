import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  accountId?: string;
  tenantId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(
  context: RequestContext,
  callback: () => T
): T => requestContextStorage.run({ ...context }, callback);

export const getRequestContext = (): RequestContext | undefined =>
  requestContextStorage.getStore();

export const setRequestContext = (updates: Partial<RequestContext>): void => {
  const current = requestContextStorage.getStore();
  if (!current) return;
  Object.assign(current, updates);
};

