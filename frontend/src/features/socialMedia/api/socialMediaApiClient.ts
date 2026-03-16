import api from '../../../services/api';
import type {
  SocialMediaDailySnapshot,
  SocialMediaOrgSettings,
  SocialMediaSettingsPatch,
  SocialMediaTestResult,
  SocialMediaTrackedPage,
} from '../types/contracts';

export class SocialMediaApiClient {
  getFacebookSettings(): Promise<SocialMediaOrgSettings> {
    return api.get<SocialMediaOrgSettings>('/social-media/facebook/settings').then((response) => response.data);
  }

  updateFacebookSettings(payload: SocialMediaSettingsPatch): Promise<SocialMediaOrgSettings> {
    return api
      .put<SocialMediaOrgSettings>('/social-media/facebook/settings', payload)
      .then((response) => response.data);
  }

  testFacebookSettings(): Promise<SocialMediaTestResult> {
    return api
      .post<SocialMediaTestResult>('/social-media/facebook/settings/test')
      .then((response) => response.data);
  }

  discoverFacebookPages(): Promise<SocialMediaTrackedPage[]> {
    return api
      .post<{ pages: SocialMediaTrackedPage[]; discoveredCount: number }>(
        '/social-media/facebook/pages/discover'
      )
      .then((response) => response.data.pages);
  }

  listFacebookPages(): Promise<SocialMediaTrackedPage[]> {
    return api
      .get<{ pages: SocialMediaTrackedPage[] }>('/social-media/facebook/pages')
      .then((response) => response.data.pages);
  }

  getFacebookPageSnapshots(pageId: string, limit: number = 30): Promise<SocialMediaDailySnapshot[]> {
    return api
      .get<{ snapshots: SocialMediaDailySnapshot[] }>(
        `/social-media/facebook/pages/${pageId}/snapshots?limit=${limit}`
      )
      .then((response) => response.data.snapshots);
  }

  syncFacebookPage(pageId: string): Promise<SocialMediaTrackedPage> {
    return api
      .post<SocialMediaTrackedPage>(`/social-media/facebook/pages/${pageId}/sync`)
      .then((response) => response.data);
  }
}

export const socialMediaApiClient = new SocialMediaApiClient();
