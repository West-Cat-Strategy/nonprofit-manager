import type { PublishedComponent, PublishedTheme } from '@app-types/publishing';
import { escapeHtml } from '../escapeHtml';
import { getSocialIcon } from '../socialIcons';

export function generateContactForm(component: PublishedComponent, theme: PublishedTheme): string {
  const submitText = (component.submitText as string) || 'Send Message';
  const includePhone = component.includePhone !== false;
  const includeMessage = component.includeMessage !== false;

  return `
      <form class="contact-form" style="max-width: 500px; margin: 0 auto;">
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
        <button type="submit" style="width: 100%; padding: 0.75rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500;">${escapeHtml(submitText)}</button>
      </form>`;
}

export function generateNewsletterSignup(component: PublishedComponent, theme: PublishedTheme): string {
  const buttonText = (component.buttonText as string) || 'Subscribe';

  return `
      <form class="newsletter-form" style="display: flex; gap: 0.5rem; max-width: 400px; margin: 0 auto;">
        <input type="email" name="email" placeholder="Enter your email" required style="flex: 1; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        <button type="submit" style="padding: 0.75rem 1.5rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500; white-space: nowrap;">${escapeHtml(buttonText)}</button>
      </form>`;
}

export function generateDonationForm(component: PublishedComponent, theme: PublishedTheme): string {
  const amounts = (component.suggestedAmounts as number[]) || [25, 50, 100, 250];
  const allowCustom = component.allowCustomAmount !== false;

  return `
      <form class="donation-form" style="max-width: 400px; margin: 0 auto; text-align: center;">
        <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap;">
          ${amounts.map((amount) => `
            <button type="button" class="amount-btn" data-amount="${amount}" style="padding: 0.75rem 1.5rem; background: white; border: 2px solid ${theme.colors.primary}; border-radius: ${theme.borderRadius.md}; cursor: pointer; color: ${theme.colors.primary}; font-weight: 500;">$${amount}</button>
          `).join('\n')}
        </div>
        ${allowCustom ? `
        <div style="margin-bottom: 1rem;">
          <input type="number" name="custom_amount" placeholder="Custom amount" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; text-align: center;">
        </div>
        ` : ''}
        <button type="submit" style="width: 100%; padding: 1rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 600; font-size: 1.125rem;">Donate Now</button>
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
      <div class="social-links" style="display: flex; gap: 1rem; justify-content: ${justifyMap[align] || 'center'}; flex-wrap: wrap;">
        ${links.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.platform)}" style="color: inherit; transition: opacity 0.2s;">
            ${getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
      </div>`;
}
