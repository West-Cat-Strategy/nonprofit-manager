import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

export type AuditSeverity = 'critical' | 'serious' | 'moderate' | 'blocked';

export interface AuditFinding {
  severity: AuditSeverity;
  type: 'contrast' | 'readability' | 'focus' | 'semantic' | 'blocked' | 'runtime';
  routeId: string;
  routePath: string;
  routeTitle: string;
  surface: string;
  message: string;
  selector?: string;
  screenshot?: string;
  fixtureState?: string;
  recommendation: string;
}

export interface RouteAuditRecord {
  routeId: string;
  routePath: string;
  routeTitle: string;
  surface: string;
  fixtureState?: string;
  screenshot?: string;
  skippedReason?: string;
  findings: AuditFinding[];
}

type ContrastSample = {
  selector: string;
  text: string;
  ratio: number;
  requiredRatio: number;
  foreground: string;
  background: string;
};

type SemanticIssue = {
  selector: string;
  message: string;
};

type ReadabilityProbe = {
  visibleHeadingCount: number;
  visibleLandmarkCount: number;
  visibleTextSampleCount: number;
};

type FocusProbe = {
  selector: string;
  label: string;
  visibleIndicator: boolean;
  outlineWidth: string;
  outlineStyle: string;
  boxShadow: string;
};

type PageProbe = {
  contrastFailures: ContrastSample[];
  semanticIssues: SemanticIssue[];
  readability: ReadabilityProbe;
};

type ReportInput = {
  generatedAt: string;
  reportPath: string;
  screenshotRoot: string;
  records: RouteAuditRecord[];
};

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results', 'dark-mode-audit');
const REPORT_PATH = path.resolve(process.cwd(), 'test-results', 'dark-mode-accessibility-report.md');

const MANUAL_REVIEW_ROUTE_IDS = new Set([
  'contact-detail',
  'account-detail',
  'volunteer-detail',
  'case-detail',
  'portal-case-detail',
  'analytics',
  'reports-builder',
  'reports-outcomes',
  'admin-settings',
  'website-builder',
  'website-console-overview',
  'website-console-builder',
  'website-builder-editor',
  'website-builder-preview',
  'cases',
]);

const severityRank: Record<AuditSeverity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  blocked: 3,
};

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function slugForRoute(routeId: string, routePath: string): string {
  return `${sanitizeFileSegment(routeId)}-${sanitizeFileSegment(routePath.replace(/[:/]/g, '-')) || 'route'}`;
}

export function getAuditReportPath(): string {
  return REPORT_PATH;
}

export function getAuditScreenshotDir(): string {
  return SCREENSHOT_DIR;
}

export function requiresManualReview(routeId: string): boolean {
  return MANUAL_REVIEW_ROUTE_IDS.has(routeId);
}

export async function ensureDarkMode(page: Page, theme: string = 'glass'): Promise<void> {
  await page.addInitScript(
    ({ nextTheme }) => {
      window.localStorage.setItem('app-theme', nextTheme);
      window.localStorage.setItem('app-color-scheme', 'dark');
    },
    { nextTheme: theme }
  );

  await page.evaluate(
    ({ nextTheme }) => {
      window.localStorage.setItem('app-theme', nextTheme);
      window.localStorage.setItem('app-color-scheme', 'dark');
    },
    { nextTheme: theme }
  ).catch(() => undefined);
}

export async function waitForSettledPage(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => undefined);
}

export async function assertDarkModeApplied(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const classes = Array.from(document.body.classList);
    const scheme = window.localStorage.getItem('app-color-scheme');
    return scheme === 'dark' && classes.includes('dark');
  });
}

