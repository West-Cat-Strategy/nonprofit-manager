/**
 * LOOP API Service Layer
 *
 * Unified service class for all backend interactions.
 * Connects to real backend API endpoints via the httpClient.
 */

import type {
  AdaptedPerson,
  Organization,
  Task,
  CampaignEvent,
  UserProfile,
  CampaignStats,
  PeopleFilter,
} from '../types/schema';

import {
  getPeople,
  updatePerson,
  createPerson,
} from './loop/people';
import {
  getUserProfile,
  updateUserProfile,
} from './loop/profile';
import { getCampaignStats, getCampaignEvents } from './loop/campaign';
import { getOrganizations } from './loop/organizations';
import { getTasks } from './loop/tasks';

/**
 * LOOP API Service Class
 * Singleton pattern for consistent API access across the application
 */
class LoopApiService {
  // ==========================================================================
  // PEOPLE MANAGEMENT
  // ==========================================================================

  async getPeople(filter?: PeopleFilter): Promise<AdaptedPerson[]> {
    return getPeople(filter);
  }

  async updatePerson(id: string, data: Partial<AdaptedPerson>): Promise<AdaptedPerson> {
    return updatePerson(id, data);
  }

  async createPerson(
    data: Omit<AdaptedPerson, 'id' | 'fullName'>
  ): Promise<AdaptedPerson> {
    return createPerson(data);
  }

  // ==========================================================================
  // USER PROFILE (Settings Module)
  // ==========================================================================

  async getUserProfile(): Promise<UserProfile> {
    return getUserProfile();
  }

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return updateUserProfile(data);
  }

  // ==========================================================================
  // CAMPAIGNS
  // ==========================================================================

  async getCampaignStats(): Promise<CampaignStats> {
    return getCampaignStats();
  }

  async getCampaignEvents(): Promise<CampaignEvent[]> {
    return getCampaignEvents();
  }

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  async getOrganizations(): Promise<Organization[]> {
    return getOrganizations();
  }

  // ==========================================================================
  // TASKS
  // ==========================================================================

  async getTasks(): Promise<Task[]> {
    return getTasks();
  }
}

export default new LoopApiService();
