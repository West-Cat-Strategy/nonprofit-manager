# Website Builder - Template System Documentation

## Overview

The Website Builder Template System allows nonprofits to create, customize, and preview professional websites using pre-built templates or building from scratch.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Template Structure](#template-structure)
- [Using the Template Gallery](#using-the-template-gallery)
- [Template Preview System](#template-preview-system)
- [Page Editor](#page-editor)
- [Publishing Websites](#publishing-websites)
- [API Reference](#api-reference)
- [Component Library](#component-library)

---

## Core Concepts

### Templates

Templates are complete website designs that can be customized for your nonprofit's needs. Each template consists of:

- **Theme**: Color palette, typography, spacing, and styling
- **Pages**: Multiple pages (home, about, donate, etc.)
- **Sections**: Page layout areas containing components
- **Components**: Individual UI elements (headings, images, buttons, etc.)
- **Global Settings**: Header, footer, navigation, and SEO configuration

### Template Types

Templates are categorized by purpose:

- `landing-page`: Single-page websites for campaigns
- `event`: Event showcases and registration pages
- `donation`: Fundraising campaign pages
- `blog`: News and blog-focused sites
- `multi-page`: Full nonprofit websites (5+ pages)
- `portfolio`: Project and impact showcases
- `contact`: Contact and inquiry pages

### Template Status

- `draft`: Work in progress, not visible to public
- `published`: Ready for use and visible in gallery
- `archived`: Deprecated or no longer in use

---

## Template Structure

### Database Schema

Templates are stored with the following structure:

```typescript
interface Template {
  id: string;
  userId: string | null;  // null for system templates
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  theme: TemplateTheme;
  globalSettings: TemplateGlobalSettings;
  status: TemplateStatus;
  isSystemTemplate: boolean;
  previewImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Theme Structure

```typescript
interface TemplateTheme {
  colors: {
    primary: string;      // Brand color
    secondary: string;    // Accent color
    accent: string;       // Call-to-action color
    background: string;   // Page background
    surface: string;      // Card/panel background
    text: string;         // Primary text color
    textMuted: string;    // Secondary text color
    border: string;       // Border color
    error: string;        // Error state color
    success: string;      // Success state color
    warning: string;      // Warning state color
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
    baseFontSize: string;
    lineHeight: string;
    headingLineHeight: string;
    fontWeightNormal: number;
    fontWeightMedium: number;
    fontWeightBold: number;
  };
  spacing: {
    xs: string;   // 0.25rem
    sm: string;   // 0.5rem
    md: string;   // 1rem
    lg: string;   // 1.5rem
    xl: string;   // 2rem
    xxl: string;  // 3rem
  };
  borderRadius: {
    sm: string;   // 0.25rem
    md: string;   // 0.5rem
    lg: string;   // 1rem
    full: string; // 9999px (fully rounded)
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
```

### Pages

Each template can have multiple pages:

```typescript
interface TemplatePage {
  id: string;
  templateId: string;
  name: string;
  slug: string;           // URL-friendly identifier
  isHomepage: boolean;
  order: number;
  sections: PageSection[];
  seo: PageSEO;
  createdAt: Date;
  updatedAt: Date;
}
```

### Sections

Pages are composed of sections:

```typescript
interface PageSection {
  id: string;
  name: string;
  components: PageComponent[];
  backgroundColor?: string;
  backgroundImage?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  maxWidth?: string;
  fullWidth?: boolean;
  hidden?: boolean;
}
```

---

## Using the Template Gallery

### Browsing Templates

1. Navigate to `/website-builder`
2. Browse **Starter Templates** (system-provided) or **My Templates** (your custom templates)
3. Use filters:
   - Search by name/description
   - Filter by category
   - Filter by status (for My Templates)

### Template Actions

- **Preview**: View template in browser before use
- **Use Template**: Duplicate and start editing
- **Duplicate**: Create a copy for customization
- **Delete**: Remove template (My Templates only)

### Creating a New Template

Two options:

1. **Start from Template**:
   - Select a starter template
   - Click "Use Template"
   - Customize to your needs

2. **Start from Scratch**:
   - Click "New Website"
   - Choose "Start from Scratch"
   - Build page by page

---

## Template Preview System

The preview system allows you to see exactly how a template will look before publishing.

### How It Works

1. **Backend Preview Generation**:
   ```
   GET /api/templates/:templateId/preview?page=home
   ```
   - Fetches template and page data
   - Converts to published format
   - Generates static HTML/CSS
   - Returns rendered HTML

2. **Frontend Preview Display**:
   - Click "Preview" button on any template
   - Opens in full-screen preview mode
   - Rendered in isolated iframe
   - Exit to return to gallery

### Preview URL Parameters

- `page` (optional): Page slug to preview (default: "home")

Example:
```
/website-builder/:templateId/preview?page=about
```

### Implementation Details

**Backend Service** (`templateService.ts`):
```typescript
generateTemplatePreview(
  templateId: string,
  userId: string,
  pageSlug: string
): Promise<GeneratedPage | null>
```

**Controller** (`templateController.ts`):
```typescript
previewTemplate(req: AuthRequest, res: Response): Promise<void>
```

**Frontend Component** (`TemplatePreview.tsx`):
- Fetches HTML with authentication
- Displays in iframe
- Provides navigation controls

---

## Page Editor

The drag-and-drop page editor allows visual customization of templates.

### Editor Features

- **Component Palette**: 25+ draggable components
- **Canvas**: Live editing area with drop zones
- **Property Panel**: Customize selected components
- **Responsive Preview**: Desktop, tablet, mobile views
- **Undo/Redo**: Full history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Auto-save**: Automatic saving every 2 seconds
- **Version History**: Save and restore previous versions

### Component Categories

1. **Layout**: Columns, divider, spacer
2. **Content**: Text, heading, image, video
3. **Interactive**: Button, form, contact form
4. **Media**: Gallery, map, video embed
5. **Data**: Stats, testimonial, pricing, FAQ
6. **Nonprofit**: Donation form, event list, team, newsletter signup
7. **Special**: Hero, card, countdown, logo grid, social links

### Editing Workflow

1. **Add Components**:
   - Drag from Component Palette
   - Drop into section

2. **Customize Properties**:
   - Select component
   - Edit in Property Panel
   - Changes apply instantly

3. **Arrange Sections**:
   - Drag to reorder
   - Add new sections
   - Delete unused sections

4. **Configure SEO**:
   - Page title and description
   - Keywords
   - Open Graph image
   - Canonical URL

5. **Save**:
   - Auto-saves every 2 seconds
   - Manual save: Ctrl+S
   - Version snapshots available

---

## Publishing Websites

### Publishing Process

1. **Prepare Template**:
   - Complete all pages
   - Test in preview mode
   - Verify links and images

2. **Publish Site**:
   ```
   POST /api/sites/publish
   {
     "templateId": "uuid",
     "name": "My Nonprofit Site",
     "subdomain": "mynonprofit"
   }
   ```

3. **Access Site**:
   - Subdomain: `https://mynonprofit.npmsite.org`
   - Custom domain: Configure DNS and SSL

### Custom Domains

Add your own domain:

1. **Add Domain**:
   ```
   POST /api/sites/:siteId/domain
   {
     "customDomain": "www.mynonprofit.org"
   }
   ```

2. **Configure DNS**:
   - Add CNAME record: `www` → `your-subdomain.npmsite.org`
   - Or A record with provided IP

3. **Verify Domain**:
   ```
   POST /api/sites/:siteId/domain/verify
   ```

4. **Provision SSL**:
   - Automatic Let's Encrypt certificate
   - Auto-renewal every 60 days

### Version Management

Roll back to previous versions:

```
POST /api/sites/:siteId/versions/:versionId/rollback
```

View version history:

```
GET /api/sites/:siteId/versions
```

---

## API Reference

### Template Endpoints

#### List Templates
```http
GET /api/templates
Query Parameters:
  - search: string
  - category: TemplateCategory
  - status: TemplateStatus
  - page: number
  - limit: number
  - sortBy: 'name' | 'createdAt' | 'updatedAt'
  - sortOrder: 'asc' | 'desc'
```

#### Get Template
```http
GET /api/templates/:templateId
```

#### Create Template
```http
POST /api/templates
Body: {
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  theme?: TemplateTheme;
  globalSettings?: TemplateGlobalSettings;
  cloneFromId?: string;
}
```

#### Update Template
```http
PUT /api/templates/:templateId
Body: Partial<Template>
```

#### Delete Template
```http
DELETE /api/templates/:templateId
```

#### Duplicate Template
```http
POST /api/templates/:templateId/duplicate
Body: { name?: string }
```

#### Preview Template
```http
GET /api/templates/:templateId/preview?page=home
Returns: HTML string
```

#### Get System Templates
```http
GET /api/templates/system
```

### Page Endpoints

#### List Pages
```http
GET /api/templates/:templateId/pages
```

#### Get Page
```http
GET /api/templates/:templateId/pages/:pageId
```

#### Create Page
```http
POST /api/templates/:templateId/pages
Body: {
  name: string;
  slug: string;
  isHomepage?: boolean;
  seo?: PageSEO;
  sections?: PageSection[];
}
```

#### Update Page
```http
PUT /api/templates/:templateId/pages/:pageId
Body: Partial<TemplatePage>
```

#### Delete Page
```http
DELETE /api/templates/:templateId/pages/:pageId
```

#### Reorder Pages
```http
PUT /api/templates/:templateId/pages/reorder
Body: { pageIds: string[] }
```

### Version Endpoints

#### Get Versions
```http
GET /api/templates/:templateId/versions
```

#### Create Version
```http
POST /api/templates/:templateId/versions
Body: { changes?: string }
```

#### Restore Version
```http
POST /api/templates/:templateId/versions/:versionId/restore
```

---

## Component Library

### Text Component
```typescript
{
  type: 'text',
  content: string,
  align?: 'left' | 'center' | 'right' | 'justify',
  color?: string,
  fontSize?: string
}
```

### Heading Component
```typescript
{
  type: 'heading',
  content: string,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  align?: TextAlign,
  color?: string
}
```

### Image Component
```typescript
{
  type: 'image',
  src: string,
  alt: string,
  width?: string,
  height?: string,
  objectFit?: 'cover' | 'contain' | 'fill' | 'none',
  borderRadius?: string,
  caption?: string,
  link?: string
}
```

### Button Component
```typescript
{
  type: 'button',
  text: string,
  href?: string,
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link',
  size?: 'sm' | 'md' | 'lg' | 'xl',
  fullWidth?: boolean,
  icon?: string,
  iconPosition?: 'left' | 'right'
}
```

### Gallery Component
```typescript
{
  type: 'gallery',
  items: Array<{
    id: string,
    src: string,
    alt: string,
    caption?: string,
    link?: string
  }>,
  columns: 2 | 3 | 4,
  gap?: string,
  aspectRatio?: string
}
```

### Form Component
```typescript
{
  type: 'form',
  fields: Array<{
    id: string,
    name: string,
    label: string,
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio',
    placeholder?: string,
    required?: boolean,
    options?: Array<{ label: string, value: string }>
  }>,
  submitText: string,
  submitAction: string,
  successMessage: string,
  errorMessage: string
}
```

### Video Component
```typescript
{
  type: 'video',
  src: string,
  provider?: 'youtube' | 'vimeo' | 'custom',
  autoplay?: boolean,
  loop?: boolean,
  muted?: boolean,
  controls?: boolean,
  poster?: string,
  aspectRatio?: string
}
```

### Stats Component
```typescript
{
  type: 'stats',
  items: Array<{
    value: string,
    label: string,
    description?: string,
    icon?: string
  }>,
  columns: 2 | 3 | 4,
  align?: TextAlign
}
```

### Social Links Component
```typescript
{
  type: 'social-links',
  links: Array<{
    platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok',
    url: string
  }>,
  iconSize?: 'sm' | 'md' | 'lg',
  iconStyle?: 'filled' | 'outline' | 'rounded',
  align?: TextAlign
}
```

---

## Best Practices

### Template Design

1. **Mobile-First**: Design for mobile, enhance for desktop
2. **Accessibility**: Use semantic HTML, ARIA labels, sufficient contrast
3. **Performance**: Optimize images, lazy load below-fold content
4. **SEO**: Complete meta tags, structured data, descriptive URLs
5. **Brand Consistency**: Use theme colors and typography throughout

### Content Guidelines

1. **Clear Hierarchy**: Use heading levels appropriately (H1 → H6)
2. **Compelling CTAs**: Action-oriented button text
3. **Alt Text**: Descriptive image alt text for accessibility
4. **Concise Copy**: Short paragraphs, scannable content
5. **Contact Info**: Easy to find contact information

### Testing Checklist

- [ ] Preview on desktop, tablet, and mobile
- [ ] Test all links and buttons
- [ ] Verify forms submit correctly
- [ ] Check image loading and sizing
- [ ] Validate SEO meta tags
- [ ] Test with screen readers
- [ ] Check page load speed (< 3 seconds)
- [ ] Verify analytics tracking

---

## Troubleshooting

### Template Not Saving
- Check auto-save status indicator
- Manually save with Ctrl+S
- Check browser console for errors
- Verify network connection

### Preview Not Loading
- Ensure template has at least one page
- Check that template is accessible by your user
- Clear browser cache
- Check for JavaScript errors in console

### Images Not Displaying
- Verify image URLs are absolute (https://)
- Check image file formats (JPG, PNG, WebP, SVG)
- Ensure images are publicly accessible
- Try re-uploading images

### Custom Domain Not Working
- Verify DNS records are correctly configured
- Allow 24-48 hours for DNS propagation
- Check SSL certificate status
- Contact support if issues persist

---

## Support

For additional help:

- **Documentation**: [docs/](../docs/)
- **API Reference**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/nonprofit-manager/issues)
- **Email**: support@yournonprofit.org

---

**Last Updated**: February 1, 2026
**Version**: 1.0.0
