/**
 * useDocumentMeta Hook
 * Dynamically updates document title and meta tags for SEO and social sharing
 */

import { useEffect } from 'react';

interface MetaTagConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  siteName?: string;
}

const defaultConfig: MetaTagConfig = {
  siteName: 'Nonprofit Manager',
  type: 'website',
};

/**
 * Update a meta tag by property name
 */
const updateMetaTag = (property: string, content: string): void => {
  // Try to find existing tag
  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;

  if (!tag) {
    // Try name attribute for standard meta tags
    tag = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
  }

  if (tag) {
    tag.setAttribute('content', content);
  } else {
    // Create new tag if it doesn't exist
    const newTag = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('twitter:')) {
      newTag.setAttribute('property', property);
    } else {
      newTag.setAttribute('name', property);
    }
    newTag.setAttribute('content', content);
    document.head.appendChild(newTag);
  }
};

/**
 * Update canonical URL link tag
 */
const updateCanonical = (url: string): void => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (link) {
    link.setAttribute('href', url);
  } else {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    document.head.appendChild(link);
  }
};

/**
 * Hook to update document meta tags
 */
export const useDocumentMeta = (config: MetaTagConfig): void => {
  const { title, description, image, url, type, siteName } = config;

  useEffect(() => {
    const mergedConfig = { ...defaultConfig, title, description, image, url, type, siteName };
    const baseUrl = window.location.origin;

    // Update document title
    if (mergedConfig.title) {
      const fullTitle = `${mergedConfig.title} | ${mergedConfig.siteName}`;
      document.title = fullTitle;
      updateMetaTag('title', fullTitle);
      updateMetaTag('og:title', fullTitle);
      updateMetaTag('twitter:title', fullTitle);
    }

    // Update description
    if (mergedConfig.description) {
      updateMetaTag('description', mergedConfig.description);
      updateMetaTag('og:description', mergedConfig.description);
      updateMetaTag('twitter:description', mergedConfig.description);
    }

    // Update image
    if (mergedConfig.image) {
      const imageUrl = mergedConfig.image.startsWith('http')
        ? mergedConfig.image
        : `${baseUrl}${mergedConfig.image}`;
      updateMetaTag('og:image', imageUrl);
      updateMetaTag('twitter:image', imageUrl);
    }

    // Update URL
    if (mergedConfig.url) {
      const fullUrl = mergedConfig.url.startsWith('http')
        ? mergedConfig.url
        : `${baseUrl}${mergedConfig.url}`;
      updateMetaTag('og:url', fullUrl);
      updateMetaTag('twitter:url', fullUrl);
      updateCanonical(fullUrl);
    }

    // Update type
    if (mergedConfig.type) {
      updateMetaTag('og:type', mergedConfig.type);
    }

    // Update site name
    if (mergedConfig.siteName) {
      updateMetaTag('og:site_name', mergedConfig.siteName);
    }

    // Cleanup - restore defaults when component unmounts
    return () => {
      document.title = 'Nonprofit Manager - Organization Management Platform';
    };
  }, [title, description, image, url, type, siteName]);
};

export default useDocumentMeta;
