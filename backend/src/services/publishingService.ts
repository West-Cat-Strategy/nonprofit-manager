/**
 * Publishing Service
 * Re-exports from the modular publishing directory for backwards compatibility
 */

// Re-export everything from the publishing module
export * from './publishing';

// Re-export the main class and default instance
export { PublishingService, publishingService, default } from './publishing';
