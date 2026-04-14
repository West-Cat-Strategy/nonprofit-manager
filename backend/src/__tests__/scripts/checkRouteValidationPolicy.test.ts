const { analyzeRouteValidationSource } = require('../../../../scripts/check-route-validation-policy.ts');

describe('check-route-validation-policy', () => {
  it('flags direct API routes in app entrypoints when validation middleware is missing', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/index.ts',
      "app.post('/api/v2/admin/audit-log', createAuditLogHandler);\n",
      'entrypoint'
    );

    expect(result.issues).toEqual([
      'backend/src/index.ts:1 defines routes without a validation middleware',
    ]);
  });

  it('allows validated direct API routes in app entrypoints', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/public-site.ts',
      "app.post('/api/v2/sites/:siteId/track', validateParams(siteIdParamsSchema), validateBody(trackSchema), recordAnalytics);\n",
      'entrypoint'
    );

    expect(result.issues).toEqual([]);
    expect(result.routeDefinitionCount).toBe(1);
  });

  it('still flags route files without validation middleware', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/modules/example/routes/index.ts',
      "router.post('/example', createExample);\n",
      'route'
    );

    expect(result.issues).toEqual([
      'backend/src/modules/example/routes/index.ts:1 defines routes without a validation middleware',
    ]);
  });
});

