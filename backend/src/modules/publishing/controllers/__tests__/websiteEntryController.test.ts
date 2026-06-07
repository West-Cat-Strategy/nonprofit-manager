import { createHash } from 'crypto';
import { buildPublicSiteContentSecurityPolicy } from '../websiteEntryController';

const getDirective = (policy: string, name: string): string =>
  policy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `)) || '';

describe('websiteEntryController public-site CSP', () => {
  it('hashes generated inline scripts instead of allowing unsafe inline scripts', () => {
    const inlineScript = 'window.__PUBLIC_SITE__ = {"siteId":"site-1"};';
    const policy = buildPublicSiteContentSecurityPolicy(
      `<!doctype html><script>${inlineScript}</script>`
    );
    const scriptSrc = getDirective(policy, 'script-src');
    const expectedHash = createHash('sha256').update(inlineScript, 'utf8').digest('base64');

    expect(scriptSrc).toContain(`'sha256-${expectedHash}'`);
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});
