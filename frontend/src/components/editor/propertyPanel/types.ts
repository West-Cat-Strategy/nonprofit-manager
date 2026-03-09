import type {
  PageComponent,
  PageSection,
  TemplatePage,
  UpdatePageRequest,
} from '../../../types/websiteBuilder';

export interface PropertyPanelProps {
  currentPage?: TemplatePage | null;
  selectedComponent: PageComponent | null;
  selectedSection: PageSection | null;
  onUpdatePage?: (updates: UpdatePageRequest) => void;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
  onUpdateSection: (id: string, updates: Partial<PageSection>) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteSection: (id: string) => void;
}

export interface PagePropertyEditorProps {
  currentPage: TemplatePage;
  onUpdatePage: (updates: UpdatePageRequest) => void;
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
