/**
 * Website Builder Types
 * Type definitions for templates, pages, and website publishing
 */

// ==================== Template Types ====================

/**
 * Template categories for organization
 */
export type TemplateCategory =
  | 'landing-page'
  | 'event'
  | 'donation'
  | 'blog'
  | 'multi-page'
  | 'portfolio'
  | 'contact';

/**
 * Template status
 */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/**
 * Component types available in the page editor
 */
export type ComponentType =
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'form'
  | 'gallery'
  | 'video'
  | 'map'
  | 'social-links'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'hero'
  | 'card'
  | 'testimonial'
  | 'pricing'
  | 'faq'
  | 'contact-form'
  | 'donation-form'
  | 'event-list'
  | 'newsletter-signup'
  | 'countdown'
  | 'stats'
  | 'team'
  | 'logo-grid';

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

/**
 * Button sizes
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

// ==================== Style Types ====================

/**
 * Color palette for a template
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

/**
 * Typography settings
 */
export interface Typography {
  fontFamily: string;
  headingFontFamily: string;
  baseFontSize: string;
  lineHeight: string;
  headingLineHeight: string;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightBold: number;
}

/**
 * Spacing scale
 */
export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

/**
 * Border radius options
 */
export interface BorderRadius {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

/**
 * Shadow definitions
 */
export interface Shadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * Complete theme/style configuration
 */
export interface TemplateTheme {
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}

// ==================== Component Types ====================

/**
 * Base component properties
 */
export interface BaseComponentProps {
  id: string;
  type: ComponentType;
  className?: string;
  style?: Record<string, string | number>;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  responsive?: {
    mobile?: Partial<BaseComponentProps>;
    tablet?: Partial<BaseComponentProps>;
  };
}

/**
 * Text component
 */
export interface TextComponent extends BaseComponentProps {
  type: 'text';
  content: string;
  align?: TextAlign;
  color?: string;
  fontSize?: string;
}

/**
 * Heading component
 */
export interface HeadingComponent extends BaseComponentProps {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align?: TextAlign;
  color?: string;
}

/**
 * Image component
 */
export interface ImageComponent extends BaseComponentProps {
  type: 'image';
  src: string;
  alt: string;
  width?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius?: string;
  caption?: string;
  link?: string;
}

/**
 * Button component
 */
export interface ButtonComponent extends BaseComponentProps {
  type: 'button';
  text: string;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  onClick?: string; // action identifier
}

/**
 * Form field definition
 */
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Form component
 */
export interface FormComponent extends BaseComponentProps {
  type: 'form';
  fields: FormField[];
  submitText: string;
  submitAction: string; // endpoint or action
  successMessage: string;
  errorMessage: string;
}

/**
 * Gallery item
 */
export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  link?: string;
}

/**
 * Gallery component
 */
export interface GalleryComponent extends BaseComponentProps {
  type: 'gallery';
  items: GalleryItem[];
  columns: 2 | 3 | 4;
  gap?: string;
  aspectRatio?: string;
}

/**
 * Video component
 */
export interface VideoComponent extends BaseComponentProps {
  type: 'video';
  src: string;
  provider?: 'youtube' | 'vimeo' | 'custom';
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
  aspectRatio?: string;
}

/**
 * Map component
 */
export interface MapComponent extends BaseComponentProps {
  type: 'map';
  address?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  height?: string;
  showMarker?: boolean;
}

/**
 * Social link item
 */
export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'email' | 'website';
  url: string;
}

/**
 * Social links component
 */
export interface SocialLinksComponent extends BaseComponentProps {
  type: 'social-links';
  links: SocialLink[];
  iconSize?: 'sm' | 'md' | 'lg';
  iconStyle?: 'filled' | 'outline' | 'rounded';
  align?: TextAlign;
}

/**
 * Divider component
 */
export interface DividerComponent extends BaseComponentProps {
  type: 'divider';
  color?: string;
  thickness?: string;
  width?: string;
}

/**
 * Spacer component
 */
export interface SpacerComponent extends BaseComponentProps {
  type: 'spacer';
  height: string;
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  id: string;
  width: string; // e.g., '1/2', '1/3', '2/3', '1/4', '3/4'
  components: PageComponent[];
}

