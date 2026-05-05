import type { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import {
  buildUnavailableCampaignBrowserViewHtml,
  renderCampaignBrowserViewHtml,
} from '@services/template/emailCampaignBrowserView';
import { verifyLocalCampaignBrowserViewToken } from './browserViewTokenService';

interface LocalCampaignBrowserViewRow {
  id: string;
  content_snapshot: Record<string, unknown> | null;
}

export class LocalCampaignBrowserViewService {
  constructor(private readonly db: Pool = pool) {}

  async renderFromToken(token: string): Promise<string> {
    const payload = verifyLocalCampaignBrowserViewToken(token);
    if (!payload) {
      return buildUnavailableCampaignBrowserViewHtml();
    }

    try {
      const result = await this.db.query<LocalCampaignBrowserViewRow>(
        `SELECT id, COALESCE(content_snapshot, '{}'::jsonb) AS content_snapshot
           FROM campaign_runs
          WHERE id = $1
            AND provider = 'local_email'`,
        [payload.runId]
      );
      const run = result.rows[0];
      if (!run) {
        return buildUnavailableCampaignBrowserViewHtml();
      }

      return renderCampaignBrowserViewHtml(run.content_snapshot);
    } catch (error) {
      logger.warn('Local campaign browser view could not be rendered', { error });
      return buildUnavailableCampaignBrowserViewHtml();
    }
  }
}

export const localCampaignBrowserViewService = new LocalCampaignBrowserViewService();

export const renderLocalCampaignBrowserViewFromToken = (token: string): Promise<string> =>
  localCampaignBrowserViewService.renderFromToken(token);
