import {
  getBuilderBackLabel,
  getBuilderBackTarget,
  getBuilderContextLabel,
  getBuilderStatusLabel,
  resolveBuilderSiteId,
  type BuilderSiteContext,
} from '../siteAwareEditor';

describe('site-aware builder launch helpers', () => {
  const siteContext: BuilderSiteContext = {
    siteId: 'site-1',
    siteName: 'Neighborhood Mutual Aid',
    siteStatus: 'published',
    blocked: false,
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org',
    templateId: 'template-1',
  };

  it('resolves route-first site context and generates the console labels/target', () => {
    expect(resolveBuilderSiteId('site-1', 'site-2')).toBe('site-1');
    expect(resolveBuilderSiteId(undefined, 'site-2')).toBe('site-2');
    expect(resolveBuilderSiteId(undefined, null)).toBeUndefined();

    expect(getBuilderBackTarget(siteContext)).toBe('/websites/site-1/overview');
    expect(getBuilderBackLabel(siteContext)).toBe('Back to website console');
    expect(getBuilderContextLabel(siteContext)).toBe('Site: Neighborhood Mutual Aid');
    expect(getBuilderStatusLabel(siteContext)).toBe('Publish status: published');

    expect(getBuilderBackTarget(null)).toBe('/website-builder');
    expect(getBuilderBackLabel(null)).toBe('Back to templates');
    expect(getBuilderContextLabel(null)).toBeUndefined();
    expect(getBuilderStatusLabel(null)).toBeUndefined();
  });
});