/**
 * Columns component
 */
export interface ColumnsComponent extends BaseComponentProps {
  type: 'columns';
  columns: ColumnDefinition[];
  gap?: string;
  verticalAlign?: 'top' | 'center' | 'bottom' | 'stretch';
}

/**
 * Hero component
 */
export interface HeroComponent extends BaseComponentProps {
  type: 'hero';
  backgroundImage?: string;
  backgroundColor?: string;
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  height?: string;
  minHeight?: string;
  verticalAlign?: 'top' | 'center' | 'bottom';
  components: PageComponent[];
}

/**
 * Card component
 */
export interface CardComponent extends BaseComponentProps {
  type: 'card';
  image?: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  link?: string;
  linkText?: string;
  shadow?: boolean;
}

/**
 * Testimonial component
 */
export interface TestimonialComponent extends BaseComponentProps {
  type: 'testimonial';
  quote: string;
  author: string;
  title?: string;
  avatar?: string;
  rating?: number;
}

/**
 * Pricing tier
 */
export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  highlighted?: boolean;
}

/**
 * Pricing component
 */
export interface PricingComponent extends BaseComponentProps {
  type: 'pricing';
  tiers: PricingTier[];
  columns?: 2 | 3 | 4;
}

/**
 * FAQ item
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * FAQ component
 */
export interface FAQComponent extends BaseComponentProps {
  type: 'faq';
  items: FAQItem[];
  expandFirst?: boolean;
  allowMultiple?: boolean;
}

/**
 * Contact form component (specialized form)
 */
export interface ContactFormComponent extends BaseComponentProps {
  type: 'contact-form';
  heading?: string;
  description?: string;
  submitText?: string;
  recipientEmail?: string;
  includePhone?: boolean;
  includeMessage?: boolean;
  successMessage?: string;
}

/**
 * Donation form component
 */
export interface DonationFormComponent extends BaseComponentProps {
  type: 'donation-form';
  heading?: string;
  description?: string;
  suggestedAmounts?: number[];
  allowCustomAmount?: boolean;
  recurringOption?: boolean;
  campaignId?: string;
}

/**
 * Event list component
 */
export interface EventListComponent extends BaseComponentProps {
  type: 'event-list';
  maxEvents?: number;
  showPastEvents?: boolean;
  layout?: 'list' | 'grid' | 'calendar';
  filterByTag?: string;
}

/**
 * Newsletter signup component
 */
export interface NewsletterSignupComponent extends BaseComponentProps {
  type: 'newsletter-signup';
  heading?: string;
  description?: string;
  buttonText?: string;
  mailchimpListId?: string;
  successMessage?: string;
}

/**
 * Countdown component
 */
export interface CountdownComponent extends BaseComponentProps {
  type: 'countdown';
  targetDate: string;
  title?: string;
  expiredMessage?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
}

/**
 * Stats item
 */
export interface StatsItem {
  id: string;
  value: string;
  label: string;
  icon?: string;
}

/**
 * Stats component
 */
export interface StatsComponent extends BaseComponentProps {
  type: 'stats';
  items: StatsItem[];
  columns?: 2 | 3 | 4;
}

/**
 * Team member
 */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image?: string;
  bio?: string;
  socialLinks?: SocialLink[];
}

/**
 * Team component
 */
export interface TeamComponent extends BaseComponentProps {
  type: 'team';
  members: TeamMember[];
  columns?: 2 | 3 | 4;
  showBio?: boolean;
  showSocial?: boolean;
}

/**
 * Logo item
 */
export interface LogoItem {
  id: string;
  src: string;
  alt: string;
  link?: string;
}

/**
 * Logo grid component
 */
export interface LogoGridComponent extends BaseComponentProps {
  type: 'logo-grid';
  logos: LogoItem[];
  columns?: 3 | 4 | 5 | 6;
  grayscale?: boolean;
  maxLogoHeight?: string;
}

/**
 * Union type of all page components
 */