export async function collectPageProbe(page: Page): Promise<PageProbe> {
  return page.evaluate(() => {
    type Rgba = { r: number; g: number; b: number; a: number };

    const parseCssColor = (input: string): Rgba | null => {
      const value = input.trim();
      const rgba = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i);
      if (rgba) {
        return {
          r: Number(rgba[1]),
          g: Number(rgba[2]),
          b: Number(rgba[3]),
          a: Number(rgba[4]),
        };
      }

      const rgb = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
      if (rgb) {
        return {
          r: Number(rgb[1]),
          g: Number(rgb[2]),
          b: Number(rgb[3]),
          a: 1,
        };
      }

      return null;
    };

    const luminance = (color: Rgba): number => {
      const channels = [color.r, color.g, color.b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });

      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };

    const contrastRatio = (foreground: Rgba, background: Rgba): number => {
      const l1 = luminance(foreground);
      const l2 = luminance(background);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    };

    const isVisible = (element: Element | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const getSelector = (element: Element): string => {
      if (element.id) {
        return `#${element.id}`;
      }
      const dataTestId = element.getAttribute('data-testid');
      if (dataTestId) {
        return `[data-testid="${dataTestId}"]`;
      }
      const role = element.getAttribute('role');
      if (role) {
        return `${element.tagName.toLowerCase()}[role="${role}"]`;
      }
      const className = typeof element.className === 'string'
        ? element.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return className ? `${element.tagName.toLowerCase()}.${className}` : element.tagName.toLowerCase();
    };

    const resolveBackground = (element: Element): string => {
      let current: Element | null = element;

      while (current) {
        const backgroundColor = window.getComputedStyle(current).backgroundColor;
        const parsed = parseCssColor(backgroundColor);
        if (parsed && parsed.a >= 0.95) {
          return backgroundColor;
        }
        current = current.parentElement;
      }

      return 'rgb(255, 255, 255)';
    };

    const textSelectors = [
      'h1',
      'h2',
      'h3',
      '[role="heading"]',
      'p',
      'label',
      'button',
      '[role="button"]',
      'a',
      '[role="link"]',
      'input',
      'textarea',
      'select',
      '[role="tab"]',
      'th',
      'td',
      'li',
      '.badge',
      '[class*="badge"]',
      '[class*="pill"]',
      '[class*="tab"]',
      '[class*="card"]',
    ];

    const uniqueElements = new Set<Element>();
    for (const selector of textSelectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (isVisible(element)) {
          uniqueElements.add(element);
        }
      }
    }

    const contrastFailures: ContrastSample[] = [];
    for (const element of Array.from(uniqueElements).slice(0, 120)) {
      const htmlElement = element as HTMLElement;
      const text = (
        htmlElement.innerText ||
        htmlElement.getAttribute('aria-label') ||
        htmlElement.getAttribute('placeholder') ||
        htmlElement.getAttribute('value') ||
        ''
      ).trim();
      if (!text) {
        continue;
      }

      const styles = window.getComputedStyle(htmlElement);
      const color = parseCssColor(styles.color);
      const backgroundRaw = resolveBackground(htmlElement);
      const background = parseCssColor(backgroundRaw);
      if (!color || !background) {
        continue;
      }

      const fontSize = Number.parseFloat(styles.fontSize || '16');
      const fontWeight = Number.parseInt(styles.fontWeight || '400', 10);
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const requiredRatio = isLargeText ? 3 : 4.5;
      const ratio = contrastRatio(color, background);
      if (ratio < requiredRatio) {
        contrastFailures.push({
          selector: getSelector(htmlElement),
          text: text.slice(0, 120),
          ratio,
          requiredRatio,
          foreground: styles.color,
          background: backgroundRaw,
        });
      }

      if (
        htmlElement instanceof HTMLInputElement &&
        htmlElement.placeholder &&
        isVisible(htmlElement)
      ) {
        const placeholderColorRaw = window.getComputedStyle(htmlElement, '::placeholder').color;
        const placeholderColor = parseCssColor(placeholderColorRaw);
        if (placeholderColor && background) {
          const placeholderRatio = contrastRatio(placeholderColor, background);
          if (placeholderRatio < 4.5) {
            contrastFailures.push({
              selector: `${getSelector(htmlElement)}::placeholder`,
              text: htmlElement.placeholder.slice(0, 120),
              ratio: placeholderRatio,
              requiredRatio: 4.5,
              foreground: placeholderColorRaw,
              background: backgroundRaw,
            });
          }
        }
      }
    }

    const semanticIssues: SemanticIssue[] = [];
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const field of fields) {
      if (!isVisible(field) || !(field instanceof HTMLElement)) {
        continue;
      }
      const inputType = field.getAttribute('type');
      if (inputType === 'hidden') {
        continue;
      }
      const labels = 'labels' in field && Array.isArray(Array.from((field as HTMLInputElement).labels || []))
        ? Array.from((field as HTMLInputElement).labels || [])
        : [];
      const hasAccessibleName = Boolean(
        labels.length ||
          field.getAttribute('aria-label') ||
          field.getAttribute('aria-labelledby') ||
          field.getAttribute('title')
      );
      if (!hasAccessibleName) {
        semanticIssues.push({
          selector: getSelector(field),
          message: 'Form control is visible without a programmatic label.',
        });
      }
    }

    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const button of buttons) {
      if (!isVisible(button) || !(button instanceof HTMLElement)) {
        continue;
      }
      const accessibleText = (
        button.innerText ||
        button.getAttribute('aria-label') ||
        button.getAttribute('aria-labelledby') ||
        button.getAttribute('title') ||
        ''
      ).trim();
      if (!accessibleText) {
        semanticIssues.push({
          selector: getSelector(button),
          message: 'Interactive button is visible without an accessible name.',
        });
      }
    }

    const navs = Array.from(document.querySelectorAll('nav')).filter((element) => isVisible(element));
    if (navs.length > 1) {
      for (const nav of navs) {
        if (
          !(nav instanceof HTMLElement) ||
          nav.getAttribute('aria-label') ||
          nav.getAttribute('aria-labelledby')
        ) {
          continue;
        }
        semanticIssues.push({
          selector: getSelector(nav),
          message: 'Multiple navigation landmarks are visible but this nav is unnamed.',
        });
      }
    }

    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]'));
    for (const dialog of dialogs) {
      if (!isVisible(dialog)) {
        continue;
      }
      if (!dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby')) {
        semanticIssues.push({
          selector: getSelector(dialog),
          message: 'Visible dialog is missing aria-label or aria-labelledby.',
        });
      }
    }

    const visibleHeadingCount = Array.from(
      document.querySelectorAll('h1, h2, h3, [role="heading"]')
    ).filter((element) => isVisible(element)).length;
    const visibleLandmarkCount = Array.from(
      document.querySelectorAll('main, [role="main"], section, article')
    ).filter((element) => isVisible(element)).length;
    const visibleTextSampleCount = Array.from(uniqueElements).filter((element) => {
      const content = (element.textContent || '').trim();
      return content.length >= 3;
    }).length;

    return {
      contrastFailures,
      semanticIssues,
      readability: {
        visibleHeadingCount,
        visibleLandmarkCount,
        visibleTextSampleCount,
      },
    };
  });
}

