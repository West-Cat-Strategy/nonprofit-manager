import {
  getRequestContext,
  runWithRequestContext,
  setRequestContext,
} from '@config/requestContext';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('requestContext', () => {
  it('stores context for the current async execution chain', async () => {
    const context = await runWithRequestContext(
      { correlationId: 'corr-1' },
      async () => {
        setRequestContext({ userId: 'user-1', organizationId: 'org-1' });
        await sleep(1);
        return getRequestContext();
      }
    );

    expect(context).toMatchObject({
      correlationId: 'corr-1',
      userId: 'user-1',
      organizationId: 'org-1',
    });
    expect(getRequestContext()).toBeUndefined();
  });

  it('isolates context between concurrent requests', async () => {
    const [first, second] = await Promise.all([
      runWithRequestContext({ correlationId: 'corr-a' }, async () => {
        setRequestContext({ userId: 'user-a', organizationId: 'org-a' });
        await sleep(20);
        return getRequestContext();
      }),
      runWithRequestContext({ correlationId: 'corr-b' }, async () => {
        setRequestContext({ userId: 'user-b', organizationId: 'org-b' });
        await sleep(5);
        return getRequestContext();
      }),
    ]);

    expect(first).toMatchObject({
      correlationId: 'corr-a',
      userId: 'user-a',
      organizationId: 'org-a',
    });
    expect(second).toMatchObject({
      correlationId: 'corr-b',
      userId: 'user-b',
      organizationId: 'org-b',
    });
  });
});
