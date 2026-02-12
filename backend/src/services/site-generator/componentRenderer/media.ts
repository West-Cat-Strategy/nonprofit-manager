import type { PublishedComponent } from '@app-types/publishing';
import { imageOptimizationService } from '../../imageOptimizationService';
import { escapeHtml } from '../escapeHtml';

export function generateImage(component: PublishedComponent): string {
  const src = (component.src as string) || '';
  const alt = (component.alt as string) || '';
  const width = (component.width as string) || '100%';
  const height = (component.height as string) || 'auto';
  const caption = component.caption as string;
  const priority = component.priority as boolean;

  if (!src) {
    return '<div class="image-placeholder" style="background: #f3f4f6; padding: 2rem; text-align: center; color: #9ca3af;">Image placeholder</div>';
  }

  const numericWidth = parseInt(width, 10);
  const optimizationOptions = {
    width: !isNaN(numericWidth) ? numericWidth : 1200,
    quality: 80,
    format: 'webp' as const,
    lazy: !priority,
  };

  const optimizedImageHtml = imageOptimizationService.generateOptimizedImageHtml(
    src,
    alt,
    optimizationOptions,
    'component-image'
  );

  const preloadHint = priority
    ? `<!-- Preload: ${imageOptimizationService.getPreloadLink(src, optimizationOptions)} -->`
    : '';

  return `
      ${preloadHint}
      <figure style="margin: 0;">
        <div style="width: ${width}; height: ${height}; overflow: hidden; border-radius: 0.5rem;">
          ${optimizedImageHtml}
        </div>
        ${caption ? `<figcaption style="text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem">${escapeHtml(caption)}</figcaption>` : ''}
      </figure>`;
}

export function generateGallery(component: PublishedComponent): string {
  const items = (component.items as Array<{ id: string; src: string; alt?: string; caption?: string }>) || [];
  const columns = (component.columns as number) || 3;

  if (!items.length) return '<div class="gallery-placeholder">Gallery - add images in editor</div>';

  const thumbnailWidth = Math.ceil(1200 / columns);

  return `
      <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 1rem;">
        ${items.map((item) => {
          const optimizedImageHtml = imageOptimizationService.generateOptimizedImageHtml(
            item.src,
            item.alt || '',
            { width: thumbnailWidth, quality: 75, lazy: true },
            'gallery-image'
          );

          return `
          <div class="gallery-item" style="position: relative; overflow: hidden; border-radius: 0.5rem; aspect-ratio: 1;">
            ${optimizedImageHtml}
            ${item.caption ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 0.5rem; font-size: 0.875rem;">${escapeHtml(item.caption)}</div>` : ''}
          </div>`;
        }).join('\n')}
      </div>`;
}

export function generateVideo(component: PublishedComponent): string {
  const src = (component.src as string) || '';
  const provider = (component.provider as string) || 'youtube';
  const aspectRatio = (component.aspectRatio as string) || '16/9';

  if (!src) {
    return '<div class="video-placeholder" style="background: #1f2937; padding: 4rem; text-align: center; color: #9ca3af; border-radius: 0.5rem;">Video - add URL in editor</div>';
  }

  let embedUrl = src;
  if (provider === 'youtube') {
    const match = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
  } else if (provider === 'vimeo') {
    const match = src.match(/vimeo\.com\/(\d+)/);
    if (match) embedUrl = `https://player.vimeo.com/video/${match[1]}`;
  }

  return `
      <div style="position: relative; aspect-ratio: ${aspectRatio}; overflow: hidden; border-radius: 0.5rem;">
        <iframe src="${escapeHtml(embedUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>`;
}