export type PageComponent =
  | TextComponent
  | HeadingComponent
  | ImageComponent
  | ButtonComponent
  | FormComponent
  | GalleryComponent
  | VideoComponent
  | MapComponent
  | SocialLinksComponent
  | DividerComponent
  | SpacerComponent
  | ColumnsComponent
  | HeroComponent
  | CardComponent
  | TestimonialComponent
  | PricingComponent
  | FAQComponent
  | ContactFormComponent
  | DonationFormComponent
  | EventListComponent
  | NewsletterSignupComponent
  | CountdownComponent
  | StatsComponent
  | TeamComponent
  | LogoGridComponent;

// ==================== Section Types ====================

/**
 * Page section (container for components)
 */
export interface PageSection {
  id: string;
  name: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: boolean;
  backgroundOverlayColor?: string;
  backgroundOverlayOpacity?: number;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  maxWidth?: string;
  components: PageComponent[];
  hidden?: boolean;
}

// ==================== Page Types ====================

/**
 * SEO settings for a page
 */
export interface PageSEO {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

/**
 * Page definition
 */
export interface TemplatePage {
  id: string;
  name: string;
  slug: string;
  isHomepage: boolean;
  seo: PageSEO;
  sections: PageSection[];
  createdAt: string;
  updatedAt: string;
}

// ==================== Template Types ====================

/**
 * Template metadata
 */
export interface TemplateMetadata {
  author?: string;
  version: string;
  license?: string;
  previewImage?: string;
  thumbnailImage?: string;
  features?: string[];
  demoUrl?: string;
}

/**
 * Template navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
  children?: NavigationItem[];
}

/**
 * Template header settings
 */
export interface TemplateHeader {
  logo?: string;
  logoAlt?: string;
  logoLink?: string;
  navigation: NavigationItem[];
  sticky?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  showCTA?: boolean;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Template footer settings
 */
export interface TemplateFooter {
  logo?: string;
  logoAlt?: string;
  description?: string;
  columns: Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;
  socialLinks?: SocialLink[];
  copyright?: string;
  backgroundColor?: string;
  showNewsletter?: boolean;
}

/**
 * Global template settings
 */
export interface TemplateGlobalSettings {
  favicon?: string;
  language: string;
  header: TemplateHeader;
  footer: TemplateFooter;
  customCSS?: string;
  customJS?: string;
  analyticsId?: string;
}

/**
 * Template version for version history
 */
export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  changes?: string;
  createdAt: string;
  createdBy?: string;
  snapshot: {
    theme: TemplateTheme;
    globalSettings: TemplateGlobalSettings;
    pages: TemplatePage[];
  };
}

/**
 * Complete template definition
 */
export interface Template {
  id: string;
  userId?: string; // null for system templates
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  status: TemplateStatus;
  isSystemTemplate: boolean;
  theme: TemplateTheme;
  globalSettings: TemplateGlobalSettings;
  pages: TemplatePage[];
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

// ==================== API Request/Response Types ====================

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  theme?: Partial<TemplateTheme>;
  globalSettings?: Partial<TemplateGlobalSettings>;
  cloneFromId?: string; // clone from existing template
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  status?: TemplateStatus;
  theme?: Partial<TemplateTheme>;
  globalSettings?: Partial<TemplateGlobalSettings>;
}

/**
 * Create page request
 */
export interface CreatePageRequest {
  name: string;
  slug: string;
  isHomepage?: boolean;
  seo?: Partial<PageSEO>;
  sections?: PageSection[];
  cloneFromId?: string;
}

/**
 * Update page request
 */
export interface UpdatePageRequest {
  name?: string;
  slug?: string;
  isHomepage?: boolean;
  seo?: Partial<PageSEO>;
  sections?: PageSection[];
}

/**
 * Template list item (summary for lists)
 */
export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  status: TemplateStatus;
  isSystemTemplate: boolean;
  thumbnailImage?: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template search/filter parameters
 */
export interface TemplateSearchParams {
  search?: string;
  category?: TemplateCategory;
  tags?: string[];
  status?: TemplateStatus;
  isSystemTemplate?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated template response
 */
export interface TemplateSearchResponse {
  templates: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
