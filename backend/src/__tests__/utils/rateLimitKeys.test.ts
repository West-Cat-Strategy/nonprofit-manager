import type { Request } from 'express';
import { rateLimitKeys } from '@utils/rateLimitKeys';

const buildRequest = (
  overrides: Partial<Request> & {
    user?: { id?: string };
    organizationId?: string;
    accountId?: string;
    tenantId?: string;
  } = {}
): Request => {
  return {
    ip: '203.0.113.10',
    connection: { remoteAddress: '203.0.113.10' } as Request['connection'],
    headers: {},
    body: {},
    ...overrides,
  } as Request;
};

describe('rateLimitKeys', () => {
  it('builds organization-scoped API keys when org context is present', () => {
    const req = buildRequest({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    } as unknown as Partial<Request>);

    expect(rateLimitKeys.api(req)).toBe('rate-limit:org:org-1:api:user-1');
  });

  it('falls back to global API keys when org context is missing', () => {
    const req = buildRequest({
      user: { id: 'user-2' },
    } as unknown as Partial<Request>);

    expect(rateLimitKeys.api(req)).toBe('rate-limit:global:api:user-2');
  });

  it('builds distinct API keys for different users on the same IP', () => {
    const reqOne = buildRequest({
      user: { id: 'user-1' },
    });

    const reqTwo = buildRequest({
      user: { id: 'user-2' },
    });

    expect(rateLimitKeys.api(reqOne)).toBe('rate-limit:global:api:user-1');
    expect(rateLimitKeys.api(reqTwo)).toBe('rate-limit:global:api:user-2');
    expect(rateLimitKeys.api(reqOne)).not.toBe(rateLimitKeys.api(reqTwo));
  });

  it('ignores organization headers for unauthenticated auth-family keys', () => {
    const req = buildRequest({
      body: { email: 'Person@Example.com' },
      headers: {
        'x-organization-id': 'org-from-header',
        'x-account-id': 'account-from-header',
        'x-tenant-id': 'tenant-from-header',
      },
    });

    expect(rateLimitKeys.auth(req)).toBe(
      'rate-limit:global:auth:542d240129883c019e106e3b%3A203.0.113.10'
    );
    expect(rateLimitKeys.passwordReset(req)).toBe(
      'rate-limit:global:password-reset:542d240129883c019e106e3b%3A203.0.113.10'
    );
    expect(rateLimitKeys.registration(req)).toBe(
      'rate-limit:global:registration:203.0.113.10'
    );
  });

  it('uses global auth key when no organization context is available', () => {
    const req = buildRequest({
      body: { email: 'person@example.com' },
    });

    expect(rateLimitKeys.auth(req)).toBe(
      'rate-limit:global:auth:542d240129883c019e106e3b%3A203.0.113.10'
    );
  });

  it('builds public event registration, report, and case-form token keys without raw tokens', () => {
    const eventReq = buildRequest({ params: { id: 'event-1' } });
    const caseReq = buildRequest({ params: { token: 'case-token' } });
    const reportReq = buildRequest({ params: { token: 'report-token' } });

    expect(rateLimitKeys.publicEventRegistration(eventReq)).toBe(
      'rate-limit:global:public-event-registration:event-1%3A203.0.113.10'
    );
    expect(rateLimitKeys.publicReportToken(reportReq)).toBe(
      'rate-limit:global:public-report-token:3afe7a1d932838be03fe2208%3A203.0.113.10'
    );
    expect(rateLimitKeys.publicCaseFormDraft(caseReq)).toBe(
      'rate-limit:global:public-case-form-draft:68422947e634bbe26eeacdfc%3A203.0.113.10'
    );
    expect(rateLimitKeys.publicCaseFormSubmit(caseReq)).toBe(
      'rate-limit:global:public-case-form-submit:68422947e634bbe26eeacdfc%3A203.0.113.10'
    );
    expect(rateLimitKeys.publicCaseFormAsset(caseReq)).toBe(
      'rate-limit:global:public-case-form-asset:68422947e634bbe26eeacdfc%3A203.0.113.10'
    );
  });

  it('builds site and IP scoped public website form keys', () => {
    const req = buildRequest({
      params: {
        siteKey: 'site-1',
        formKey: 'contact-form',
      },
    });

    expect(rateLimitKeys.publicWebsiteForm(req)).toBe(
      'rate-limit:global:public-website-form:site-1%3Acontact-form%3A203.0.113.10'
    );
  });

  it('builds site and IP scoped public action keys', () => {
    const req = buildRequest({
      params: {
        siteKey: 'site-1',
        actionSlug: 'save-the-library',
      },
    });

    expect(rateLimitKeys.publicWebsiteAction(req)).toBe(
      'rate-limit:global:public-website-action:site-1%3Asave-the-library%3A203.0.113.10'
    );
  });

  it('builds token and IP scoped public newsletter confirmation keys', () => {
    const req = buildRequest({
      params: {
        token: 'signed-token',
      },
    });

    expect(rateLimitKeys.publicNewsletterConfirmation(req)).toBe(
      'rate-limit:global:public-newsletter-confirmation:d131c306d498cf8aa66cbd07%3A203.0.113.10'
    );
  });

  it('builds site and IP scoped public analytics keys', () => {
    const req = buildRequest({
      params: {
        siteId: 'site-1',
      },
    });

    expect(rateLimitKeys.publicSiteAnalytics(req)).toBe(
      'rate-limit:global:public-site-analytics:site-1%3A203.0.113.10'
    );
  });
});