export async function collectFocusIssues(page: Page, steps: number = 8): Promise<FocusProbe[]> {
  const issues: FocusProbe[] = [];
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press('Tab');
    const focusProbe = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) {
        return null;
      }

      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute('role');
      const isInteractive =
        ['a', 'button', 'input', 'select', 'textarea', 'summary'].includes(tagName) ||
        ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'combobox', 'textbox'].includes(
          role || ''
        ) ||
        element.tabIndex >= 0;

      if (!isInteractive || ['body', 'html'].includes(tagName)) {
        return null;
      }

      const style = window.getComputedStyle(element);
      const label = (
        element.innerText ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.getAttribute('placeholder') ||
        ''
      ).trim();
      const dataTestId = element.getAttribute('data-testid');
      const selector = element.id
        ? `#${element.id}`
        : dataTestId
          ? `[data-testid="${dataTestId}"]`
          : element.tagName.toLowerCase();

      const outlineWidth = style.outlineWidth || '0px';
      const visibleIndicator =
        (style.outlineStyle && style.outlineStyle !== 'none' && Number.parseFloat(outlineWidth) > 0) ||
        style.boxShadow !== 'none';

      return {
        selector,
        label: label.slice(0, 80),
        visibleIndicator,
        outlineWidth,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

    if (focusProbe && !focusProbe.visibleIndicator) {
      issues.push(focusProbe);
    }
  }

  return issues;
}

