import type { PublishedSite, RenderablePublishedComponent } from '@app-types/publishing';
import {
  mergeManagedComponentConfig,
  WebsiteSiteSettingsService,
} from '@services/publishing/siteSettingsService';

type PublicSiteSettings = Awaited<ReturnType<WebsiteSiteSettingsService['getPublicSettings']>>;

export class PublicSiteRenderableSiteBuilder {
  constructor(private readonly siteSettings: WebsiteSiteSettingsService) {}

  private mergeComponentSettings(
    component: RenderablePublishedComponent,
    settings: PublicSiteSettings
  ): RenderablePublishedComponent {
    const withSettings = mergeManagedComponentConfig(component, settings);
    const componentRecord = withSettings as RenderablePublishedComponent & {
      components?: RenderablePublishedComponent[];
      columns?: Array<{ components?: RenderablePublishedComponent[] }>;
    };

    if (Array.isArray(componentRecord.components)) {
      componentRecord.components = componentRecord.components.map((nested) =>
        this.mergeComponentSettings(nested as RenderablePublishedComponent, settings)
      );
    }

    if (Array.isArray(componentRecord.columns)) {
      componentRecord.columns = componentRecord.columns.map((column) => ({
        ...column,
        components: Array.isArray(column.components)
          ? column.components.map((nested) =>
              this.mergeComponentSettings(nested as RenderablePublishedComponent, settings)
            )
          : [],
      }));
    }

    return componentRecord as RenderablePublishedComponent;
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
              this.mergeComponentSettings(component as RenderablePublishedComponent, settings)
            ),
          })),
        })),
      },
    };
  }
}
