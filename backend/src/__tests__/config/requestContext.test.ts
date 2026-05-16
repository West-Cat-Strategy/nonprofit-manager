import {
  getRequestContext,
  runWithRequestContext,
  setRequestContext,
} from '@config/requestContext';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('requestContext', () => {
  it('stores context for the current async execution chain', async () => {
    const context = await runWithRequestContext({ correlationId: 'corr-1' }, async () => {
      setRequestContext({
        ipAddress: '203.0.113.10',
        userAgent: 'request-context-test/1.0',
        userId: 'user-1',
        portalUserId: 'portal-user-1',
        portalContactId: 'contact-1',
        organizationId: 'org-1',
      });
      await sleep(1);
      return getRequestContext();
    });

    expect(context).toMatchObject({
      correlationId: 'corr-1',
      ipAddress: '203.0.113.10',
      userAgent: 'request-context-test/1.0',
      userId: 'user-1',
      portalUserId: 'portal-user-1',
      portalContactId: 'contact-1',
      organizationId: 'org-1',
    });
    expect(getRequestContext()).toBeUndefined();
  });

  it('isolates context between concurrent requests', async () => {
    const [first, second] = await Promise.all([
      runWithRequestContext(
        {
          correlationId: 'corr-a',
          ipAddress: '203.0.113.11',
          userAgent: 'request-context-a/1.0',
        },
        async () => {
          setRequestContext({
            userId: 'user-a',
            portalUserId: 'portal-user-a',
            portalContactId: 'contact-a',
            organizationId: 'org-a',
          });
          await sleep(20);
          return getRequestContext();
        }
      ),
      runWithRequestContext(
        {
          correlationId: 'corr-b',
          ipAddress: '203.0.113.12',
          userAgent: 'request-context-b/1.0',
        },
        async () => {
          setRequestContext({
            userId: 'user-b',
            portalUserId: 'portal-user-b',
            portalContactId: 'contact-b',
            organizationId: 'org-b',
          });
          await sleep(5);
          return getRequestContext();
        }
      ),
    ]);

    expect(first).toMatchObject({
      correlationId: 'corr-a',
      ipAddress: '203.0.113.11',
      userAgent: 'request-context-a/1.0',
      userId: 'user-a',
      portalUserId: 'portal-user-a',
      portalContactId: 'contact-a',
      organizationId: 'org-a',
    });
    expect(second).toMatchObject({
      correlationId: 'corr-b',
      ipAddress: '203.0.113.12',
      userAgent: 'request-context-b/1.0',
      userId: 'user-b',
      portalUserId: 'portal-user-b',
      portalContactId: 'contact-b',
      organizationId: 'org-b',
    });
  });
});
