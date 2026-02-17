import type {
  GeneratedPage,
  PublishedContent,
  PublishedPage,
} from '@app-types/publishing';
import { generateThemeCSS, renderPageHtml } from './site-generator';

export class SiteGeneratorService {
  generateSite(content: PublishedContent): GeneratedPage[] {
    const css = generateThemeCSS(content.theme);
    return content.pages.map((page) => this.generatePageWithCss(page, content, css));
  }

  generatePage(page: PublishedPage, content: PublishedContent): GeneratedPage {
    const css = generateThemeCSS(content.theme);
    return this.generatePageWithCss(page, content, css);
  }

  private generatePageWithCss(
    page: PublishedPage,
    content: PublishedContent,
    css: string
  ): GeneratedPage {
    const html = renderPageHtml(page, content, css);

    return {
      slug: page.slug,
      html,
      css,
    };
  }
}

export const siteGeneratorService = new SiteGeneratorService();
export default siteGeneratorService;