export function buildFindingsFromProbe(input: {
  routeId: string;
  routePath: string;
  routeTitle: string;
  surface: string;
  fixtureState?: string;
  screenshot?: string;
  darkModeApplied: boolean;
  pageProbe: PageProbe;
  focusIssues: FocusProbe[];
}): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const {
    routeId,
    routePath,
    routeTitle,
    surface,
    fixtureState,
    screenshot,
    darkModeApplied,
    pageProbe,
    focusIssues,
  } = input;

  if (!darkModeApplied) {
    findings.push({
      severity: 'critical',
      type: 'runtime',
      routeId,
      routePath,
      routeTitle,
      surface,
      fixtureState,
      screenshot,
      message: 'Dark mode preference did not apply before the page was audited.',
      recommendation: 'Ensure the theme bootstrapping path honors localStorage dark mode before first meaningful paint.',
    });
  }

  if (pageProbe.readability.visibleHeadingCount === 0 && pageProbe.readability.visibleTextSampleCount < 5) {
    findings.push({
      severity: 'critical',
      type: 'readability',
      routeId,
      routePath,
      routeTitle,
      surface,
      fixtureState,
      screenshot,
      message: 'Primary page content appears blank or visually unreadable after load.',
      recommendation: 'Verify dark-mode text tokens, page-level surfaces, and route-specific content rendering for this screen.',
    });
  }

  for (const failure of pageProbe.contrastFailures.slice(0, 10)) {
    findings.push({
      severity: failure.ratio < 3 ? 'critical' : 'serious',
      type: 'contrast',
      routeId,
      routePath,
      routeTitle,
      surface,
      selector: failure.selector,
      fixtureState,
      screenshot,
      message: `Contrast ratio ${failure.ratio}:1 is below the required ${failure.requiredRatio}:1 threshold for "${failure.text}".`,
      recommendation: 'Adjust the affected foreground or surface token so text and placeholders meet WCAG AA in dark mode.',
    });
  }

  for (const issue of pageProbe.semanticIssues.slice(0, 10)) {
    findings.push({
      severity: 'moderate',
      type: 'semantic',
      routeId,
      routePath,
      routeTitle,
      surface,
      selector: issue.selector,
      fixtureState,
      screenshot,
      message: issue.message,
      recommendation: 'Add an explicit accessible name or landmark label so the element is understandable to assistive technologies.',
    });
  }

  for (const focusIssue of focusIssues.slice(0, 8)) {
    findings.push({
      severity: 'serious',
      type: 'focus',
      routeId,
      routePath,
      routeTitle,
      surface,
      selector: focusIssue.selector,
      fixtureState,
      screenshot,
      message: `Focused element "${focusIssue.label || focusIssue.selector}" does not expose a visible focus indicator.`,
      recommendation: 'Apply a consistent focus-visible style using the shared focus-ring token on interactive controls.',
    });
  }

  return findings;
}

export async function captureRouteScreenshot(page: Page, routeId: string, routePath: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${slugForRoute(routeId, routePath)}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return toPosix(path.relative(process.cwd(), filePath));
}

export function blockedFinding(input: {
  routeId: string;
  routePath: string;
  routeTitle: string;
  surface: string;
  message: string;
  recommendation: string;
  fixtureState?: string;
}): AuditFinding {
  return {
    severity: 'blocked',
    type: 'blocked',
    routeId: input.routeId,
    routePath: input.routePath,
    routeTitle: input.routeTitle,
    surface: input.surface,
    fixtureState: input.fixtureState,
    message: input.message,
    recommendation: input.recommendation,
  };
}

