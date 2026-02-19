describe('reconciliationService config detection', () => {
  const original = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = original;
    jest.resetModules();
  });

  it('reports not configured without STRIPE_SECRET_KEY', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    jest.resetModules();
    const mod = await import('@services/reconciliationService');
    expect(mod.isStripeConfigured()).toBe(false);
  });

  it('reports configured with STRIPE_SECRET_KEY', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    jest.resetModules();
    const mod = await import('@services/reconciliationService');
    expect(mod.isStripeConfigured()).toBe(true);
  });
});
