import type { DonationMetrics, EventMetrics, TaskMetrics, VolunteerMetrics } from '../../types/analytics';
/**
 * Calculate engagement score based on various metrics (0-100).
 */
export declare const calculateEngagementScore: (donationMetrics: DonationMetrics, eventMetrics: EventMetrics, volunteerMetrics: VolunteerMetrics | null, taskMetrics: TaskMetrics) => number;
/**
 * Get engagement level based on score.
 */
export declare const getEngagementLevel: (score: number) => "high" | "medium" | "low" | "inactive";
//# sourceMappingURL=engagement.d.ts.map