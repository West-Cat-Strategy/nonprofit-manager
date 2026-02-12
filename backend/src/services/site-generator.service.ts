import type {
  GeneratedPage,
  PublishedContent,
  PublishedPage,
} from '@app-types/publishing';
import { generateThemeCSS, renderPageHtml } from './site-generator';

export class SiteGeneratorService {
  generateSite(content: PublishedContent): GeneratedPage[] {
    return content.pages.map((page) => this.generatePage(page, content));
  }

  generatePage(page: PublishedPage, content: PublishedContent): GeneratedPage {
    const css = generateThemeCSS(content.theme);
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
