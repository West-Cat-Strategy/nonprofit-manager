import { generateNavigationToggleScript } from '../../../services/site-generator/navigationScript';

describe('navigationScript.generateNavigationToggleScript', () => {
  it('includes accessible toggle wiring for mobile navigation', () => {
    const script = generateNavigationToggleScript();

    expect(script).toContain('.nav-toggle');
    expect(script).toContain('aria-expanded');
    expect(script).toContain('closeAllNavs');
    expect(script).toContain('Escape');
  });
});
