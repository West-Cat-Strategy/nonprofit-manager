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
    return '<div class="image-placeholder" style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 0.5rem; padding: 3rem; text-align: center; color: #64748b; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;"><svg style="width: 2.5rem; height: 2.5rem; margin-bottom: 0.75rem; color: #94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span style="font-weight: 500;">Image Placeholder</span><span style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem;">Add content in editor</span></div>';
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

  if (!items.length) return '<div class="gallery-placeholder" style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 0.5rem; padding: 2rem; text-align: center; color: #64748b; font-family: sans-serif;">Gallery - add images in editor</div>';

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
    return '<div class="video-placeholder" style="background: #0f172a; border-radius: 0.5rem; aspect-ratio: ' + aspectRatio + '; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-family: sans-serif; text-align: center; padding: 2rem;"><svg style="width: 3rem; height: 3rem; margin-bottom: 1rem; color: #475569;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span style="font-weight: 500;">Video Placeholder</span><span style="font-size: 0.75rem; margin-top: 0.25rem;">Add URL in editor</span></div>';
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
