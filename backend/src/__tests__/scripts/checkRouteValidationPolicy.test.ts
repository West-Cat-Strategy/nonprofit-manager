import { analyzeRouteValidationSource } from '../../../../scripts/check-route-validation-policy.ts';

describe('check-route-validation-policy', () => {
  it('allows route files when validation middleware is present in the route call chain', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/modules/example/routes/index.ts',
      "router.post('/example', validateBody(exampleSchema), createExample);\n",
      'route'
    );

    expect(result.issues).toEqual([]);
    expect(result.routeDefinitionCount).toBe(1);
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
      'backend/src/modules/example/routes/index.ts:1 defines routes without any recognized validation middleware',
    ]);
    expect(result.routeDefinitionCount).toBe(1);
  });

  it('ignores validator names that appear only in comments and strings', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/modules/example/routes/index.ts',
      [
        "const routeLabel = 'validateBody(validateParams)';",
        '// validateBody(validateParams) should not count',
        "router.post('/example', createExample);",
        '',
      ].join('\n'),
      'route'
    );

    expect(result.issues).toEqual([
      'backend/src/modules/example/routes/index.ts:3 defines routes without any recognized validation middleware',
    ]);
    expect(result.routeDefinitionCount).toBe(1);
  });

  it('ignores validator calls that live only in helper-local dead code', () => {
    const result = analyzeRouteValidationSource(
      '/Users/bryan/projects/nonprofit-manager/backend/src/modules/example/routes/index.ts',
      [
        'function buildValidation() {',
        '  if (false) {',
        '    return validateBody(exampleSchema);',
        '  }',
        '  return null;',
        '}',
        'const helperValidation = buildValidation();',
        "router.post('/example', createExample);",
        '',
      ].join('\n'),
      'route'
    );

    expect(result.issues).toEqual([
      'backend/src/modules/example/routes/index.ts:8 defines routes without any recognized validation middleware',
    ]);
    expect(result.routeDefinitionCount).toBe(1);
  });
});