export function runtimeFinding(input: {
  routeId: string;
  routePath: string;
  routeTitle: string;
  surface: string;
  message: string;
  recommendation: string;
  screenshot?: string;
  fixtureState?: string;
}): AuditFinding {
  return {
    severity: 'critical',
    type: 'runtime',
    routeId: input.routeId,
    routePath: input.routePath,
    routeTitle: input.routeTitle,
    surface: input.surface,
    fixtureState: input.fixtureState,
    screenshot: input.screenshot,
    message: input.message,
    recommendation: input.recommendation,
  };
}

export function writeAuditReport(input: ReportInput): void {
  const auditedRecords = input.records.filter((record) => !record.skippedReason);
  const skippedRecords = input.records.filter((record) => record.skippedReason);
  const allFindings = auditedRecords.flatMap((record) => record.findings);
  allFindings.sort((left, right) => severityRank[left.severity] - severityRank[right.severity]);

  const surfaceCounts = new Map<string, { routes: number; findings: number }>();
  for (const record of auditedRecords) {
    const current = surfaceCounts.get(record.surface) || { routes: 0, findings: 0 };
    current.routes += 1;
    current.findings += record.findings.length;
    surfaceCounts.set(record.surface, current);
  }

  const summaryLines = [
    '# Dark Mode Accessibility Audit',
    '',
    `Generated: ${input.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Routes audited: ${auditedRecords.length}`,
    `- Routes skipped: ${skippedRecords.length}`,
    `- Findings: ${allFindings.length}`,
    `- Critical: ${allFindings.filter((finding) => finding.severity === 'critical').length}`,
    `- Serious: ${allFindings.filter((finding) => finding.severity === 'serious').length}`,
    `- Moderate: ${allFindings.filter((finding) => finding.severity === 'moderate').length}`,
    `- Blocked: ${allFindings.filter((finding) => finding.severity === 'blocked').length}`,
    `- Screenshot root: \`${toPosix(path.relative(process.cwd(), input.screenshotRoot))}\``,
    '',
    '## Surface Coverage',
    '',
    '| Surface | Routes | Findings |',
    '| --- | ---: | ---: |',
    ...Array.from(surfaceCounts.entries()).map(
      ([surface, counts]) => `| ${surface} | ${counts.routes} | ${counts.findings} |`
    ),
    '',
    '## Findings',
    '',
  ];

  const grouped = new Map<string, AuditFinding[]>();
  for (const finding of allFindings) {
    const key = `${finding.surface}:${finding.routeTitle}:${finding.routePath}`;
    const current = grouped.get(key) || [];
    current.push(finding);
    grouped.set(key, current);
  }

  for (const [key, findings] of grouped.entries()) {
    const first = findings[0];
    summaryLines.push(`### ${first.surface} · ${first.routeTitle} · \`${first.routePath}\``);
    summaryLines.push('');
    for (const finding of findings) {
      summaryLines.push(`- [${finding.severity.toUpperCase()}] ${finding.message}`);
      if (finding.selector) {
        summaryLines.push(`  Selector: \`${finding.selector}\``);
      }
      if (finding.fixtureState) {
        summaryLines.push(`  Fixture: ${finding.fixtureState}`);
      }
      if (finding.screenshot) {
        summaryLines.push(`  Screenshot: \`${finding.screenshot}\``);
      }
      summaryLines.push(`  Recommendation: ${finding.recommendation}`);
    }
    summaryLines.push('');
  }

  if (allFindings.length === 0) {
    summaryLines.push('No dark-mode readability or accessibility findings were recorded in this run.');
    summaryLines.push('');
  }

  if (skippedRecords.length > 0) {
    summaryLines.push('## Skipped Routes');
    summaryLines.push('');
    for (const record of skippedRecords) {
      summaryLines.push(`- ${record.surface} · ${record.routeTitle} · \`${record.routePath}\`: ${record.skippedReason}`);
      if (record.fixtureState) {
        summaryLines.push(`  Context: ${record.fixtureState}`);
      }
    }
    summaryLines.push('');
  }

  fs.mkdirSync(path.dirname(input.reportPath), { recursive: true });
  fs.writeFileSync(input.reportPath, summaryLines.join('\n'));
}
