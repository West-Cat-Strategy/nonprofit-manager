import {
  detectAnomalies,
  getAccountAnalytics,
  getAccountDonationMetrics,
  getAccountEventMetrics,
  getAnalyticsSummary,
  getComparativeAnalytics,
  getContactAnalytics,
  getContactDonationMetrics,
  getContactEventMetrics,
  getContactVolunteerMetrics,
  getDonationTrends,
  getEventAttendanceTrends,
  getTrendAnalysis,
  getVolunteerHoursTrends,
} from '@controllers/analyticsController';
import { AnalyticsQueryUseCase } from '../usecases/analyticsQuery.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createAnalyticsController = (
  useCase: AnalyticsQueryUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

  return {
    getAccountAnalytics,
    getContactAnalytics,
    getAnalyticsSummary,
    getAccountDonationMetrics,
    getContactDonationMetrics,
    getAccountEventMetrics,
    getContactEventMetrics,
    getContactVolunteerMetrics,
    getDonationTrends,
    getVolunteerHoursTrends,
    getEventAttendanceTrends,
    getComparativeAnalytics,
    getTrendAnalysis,
    detectAnomalies,
  };
};
