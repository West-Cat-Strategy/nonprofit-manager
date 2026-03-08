import type { PublishedComponent, PublishedSite } from '@app-types/publishing';
import {
  mergeManagedComponentConfig,
  WebsiteSiteSettingsService,
} from '@services/publishing/siteSettingsService';

type PublicSiteSettings = Awaited<ReturnType<WebsiteSiteSettingsService['getPublicSettings']>>;

export class PublicSiteRenderableSiteBuilder {
  constructor(private readonly siteSettings: WebsiteSiteSettingsService) {}

  private mergeComponentSettings(
    component: PublishedComponent,
    settings: PublicSiteSettings
  ): PublishedComponent {
    const withSettings = mergeManagedComponentConfig(component, settings);
    const componentRecord = withSettings as PublishedComponent & {
      components?: PublishedComponent[];
      columns?: Array<{ components?: PublishedComponent[] }>;
    };

    if (Array.isArray(componentRecord.components)) {
      componentRecord.components = componentRecord.components.map((nested) =>
        this.mergeComponentSettings(nested, settings)
      );
    }

    if (Array.isArray(componentRecord.columns)) {
      componentRecord.columns = componentRecord.columns.map((column) => ({
        ...column,
        components: Array.isArray(column.components)
          ? column.components.map((nested) => this.mergeComponentSettings(nested, settings))
          : [],
      }));
    }

    return componentRecord;
  }

  async buildRenderableSite(site: PublishedSite): Promise<PublishedSite> {
    if (!site.publishedContent) {
      return site;
    }

    const settings = await this.siteSettings.getPublicSettings(site.id);

    return {
      ...site,
      publishedContent: {
        ...site.publishedContent,
        pages: site.publishedContent.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => ({
            ...section,
            components: section.components.map((component) =>
              this.mergeComponentSettings(component, settings)
            ),
          })),
        })),
      },
    };
  }
}
