/**
 * Service Container
 * Centralized dependency injection container for all services
 *
 * This provides a single location for service instantiation, making it easy to:
 * 1. Swap implementations for testing
 * 2. Manage service lifecycles
 * 3. Share database connections
 */

import { Pool } from 'pg';
import pool from '@config/database';
import { EngagementProviders, createEngagementProviders } from './providers/engagementProviders';
import { OperationsProviders, createOperationsProviders } from './providers/operationsProviders';

/**
 * Service container interface
 */
export interface ServiceContainer extends EngagementProviders, OperationsProviders {
  readonly pool: Pool;
}

/**
 * Create a service container with the given database pool
 * This allows for easy testing by injecting a mock pool
 */
export function createServiceContainer(dbPool: Pool = pool): ServiceContainer {
  const engagement = createEngagementProviders(dbPool);
  const operations = createOperationsProviders(dbPool);

  return {
    ...engagement,
    ...operations,
    get pool() {
      return dbPool;
    },
  };
}

/**
 * Default service container instance
 * Use this for production code
 */
export const services = createServiceContainer();

/**
 * Type helper for getting service types
 */
export type Services = typeof services;
