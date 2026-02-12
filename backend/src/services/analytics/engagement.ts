import type { DonationMetrics, EventMetrics, TaskMetrics, VolunteerMetrics } from '@app-types/analytics';

/**
 * Calculate engagement score based on various metrics (0-100).
 */
export const calculateEngagementScore = (
  donationMetrics: DonationMetrics,
  eventMetrics: EventMetrics,
  volunteerMetrics: VolunteerMetrics | null,
  taskMetrics: TaskMetrics
): number => {
  let score = 0;

  // Donation engagement (max 40 points)
  if (donationMetrics.total_count > 0) {
    score += Math.min(15, donationMetrics.total_count * 3); // Up to 15 points for donation count
    score += donationMetrics.recurring_donations > 0 ? 15 : 0; // 15 points for recurring
    score += Math.min(10, Math.floor(donationMetrics.total_amount / 1000)); // Up to 10 points for total amount
  }

  // Event engagement (max 30 points)
  if (eventMetrics.total_registrations > 0) {
    score += Math.min(15, eventMetrics.events_attended * 3); // Up to 15 points for attendance
    score += Math.min(15, Math.floor(eventMetrics.attendance_rate * 15)); // Up to 15 points for attendance rate
  }

  // Volunteer engagement (max 20 points)
  if (volunteerMetrics) {
    score += Math.min(10, Math.floor(volunteerMetrics.total_hours / 10)); // Up to 10 points for hours
    score += Math.min(10, volunteerMetrics.completed_assignments * 2); // Up to 10 points for assignments
  }

  // Task engagement (max 10 points)
  if (taskMetrics.total_tasks > 0) {
    const completionRate = taskMetrics.completed_tasks / taskMetrics.total_tasks;
    score += Math.floor(completionRate * 10);
  }

  return Math.min(100, score);
};

/**
 * Get engagement level based on score.
 */
export const getEngagementLevel = (score: number): 'high' | 'medium' | 'low' | 'inactive' => {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  if (score > 0) return 'low';
  return 'inactive';
};
