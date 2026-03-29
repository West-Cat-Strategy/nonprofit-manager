import type { PublishedComponent, PublishedTheme } from '@app-types/publishing';
import { escapeHtml } from '../escapeHtml';
import { getSocialIcon } from '../socialIcons';
import { sanitizeRenderableUrl } from '../urlSanitizer';

export function generateContactForm(component: PublishedComponent, theme: PublishedTheme): string {
  const submitText = (component.submitText as string) || 'Send Message';
  const includePhone = component.includePhone !== false;
  const includeMessage = component.includeMessage !== false;

  return `
      <form class="contact-form npm-form" style="display: grid; gap: 1rem; max-width: 520px; margin: 0 auto; padding: 1.25rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; box-shadow: ${theme.shadows.sm};">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Name</label>
          <input type="text" name="name" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Email</label>
          <input type="email" name="email" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ${includePhone ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Phone</label>
          <input type="tel" name="phone" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ` : ''}
        ${includeMessage ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Message</label>
          <textarea name="message" rows="4" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; resize: vertical;"></textarea>
        </div>
        ` : ''}
        <button type="submit" class="btn" style="width: 100%; padding: 0.9rem 1rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.full}; cursor: pointer; font-weight: 600; box-shadow: ${theme.shadows.sm};">${escapeHtml(submitText)}</button>
      </form>`;
}

export function generateNewsletterSignup(component: PublishedComponent, theme: PublishedTheme): string {
  const buttonText = (component.buttonText as string) || 'Subscribe';

  return `
      <form class="newsletter-form npm-form" style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: stretch; max-width: 520px; margin: 0 auto;">
        <input type="email" name="email" placeholder="Enter your email" required style="flex: 1 1 14rem; min-width: 0; padding: 0.85rem 0.9rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.full};">
        <button type="submit" class="btn" style="padding: 0.85rem 1.5rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.full}; cursor: pointer; font-weight: 600; white-space: nowrap; box-shadow: ${theme.shadows.sm};">${escapeHtml(buttonText)}</button>
      </form>`;
}

export function generateDonationForm(component: PublishedComponent, theme: PublishedTheme): string {
  const amounts = (component.suggestedAmounts as number[]) || [25, 50, 100, 250];
  const allowCustom = component.allowCustomAmount !== false;

  return `
      <form class="donation-form npm-form" style="display: grid; gap: 1rem; max-width: 520px; margin: 0 auto; padding: 1.25rem; text-align: center; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; box-shadow: ${theme.shadows.sm};">
        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          ${amounts.map((amount) => `
            <button type="button" class="amount-btn btn" data-amount="${amount}" style="padding: 0.75rem 1.25rem; background: white; border: 2px solid ${theme.colors.primary}; border-radius: ${theme.borderRadius.full}; cursor: pointer; color: ${theme.colors.primary}; font-weight: 600;">$${amount}</button>
          `).join('\n')}
        </div>
        ${allowCustom ? `
        <div style="margin-bottom: 1rem;">
          <input type="number" name="custom_amount" placeholder="Custom amount" style="width: 100%; padding: 0.85rem 0.9rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.full}; text-align: center;">
        </div>
        ` : ''}
        <button type="submit" class="btn" style="width: 100%; padding: 1rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.full}; cursor: pointer; font-weight: 700; font-size: 1.05rem; box-shadow: ${theme.shadows.sm};">Donate Now</button>
      </form>`;
}

export function generateSocialLinks(component: PublishedComponent): string {
  const links = (component.links as Array<{ platform: string; url: string }>) || [];
  const align = (component.align as string) || 'center';

  if (!links.length) return '';

  const justifyMap: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  return `
      <div class="social-links" style="display: flex; gap: 0.75rem; justify-content: ${justifyMap[align] || 'center'}; flex-wrap: wrap;">
        ${links
          .map((link) => {
            const safeUrl = sanitizeRenderableUrl(link.url);
            if (!safeUrl) {
              return '';
            }
            return `
          <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.platform)}" style="color: inherit; transition: opacity 0.2s, transform 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 9999px; border: 1px solid currentColor; opacity: 0.8;">
            ${getSocialIcon(link.platform)}
          </a>
        `;
          })
          .join('\n')}
      </div>`;
}
