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
} from './analytics.handlers';

export const createAnalyticsController = () => {
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
