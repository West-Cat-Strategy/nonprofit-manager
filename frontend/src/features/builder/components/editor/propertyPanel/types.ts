import type {
  PageCollectionType,
  PageComponent,
  PageSection,
  TemplatePage,
  TemplatePageType,
  UpdatePageRequest,
} from '../../../../../types/websiteBuilder';

export interface PageSettingsDraft {
  name: string;
  slug: string;
  pageType: TemplatePageType;
  collection?: PageCollectionType;
  routePattern: string;
  isHomepage: boolean;
}

export interface PropertyPanelProps {
  currentPage?: TemplatePage | null;
  selectedComponent: PageComponent | null;
  selectedSection: PageSection | null;
  onUpdatePage?: (updates: UpdatePageRequest) => void;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
  onUpdateSection: (id: string, updates: Partial<PageSection>) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteSection: (id: string) => void;
  previewHref?: string | null;
  onPublishPage?: (draft: PageSettingsDraft) => Promise<void> | void;
  canPublish?: boolean;
  isPublishing?: boolean;
}

export interface PagePropertyEditorProps {
  currentPage: TemplatePage;
  onUpdatePage: (updates: UpdatePageRequest) => void | Promise<void>;
  previewHref?: string | null;
  onPublishPage?: (draft: PageSettingsDraft) => Promise<void> | void;
  canPublish?: boolean;
  isPublishing?: boolean;
}

export interface SectionPropertyEditorProps {
  selectedSection: PageSection;
  onUpdateSection: (id: string, updates: Partial<PageSection>) => void;
  onDeleteSection: (id: string) => void;
}

export interface ComponentPropertyEditorProps {
  selectedComponent: PageComponent;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
  onDeleteComponent: (id: string) => void;
}
