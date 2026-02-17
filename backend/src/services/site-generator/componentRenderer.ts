import type { PublishedComponent, PublishedSection, PublishedTheme } from '@app-types/publishing';
import {
  generateButton,
  generateDivider,
  generateHeading,
  generateSpacer,
  generateStats,
  generateTestimonial,
  generateText,
} from './componentRenderer/primitives';
import { generateGallery, generateImage, generateVideo } from './componentRenderer/media';
import {
  generateContactForm,
  generateDonationForm,
  generateNewsletterSignup,
  generateSocialLinks,
} from './componentRenderer/forms';

export function generateSectionHtml(section: PublishedSection, theme: PublishedTheme): string {
  const style: string[] = [];

  if (section.backgroundColor) style.push(`background-color: ${section.backgroundColor}`);
  if (section.backgroundImage) style.push(`background-image: url('${section.backgroundImage}'); background-size: cover; background-position: center`);
  if (section.paddingTop) style.push(`padding-top: ${section.paddingTop}`);
  if (section.paddingBottom) style.push(`padding-bottom: ${section.paddingBottom}`);
  if (section.paddingLeft) style.push(`padding-left: ${section.paddingLeft}`);
  if (section.paddingRight) style.push(`padding-right: ${section.paddingRight}`);

  const styleAttr = style.length ? `style="${style.join('; ')}"` : '';
  const maxWidth = section.maxWidth || '1200px';

  return `
    <section class="site-section" ${styleAttr}>
      <div class="section-container" style="max-width: ${maxWidth}; margin: 0 auto;">
        ${section.components.map((component) => generateComponentHtml(component, theme)).join('\n')}
      </div>
    </section>`;
}

function generateComponentHtml(component: PublishedComponent, theme: PublishedTheme): string {
  switch (component.type) {
    case 'heading':
      return generateHeading(component, theme);
    case 'text':
      return generateText(component, theme);
    case 'button':
      return generateButton(component, theme);
    case 'image':
      return generateImage(component);
    case 'divider':
      return generateDivider(component, theme);
    case 'spacer':
      return generateSpacer(component);
    case 'stats':
      return generateStats(component, theme);
    case 'testimonial':
      return generateTestimonial(component, theme);
    case 'gallery':
      return generateGallery(component);
    case 'video':
      return generateVideo(component);
    case 'contact-form':
      return generateContactForm(component, theme);
    case 'newsletter-signup':
      return generateNewsletterSignup(component, theme);
    case 'donation-form':
      return generateDonationForm(component, theme);
    case 'social-links':
      return generateSocialLinks(component);
    default:
      return `<!-- Unknown component type: ${component.type} -->`;
  }
}
